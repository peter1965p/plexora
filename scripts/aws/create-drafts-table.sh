#!/usr/bin/env bash
# Legt die DynamoDB-Tabelle plexora-drafts samt TTL an. Idempotent: mehrfach ausführbar.
#
#   scripts/aws/create-drafts-table.sh --dry-run   zeigt nur, was passieren würde
#   scripts/aws/create-drafts-table.sh             legt Tabelle und TTL an, falls nötig
#
# Schlüssel:  owner (HASH) = "<Tenant-Scope>#<Nutzer-ID>", formType (RANGE)
# TTL-Feld:   expiresAt (Unix-Sekunden, 30 Tage nach dem letzten Speichern)
# Abrechnung: On-Demand (kostet bei geringer Nutzung praktisch nichts)
set -euo pipefail

REGION="${AWS_REGION:-eu-central-1}"
TABLE="plexora-drafts"
DRY=0; [[ "${1:-}" == "--dry-run" ]] && DRY=1

run() { if [[ $DRY -eq 1 ]]; then echo "[dry-run] $*"; else "$@"; fi; }

if aws dynamodb describe-table --region "$REGION" --table-name "$TABLE" >/dev/null 2>&1; then
  echo "Tabelle $TABLE existiert bereits."
else
  echo "Lege Tabelle $TABLE an ($REGION) ..."
  run aws dynamodb create-table --region "$REGION" --table-name "$TABLE" \
    --attribute-definitions AttributeName=owner,AttributeType=S AttributeName=formType,AttributeType=S \
    --key-schema AttributeName=owner,KeyType=HASH AttributeName=formType,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --tags Key=app,Value=plexora Key=purpose,Value=form-drafts \
    --query 'TableDescription.TableStatus' --output text
  [[ $DRY -eq 1 ]] || aws dynamodb wait table-exists --region "$REGION" --table-name "$TABLE"
fi

TTL_STATUS=$(aws dynamodb describe-time-to-live --region "$REGION" --table-name "$TABLE" \
  --query 'TimeToLiveDescription.TimeToLiveStatus' --output text 2>/dev/null || echo "TABLE_MISSING")
if [[ "$TTL_STATUS" == "ENABLED" || "$TTL_STATUS" == "ENABLING" ]]; then
  echo "TTL ist bereits aktiv ($TTL_STATUS)."
else
  echo "Aktiviere TTL auf expiresAt ..."
  run aws dynamodb update-time-to-live --region "$REGION" --table-name "$TABLE" \
    --time-to-live-specification Enabled=true,AttributeName=expiresAt
fi
echo "Fertig."
