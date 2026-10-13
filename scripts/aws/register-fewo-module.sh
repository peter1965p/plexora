#!/usr/bin/env bash
# Trägt das Branchenpaket "Ferienwohnungen" in den Modul-Store ein (Tabelle plexora-plugin-registry). Legt nur an, überschreibt nie.
#
#   scripts/aws/register-fewo-module.sh --dry-run   zeigt den Eintrag
#   scripts/aws/register-fewo-module.sh             legt ihn an (Preis: PRICE=79, in Euro pro Monat)
#
# Rückweg: aws dynamodb delete-item --table-name plexora-plugin-registry --key '{"key":{"S":"fewo"}}'
set -euo pipefail
REGION="${AWS_REGION:-eu-central-1}"; PRICE="${PRICE:-79}"
DRY=0; [[ "${1:-}" == "--dry-run" ]] && DRY=1
ITEM="$(PRICE="$PRICE" python3 - <<'PY'
import json, os
f = lambda s: {"S": s}
print(json.dumps({
  "key": f("fewo"), "name": f("Ferienwohnungen"), "icon": f("BedDouble"), "price": {"N": os.environ["PRICE"]},
  "desc": f("Unterkünfte, Buchungen und Belegungsplan für Ferienwohnungen, mit Kalender-Abgleich zu Booking.com & Co."),
  "features": {"L": [f(x) for x in ["Belegungsplan", "Buchungen & Preise", "Rechnung aus Buchung", "Booking.com-Kalender (iCal)"]]},
  "builtin": {"BOOL": True}, "route": f("/fewo"),
}, ensure_ascii=False))
PY
)"
echo "$ITEM"
[[ $DRY -eq 1 ]] && { echo "(Probelauf: nichts geändert)"; exit 0; }
aws dynamodb put-item --region "$REGION" --table-name plexora-plugin-registry --item "$ITEM" \
  --condition-expression 'attribute_not_exists(#k)' --expression-attribute-names '{"#k":"key"}'
echo "Eingetragen."
