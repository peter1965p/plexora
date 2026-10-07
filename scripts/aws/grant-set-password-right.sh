#!/usr/bin/env bash
# Gibt der Rolle der API-Lambda (plexora-lambda-role) das EINE zusätzliche Recht, das der Einmal-Link "Passwort festlegen" braucht:
#   cognito-idp:AdminSetUserPassword – nur auf den User Pool von Plexora, nie auf "*".
# Ohne dieses Recht antwortet POST /api/auth/set-password mit "noch nicht freigeschaltet" (503) und das Token bleibt gültig.
# Das Skript braucht ADMINISTRATOR-Rechte (z. B. AWS CloudShell als Inhaber/Admin oder AWS_PROFILE=<Admin-Profil>); als plexora-app geht es absichtlich nicht.
#
#   scripts/aws/grant-set-password-right.sh --dry-run    zeigt die Richtlinie, ändert nichts (geht auch als plexora-app)   [Standard]
#   scripts/aws/grant-set-password-right.sh --apply      setzt die Richtlinie "plexora-set-password" an die Rolle
#   scripts/aws/grant-set-password-right.sh --revoke     entfernt sie wieder (Rückweg; danach NUXT_WELCOME_LINK leeren)
#
# Reihenfolge: 1) --apply (Admin)  2) scripts/aws/set-enforce.sh welcome on
#              3) scripts/aws/deploy-backend.sh --config-only  4) Testkauf im Stripe-Testmodus und Link prüfen.
# Es werden keine Geheimnisse gelesen oder ausgegeben.
set -euo pipefail
MODE="${1:---dry-run}"; ROLE="plexora-lambda-role"; POLICY="plexora-set-password"; REGION="${AWS_REGION:-eu-central-1}"; POOL="eu-central-1_lM7sN6LvC"
ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
CALLER="$(aws sts get-caller-identity --query Arn --output text)"
umask 077; TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
cat > "$TMP/policy.json" <<JSON
{"Version":"2012-10-17","Statement":[{"Sid":"PasswortPerEinmalLinkFestlegen","Effect":"Allow","Action":"cognito-idp:AdminSetUserPassword","Resource":"arn:aws:cognito-idp:$REGION:$ACCOUNT:userpool/$POOL"}]}
JSON
echo "== Modus: ${MODE#--}   Rolle: $ROLE   Richtlinie: $POLICY"
echo "   Die Richtlinie erlaubt genau:"
python3 - "$TMP/policy.json" <<'PY'
import json,sys
for s in json.load(open(sys.argv[1]))['Statement']:
    print('    -',s['Sid'],':',s['Action'],'\n        auf',s['Resource'])
PY
case "$MODE" in
  --dry-run) echo; echo "(Probelauf: nichts geändert)"; exit 0;;
  --apply|--revoke)
    if [[ "$CALLER" == *"user/plexora-app" ]]; then echo "ABBRUCH: Du bist als plexora-app angemeldet. Dieses Skript braucht Administratorrechte (CloudShell als Inhaber/Admin oder AWS_PROFILE=<Admin-Profil>)." >&2; exit 2; fi;;
  *) echo "Unbekannter Modus: $MODE (erlaubt: --dry-run, --apply, --revoke)" >&2; exit 2;;
esac
if [[ "$MODE" == "--apply" ]]; then
  aws iam put-role-policy --role-name "$ROLE" --policy-name "$POLICY" --policy-document "file://$TMP/policy.json"
  echo "Gesetzt. Als Nächstes: scripts/aws/set-enforce.sh welcome on, dann scripts/aws/deploy-backend.sh --config-only."
else
  aws iam delete-role-policy --role-name "$ROLE" --policy-name "$POLICY" 2>/dev/null && echo "Entfernt: $POLICY (jetzt NUXT_WELCOME_LINK leeren, sonst bekommen neue Kunden einen Link, der nicht funktioniert)." || echo "Richtlinie war nicht gesetzt (nichts zu tun)."
fi
