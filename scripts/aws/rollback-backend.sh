#!/usr/bin/env bash
# Rückweg in einem Schritt: der Alias "live" zeigt wieder auf die vorherige Version ("previous").
# "previous" zeigt danach auf die bisherige Version, so lässt sich der Rückweg auch umkehren.
#
#   scripts/aws/rollback-backend.sh             tauscht live und previous
#   scripts/aws/rollback-backend.sh --dry-run   zeigt nur, was getauscht würde (Versionen und Beschriftung), ändert nichts
#
# Es wird nie getauscht, wenn live und previous auf dieselbe Version zeigen (der "Rückweg" wäre wirkungslos und würde den echten Rückweg verdecken).
set -euo pipefail
REGION="${AWS_REGION:-eu-central-1}"; FN="plexora-api"
API="https://7hrkm580pb.execute-api.eu-central-1.amazonaws.com"
DRY=0
case "${1:-}" in "") ;; --dry-run) DRY=1;; *) echo "Aufruf: $0 [--dry-run]" >&2; exit 2;; esac
ver() { aws lambda get-alias --region "$REGION" --function-name "$FN" --name "$1" --query FunctionVersion --output text; }
desc() { aws lambda get-function --region "$REGION" --function-name "$FN" --qualifier "$1" --query Configuration.Description --output text 2>/dev/null || echo "?"; }
LIVE="$(ver live)"; PREV="$(ver previous)"
[[ "$LIVE" =~ ^[0-9]+$ && "$PREV" =~ ^[0-9]+$ ]] || { echo "FEHLER: Aliase nicht lesbar (live='$LIVE', previous='$PREV')." >&2; exit 1; }
if [[ "$LIVE" == "$PREV" ]]; then echo "live und previous zeigen beide auf Version $LIVE, es gibt nichts zurückzurollen." >&2; exit 1; fi
if [[ $DRY -eq 1 ]]; then
  echo "Probelauf: nichts wird geändert."
  echo "  jetzt:  live = Version $LIVE ($(desc "$LIVE")), previous = Version $PREV ($(desc "$PREV"))"
  echo "  danach: live = Version $PREV ($(desc "$PREV")), previous = Version $LIVE"
  exit 0
fi
echo "Rolle zurück: live $LIVE -> $PREV (previous wird $LIVE)"
aws lambda update-alias --region "$REGION" --function-name "$FN" --name live --function-version "$PREV" --query FunctionVersion --output text
aws lambda update-alias --region "$REGION" --function-name "$FN" --name previous --function-version "$LIVE" --query FunctionVersion --output text
sleep 3
echo "Prüfung: /api/settings/agb -> $(curl -s -o /dev/null -w '%{http_code}' "$API/api/settings/agb") (erwartet 200)"
