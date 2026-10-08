#!/usr/bin/env bash
# IAM Access Analyzer (Typ "externer Zugriff") einrichten: meldet laufend Buckets/Rollen/Funktionen, die von außerhalb des Kontos oder öffentlich erreichbar sind –
# auch Änderungen in der Konsole NACH einem Deploy (das Deploy-Gate scripts/aws/check-storage.sh sieht nur den Zustand zum Aufrufzeitpunkt).
# Findings gehen per EventBridge an das vorhandene SNS-Thema plexora-alerts (dieselbe bestätigte Mail wie die CloudWatch-Alarme).
#
#   scripts/aws/setup-access-analyzer.sh --dry-run    [Standard] zeigt, was angelegt würde, und liest nur (soweit das Recht reicht); ändert nichts
#   scripts/aws/setup-access-analyzer.sh --apply      legt Analyzer, Thema-Berechtigung und EventBridge-Regel an   (NUR nach Freigabe: braucht Rechte, siehe unten)
#   scripts/aws/setup-access-analyzer.sh --remove     entfernt Regel und Analyzer wieder (das Thema plexora-alerts bleibt)
#
# Benötigte Rechte (für --apply/--remove, nicht für --dry-run): access-analyzer:CreateAnalyzer/DeleteAnalyzer/ListAnalyzers,
#   events:PutRule/PutTargets/DeleteRule/RemoveTargets/DescribeRule, sns:GetTopicAttributes/SetTopicAttributes.
# Kosten: der Analyzer für externen Zugriff ist nach AWS-Angabe kostenlos (bitte in der aktuellen Preisliste gegenprüfen); EventBridge-Regel und SNS-Mail: praktisch 0.
set -uo pipefail
MODE="${1:---dry-run}"; REGION="${AWS_REGION:-eu-central-1}"
ANALYZER="plexora-external-access"; RULE="plexora-access-analyzer-findings"; TOPIC="plexora-alerts"
ACCOUNT="$(aws sts get-caller-identity --query Account --output text 2>/dev/null || true)"
[[ "$ACCOUNT" =~ ^[0-9]{12}$ ]] || { echo "FEHLER: Konto nicht ermittelbar (aws sts get-caller-identity)." >&2; exit 1; }
TOPIC_ARN="arn:aws:sns:$REGION:$ACCOUNT:$TOPIC"; RULE_ARN="arn:aws:events:$REGION:$ACCOUNT:rule/$RULE"
umask 077; TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

# Nur aktive, neue Findings (nicht jede Statusänderung) lösen eine Mail aus
cat > "$TMP/pattern.json" <<JSON
{"source":["aws.access-analyzer"],"detail-type":["Access Analyzer Finding"],"detail":{"status":["ACTIVE"],"isDeprecated":[false]}}
JSON
# Das Thema darf nur von dieser einen Regel beschickt werden
cat > "$TMP/statement.json" <<JSON
{"Sid":"AccessAnalyzerRegel","Effect":"Allow","Principal":{"Service":"events.amazonaws.com"},"Action":"sns:Publish","Resource":"$TOPIC_ARN","Condition":{"ArnEquals":{"aws:SourceArn":"$RULE_ARN"}}}
JSON

echo "== Modus: ${MODE#--}   Region: $REGION"
echo "   Analyzer:   $ANALYZER (Typ ACCOUNT = nur dieses Konto als Vertrauensbereich)"
echo "   Regel:      $RULE  -> Ziel: SNS-Thema $TOPIC (bestehend)"
echo "   Muster:     $(cat "$TMP/pattern.json")"
echo "   Themen-Berechtigung (nur diese Regel darf veröffentlichen):"; sed 's/^/     /' "$TMP/statement.json"
echo
echo "== Ist-Zustand (nur lesend)"
la="$(aws accessanalyzer list-analyzers --region "$REGION" --query "analyzers[?name=='$ANALYZER'].status" --output text 2>&1)"
case "$la" in *AccessDenied*|*not\ authorized*) echo "   Analyzer: nicht prüfbar (plexora-app hat kein access-analyzer:ListAnalyzers) – bei --apply wird ein vorhandener erkannt";; "") echo "   Analyzer: nicht vorhanden";; *) echo "   Analyzer: vorhanden ($la)";; esac
rs="$(aws events describe-rule --name "$RULE" --region "$REGION" --query State --output text 2>&1)"
case "$rs" in *ResourceNotFound*) echo "   Regel: nicht vorhanden";; *AccessDenied*|*not\ authorized*) echo "   Regel: nicht prüfbar (kein events:DescribeRule)";; *) echo "   Regel: vorhanden ($rs)";; esac
tp="$(aws sns get-topic-attributes --topic-arn "$TOPIC_ARN" --region "$REGION" --query 'Attributes.TopicArn' --output text 2>&1)"
if [[ "$tp" == "$TOPIC_ARN" ]]; then echo "   SNS-Thema $TOPIC: vorhanden"; elif [[ "$tp" == *AuthorizationError* || "$tp" == *AccessDenied* ]]; then echo "   SNS-Thema $TOPIC: nicht prüfbar (plexora-app hat kein sns:GetTopicAttributes); das Thema existiert laut setup-alarms.sh"; else echo "   SNS-Thema $TOPIC: nicht vorhanden – erst scripts/aws/setup-alarms.sh ausführen"; fi

case "$MODE" in
  --dry-run) echo; echo "(Probelauf: nichts geändert)"; exit 0;;
  --apply)
    echo; echo "== Anlegen"
    aws accessanalyzer create-analyzer --region "$REGION" --analyzer-name "$ANALYZER" --type ACCOUNT --query arn --output text || echo "   (Analyzer existiert evtl. schon oder Recht fehlt)"
    # bestehende Themen-Richtlinie um die Anweisung ergänzen (nicht ersetzen)
    aws sns get-topic-attributes --topic-arn "$TOPIC_ARN" --region "$REGION" --query 'Attributes.Policy' --output text > "$TMP/policy.cur" 2>/dev/null || true
    python3 - "$TMP/policy.cur" "$TMP/statement.json" "$TMP/policy.new" <<'PY'
import json,sys
try: pol=json.load(open(sys.argv[1]))
except Exception: pol={"Version":"2012-10-17","Statement":[]}
st=json.load(open(sys.argv[2])); pol["Statement"]=[s for s in pol.get("Statement",[]) if s.get("Sid")!=st["Sid"]]+[st]
json.dump(pol,open(sys.argv[3],"w"))
PY
    aws sns set-topic-attributes --topic-arn "$TOPIC_ARN" --region "$REGION" --attribute-name Policy --attribute-value "file://$TMP/policy.new" || exit 1
    aws events put-rule --name "$RULE" --region "$REGION" --event-pattern "file://$TMP/pattern.json" --state ENABLED --description "Neue externe Zugriffe (Access Analyzer) an plexora-alerts" --query RuleArn --output text || exit 1
    aws events put-targets --rule "$RULE" --region "$REGION" --targets "Id=sns,Arn=$TOPIC_ARN" || exit 1
    echo "Fertig. Rückweg: $0 --remove";;
  --remove)
    aws events remove-targets --rule "$RULE" --region "$REGION" --ids sns; aws events delete-rule --name "$RULE" --region "$REGION"
    aws accessanalyzer delete-analyzer --region "$REGION" --analyzer-name "$ANALYZER"
    echo "Entfernt (die Berechtigung am Thema $TOPIC bleibt als harmlose Zeile stehen; sie gilt nur für die gelöschte Regel).";;
  *) echo "Aufruf: $0 --dry-run | --apply | --remove" >&2; exit 2;;
esac
