#!/usr/bin/env bash
# Backend (Lambda plexora-api) ausliefern: bauen, hochladen, als neue Version veröffentlichen, prüfen,
# prüfen (inkl. Speicher-Gate scripts/aws/check-storage.sh), dann den Alias "live" umstellen. Die bisherige Version wird zu "previous" (Rückweg: rollback-backend.sh).
#
#   scripts/aws/deploy-backend.sh                 testen, bauen, ausliefern
#   scripts/aws/deploy-backend.sh --skip-tests    ohne "npm test"
#   scripts/aws/deploy-backend.sh --config-only   nur geänderte Umgebungsvariablen/Konfiguration veröffentlichen
#   KEEP_VERSIONS=10                              so viele Versionen bleiben erhalten (Standard 10)
set -euo pipefail
cd "$(dirname "$0")/../.."

REGION="${AWS_REGION:-eu-central-1}"
FN="plexora-api"; ALIAS="live"; PREV="previous"
BUCKET="plexora-files"; KEY="lambda/lambda-new.zip"
KEEP="${KEEP_VERSIONS:-10}"
API="https://7hrkm580pb.execute-api.eu-central-1.amazonaws.com"
SKIP_TESTS=0; CONFIG_ONLY=0
for a in "$@"; do case "$a" in --skip-tests) SKIP_TESTS=1;; --config-only) CONFIG_ONLY=1;; esac; done

SHA="$(git rev-parse --short HEAD)"
DIRTY=""; [[ -n "$(git status --porcelain -- server app shared nuxt.config.ts package.json 2>/dev/null)" ]] && DIRTY="+uncommitted"
DESC="${SHA}${DIRTY} $(date -u +%Y-%m-%dT%H:%MZ)"
[[ -n "$DIRTY" ]] && echo "Hinweis: Es gibt uncommittete Änderungen; die Version wird als ${SHA}${DIRTY} beschriftet."

smoke() { # $1 = Qualifier, liefert den HTTP-Status der Testanfrage
  local out; out="$(mktemp)"
  aws lambda invoke --region "$REGION" --function-name "$FN" --qualifier "$1" \
    --cli-binary-format raw-in-base64-out --payload "file://scripts/aws/smoke-event.json" "$out" >/dev/null
  python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("statusCode"))' "$out"; rm -f "$out"
}
alias_ver() { aws lambda get-alias --region "$REGION" --function-name "$FN" --name "$1" --query FunctionVersion --output text; }

if [[ $CONFIG_ONLY -eq 0 ]]; then
  [[ $SKIP_TESTS -eq 1 ]] || { echo "== Tests"; npm test --silent; }
  echo "== Bauen"
  NITRO_PRESET=aws-lambda npx nuxi build >/tmp/plexora-build.log 2>&1 || { tail -20 /tmp/plexora-build.log; exit 1; }
  ZIP="$(mktemp --suffix=.zip)"
  python3 - "$ZIP" <<'PY'
