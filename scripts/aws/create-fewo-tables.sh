#!/usr/bin/env bash
# Legt die DynamoDB-Tabellen für das Branchenpaket Ferienwohnungen an (plexora-fewo-units, plexora-fewo-bookings). Idempotent: mehrfach ausführbar.
#
#   scripts/aws/create-fewo-tables.sh --dry-run   zeigt nur, was passieren würde
#   scripts/aws/create-fewo-tables.sh             legt fehlende Tabellen an
#
# Schlüssel:  tenantId (HASH, = Mandant), unitId bzw. bookingId (RANGE)
# Abrechnung: On-Demand (bei geringer Nutzung praktisch kostenlos). Rückweg: aws dynamodb delete-table (enthält nur Unterkünfte/Buchungen des Pakets).
set -euo pipefail
REGION="${AWS_REGION:-eu-central-1}"
DRY=0; [[ "${1:-}" == "--dry-run" ]] && DRY=1
run() { if [[ $DRY -eq 1 ]]; then echo "[dry-run] $*"; else "$@"; fi; }
make() { # $1 = Tabelle, $2 = Bereichsschlüssel
  if aws dynamodb describe-table --region "$REGION" --table-name "$1" >/dev/null 2>&1; then echo "Tabelle $1 existiert bereits."; return; fi
  echo "Lege Tabelle $1 an ($REGION) ..."
  run aws dynamodb create-table --region "$REGION" --table-name "$1" \
    --attribute-definitions AttributeName=tenantId,AttributeType=S AttributeName="$2",AttributeType=S \
    --key-schema AttributeName=tenantId,KeyType=HASH AttributeName="$2",KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST --tags Key=app,Value=plexora Key=purpose,Value=fewo \
    --query 'TableDescription.TableStatus' --output text
  [[ $DRY -eq 1 ]] || aws dynamodb wait table-exists --region "$REGION" --table-name "$1"
}
make plexora-fewo-units unitId
make plexora-fewo-bookings bookingId
echo "Fertig."
