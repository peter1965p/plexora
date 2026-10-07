#!/usr/bin/env bash
# Liefert den Cognito-Pre-Sign-up-Trigger (Lambda plexora-pre-signup, Code in lambdas/pre-signup/) versioniert aus.
#
#   scripts/aws/deploy-pre-signup.sh                       PROBELAUF (Standard): zeigt Konfiguration, Versionen und den Unterschied zum Live-Code, ändert nichts
#   scripts/aws/deploy-pre-signup.sh --apply [--policy separate|reject|delete]
#                                                          testen, Ausgangsstand als Version sichern, ausliefern, prüfen, Aliase setzen
#   scripts/aws/deploy-pre-signup.sh --rollback            den Code der Version "previous" wieder einspielen
#
# Wichtig: Cognito ruft die Lambda ohne Alias auf (also $LATEST). Mit "update-function-code" gilt der neue Code sofort. Versionen und Aliase
# (live, previous) sind die Rückweg-Buchführung: jede Auslieferung wird als Version festgehalten, "--rollback" spielt die vorherige wieder ein.
# --policy setzt UNCONFIRMED_NATIVE_POLICY (Standard im Code: separate). "delete" braucht zusätzlich das Recht cognito-idp:AdminDeleteUser für die Rolle der Lambda.
# Es werden keine Geheimnisse gelesen oder ausgegeben (die Lambda hat keine).
set -euo pipefail
cd "$(dirname "$0")/../.."
REGION="${AWS_REGION:-eu-central-1}"; FN="plexora-pre-signup"; LIVE="live"; PREV="previous"
MODE="--dry-run"; POLICY=""
while [[ $# -gt 0 ]]; do case "$1" in --apply|--rollback|--dry-run) MODE="$1";; --policy) POLICY="${2:-}"; shift;; *) echo "Unbekannte Option: $1" >&2; exit 2;; esac; shift; done
[[ -z "$POLICY" || "$POLICY" =~ ^(separate|reject|delete)$ ]] || { echo "--policy: separate, reject oder delete" >&2; exit 2; }
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
aws_() { aws --region "$REGION" "$@"; }
alias_ver() { aws_ lambda get-alias --function-name "$FN" --name "$1" --query FunctionVersion --output text 2>/dev/null || true; }
live_zip() { local q="${1:-}"; local url; url="$(aws_ lambda get-function --function-name "$FN" ${q:+--qualifier "$q"} --query Code.Location --output text)"; curl -sf -m 60 -o "$TMP/live-$q.zip" "$url"; echo "$TMP/live-$q.zip"; }
make_zip() { python3 - "$TMP/new.zip" <<'PY'
import zipfile, sys
zi = zipfile.ZipInfo('index.mjs', date_time=(2026, 1, 1, 0, 0, 0)); zi.external_attr = 0o644 << 16; zi.compress_type = zipfile.ZIP_DEFLATED
with zipfile.ZipFile(sys.argv[1], 'w') as z: z.writestr(zi, open('lambdas/pre-signup/index.mjs', 'rb').read())
PY
echo "$TMP/new.zip"; }

smoke() { # $1 = Qualifier; side-effect-freie Ereignisse: native Registrierung (unverändert) und Google ohne bestätigte Adresse (muss abgelehnt werden)
  local q="$1" out="$TMP/o.json"
  echo '{"triggerSource":"PreSignUp_SignUp","userPoolId":"smoke","userName":"smoke","request":{"userAttributes":{"email":"smoke@example.com"}},"response":{}}' > "$TMP/e1.json"
  echo '{"triggerSource":"PreSignUp_ExternalProvider","userPoolId":"smoke","userName":"Google_1","request":{"userAttributes":{"email":"smoke@example.com","email_verified":"false"}},"response":{}}' > "$TMP/e2.json"
  local r1 r2
  r1="$(aws_ lambda invoke --function-name "$FN" --qualifier "$q" --cli-binary-format raw-in-base64-out --payload "file://$TMP/e1.json" "$out" --query FunctionError --output text)"
  python3 -c 'import json,sys; r=json.load(open(sys.argv[1])); assert not r["response"].get("autoConfirmUser"), "native Registrierung wurde bestätigt"' "$out" || return 1
  r2="$(aws_ lambda invoke --function-name "$FN" --qualifier "$q" --cli-binary-format raw-in-base64-out --payload "file://$TMP/e2.json" "$out" --query FunctionError --output text)"
  [[ "$r1" == "None" && "$r2" == "Unhandled" ]] && echo "   Smoke-Test ok (native Registrierung unverändert; Google ohne bestätigte Adresse abgelehnt)" || { echo "   Smoke-Test FEHLGESCHLAGEN (native: $r1, Google unbestätigt: $r2)" >&2; return 1; }
}

echo "== Lambda $FN, Modus ${MODE#--}"
aws_ lambda get-function-configuration --function-name "$FN" --query '{Laufzeit:Runtime,Handler:Handler,Timeout:Timeout,MB:MemorySize,Variablen:keys(Environment.Variables)}' --output json 2>/dev/null || true
echo "   Versionen: $(aws_ lambda list-versions-by-function --function-name "$FN" --query 'Versions[].Version' --output text | tr '\t' ' ')  | live=$(alias_ver $LIVE) previous=$(alias_ver $PREV)"

case "$MODE" in
--dry-run)
  python3 - <<'PY'
import json,subprocess
want=json.load(open('lambdas/pre-signup/lambda.json'))
live=json.loads(subprocess.check_output(['aws','lambda','get-function-configuration','--function-name','plexora-pre-signup','--region','eu-central-1','--output','json']))
for k,w in [('Runtime',want['runtime']),('Handler',want['handler']),('Timeout',want['timeout']),('MemorySize',want['memorySize'])]:
    print(f"   {'OK     ' if live.get(k)==w else 'ABWEICHUNG'} {k}: live={live.get(k)} soll={w}")
PY
  echo "== Unterschied Live-Code -> Repo-Code (lambdas/pre-signup/index.mjs)"
  unzip -o -q "$(live_zip)" -d "$TMP/live" && diff -u "$TMP/live/index.mjs" lambdas/pre-signup/index.mjs | head -150 || true
  echo; echo "== --apply würde: Tests laufen lassen, den jetzigen Stand als Version sichern, ${POLICY:+UNCONFIRMED_NATIVE_POLICY=$POLICY setzen, }den Code einspielen und als neue Version veröffentlichen, Smoke-Test, Aliase live/previous setzen."
  echo "(Probelauf: nichts geändert)";;
--apply)
  echo "== Tests"; npx vitest run tests/lambda >/dev/null && echo "   ok"
  if [[ -z "$(aws_ lambda list-versions-by-function --function-name "$FN" --query 'Versions[?Version!=`$LATEST`].Version' --output text)" ]]; then
    echo "== Ausgangsstand als Version sichern"; BASE="$(aws_ lambda publish-version --function-name "$FN" --description "Stand vor der Korrektur (24.07.2026)" --query Version --output text)"
    aws_ lambda create-alias --function-name "$FN" --name "$LIVE" --function-version "$BASE" >/dev/null; aws_ lambda create-alias --function-name "$FN" --name "$PREV" --function-version "$BASE" >/dev/null; echo "   Version $BASE"
  fi
  OLD="$(alias_ver $LIVE)"
  if [[ -n "$POLICY" ]]; then
    echo "== UNCONFIRMED_NATIVE_POLICY=$POLICY setzen"; aws_ lambda update-function-configuration --function-name "$FN" --environment "Variables={UNCONFIRMED_NATIVE_POLICY=$POLICY}" >/dev/null; aws_ lambda wait function-updated --function-name "$FN"
  fi
  echo "== Code einspielen und Version veröffentlichen"
  NEW="$(aws_ lambda update-function-code --function-name "$FN" --zip-file "fileb://$(make_zip)" --publish --query Version --output text)"; aws_ lambda wait function-updated --function-name "$FN"; echo "   neue Version $NEW (Cognito nutzt ab jetzt diesen Code)"
  if ! smoke "$NEW"; then echo "== Smoke-Test fehlgeschlagen: automatischer Rückweg" >&2; exec "$0" --rollback; fi
  aws_ lambda update-alias --function-name "$FN" --name "$PREV" --function-version "$OLD" >/dev/null; aws_ lambda update-alias --function-name "$FN" --name "$LIVE" --function-version "$NEW" >/dev/null
  echo "Fertig. live = Version $NEW, previous = Version $OLD. Rückweg: scripts/aws/deploy-pre-signup.sh --rollback";;
--rollback)
  PV="$(alias_ver $PREV)"; CUR="$(alias_ver $LIVE)"; [[ -n "$PV" ]] || { echo "Keine Version 'previous' vorhanden" >&2; exit 1; }
  echo "== Code der Version $PV wieder einspielen"; unzip -o -q "$(live_zip "$PV")" -d "$TMP/prev"; (cd "$TMP/prev" && python3 -c "import zipfile,os;z=zipfile.ZipFile('$TMP/rb.zip','w',zipfile.ZIP_DEFLATED);[z.write(f) for f in os.listdir('.')]")
  NEW="$(aws_ lambda update-function-code --function-name "$FN" --zip-file "fileb://$TMP/rb.zip" --publish --query Version --output text)"; aws_ lambda wait function-updated --function-name "$FN"
  aws_ lambda update-alias --function-name "$FN" --name "$PREV" --function-version "$CUR" >/dev/null; aws_ lambda update-alias --function-name "$FN" --name "$LIVE" --function-version "$NEW" >/dev/null
  echo "Zurückgerollt: live = Version $NEW (Code von Version $PV), previous = Version $CUR";;
esac