import zipfile, os, sys
# Nitro legt deduplizierte Pakete als symbolische Links ab (z. B. node_modules/base64-js -> .nitro/base64-js@1.5.1).
# followlinks=True packt deren Inhalt als echte Dateien ein; ohne das fehlt das Paket auf der Lambda
# ("Cannot find module 'base64-js'" beim Laden von pdfkit).
base = '.output/server'
names = set()
with zipfile.ZipFile(sys.argv[1], 'w', zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk(base, followlinks=True):
        for f in files:
            if f.endswith('.map'): continue
            p = os.path.join(root, f); arc = os.path.relpath(p, base)
            if arc in names: continue
            names.add(arc); z.write(p, arc)
# Prüfung: jeder Link in node_modules muss im Zip mit Inhalt vorhanden sein
nm = os.path.join(base, 'node_modules')
missing = []
for entry in os.listdir(nm):
    path = os.path.join(nm, entry)
    subs = [os.path.join(path, d) for d in os.listdir(path)] if entry.startswith('@') and os.path.isdir(path) else [path]
    for sp in subs:
        if os.path.islink(sp):
            rel = os.path.relpath(sp, base)
            if not any(n.startswith(rel + '/') for n in names): missing.append(rel)
if missing:
    print('FEHLER: Links ohne Inhalt im Zip:', ', '.join(missing)); sys.exit(1)
print(f'   Zip: {len(names)} Dateien, alle node_modules-Links aufgelöst')
PY
  echo "== Hochladen (S3, versioniert)"
  VID="$(aws s3api put-object --bucket "$BUCKET" --key "$KEY" --body "$ZIP" --query VersionId --output text)"
  rm -f "$ZIP"
  echo "   S3-Version: $VID"
  echo "== Funktion aktualisieren"
  aws lambda update-function-code --region "$REGION" --function-name "$FN" --s3-bucket "$BUCKET" --s3-key "$KEY" --s3-object-version "$VID" --query LastUpdateStatus --output text >/dev/null
  aws lambda wait function-updated --region "$REGION" --function-name "$FN"
fi

echo "== Version veröffentlichen"
NEW="$(aws lambda publish-version --region "$REGION" --function-name "$FN" --description "$DESC" --query Version --output text)"
aws lambda wait published-version-active --region "$REGION" --function-name "$FN" --qualifier "$NEW"
echo "   neue Version: $NEW ($DESC)"

echo "== Vorabprüfung der neuen Version (noch nicht live)"
code="$(smoke "$NEW")"
[[ "$code" == "200" ]] || { echo "ABBRUCH: Version $NEW antwortet mit $code statt 200. Alias unverändert (live = Version $(alias_ver "$ALIAS"))."; exit 1; }

echo "== Speicher-Prüfung (check-storage.sh, nur lesend): Buckets gegen infra/storage-policy.ts"
if ! scripts/aws/check-storage.sh; then
  echo "ABBRUCH: Die Speicher-Prüfung ist fehlgeschlagen (Erklärung oben). Alias unverändert (live = Version $(alias_ver "$ALIAS"))." >&2
  echo "         Liegt es an einer gewollten Änderung, infra/storage-policy.ts mit Begründung anpassen; sonst den Zustand in AWS korrigieren (z. B. scripts/aws/secure-bucket.sh --apply)." >&2
  exit 1
fi

CUR="$(alias_ver "$ALIAS")"
echo "== Alias umstellen: $PREV -> $CUR, $ALIAS -> $NEW"
aws lambda update-alias --region "$REGION" --function-name "$FN" --name "$PREV" --function-version "$CUR" >/dev/null
aws lambda update-alias --region "$REGION" --function-name "$FN" --name "$ALIAS" --function-version "$NEW" --description "$DESC" >/dev/null

echo "== Prüfung über die öffentliche Adresse"
sleep 3
a="$(curl -s -o /dev/null -w '%{http_code}' "$API/api/settings/agb")"
d="$(curl -s -o /dev/null -w '%{http_code}' "$API/api/drafts/marketing-campaign")"
echo "   /api/settings/agb: $a (erwartet 200) · /api/drafts/marketing-campaign ohne Token: $d (erwartet 401)"
if [[ "$a" != "200" || "$d" != "401" ]]; then
  echo "FEHLER: Rolle zurück auf Version $CUR ..."
  aws lambda update-alias --region "$REGION" --function-name "$FN" --name "$ALIAS" --function-version "$CUR" >/dev/null
  exit 1
fi
echo "== Modulprüfung: jede geschützte Route ohne Token darf nicht abstürzen"
if ! python3 scripts/aws/check-route-modules.py "$API"; then
  echo "FEHLER: Rolle zurück auf Version $CUR ..."
  aws lambda update-alias --region "$REGION" --function-name "$FN" --name "$ALIAS" --function-version "$CUR" >/dev/null
  exit 1
fi

# Der Sicherungs-Worker (Lambda plexora-backup-worker, siehe setup-backup.sh) läuft mit demselben Code wie die API
WORKER="plexora-backup-worker"
if [[ $CONFIG_ONLY -eq 0 ]] && aws lambda get-function --region "$REGION" --function-name "$WORKER" >/dev/null 2>&1; then
  echo "== Sicherungs-Worker mit demselben Code aktualisieren"
  aws lambda update-function-code --region "$REGION" --function-name "$WORKER" --s3-bucket "$BUCKET" --s3-key "$KEY" --s3-object-version "$VID" --query LastUpdateStatus --output text >/dev/null
  aws lambda wait function-updated --region "$REGION" --function-name "$WORKER"
  echo "   $WORKER aktualisiert"
fi

echo "== Alte Versionen aufräumen (behalte $KEEP)"
IN_USE="$(alias_ver "$ALIAS") $(alias_ver "$PREV")"
aws lambda list-versions-by-function --region "$REGION" --function-name "$FN" --query 'Versions[?Version!=`$LATEST`].Version' --output text \
  | tr '\t' '\n' | sort -n | head -n -"$KEEP" | while read -r v; do
    [[ -z "$v" ]] && continue
    if [[ " $IN_USE " == *" $v "* ]]; then continue; fi
    aws lambda delete-function --region "$REGION" --function-name "$FN" --qualifier "$v" && echo "   Version $v gelöscht"
  done
echo "Fertig. live = Version $NEW. Rückweg: scripts/aws/rollback-backend.sh"
