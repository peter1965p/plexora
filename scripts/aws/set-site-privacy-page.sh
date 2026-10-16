#!/usr/bin/env bash
# Ersetzt den Inhalt der Seite "datenschutz" einer Nexora-Webseite durch eine HTML-Datei. Legt vorher eine Sicherung des alten Textes ab.
#
#   scripts/aws/set-site-privacy-page.sh <mandant> <datei.html> --dry-run   zeigt nur Größen und Überschriften (nichts wird geändert)
#   scripts/aws/set-site-privacy-page.sh <mandant> <datei.html> --apply     schreibt den neuen Text (Sicherung unter ~/Dev/backups/plexora/)
#
# Veröffentlicht einen Rechtstext: nur nach deiner Freigabe ausführen. HTML-Kommentare in der Datei (<!-- ... -->) bleiben erhalten, sind aber unsichtbar.
set -euo pipefail
REGION="${AWS_REGION:-eu-central-1}"; TENANT="${1:-}"; FILE="${2:-}"; MODE="${3:---dry-run}"
[[ -n "$TENANT" && -f "$FILE" ]] || { echo "Aufruf: $0 <mandant> <datei.html> [--dry-run|--apply]"; exit 2; }
[[ "$MODE" == "--dry-run" || "$MODE" == "--apply" ]] || { echo "Aufruf: $0 <mandant> <datei.html> [--dry-run|--apply]"; exit 2; }
TMP="$(mktemp)"; trap 'rm -f "$TMP" "$TMP.upd"' EXIT
aws dynamodb get-item --region "$REGION" --table-name plexora-nexora --key "{\"tenantId\":{\"S\":\"$TENANT\"}}" --projection-expression pages --output json > "$TMP"
python3 - "$TMP" "$FILE" "$MODE" "$TMP.upd" <<'PY'
import json, re, sys
src, file, mode, out = sys.argv[1:5]
pages = json.load(open(src))["Item"]["pages"]["L"]
idx = next((i for i, p in enumerate(pages) if p["M"]["slug"]["S"] == "datenschutz"), None)
if idx is None: sys.exit("Keine Seite mit dem Kürzel 'datenschutz' gefunden.")
old = pages[idx]["M"]["content"]["S"]; new = open(file, encoding="utf-8").read()
head = lambda t: [re.sub("<[^>]+>", "", h).strip() for h in re.findall(r"<h[12][^>]*>(.*?)</h[12]>", t, flags=re.S)]
print(f"Seite 'datenschutz' (Position {idx}), Typ {pages[idx]['M'].get('contentType', {}).get('S')}")
print(f"  alt: {len(old)} Zeichen, Überschriften: {head(old)}")
print(f"  neu: {len(new)} Zeichen, Überschriften: {head(new)}")
if pages[idx]["M"].get("contentType", {}).get("S") != "html": sys.exit("Die Seite ist nicht im HTML-Modus; Abbruch.")
json.dump({"idx": idx, "new": new, "old": old}, open(out, "w"))
PY
[[ "$MODE" == "--dry-run" ]] && { echo "(Probelauf: nichts geändert)"; exit 0; }
IDX="$(python3 -c "import json,sys; print(json.load(open('$TMP.upd'))['idx'])")"
BK="$HOME/Dev/backups/plexora"; mkdir -p "$BK"; chmod 700 "$BK"
python3 -c "import json; open('$BK/datenschutz-alt-$(date +%Y%m%dT%H%M%S).html','w').write(json.load(open('$TMP.upd'))['old'])"
python3 -c "import json; print(json.dumps({':c': {'S': json.load(open('$TMP.upd'))['new']}, ':s': {'S': 'datenschutz'}}))" > "$TMP.vals"
aws dynamodb update-item --region "$REGION" --table-name plexora-nexora --key "{\"tenantId\":{\"S\":\"$TENANT\"}}" \
  --update-expression "SET pages[$IDX].content = :c" --condition-expression "pages[$IDX].slug = :s" --expression-attribute-values "file://$TMP.vals"
rm -f "$TMP.vals"; echo "Geschrieben. Die alte Fassung liegt in $BK."
