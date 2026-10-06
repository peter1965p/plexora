#!/usr/bin/env bash
# Legt Überwachung für plexora-api an: SNS-Thema mit Mail, Log-Filter und vier CloudWatch-Alarme.
# Wiederholbar (idempotent). Fehlende Daten gelten bei allen Alarmen als "nicht auslösend".
#
#   scripts/aws/setup-alarms.sh --dry-run   zeigt nur, was angelegt würde
#   scripts/aws/setup-alarms.sh             legt alles an
#   scripts/aws/setup-alarms.sh --remove    entfernt Alarme, Log-Filter und Thema wieder
#
# Wichtig: Nitro wandelt Handler-Fehler in HTTP-500-Antworten um, die Lambda-Kennzahl "Errors" bleibt dabei 0.
# Deshalb überwachen wir API-Gateway-5xx UND den Log-Filter "[request error]" (deckt auch Cron-Jobs ab, die nicht
# über das API Gateway laufen).
set -uo pipefail

REGION="${AWS_REGION:-eu-central-1}"
EMAIL="${ALERT_EMAIL:-news24regional@gmail.com}"
TOPIC="plexora-alerts"
API_ID="7hrkm580pb"
FN="plexora-api"
LOG_GROUP="/aws/lambda/${FN}"
FILTER_NAME="plexora-request-errors"
ALARMS=(plexora-api-5xx plexora-app-errors-log plexora-lambda-errors plexora-lambda-throttles)

MODE=apply
[[ "${1:-}" == "--dry-run" ]] && MODE=dry
[[ "${1:-}" == "--remove" ]] && MODE=remove
FAILED=()
run() {
  if [[ $MODE == dry ]]; then echo "[dry-run] $*"; return 0; fi
  "$@" || { FAILED+=("${2:-$1} ${3:-}"); return 1; }
}

ACCT="$(aws sts get-caller-identity --query Account --output text)"
TOPIC_ARN="arn:aws:sns:${REGION}:${ACCT}:${TOPIC}"

if [[ $MODE == remove ]]; then
  aws cloudwatch delete-alarms --region "$REGION" --alarm-names "${ALARMS[@]}"
  aws logs delete-metric-filter --region "$REGION" --log-group-name "$LOG_GROUP" --filter-name "$FILTER_NAME" 2>/dev/null
  aws sns delete-topic --region "$REGION" --topic-arn "$TOPIC_ARN"
  echo "Entfernt."; exit 0
fi

echo "== Benachrichtigung (SNS-Thema $TOPIC)"
run aws sns create-topic --region "$REGION" --name "$TOPIC" --query TopicArn --output text
SUB="$(aws sns list-subscriptions-by-topic --region "$REGION" --topic-arn "$TOPIC_ARN" --query "Subscriptions[?Endpoint=='${EMAIL}'].SubscriptionArn" --output text 2>/dev/null || true)"
if [[ -n "$SUB" && "$SUB" != "None" ]]; then
  echo "   Mail-Abo für $EMAIL existiert bereits ($SUB)"
else
  run aws sns subscribe --region "$REGION" --topic-arn "$TOPIC_ARN" --protocol email --notification-endpoint "$EMAIL" --query SubscriptionArn --output text
  echo "   Bitte den Bestätigungslink in der Mail an $EMAIL anklicken (auch im Spam-Ordner nachsehen)."
fi

echo "== Log-Filter $FILTER_NAME -> Plexora/RequestErrors"
run aws logs put-metric-filter --region "$REGION" --log-group-name "$LOG_GROUP" --filter-name "$FILTER_NAME" \
  --filter-pattern '"[request error]"' \
  --metric-transformations metricName=RequestErrors,metricNamespace=Plexora,metricValue=1,defaultValue=0,unit=Count

alarm() { # Name, Beschreibung, weitere Argumente
  local name="$1" desc="$2"; shift 2
  if run aws cloudwatch put-metric-alarm --region "$REGION" --alarm-name "$name" --alarm-description "$desc" \
    --treat-missing-data notBreaching --comparison-operator GreaterThanOrEqualToThreshold \
    --alarm-actions "$TOPIC_ARN" --ok-actions "$TOPIC_ARN" "$@"; then echo "   $name"; else echo "   $name: FEHLER"; fi
}

echo "== Alarme (fehlende Daten = nicht auslösend)"
alarm plexora-api-5xx \
  "API Gateway liefert 5xx: mindestens 5 Fehler in 5 Minuten, in 2 von 3 Zeiträumen. Normal sind etwa 9 pro Tag. Erst Logs prüfen, nach einem Deploy: scripts/aws/rollback-backend.sh" \
  --namespace AWS/ApiGateway --metric-name 5xx --dimensions Name=ApiId,Value="$API_ID" \
  --statistic Sum --period 300 --evaluation-periods 3 --datapoints-to-alarm 2 --threshold 5 --unit Count
alarm plexora-app-errors-log \
  "Anwendungsfehler im Log ([request error]): mindestens 5 in 5 Minuten. Deckt auch Cron-Jobs ab (Terminerinnerungen, Funnel, Newsletter)." \
  --namespace Plexora --metric-name RequestErrors \
  --statistic Sum --period 300 --evaluation-periods 1 --threshold 5 --unit Count
alarm plexora-lambda-errors \
  "Lambda-Funktionsfehler (Absturz, Zeitüberschreitung, Speicher): mindestens 1 in 5 Minuten. Normal: 0." \
  --namespace AWS/Lambda --metric-name Errors --dimensions Name=FunctionName,Value="$FN" \
  --statistic Sum --period 300 --evaluation-periods 1 --threshold 1 --unit Count
alarm plexora-lambda-throttles \
  "Lambda wird gedrosselt (Konto-Limit gleichzeitiger Ausführungen): mindestens 10 in 5 Minuten. Anfragen scheitern dann, auch Leads und Buchungen. Limit-Erhöhung beantragen." \
  --namespace AWS/Lambda --metric-name Throttles --dimensions Name=FunctionName,Value="$FN" \
  --statistic Sum --period 300 --evaluation-periods 1 --threshold 10 --unit Count

echo
if [[ $MODE == dry ]]; then echo "Probelauf beendet, es wurde nichts angelegt."; exit 0; fi
if (( ${#FAILED[@]} )); then
  echo "UNVOLLSTÄNDIG: ${#FAILED[@]} Schritt(e) sind fehlgeschlagen:"; printf '  - %s\n' "${FAILED[@]}"
  echo "Alarme, die von einem fehlgeschlagenen Schritt abhängen, lösen NICHT aus (plexora-app-errors-log braucht den Log-Filter)."
  echo "Fehlende Berechtigung ergänzen (logs:PutMetricFilter) und dieses Skript erneut ausführen."
  exit 1
fi
echo "Fertig."
