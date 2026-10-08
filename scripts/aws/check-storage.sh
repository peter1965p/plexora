#!/usr/bin/env bash
# Speicher-Gate (nur lesend). Vergleicht den echten Zustand aller S3-Buckets mit infra/storage-policy.ts und prüft per HTTP,
# dass Privates 403 liefert, das Auflisten 403 liefert und die deklarierten öffentlichen Präfixe 200 liefern.
#
#   scripts/aws/check-storage.sh              volle Prüfung (Konfiguration + HTTP)
#   scripts/aws/check-storage.sh --http-only  nur HTTP (wird von check-public-flows.sh aufgerufen)
#   scripts/aws/check-storage.sh --no-http    nur Konfiguration
#
# deploy-backend.sh ruft es VOR dem Alias-Wechsel auf: bei Abweichung bleibt der Alias unverändert und der Deploy bricht ab.
# Grenze: Das Gate sieht nur den Zustand zum Zeitpunkt des Aufrufs – spätere Änderungen in der Konsole bemerkt erst der nächste Lauf.
# Erwartete Rechte von plexora-app: s3:ListAllMyBuckets, s3:GetBucket*/GetEncryptionConfiguration/GetLifecycleConfiguration/GetBucketPolicy/GetBucketPublicAccessBlock/ListBucket, s3:GetAccountPublicAccessBlock.
set -uo pipefail
cd "$(dirname "$0")/../.."
major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"; minor="$(node -p 'process.versions.node.split(".")[1]' 2>/dev/null || echo 0)"
if [[ "$major" -lt 22 || ( "$major" -eq 22 && "$minor" -lt 18 ) ]]; then echo "FEHLER: Node 22.18 oder neuer wird gebraucht (führt TypeScript direkt aus). Gefunden: $(node --version 2>/dev/null || echo keins)" >&2; exit 2; fi
exec node scripts/aws/check-storage.mjs "$@"
