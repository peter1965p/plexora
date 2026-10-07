#!/usr/bin/env bash
# Vergibt dem Benutzer plexora-app VORÜBERGEHEND die wenigen Rechte, die scripts/aws/setup-backup.sh --apply braucht
# (IAM-Rolle für den Sicherungs-Worker anlegen, Worker-Lambda anlegen, Recht zum Starten des Workers an plexora-lambda-role).
# Das Skript muss mit ADMIN-Rechten laufen (z. B. AWS CloudShell im Browser, angemeldet als Inhaber/Administrator, oder AWS_PROFILE=<Admin-Profil>) –
# als plexora-app geht es absichtlich nicht (der Benutzer darf sich nicht selbst Rechte geben).
#
#   scripts/aws/grant-backup-setup-rights.sh --dry-run    zeigt die Richtlinie, ändert nichts (geht auch als plexora-app)
#   scripts/aws/grant-backup-setup-rights.sh --apply      hängt die Richtlinie "plexora-backup-setup-temp" an plexora-app
#   scripts/aws/grant-backup-setup-rights.sh --revoke     entfernt sie wieder (NACH setup-backup.sh --apply ausführen!)
#
# Ablauf: 1) --apply (Admin)  2) setup-backup.sh --apply (als plexora-app)  3) deploy-backend.sh --config-only  4) --revoke (Admin)
# Alle Rechte gelten nur für genau die benannten Rollen/Funktionen, nie für "*". Es werden keine Secrets ausgegeben.
set -euo pipefail
MODE="${1:---dry-run}"; USER_NAME="plexora-app"; POLICY="plexora-backup-setup-temp"; REGION="${AWS_REGION:-eu-central-1}"
ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
CALLER="$(aws sts get-caller-identity --query Arn --output text)"
WORKER_ROLE="arn:aws:iam::$ACCOUNT:role/plexora-backup-worker-role"; API_ROLE="arn:aws:iam::$ACCOUNT:role/plexora-lambda-role"
WORKER_FN="arn:aws:lambda:$REGION:$ACCOUNT:function:plexora-backup-worker"; API_FN="arn:aws:lambda:$REGION:$ACCOUNT:function:plexora-api"
umask 077; TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

cat > "$TMP/policy.json" <<JSON
{"Version":"2012-10-17","Statement":[
 {"Sid":"WorkerRolleAnlegen","Effect":"Allow","Action":["iam:CreateRole","iam:GetRole","iam:PutRolePolicy","iam:GetRolePolicy","iam:AttachRolePolicy","iam:ListAttachedRolePolicies","iam:ListRolePolicies"],"Resource":"$WORKER_ROLE"},
 {"Sid":"ApiRolleErgaenzen","Effect":"Allow","Action":["iam:GetRole","iam:PutRolePolicy","iam:GetRolePolicy"],"Resource":"$API_ROLE"},
 {"Sid":"WorkerRolleUebergeben","Effect":"Allow","Action":"iam:PassRole","Resource":"$WORKER_ROLE","Condition":{"StringEquals":{"iam:PassedToService":"lambda.amazonaws.com"}}},
 {"Sid":"WorkerLambdaAnlegen","Effect":"Allow","Action":["lambda:CreateFunction","lambda:GetFunction","lambda:GetFunctionConfiguration","lambda:UpdateFunctionCode","lambda:UpdateFunctionConfiguration"],"Resource":"$WORKER_FN"},
 {"Sid":"ApiUmgebungErgaenzen","Effect":"Allow","Action":["lambda:GetFunctionConfiguration","lambda:UpdateFunctionConfiguration"],"Resource":"$API_FN"}
]}
JSON

echo "== Modus: ${MODE#--}   Benutzer: $USER_NAME   Richtlinie: $POLICY"
echo "   Die Richtlinie erlaubt genau:"
python3 - "$TMP/policy.json" <<'PY'
import json,sys
for s in json.load(open(sys.argv[1]))['Statement']:
    a=s['Action']; a=[a] if isinstance(a,str) else a
    print('    -',s['Sid'],':',','.join(a),'\n        auf',s['Resource'])
PY
case "$MODE" in
  --dry-run) echo; echo "(Probelauf: nichts geändert)"; exit 0;;
  --apply|--revoke)
    if [[ "$CALLER" == *"user/$USER_NAME" ]]; then
      echo "ABBRUCH: Du bist als $USER_NAME angemeldet. Dieses Skript braucht Administratorrechte (CloudShell als Inhaber/Admin oder AWS_PROFILE=<Admin-Profil>)." >&2; exit 2
    fi;;
  *) echo "Unbekannter Modus: $MODE (erlaubt: --dry-run, --apply, --revoke)" >&2; exit 2;;
esac
if [[ "$MODE" == "--apply" ]]; then
  aws iam put-user-policy --user-name "$USER_NAME" --policy-name "$POLICY" --policy-document "file://$TMP/policy.json"
  echo "Gesetzt. Jetzt: scripts/aws/setup-backup.sh --apply (als $USER_NAME), danach deploy-backend.sh --config-only, danach dieses Skript mit --revoke."
else
  aws iam delete-user-policy --user-name "$USER_NAME" --policy-name "$POLICY" 2>/dev/null && echo "Entfernt: $POLICY" || echo "Richtlinie war nicht gesetzt (nichts zu tun)."
fi
