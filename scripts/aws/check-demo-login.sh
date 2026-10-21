#!/usr/bin/env bash
# Prüft live, dass das Demo-Login (demo@plexora.eu) nach den Sicherheitsänderungen weiter funktioniert:
# Anmeldung bei Cognito, dann Lesezugriff auf jedes Modul (Dashboard-relevante Listen) und Gegenprobe ohne Token (401).
# Das Demo-Konto ist ein Sandkasten: erlaubte Bereiche darf es schreiben (wird danach zurückgesetzt), Außenwirkung und Sicherheit bleiben gesperrt.
# Das Passwort steht öffentlich auf plexora.eu, wird aber nicht im Repo gespeichert: DEMO_PASSWORD=… scripts/aws/check-demo-login.sh
# Die Anmeldung läuft per SRP über scripts/aws/demo-login-token.mjs (der App-Client erlaubt kein USER_PASSWORD_AUTH).
# Tokens und Passwort werden nie ausgegeben.
set -uo pipefail
API="${API:-https://7hrkm580pb.execute-api.eu-central-1.amazonaws.com}"
REGION="eu-central-1"
FAIL=0
ok()  { printf '  \033[32mOK\033[0m   %s\n' "$1"; }
bad() { printf '  \033[31mFEHLER\033[0m %s\n' "$1"; FAIL=1; }
[[ -n "${DEMO_PASSWORD:-}" ]] || { echo "DEMO_PASSWORD fehlt (Passwort des Demo-Kontos als Umgebungsvariable übergeben)"; exit 2; }

echo "== Anmeldung (Cognito)"
TOKEN="$(DEMO_USERNAME="${DEMO_USERNAME:-demo@plexora.eu}" node scripts/aws/demo-login-token.mjs 2>/dev/null || true)"
if [[ -z "$TOKEN" || "$TOKEN" == "None" ]]; then bad "Anmeldung des Demo-Kontos fehlgeschlagen"; exit 1; fi
ok "Demo-Login erfolgreich (Token erhalten, nicht angezeigt)"
EMAIL="$(python3 - "$TOKEN" <<'PY'
import sys,base64,json
p=sys.argv[1].split('.')[1]; p+='='*(-len(p)%4)
d=json.loads(base64.urlsafe_b64decode(p)); print(d.get('email',''), ','.join(d.get('cognito:groups',[])))
PY
)"
echo "   Konto: ${EMAIL%% *}  Gruppen: ${EMAIL#* }"

code() { curl -s -o /dev/null -m 25 -w '%{http_code}' "$@"; }
echo "== Lesezugriff je Modul (mit Token erwartet 200, ohne Token 401)"
for p in dashboard-skip contacts companies deals contracts projects support finance finance/cashbook finance/bank-txns hr hr/leave hr/timelog hr/stempel marketing forms notifications settings/invoice settings/invoice-template team/members settings/branch-packages campaigns/presets settings/invoice-presets; do
  [[ "$p" == "dashboard-skip" ]] && continue
  with="$(code -H "Authorization: Bearer $TOKEN" "$API/api/$p")"
  without="$(code "$API/api/$p")"
  if [[ "$with" == "200" ]]; then ok "GET /api/$p mit Token: 200"; else bad "GET /api/$p mit Token: $with (erwartet 200)"; fi
  if [[ "$without" == "401" ]]; then ok "GET /api/$p ohne Token: 401"; else bad "GET /api/$p ohne Token: $without (erwartet 401)"; fi
done
echo "== Demo-Konto darf nichts verändern (403 erwartet)"
for spec in "POST settings/branding" "POST settings/branch-packages" "POST bot-protection-skip" "POST settings/payment" "POST blog" "POST pages" "POST marketing" "POST newsletter/campaigns" "POST aws/s3-upload" "POST team/invite" "POST ai/assistant/execute"; do
  m="${spec%% *}"; p="${spec#* }"; [[ "$p" == "bot-protection-skip" ]] && p="settings/bot-protection"
  c="$(code -X "$m" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"packageKey":"gratis","brandName":"x","legalName":"x","siteKey":"x"}' "$API/api/$p")"
  [[ "$c" == "403" ]] && ok "$m /api/$p als Demo-Konto: 403" || bad "$m /api/$p als Demo-Konto: $c (erwartet 403)"
done
echo "== Demo-Sandkasten: Anlegen geht, Zurücksetzen räumt auf (alles wird beim Abmelden auf den Standard zurückgesetzt)"
mark="ZZ-Sandkasten-$RANDOM"
c="$(code -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "{\"firstName\":\"$mark\",\"lastName\":\"Test\",\"email\":\"sandkasten@example.test\"}" "$API/api/contacts")"
[[ "$c" == "200" ]] && ok "Kontakt anlegen als Demo-Konto: 200" || bad "Kontakt anlegen als Demo-Konto: $c (erwartet 200)"
has() { curl -s -m 25 -H "Authorization: Bearer $TOKEN" "$API/api/contacts" | grep -c "$mark" || true; }
[[ "$(has)" -ge 1 ]] && ok "Neuer Kontakt ist in der Liste" || bad "Neuer Kontakt fehlt in der Liste"
rs="$(curl -s -m 90 -X POST -H "Authorization: Bearer $TOKEN" "$API/api/demo/reset")"
echo "$rs" | grep -q '"reset":true' && ok "Zurücksetzen: ${rs:0:80}" || bad "Zurücksetzen fehlgeschlagen: ${rs:0:120}"
[[ "$(has)" -eq 0 ]] && ok "Neuer Kontakt nach dem Zurücksetzen weg" || bad "Neuer Kontakt noch da"
c="$(code -X POST -H "Authorization: Bearer $TOKEN" "$API/api/demo/reset")"
[[ "$c" == "200" ]] && ok "Zweites Zurücksetzen ohne Änderung: 200 (nichts zu tun)" || bad "Zweites Zurücksetzen: $c"
c="$(code -X POST "$API/api/demo/reset")"; [[ "$c" == "401" ]] && ok "Zurücksetzen ohne Token: 401" || bad "Zurücksetzen ohne Token: $c (erwartet 401)"
echo
[[ $FAIL -eq 0 ]] && echo "Demo-Login: alle Prüfungen bestanden." || { echo "Demo-Login: es gibt Fehler."; exit 1; }
