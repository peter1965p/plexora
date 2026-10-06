#!/usr/bin/env bash
# Rückweg in einem Schritt: der Alias "live" zeigt wieder auf die vorherige Version ("previous").
# "previous" zeigt danach auf die bisherige Version, so lässt sich der Rückweg auch umkehren.
set -euo pipefail
REGION="${AWS_REGION:-eu-central-1}"; FN="plexora-api"
API="https://7hrkm580pb.execute-api.eu-central-1.amazonaws.com"
ver() { aws lambda get-alias --region "$REGION" --function-name "$FN" --name "$1" --query FunctionVersion --output text; }
LIVE="$(ver live)"; PREV="$(ver previous)"
if [[ "$LIVE" == "$PREV" ]]; then echo "live und previous zeigen beide auf Version $LIVE, es gibt nichts zurückzurollen."; exit 1; fi
echo "Rolle zurück: live $LIVE -> $PREV (previous wird $LIVE)"
aws lambda update-alias --region "$REGION" --function-name "$FN" --name live --function-version "$PREV" --query FunctionVersion --output text
aws lambda update-alias --region "$REGION" --function-name "$FN" --name previous --function-version "$LIVE" --query FunctionVersion --output text
sleep 3
echo "Prüfung: /api/settings/agb -> $(curl -s -o /dev/null -w '%{http_code}' "$API/api/settings/agb") (erwartet 200)"
