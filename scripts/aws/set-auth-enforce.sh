#!/usr/bin/env bash
# Schaltet NUXT_AUTH_ENFORCE in der Konfiguration der Lambda plexora-api ($LATEST) um.
# Die Middleware lehnt dann jede Route ohne gültiges Token mit 401 ab, außer den begründeten öffentlichen Routen
# (server/utils/routePolicy.ts). Ungültige/abgelaufene Tokens führen dadurch nie mehr still auf einen Demo-Nutzer.
#
#   scripts/aws/set-auth-enforce.sh status            zeigt den aktuellen Wert (nur dieser, sonst nichts aus der Umgebung)
#   scripts/aws/set-auth-enforce.sh on  [--dry-run]   setzt NUXT_AUTH_ENFORCE=true
#   scripts/aws/set-auth-enforce.sh off [--dry-run]   entfernt den Schalter wieder
#
# Danach wirksam machen (neue Version + Alias): scripts/aws/deploy-backend.sh --config-only
# RÜCKWEG in einem Satz: scripts/aws/rollback-backend.sh (Alias-Wechsel auf die vorige Version, deren Konfiguration den Schalter nicht enthält);
# danach optional "set-auth-enforce.sh off" und "deploy-backend.sh --config-only", damit auch $LATEST wieder ohne Schalter ist.
# Werte anderer Umgebungsvariablen werden nie ausgegeben.
set -euo pipefail
REGION="${AWS_REGION:-eu-central-1}"; FN="plexora-api"
MODE="${1:-status}"; DRY=0; [[ "${2:-}" == "--dry-run" ]] && DRY=1
umask 077
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

aws lambda get-function-configuration --region "$REGION" --function-name "$FN" --query 'Environment.Variables' --output json > "$TMP/env.json"
CUR="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("NUXT_AUTH_ENFORCE","(nicht gesetzt)"))' "$TMP/env.json")"

case "$MODE" in
  status) echo "NUXT_AUTH_ENFORCE = $CUR"; exit 0 ;;
  on|off) ;;
  *) echo "Aufruf: $0 status|on|off [--dry-run]"; exit 2 ;;
esac

python3 - "$TMP/env.json" "$TMP/new.json" "$MODE" <<'PY'
import json,sys
src,dst,mode=sys.argv[1:]
env=json.load(open(src))
if mode=='on': env['NUXT_AUTH_ENFORCE']='true'
else: env.pop('NUXT_AUTH_ENFORCE',None)
json.dump({'Variables':env},open(dst,'w'))
others=sorted(k for k in env if k!='NUXT_AUTH_ENFORCE')
print(f"NUXT_AUTH_ENFORCE: {json.load(open(src)).get('NUXT_AUTH_ENFORCE','(nicht gesetzt)')} -> {env.get('NUXT_AUTH_ENFORCE','(nicht gesetzt)')}")
print(f"{len(others)} weitere Variablen bleiben unverändert (Namen: {', '.join(others)})")
PY
if [[ $DRY -eq 1 ]]; then echo "(Probelauf: nichts geändert)"; exit 0; fi
aws lambda update-function-configuration --region "$REGION" --function-name "$FN" --environment "file://$TMP/new.json" --query 'LastUpdateStatus' --output text >/dev/null
aws lambda wait function-updated --region "$REGION" --function-name "$FN"
echo "Konfiguration von \$LATEST aktualisiert. Als Nächstes: scripts/aws/deploy-backend.sh --config-only"
echo "Rückweg: scripts/aws/rollback-backend.sh"
