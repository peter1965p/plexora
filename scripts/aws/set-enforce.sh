#!/usr/bin/env bash
# Schaltet einen Durchsetzungs-Schalter in der Konfiguration der Lambda plexora-api ($LATEST) um.
#
#   scripts/aws/set-enforce.sh plan  status|on|off [--dry-run]   NUXT_PLAN_ENFORCE  (Tarif-/Modul-, Mail- und Upload-Limits: aus = nur protokollieren)
#   scripts/aws/set-enforce.sh roles status|on|off [--dry-run]   NUXT_ROLES_ENFORCE (Rollen Inhaber/Admin/Mitglied: aus = nur protokollieren)
#   scripts/aws/set-enforce.sh welcome status|on|off [--dry-run] NUXT_WELCOME_LINK  (Willkommensmail mit Einmal-Link statt Start-Passwort; erst NACH grant-set-password-right.sh --apply)
#
# "off" entfernt die Variable, dann gilt der Beobachtungsmodus: es wird nur protokolliert ("würde ablehnen"), nichts abgelehnt.
# Danach wirksam machen (neue Version + Alias): scripts/aws/deploy-backend.sh --config-only
# RÜCKWEG in einem Satz: scripts/aws/rollback-backend.sh (Alias-Wechsel auf die vorige Version, deren Konfiguration den Schalter nicht enthält);
# danach optional "set-enforce.sh <plan|roles> off" und "deploy-backend.sh --config-only", damit auch $LATEST wieder ohne Schalter ist.
# Werte anderer Umgebungsvariablen werden nie ausgegeben (nur ihre Namen).
set -euo pipefail
REGION="${AWS_REGION:-eu-central-1}"; FN="plexora-api"
WHAT="${1:-}"; MODE="${2:-status}"; DRY=0; [[ "${3:-}" == "--dry-run" ]] && DRY=1
case "$WHAT" in plan) VAR="NUXT_PLAN_ENFORCE";; roles) VAR="NUXT_ROLES_ENFORCE";; welcome) VAR="NUXT_WELCOME_LINK";; *) echo "Aufruf: $0 plan|roles|welcome status|on|off [--dry-run]"; exit 2;; esac
case "$MODE" in status|on|off) ;; *) echo "Aufruf: $0 plan|roles|welcome status|on|off [--dry-run]"; exit 2;; esac
umask 077
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

aws lambda get-function-configuration --region "$REGION" --function-name "$FN" --query 'Environment.Variables' --output json > "$TMP/env.json"
if [[ "$MODE" == "status" ]]; then
  python3 -c 'import json,sys; print(sys.argv[2], "=", json.load(open(sys.argv[1])).get(sys.argv[2], "(nicht gesetzt)"))' "$TMP/env.json" "$VAR"; exit 0
fi

python3 - "$TMP/env.json" "$TMP/new.json" "$MODE" "$VAR" <<'PY'
import json,sys
src,dst,mode,var=sys.argv[1:]
env=json.load(open(src)) or {}
before=env.get(var,'(nicht gesetzt)')
if mode=='on': env[var]='true'
else: env.pop(var,None)
json.dump({'Variables':env},open(dst,'w'))
others=sorted(k for k in env if k!=var)
print(f"{var}: {before} -> {env.get(var,'(nicht gesetzt)')}")
print(f"{len(others)} weitere Variablen bleiben unverändert (Namen: {', '.join(others)})")
PY
if [[ $DRY -eq 1 ]]; then echo "(Probelauf: nichts geändert)"; exit 0; fi
aws lambda update-function-configuration --region "$REGION" --function-name "$FN" --environment "file://$TMP/new.json" --query 'LastUpdateStatus' --output text >/dev/null
aws lambda wait function-updated --region "$REGION" --function-name "$FN"
echo "Konfiguration von \$LATEST aktualisiert. Als Nächstes: scripts/aws/deploy-backend.sh --config-only"
echo "Rückweg: scripts/aws/rollback-backend.sh"
