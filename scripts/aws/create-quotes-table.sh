#!/usr/bin/env bash
# Legt die DynamoDB-Tabelle plexora-quotes (Angebote) an. Idempotent: mehrfach ausführbar.
#
#   scripts/aws/create-quotes-table.sh --dry-run   zeigt nur, was passieren würde
#   scripts/aws/create-quotes-table.sh             legt die Tabelle an, falls nötig
#
# Schlüssel:  userId (HASH, = Mandant wie bei plexora-finance), quoteId (RANGE)
# Abrechnung: On-Demand (kostet bei geringer Nutzung praktisch nichts). Rückweg: Tabelle löschen (aws dynamodb delete-table), sie enthält nur Angebote.
set -euo pipefail
REGION="${AWS_REGION:-eu-central-1}"; TABLE="plexora-quotes"
DRY=0; [[ "${1:-}" == "--dry-run" ]] && DRY=1
run() { if [[ $DRY -eq 1 ]]; then echo "[dry-run] $*"; else "$@"; fi; }
if aws dynamodb describe-table --region "$REGION" --table-name "$TABLE" >/dev/null 2>&1; then
  echo "Tabelle $TABLE existiert bereits."
else
  echo "Lege Tabelle $TABLE an ($REGION) ..."
  run aws dynamodb create-table --region "$REGION" --table-name "$TABLE" \
    --attribute-definitions AttributeName=userId,AttributeType=S AttributeName=quoteId,AttributeType=S \
    --key-schema AttributeName=userId,KeyType=HASH AttributeName=quoteId,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --tags Key=app,Value=plexora Key=purpose,Value=quotes \
    --query 'TableDescription.TableStatus' --output text
  [[ $DRY -eq 1 ]] || aws dynamodb wait table-exists --region "$REGION" --table-name "$TABLE"
fi
echo "Fertig."
