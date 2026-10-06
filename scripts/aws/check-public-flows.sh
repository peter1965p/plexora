#!/usr/bin/env bash
# Prüft nach jedem Deploy die öffentlichen Abläufe, ohne etwas zu verändern (keine Leads, keine Buchungen, keine Mails):
# Landingpage, Lead-Formular (Definition + Preflight), Terminbuchung (Typen, freie Zeiten, Preflight), Nexora-Seite,
# Cron-Schutz und Anmeldeschutz. Endet mit Fehlercode 1, wenn etwas nicht stimmt.
set -uo pipefail
API="https://7hrkm580pb.execute-api.eu-central-1.amazonaws.com"
TENANT="PLXR-GOD0-MODE-0000-PETE"
CAMPAIGN="eeb06c2a-4ff3-48ba-b8bc-883f985589e4"
FAIL=0
ok()   { printf '  \033[32mOK\033[0m   %s\n' "$1"; }
bad()  { printf '  \033[31mFEHLER\033[0m %s\n' "$1"; FAIL=1; }
code() { curl -s -o /dev/null -m 25 -w '%{http_code}' "$@"; }
expect() { local want="$1" desc="$2"; shift 2; local got; got="$(code "$@")"; [[ "$got" == "$want" ]] && ok "$desc ($got)" || bad "$desc: erwartet $want, erhalten $got"; }

echo "== Landingpage"
LP="$(curl -s -m 25 "$API/api/marketing/public/$CAMPAIGN")"
FORM_ID="$(echo "$LP" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["campaign"]["formId"])' 2>/dev/null || true)"
NFIELDS="$(echo "$LP" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)["form"]["fields"]))' 2>/dev/null || echo 0)"
TYPE_ID="$(echo "$LP" | python3 -c 'import json,sys; print(json.load(sys.stdin)["campaign"].get("appointmentTypeId",""))' 2>/dev/null || true)"
[[ -n "$FORM_ID" ]] && ok "Kampagnendaten laden (Formular $FORM_ID)" || bad "Kampagnendaten laden"
[[ "$NFIELDS" -ge 1 ]] && ok "Formular hat $NFIELDS Felder" || bad "Formular ohne Felder"
expect 200 "Seite app.plexora.eu/lead/<Kampagne>" -H 'Accept: text/html' "https://app.plexora.eu/lead/$CAMPAIGN"
expect 200 "Kurzlink-Variante /ai.beratung (Slug)" "$API/api/marketing/public/ai.beratung"

# Bot-Schutz (Turnstile): öffentliche Ausgaben enthalten höchstens Sitekey + Modus, nie ein Secret.
# Ist die Test-Kampagne geschützt (botProtection gesetzt), kann dieses Skript kein Token lösen: dann wird nur geprüft,
# dass ein Absenden OHNE Token mit 403 abgewiesen wird (kein Lead entsteht, weil die Prüfung vor dem Speichern läuft).
BOT="$(echo "$LP" | python3 -c 'import json,sys; print(json.dumps(json.load(sys.stdin).get("botProtection")))' 2>/dev/null || echo null)"
echo "$LP" | grep -qiE 'secret|encrypted' && bad "Landingpage-Ausgabe enthält ein Secret-Feld" || ok "Landingpage-Ausgabe ohne Secret-Felder"
CT="$(curl -s -m 25 "$API/api/public/$TENANT/contact")"
echo "$CT" | grep -qiE 'secret|encrypted' && bad "Kontakt-Ausgabe enthält ein Secret-Feld" || ok "Kontakt-Ausgabe ohne Secret-Felder"
if [[ "$BOT" != "null" && -n "$FORM_ID" ]]; then
  expect 403 "Bot-Schutz aktiv: Absenden ohne Token wird abgewiesen (kein Lead)" -X POST "$API/api/forms/$FORM_ID/submit" -H 'Content-Type: application/json' -d '{"data":{"E-Mail":"check-public-flows@invalid.example"}}'
else
  ok "Bot-Schutz an der Test-Kampagne aus (Formular bleibt ohne Token erreichbar)"
fi

echo "== Lead-Formular (nur Preflight, kein Absenden)"
PF="$(curl -s -i -m 25 -X OPTIONS "$API/api/forms/$FORM_ID/submit" -H 'Origin: https://app.plexora.eu' -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type')"
echo "$PF" | head -1 | grep -qE ' (200|204)' && ok "Preflight für POST /api/forms/<id>/submit" || bad "Preflight für Formular-Absenden"

echo "== Terminbuchung"
TY="$(curl -s -m 25 "$API/api/public/$TENANT/termine${TYPE_ID:+?type=$TYPE_ID}")"
NTYPES="$(echo "$TY" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)["types"]))' 2>/dev/null || echo 0)"
[[ "$NTYPES" -ge 1 ]] && ok "$NTYPES Terminarten (Deep-Link ?type=${TYPE_ID:-–})" || bad "keine Terminarten"
if [[ -n "$TYPE_ID" ]]; then
  echo "$TY" | grep -q "$TYPE_ID" && ok "Kampagnen-Terminart über Deep-Link sichtbar" || bad "Kampagnen-Terminart nicht über Deep-Link sichtbar"
  echo "$(curl -s -m 25 "$API/api/public/$TENANT/termine")" | grep -q "$TYPE_ID" && bad "Kampagnen-Terminart steht auf der allgemeinen Liste" || ok "Kampagnen-Terminart NICHT auf der allgemeinen Liste"
fi
DAY="$(date -d '+2 days' +%F)"; FIRST_TYPE="$(echo "$TY" | python3 -c 'import json,sys; print(json.load(sys.stdin)["types"][0]["typeId"])' 2>/dev/null || true)"
SLOTS="$(curl -s -m 25 "$API/api/public/$TENANT/termine/availability?typeId=${TYPE_ID:-$FIRST_TYPE}&date=$DAY" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)["slots"]))' 2>/dev/null || echo 0)"
[[ "$SLOTS" -ge 1 ]] && ok "freie Zeiten am $DAY: $SLOTS" || bad "keine freien Zeiten am $DAY"
PB="$(curl -s -i -m 25 -X OPTIONS "$API/api/public/$TENANT/termine/book" -H 'Origin: https://www.paeffgen-it.de' -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type')"
echo "$PB" | head -1 | grep -qE ' (200|204)' && ok "Preflight für POST …/termine/book" || bad "Preflight für Terminbuchung"

echo "== Nexora-Website"
expect 200 "www.paeffgen-it.de/termine" -H 'Accept: text/html' "https://www.paeffgen-it.de/termine${TYPE_ID:+?type=$TYPE_ID}"
expect 200 "www.paeffgen-it.de/" -H 'Accept: text/html' "https://www.paeffgen-it.de/"

echo "== Schutz"
expect 401 "Entwürfe ohne Token" "$API/api/drafts/marketing-campaign"
expect 401 "Cron-Route ohne Secret" -X POST "$API/api/termine/cron/reminders"
expect 200 "Anwendung antwortet (/api/settings/agb)" "$API/api/settings/agb"

echo
[[ $FAIL -eq 0 ]] && echo "Alle Prüfungen bestanden." || { echo "Es gibt Fehler."; exit 1; }
