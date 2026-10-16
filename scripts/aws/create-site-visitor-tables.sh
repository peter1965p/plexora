#!/usr/bin/env bash
# Legt die Tabellen für Besucher-Konten und Blog-Kommentare an (plexora-site-visitors, plexora-blog-comments). Idempotent.
#
#   scripts/aws/create-site-visitor-tables.sh --dry-run   zeigt nur, was passieren würde
#   scripts/aws/create-site-visitor-tables.sh             legt fehlende Tabellen an und schaltet die TTL (Ablauf) für plexora-site-visitors ein
#
# plexora-site-visitors: tenantId (HASH), sk (RANGE); TTL-Attribut "ttl" (Sitzungen und Einmal-Links laufen automatisch ab)
# plexora-blog-comments: tenantId (HASH), commentId (RANGE)
# Abrechnung On-Demand. Rückweg: aws dynamodb delete-table (die Tabellen enthalten nur Besucher-Konten bzw. Kommentare).
set -euo pipefail
REGION="${AWS_REGION:-eu-central-1}"
DRY=0; [[ "${1:-}" == "--dry-run" ]] && DRY=1
run() { if [[ $DRY -eq 1 ]]; then echo "[dry-run] $*"; else "$@"; fi; }
make() { # $1 Tabelle, $2 Bereichsschlüssel
  if aws dynamodb describe-table --region "$REGION" --table-name "$1" >/dev/null 2>&1; then echo "Tabelle $1 existiert bereits."; return; fi
  echo "Lege Tabelle $1 an ($REGION) ..."
  run aws dynamodb create-table --region "$REGION" --table-name "$1" \
    --attribute-definitions AttributeName=tenantId,AttributeType=S AttributeName="$2",AttributeType=S \
    --key-schema AttributeName=tenantId,KeyType=HASH AttributeName="$2",KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST --tags Key=app,Value=plexora Key=purpose,Value=site-visitors \
    --query 'TableDescription.TableStatus' --output text
  [[ $DRY -eq 1 ]] || aws dynamodb wait table-exists --region "$REGION" --table-name "$1"
}
make plexora-site-visitors sk
make plexora-blog-comments commentId
echo "Schalte TTL für plexora-site-visitors ein ..."
run aws dynamodb update-time-to-live --region "$REGION" --table-name plexora-site-visitors --time-to-live-specification Enabled=true,AttributeName=ttl >/dev/null 2>&1 || echo "(TTL war schon eingeschaltet oder wird gerade umgestellt)"
echo "Fertig."
