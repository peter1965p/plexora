#!/usr/bin/env bash
# Einmalige Einrichtung: veröffentlicht den aktuellen Stand von plexora-api als Version, legt die Aliase
# "live" und "previous" an und lässt API Gateway sowie EventBridge den Alias "live" aufrufen.
# Danach ist ein Rückweg ein einziger Befehl (scripts/aws/rollback-backend.sh).
#
#   scripts/aws/setup-lambda-alias.sh --dry-run   zeigt nur, was passieren würde
#   scripts/aws/setup-lambda-alias.sh             richtet alles ein (wiederholbar)
#   scripts/aws/setup-lambda-alias.sh --revert    stellt API Gateway/EventBridge zurück auf die Funktion ohne Alias
#
# ACHTUNG: Veröffentlichte Versionen sind unveränderlich, auch ihre Umgebungsvariablen. Wer Variablen mit
# "aws lambda update-function-configuration" ändert, muss danach "scripts/aws/deploy-backend.sh --config-only"
# ausführen, sonst wirkt die Änderung nicht auf "live".
set -euo pipefail
cd "$(dirname "$0")"

REGION="${AWS_REGION:-eu-central-1}"
FN="plexora-api"; ALIAS="live"; PREV="previous"
API_ID="7hrkm580pb"; INTEG_ID="479o3p7"
RULES=(plexora-newsletter-automation-daily plexora-sequences-daily plexora-termine-reminders plexora-api-warmup)
ACCT="$(aws sts get-caller-identity --query Account --output text)"
FN_ARN="arn:aws:lambda:${REGION}:${ACCT}:function:${FN}"
ALIAS_ARN="${FN_ARN}:${ALIAS}"

MODE=apply
[[ "${1:-}" == "--dry-run" ]] && MODE=dry
[[ "${1:-}" == "--revert" ]] && MODE=revert
run() { if [[ $MODE == dry ]]; then echo "[dry-run] $*"; else "$@"; fi; }

smoke() { # $1 = Qualifier
  local out; out="$(mktemp)"
  aws lambda invoke --region "$REGION" --function-name "$FN" --qualifier "$1" \
    --cli-binary-format raw-in-base64-out --payload "file://smoke-event.json" "$out" >/dev/null
  python3 -c 'import json,sys; r=json.load(open(sys.argv[1])); print(r.get("statusCode"))' "$out"
  rm -f "$out"
}

switch_target() { # $1 = Ziel-ARN für API Gateway und EventBridge
  run aws apigatewayv2 update-integration --region "$REGION" --api-id "$API_ID" --integration-id "$INTEG_ID" \
    --integration-uri "$1" --query IntegrationUri --output text
  for rule in "${RULES[@]}"; do
    local tmp; tmp="$(mktemp)"
    aws events list-targets-by-rule --region "$REGION" --rule "$rule" --output json \
      | python3 -c 'import json,sys; t=json.load(sys.stdin)["Targets"]; arn=sys.argv[1]
for x in t:
    if x["Arn"].startswith(sys.argv[2]): x["Arn"]=arn
print(json.dumps(t))' "$1" "$FN_ARN" > "$tmp"
    run aws events put-targets --region "$REGION" --rule "$rule" --targets "file://$tmp" --query FailedEntryCount --output text
    rm -f "$tmp"
  done
}

if [[ $MODE == revert ]]; then
  echo "Stelle API Gateway und EventBridge zurück auf $FN_ARN ..."
  switch_target "$FN_ARN"
  echo "Fertig. (Aliase und Versionen bleiben bestehen.)"; exit 0
fi

# 1) Version + Aliase
if aws lambda get-alias --region "$REGION" --function-name "$FN" --name "$ALIAS" >/dev/null 2>&1; then
  echo "Alias $ALIAS existiert bereits (Version $(aws lambda get-alias --region "$REGION" --function-name "$FN" --name "$ALIAS" --query FunctionVersion --output text))."
else
  echo "Veröffentliche aktuellen Stand als Version ..."
  if [[ $MODE == dry ]]; then echo "[dry-run] aws lambda publish-version --function-name $FN"; V=1
  else
    V="$(aws lambda publish-version --region "$REGION" --function-name "$FN" --description "Ausgangsstand bei Einrichtung der Aliase" --query Version --output text)"
    aws lambda wait published-version-active --region "$REGION" --function-name "$FN" --qualifier "$V"
  fi
  echo "Version $V; lege Aliase $ALIAS und $PREV an ..."
  run aws lambda create-alias --region "$REGION" --function-name "$FN" --name "$ALIAS" --function-version "$V" --query AliasArn --output text
  run aws lambda create-alias --region "$REGION" --function-name "$FN" --name "$PREV" --function-version "$V" --query AliasArn --output text
fi

# 2) Aufrufrechte auf den Alias (wiederholbar: "existiert bereits" ist in Ordnung)
addperm() {
  local out
  if [[ $MODE == dry ]]; then echo "[dry-run] add-permission $*"; return; fi
  out="$(aws lambda add-permission --region "$REGION" --function-name "$FN" --qualifier "$ALIAS" --action lambda:InvokeFunction "$@" 2>&1)" \
    || { echo "$out" | grep -q "already exists" || { echo "$out"; exit 1; }; }
}
addperm --statement-id apigateway-invoke-live --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGION}:${ACCT}:${API_ID}/*"
for rule in "${RULES[@]}"; do
  addperm --statement-id "events-${rule}-live" --principal events.amazonaws.com \
    --source-arn "arn:aws:events:${REGION}:${ACCT}:rule/${rule}"
done

# 3) Vorabprüfung: Alias direkt aufrufen, bevor irgendetwas umgestellt wird
if [[ $MODE != dry ]]; then
  code="$(smoke "$ALIAS")"
  [[ "$code" == "200" ]] || { echo "ABBRUCH: Alias $ALIAS antwortet im Test mit $code statt 200. Nichts wurde umgestellt."; exit 1; }
  echo "Vorabprüfung ok (Alias $ALIAS antwortet 200)."
fi

# 4) Umstellen
echo "Stelle API Gateway und EventBridge auf $ALIAS_ARN um ..."
switch_target "$ALIAS_ARN"
echo "Fertig. Rückgängig machen: scripts/aws/setup-lambda-alias.sh --revert"
