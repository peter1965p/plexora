#!/usr/bin/env bash
# Schränkt die öffentliche Leseberechtigung des Buckets plexora-files auf die gewollten Bild-Präfixe ein.
# Bisher erlaubt die Bucket-Policy JEDEM das Lesen von plexora-files/* – auch lambda/ und lambda-deploy/ (Deploy-Zips mit dem Backend-Quelltext).
#
#   scripts/aws/secure-bucket.sh --dry-run     zeigt Ist-Zustand, neue Policy und neue Block-Public-Access-Einstellungen, ändert nichts
#   scripts/aws/secure-bucket.sh --apply       sichert den Ist-Zustand lokal, setzt Policy + Einstellungen und prüft per HTTP
#   scripts/aws/secure-bucket.sh --rollback    stellt die zuletzt gesicherte Policy/Einstellung wieder her
#
# Öffentlich (nur Lesen einzelner Objekte, kein Auflisten): die Präfixe in PUBLIC_PREFIXES unten. Alles andere ist privat.
# Neues öffentliches Präfix = hier eintragen UND scripts/aws/check-public-flows.sh ergänzen (der Test s3-upload.test.ts erzwingt dieselbe Liste).
set -euo pipefail
BUCKET="plexora-files"; REGION="eu-central-1"
PUBLIC_PREFIXES=(automotive avatars blog branding campaigns marketing newsletter nexora plugins products public termine)
PRIVATE_EXAMPLES=("lambda/lambda-new.zip" "lambda-deploy/lambda-new.zip")
MODE="${1:---dry-run}"
SAVE_DIR="/home/peter/Dev/backups/plexora/bucket"; STAMP="$(date +%Y%m%d-%H%M%S)"
umask 077

new_policy() {
  python3 - "$BUCKET" "${PUBLIC_PREFIXES[@]}" <<'PY'
import json,sys
b,prefixes=sys.argv[1],sys.argv[2:]
print(json.dumps({"Version":"2012-10-17","Statement":[{"Sid":"OeffentlichLesbareBildPraefixe","Effect":"Allow","Principal":"*","Action":"s3:GetObject","Resource":[f"arn:aws:s3:::{b}/{p}/*" for p in prefixes]}]}, indent=1))
PY
}
current_policy() { aws s3api get-bucket-policy --bucket "$BUCKET" --query Policy --output text 2>/dev/null || echo '{}'; }
current_bpa()    { aws s3api get-public-access-block --bucket "$BUCKET" --output json 2>/dev/null || echo '{}'; }
http() { curl -s -o /dev/null -I -m 20 -w '%{http_code}' "https://$BUCKET.s3.$REGION.amazonaws.com/$1"; }

# Block Public Access: Mit einer öffentlichen Policy dürfen BlockPublicPolicy/RestrictPublicBuckets nicht an sein.
# ACLs werden nicht genutzt (BucketOwnerEnforced) -> BlockPublicAcls/IgnorePublicAcls dürfen an sein.
BPA_NEW='BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false'

case "$MODE" in
  --dry-run)
    echo "== Ist-Zustand"; echo "Policy:"; current_policy | python3 -m json.tool 2>/dev/null | sed 's/^/  /' || true
    echo "Block Public Access: $(current_bpa | python3 -c 'import json,sys; d=json.load(sys.stdin).get("PublicAccessBlockConfiguration",{}); print(d or "(nicht gesetzt)")')"
    echo; echo "== Neue Policy (nur Lesen einzelner Objekte dieser Präfixe):"; new_policy | sed 's/^/  /'
    echo; echo "== Neue Block-Public-Access-Einstellung: $BPA_NEW"
    echo; echo "== Aktuell per HTTP erreichbar (nur Status): "
    for k in "${PRIVATE_EXAMPLES[@]}"; do echo "  $k: $(http "$k")  (Ziel nach --apply: 403)"; done
    echo; echo "(Probelauf: nichts geändert)";;
  --apply)
    mkdir -p "$SAVE_DIR"; chmod 700 "$SAVE_DIR"
    current_policy > "$SAVE_DIR/policy-$STAMP.json"; current_bpa > "$SAVE_DIR/bpa-$STAMP.json"
    echo "Ist-Zustand gesichert: $SAVE_DIR/policy-$STAMP.json und bpa-$STAMP.json"
    new_policy > "$SAVE_DIR/policy-neu-$STAMP.json"
    aws s3api put-bucket-policy --bucket "$BUCKET" --policy "file://$SAVE_DIR/policy-neu-$STAMP.json"
    aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration "$BPA_NEW"
    echo "Policy und Block Public Access gesetzt. Prüfung per HTTP:"
    sleep 3; FAIL=0
    for k in "${PRIVATE_EXAMPLES[@]}"; do c="$(http "$k")"; [[ "$c" == "403" ]] && echo "  OK   $k -> 403" || { echo "  FEHLER $k -> $c (erwartet 403)"; FAIL=1; }; done
    for p in "${PUBLIC_PREFIXES[@]}"; do
      k="$(aws s3api list-objects-v2 --bucket "$BUCKET" --prefix "$p/" --max-items 1 --query 'Contents[0].Key' --output text 2>/dev/null || true)"
      [[ -z "$k" || "$k" == "None" ]] && { echo "  --   $p/: keine Objekte zum Testen"; continue; }
      c="$(http "$k")"; [[ "$c" == "200" ]] && echo "  OK   $p/… -> 200" || { echo "  FEHLER $p/… -> $c (erwartet 200)"; FAIL=1; }
    done
    [[ $FAIL -eq 0 ]] && echo "Fertig. Rückweg: $0 --rollback" || { echo "Es gab Fehler. Rückweg: $0 --rollback"; exit 1; };;
  --rollback)
    P="$(ls -1t "$SAVE_DIR"/policy-2*.json 2>/dev/null | grep -v neu | head -1 || true)"; B="$(ls -1t "$SAVE_DIR"/bpa-*.json 2>/dev/null | head -1 || true)"
    [[ -n "$P" ]] || { echo "Keine gesicherte Policy gefunden in $SAVE_DIR"; exit 1; }
    aws s3api put-bucket-policy --bucket "$BUCKET" --policy "file://$P"
    if [[ -n "$B" ]] && python3 -c 'import json,sys; sys.exit(0 if json.load(open(sys.argv[1])).get("PublicAccessBlockConfiguration") else 1)' "$B"; then
      CFG="$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1]))["PublicAccessBlockConfiguration"]; print(",".join(f"{k}={str(v).lower()}" for k,v in d.items()))' "$B")"
      aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration "$CFG"
    fi
    echo "Zurückgesetzt auf $P";;
  *) echo "Aufruf: $0 --dry-run | --apply | --rollback"; exit 2;;
esac
