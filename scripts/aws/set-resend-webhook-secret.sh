#!/usr/bin/env bash
# Trägt das Signing-Secret des Resend-Webhooks (whsec_…) als Umgebungsvariable NUXT_RESEND_WEBHOOK_SECRET in die Lambda plexora-api ($LATEST) ein.
# Du findest es im Resend-Dashboard: Webhooks -> dein Endpunkt -> "Signing Secret".
#
#   scripts/aws/set-resend-webhook-secret.sh             fragt nach dem Secret (verdeckte Eingabe, nichts wird angezeigt) und setzt es
#   scripts/aws/set-resend-webhook-secret.sh status      zeigt nur, OB es gesetzt ist (nie den Wert)
#   scripts/aws/set-resend-webhook-secret.sh --dry-run   prüft Eingabe und Ablauf, ändert nichts
#   scripts/aws/set-resend-webhook-secret.sh remove      entfernt die Variable wieder (dann lehnt der Webhook ALLES ab)
#
# Danach wirksam machen: scripts/aws/deploy-backend.sh --config-only
# Sicherheit: Das Secret steht nie in einem Argument (also nicht in der Prozessliste), nie in der Shell-Historie und wird nie ausgegeben (höchstens die ersten 4 Zeichen und die Länge).
# Es liegt nur kurz in einer Datei mit Rechten 600 und wird danach überschrieben und gelöscht. Alle anderen Variablen bleiben unverändert (nur ihre Namen werden genannt).
# Ohne Terminal (Pipe) wird eine Zeile von der Standardeingabe gelesen, so lässt sich das Secret auch aus einem Passwort-Manager übergeben.
set -euo pipefail
REGION="${AWS_REGION:-eu-central-1}"; FN="plexora-api"; VAR="NUXT_RESEND_WEBHOOK_SECRET"
MODE="set"; DRY=0
for a in "$@"; do case "$a" in status) MODE=status;; remove) MODE=remove;; --dry-run) DRY=1;; *) echo "Aufruf: $0 [status|remove] [--dry-run]" >&2; exit 2;; esac; done
umask 077
TMP="$(mktemp -d)"; scrub() { [[ -f "$TMP/new.json" ]] && shred -u "$TMP/new.json" 2>/dev/null; rm -rf "$TMP"; unset SECRET PLX_SECRET; }; trap scrub EXIT

aws lambda get-function-configuration --region "$REGION" --function-name "$FN" --query 'Environment.Variables' --output json > "$TMP/env.json"
IS_SET="$(python3 -c 'import json,sys; print("ja" if json.load(open(sys.argv[1])).get(sys.argv[2]) else "nein")' "$TMP/env.json" "$VAR")"
if [[ "$MODE" == status ]]; then echo "$VAR gesetzt: $IS_SET"; exit 0; fi

if [[ "$MODE" == set ]]; then
  if [[ -t 0 ]]; then read -r -s -p "Resend Signing Secret (whsec_…, die Eingabe bleibt unsichtbar): " SECRET; echo
  else IFS= read -r SECRET || true; fi
  SECRET="${SECRET//$'\r'/}"; SECRET="${SECRET#"${SECRET%%[![:space:]]*}"}"; SECRET="${SECRET%"${SECRET##*[![:space:]]}"}"
  [[ "$SECRET" =~ ^whsec_[A-Za-z0-9+/]{20,}={0,2}$ ]] || { echo "Das sieht nicht wie ein Resend/Svix-Secret aus (erwartet: whsec_ gefolgt von Base64, mindestens 20 Zeichen). Es wurde nichts geändert." >&2; exit 1; }
  echo "Eingabe gelesen: ${SECRET:0:4}…, Länge ${#SECRET} (nicht weiter angezeigt)"
fi

PLX_SECRET="${SECRET:-}" python3 - "$TMP/env.json" "$TMP/new.json" "$MODE" "$VAR" <<'PY'
import json, os, sys
src, dst, mode, var = sys.argv[1:]
env = json.load(open(src)) or {}
before = var in env
if mode == 'set': env[var] = os.environ['PLX_SECRET']
else: env.pop(var, None)
json.dump({'Variables': env}, open(dst, 'w'))
others = sorted(k for k in env if k != var)
print(f"{var}: {'gesetzt' if before else 'nicht gesetzt'} -> {'gesetzt' if var in env else 'nicht gesetzt'}")
print(f"{len(others)} weitere Variablen bleiben unverändert (Namen: {', '.join(others)})")
PY
if [[ $DRY -eq 1 ]]; then echo "(Probelauf: nichts geändert)"; exit 0; fi
aws lambda update-function-configuration --region "$REGION" --function-name "$FN" --environment "file://$TMP/new.json" --query LastUpdateStatus --output text >/dev/null
aws lambda wait function-updated --region "$REGION" --function-name "$FN"
echo "Gespeichert. Jetzt wirksam machen: scripts/aws/deploy-backend.sh --config-only"
echo "Danach in Resend einen Test senden (Webhooks -> Endpunkt -> Send test event): die Antwort muss 200 sein."
