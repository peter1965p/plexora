#!/usr/bin/env bash
# Entfernt die gespeicherten Google-Kalender-Zugänge aus plexora-nexora (Felder googleRefreshTokenEncrypted, googleConnected, googleEmail,
# googleCalendarId, googleCalendarIds, googleAuthNotifiedAt). Die Kalender-Anbindung wurde aus Plexora entfernt; diese Felder werden nicht mehr gebraucht.
#
#   scripts/aws/purge-google-credentials.sh --dry-run   zählt nur (Anzahl Mandanten mit solchen Feldern), zeigt KEINE Werte
#   scripts/aws/purge-google-credentials.sh --apply     entfernt die Felder (nur diese Felder, sonst nichts)
#
# Löscht Daten: nur nach ausdrücklichem Okay ausführen. Rückweg gibt es nicht (die Zugänge müssten neu verbunden werden, die Funktion gibt es nicht mehr).
# Zusätzlich im Google-Konto: Zugriff von "Plexora" unter Sicherheit -> Drittanbieter-Zugriff entziehen, und das Cloud-Projekt "plexora" prüfen.
set -euo pipefail
REGION="${AWS_REGION:-eu-central-1}"; TABLE="plexora-nexora"
MODE="${1:---dry-run}"; [[ "$MODE" == "--dry-run" || "$MODE" == "--apply" ]] || { echo "Aufruf: $0 --dry-run | --apply"; exit 2; }
TMP="$(mktemp)"; trap 'rm -f "$TMP"' EXIT
aws dynamodb scan --region "$REGION" --table-name "$TABLE" \
  --projection-expression "tenantId, googleRefreshTokenEncrypted, googleConnected, googleEmail, googleCalendarId, googleCalendarIds, googleAuthNotifiedAt" --output json > "$TMP"
python3 - "$TMP" <<'PY' > "$TMP.ids"
import json, sys
d = json.load(open(sys.argv[1]))
for it in d.get("Items", []):
    if any(k in it for k in ("googleRefreshTokenEncrypted","googleConnected","googleEmail","googleCalendarId","googleCalendarIds","googleAuthNotifiedAt")):
        print(it["tenantId"]["S"])
PY
N="$(wc -l < "$TMP.ids" | tr -d ' ')"
echo "Mandanten mit gespeicherten Google-Feldern: $N"
[[ "$MODE" == "--dry-run" ]] && { echo "(Probelauf: nichts geändert)"; rm -f "$TMP.ids"; exit 0; }
while read -r tid; do
  [[ -n "$tid" ]] || continue
  aws dynamodb update-item --region "$REGION" --table-name "$TABLE" --key "{\"tenantId\":{\"S\":\"$tid\"}}" \
    --update-expression "REMOVE googleRefreshTokenEncrypted, googleConnected, googleEmail, googleCalendarId, googleCalendarIds, googleAuthNotifiedAt" \
    --condition-expression "attribute_exists(tenantId)" >/dev/null
  echo "bereinigt: ${tid:0:4}…"
done < "$TMP.ids"
rm -f "$TMP.ids"; echo "Fertig."
