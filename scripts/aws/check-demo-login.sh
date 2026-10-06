#!/usr/bin/env bash
# Prüft live, dass das Demo-Login (demo@plexora.eu) nach den Sicherheitsänderungen weiter funktioniert:
# Anmeldung bei Cognito, dann Lesezugriff auf jedes Modul (Dashboard-relevante Listen) und Gegenprobe ohne Token (401).
# Das Passwort steht öffentlich auf plexora.eu, wird aber nicht im Repo gespeichert: DEMO_PASSWORD=… scripts/aws/check-demo-login.sh
# Tokens und Passwort werden nie ausgegeben.
set -uo pipefail
API="${API:-https://7hrkm580pb.execute-api.eu-central-1.amazonaws.com}"
REGION="eu-central-1"
CLIENT_ID="${COGNITO_CLIENT_ID:-1aa9chqqkgr9dp232cgpa4nanb}"
USERNAME="${DEMO_USERNAME:-demo-plexora}"
FAIL=0
ok()  { printf '  \033[32mOK\033[0m   %s\n' "$1"; }
bad() { printf '  \033[31mFEHLER\033[0m %s\n' "$1"; FAIL=1; }
[[ -n "${DEMO_PASSWORD:-}" ]] || { echo "DEMO_PASSWORD fehlt (Passwort des Demo-Kontos als Umgebungsvariable übergeben)"; exit 2; }

echo "== Anmeldung (Cognito)"
TOKEN="$(aws cognito-idp initiate-auth --no-sign-request --region "$REGION" --auth-flow USER_PASSWORD_AUTH --client-id "$CLIENT_ID" \
  --auth-parameters "USERNAME=$USERNAME,PASSWORD=$DEMO_PASSWORD" --query 'AuthenticationResult.IdToken' --output text 2>/dev/null || true)"
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
for spec in "POST settings/branding" "POST settings/company" "POST settings/branch-packages" "POST bot-protection-skip"; do
  m="${spec%% *}"; p="${spec#* }"; [[ "$p" == "bot-protection-skip" ]] && p="settings/bot-protection"
  c="$(code -X "$m" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"packageKey":"gratis","brandName":"x","legalName":"x","siteKey":"x"}' "$API/api/$p")"
  [[ "$c" == "403" ]] && ok "$m /api/$p als Demo-Konto: 403" || bad "$m /api/$p als Demo-Konto: $c (erwartet 403)"
done
echo
[[ $FAIL -eq 0 ]] && echo "Demo-Login: alle Prüfungen bestanden." || { echo "Demo-Login: es gibt Fehler."; exit 1; }
