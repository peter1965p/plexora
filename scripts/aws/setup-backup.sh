#!/usr/bin/env bash
# Richtet die Infrastruktur für den Tab "Sicherung" ein (wiederholbar, ändert nur Fehlendes):
#   1. privater Bucket plexora-backups-<Konto-ID> (Block Public Access komplett, SSE-S3, nur HTTPS, KEINE Versionierung, Ablauf nach 7 Tagen)
#   2. Tabelle plexora-backup-jobs (Aufträge, TTL auf expiresAt = 7 Tage)
#   3. IAM-Rolle plexora-backup-worker-role: Lesen aller plexora-*-Tabellen, Schreiben nur in plexora-backup-jobs, Schreiben NUR in den Backup-Bucket,
#      Lesen (nur lesen) im Dateien-Bucket plexora-files. Kein AmazonS3FullAccess, kein DynamoDB-Vollzugriff.
#   4. Lambda plexora-backup-worker (derselbe Code wie plexora-api, 900 s, 1536 MB), wird vom Deploy-Skript mit aktualisiert
#   5. plexora-api bekommt NUXT_BACKUP_BUCKET und NUXT_BACKUP_WORKER_FUNCTION sowie das Recht, den Worker aufzurufen
#
#   scripts/aws/setup-backup.sh --dry-run     zeigt alles, ändert nichts
#   scripts/aws/setup-backup.sh --apply       legt an / ergänzt
#   scripts/aws/setup-backup.sh --remove      entfernt Worker, Rolle und Tabelle (Bucket nur, wenn leer)
# Danach: scripts/aws/deploy-backend.sh --config-only (macht die neuen Umgebungsvariablen von plexora-api wirksam).
# Es werden nie Secret-Werte ausgegeben (nur Namen).
set -euo pipefail
REGION="${AWS_REGION:-eu-central-1}"; MODE="${1:---dry-run}"
ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
BUCKET="plexora-backups-$ACCOUNT"; SRC_BUCKET="plexora-files"; TABLE="plexora-backup-jobs"
ROLE="plexora-backup-worker-role"; FN="plexora-backup-worker"; API_FN="plexora-api"; API_ROLE="plexora-lambda-role"
umask 077; TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
say() { printf '%s\n' "$*"; }
act() { if [[ "$MODE" == "--apply" ]]; then "$@"; else say "   (würde ausführen) ${*:1:4} …"; fi; }

exists_bucket() { aws s3api head-bucket --bucket "$BUCKET" >/dev/null 2>&1; }
exists_table()  { aws dynamodb describe-table --region "$REGION" --table-name "$TABLE" >/dev/null 2>&1; }
exists_role()   { aws iam get-role --role-name "$ROLE" >/dev/null 2>&1; }
exists_fn()     { aws lambda get-function --region "$REGION" --function-name "$FN" >/dev/null 2>&1; }

lifecycle_json() { cat <<'JSON'
{"Rules":[{"ID":"sicherungen-nach-7-tagen-loeschen","Status":"Enabled","Filter":{"Prefix":"jobs/"},"Expiration":{"Days":7},"AbortIncompleteMultipartUpload":{"DaysAfterInitiation":1}}]}
JSON
}
bucket_policy_json() { cat <<JSON
{"Version":"2012-10-17","Statement":[{"Sid":"NurHTTPS","Effect":"Deny","Principal":"*","Action":"s3:*","Resource":["arn:aws:s3:::$BUCKET","arn:aws:s3:::$BUCKET/*"],"Condition":{"Bool":{"aws:SecureTransport":"false"}}}]}
JSON
}
trust_json() { cat <<'JSON'
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}
JSON
}
worker_policy_json() { cat <<JSON
{"Version":"2012-10-17","Statement":[
 {"Sid":"TabellenLesen","Effect":"Allow","Action":["dynamodb:Scan","dynamodb:DescribeTable"],"Resource":"arn:aws:dynamodb:$REGION:$ACCOUNT:table/plexora-*"},
 {"Sid":"AuftraegeSchreiben","Effect":"Allow","Action":["dynamodb:GetItem","dynamodb:UpdateItem","dynamodb:PutItem","dynamodb:Query"],"Resource":"arn:aws:dynamodb:$REGION:$ACCOUNT:table/$TABLE"},
 {"Sid":"NurBackupBucketSchreiben","Effect":"Allow","Action":["s3:PutObject"],"Resource":"arn:aws:s3:::$BUCKET/jobs/*"},
 {"Sid":"DateienNurLesen","Effect":"Allow","Action":["s3:GetObject"],"Resource":"arn:aws:s3:::$SRC_BUCKET/*"},
 {"Sid":"DateienAuflisten","Effect":"Allow","Action":["s3:ListBucket"],"Resource":"arn:aws:s3:::$SRC_BUCKET"}
]}
JSON
}
api_policy_json() { cat <<JSON
{"Version":"2012-10-17","Statement":[
 {"Sid":"SicherungsWorkerStarten","Effect":"Allow","Action":"lambda:InvokeFunction","Resource":"arn:aws:lambda:$REGION:$ACCOUNT:function:$FN"},
 {"Sid":"SicherungenHerunterladenUndLoeschen","Effect":"Allow","Action":["s3:GetObject","s3:DeleteObject"],"Resource":"arn:aws:s3:::$BUCKET/jobs/*"}
]}
JSON
}

if [[ "$MODE" == "--remove" ]]; then
  say "== Entfernen"
  exists_fn && aws lambda delete-function --region "$REGION" --function-name "$FN" && say "   Lambda $FN gelöscht"
  aws iam delete-role-policy --role-name "$ROLE" --policy-name plexora-backup-worker >/dev/null 2>&1 || true
  aws iam detach-role-policy --role-name "$ROLE" --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole >/dev/null 2>&1 || true
  exists_role && aws iam delete-role --role-name "$ROLE" && say "   Rolle $ROLE gelöscht"
  aws iam delete-role-policy --role-name "$API_ROLE" --policy-name plexora-backup-api >/dev/null 2>&1 || true
  exists_table && aws dynamodb delete-table --region "$REGION" --table-name "$TABLE" >/dev/null && say "   Tabelle $TABLE gelöscht"
  say "   Bucket $BUCKET bleibt bestehen (zum Löschen: aws s3 rb s3://$BUCKET, nur wenn leer). Umgebungsvariablen von $API_FN bei Bedarf manuell entfernen."
  exit 0
fi
[[ "$MODE" == "--dry-run" || "$MODE" == "--apply" ]] || { say "Aufruf: $0 --dry-run | --apply | --remove"; exit 2; }
say "== Modus: ${MODE#--}   Konto-ID wird zur Laufzeit ermittelt, Bucket: $BUCKET"

say; say "1. Privater Bucket $BUCKET"
if exists_bucket; then say "   existiert bereits (Einstellungen werden erneut gesetzt)"; else act aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" --create-bucket-configuration "LocationConstraint=$REGION"; fi
lifecycle_json > "$TMP/lc.json"; bucket_policy_json > "$TMP/bp.json"
if [[ "$MODE" == "--apply" ]] || exists_bucket; then :; fi
say "   Block Public Access: komplett an | Verschlüsselung: AES256 | Ablauf: jobs/ nach 7 Tagen | Versionierung: bewusst AUS | nur HTTPS"
act aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
act aws s3api put-bucket-encryption --bucket "$BUCKET" --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":true}]}'
act aws s3api put-bucket-lifecycle-configuration --bucket "$BUCKET" --lifecycle-configuration "file://$TMP/lc.json"
act aws s3api put-bucket-policy --bucket "$BUCKET" --policy "file://$TMP/bp.json"

say; say "2. Tabelle $TABLE (Schlüssel owner + jobId, On-Demand, TTL expiresAt)"
if exists_table; then say "   existiert bereits"; else
  act aws dynamodb create-table --region "$REGION" --table-name "$TABLE" --attribute-definitions AttributeName=owner,AttributeType=S AttributeName=jobId,AttributeType=S --key-schema AttributeName=owner,KeyType=HASH AttributeName=jobId,KeyType=RANGE --billing-mode PAY_PER_REQUEST
  [[ "$MODE" == "--apply" ]] && aws dynamodb wait table-exists --region "$REGION" --table-name "$TABLE"
fi
act aws dynamodb update-time-to-live --region "$REGION" --table-name "$TABLE" --time-to-live-specification Enabled=true,AttributeName=expiresAt || true

say; say "3. IAM-Rolle $ROLE (eigene Rechte, kein AmazonS3FullAccess)"
trust_json > "$TMP/trust.json"; worker_policy_json > "$TMP/worker.json"; api_policy_json > "$TMP/api.json"
say "   Rechte des Workers:"; python3 -c "
import json,sys
for s in json.load(open(sys.argv[1]))['Statement']: print('    -',s['Sid'],':',','.join(s['Action']),'auf',s['Resource'])" "$TMP/worker.json"
if exists_role; then say "   Rolle existiert bereits (Richtlinie wird aktualisiert)"; else act aws iam create-role --role-name "$ROLE" --assume-role-policy-document "file://$TMP/trust.json"; fi
act aws iam attach-role-policy --role-name "$ROLE" --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
act aws iam put-role-policy --role-name "$ROLE" --policy-name plexora-backup-worker --policy-document "file://$TMP/worker.json"
say "   $API_ROLE bekommt zusätzlich: Worker aufrufen, Sicherungen aus dem Backup-Bucket lesen (Download-Link) und löschen"
act aws iam put-role-policy --role-name "$API_ROLE" --policy-name plexora-backup-api --policy-document "file://$TMP/api.json"

say; say "4. Lambda $FN"
if exists_fn; then say "   existiert bereits (Code aktualisiert das Deploy-Skript)"; else
  HANDLER="$(aws lambda get-function-configuration --region "$REGION" --function-name "$API_FN" --query Handler --output text)"
  SECRET="$(aws lambda get-function-configuration --region "$REGION" --function-name "$API_FN" --query 'Environment.Variables.NUXT_NEWSLETTER_CRON_SECRET' --output text)"
  python3 - "$TMP/env.json" "$BUCKET" "$SECRET" <<'PY'
import json,sys
json.dump({"Variables":{"NUXT_BACKUP_BUCKET":sys.argv[2],"NUXT_NEWSLETTER_CRON_SECRET":sys.argv[3],"NUXT_AWS_REGION":"eu-central-1"}},open(sys.argv[1],"w"))
PY
  say "   Umgebung des Workers: NUXT_BACKUP_BUCKET, NUXT_NEWSLETTER_CRON_SECRET (aus $API_FN kopiert, nicht angezeigt), NUXT_AWS_REGION"
  if [[ "$MODE" == "--apply" ]]; then
    ROLE_ARN="$(aws iam get-role --role-name "$ROLE" --query Role.Arn --output text)"; sleep 10
    aws lambda create-function --region "$REGION" --function-name "$FN" --runtime nodejs22.x --handler "$HANDLER" --role "$ROLE_ARN" --timeout 900 --memory-size 1536 --ephemeral-storage Size=2048 \
      --code "S3Bucket=$SRC_BUCKET,S3Key=lambda/lambda-new.zip" --environment "file://$TMP/env.json" --description "Sicherungs-Worker (gleicher Code wie plexora-api)" --query FunctionArn --output text
  else say "   (würde ausführen) aws lambda create-function $FN nodejs22.x, 900 s, 1536 MB, Code: $SRC_BUCKET/lambda/lambda-new.zip"; fi
fi

say; say "5. $API_FN: Umgebungsvariablen NUXT_BACKUP_BUCKET und NUXT_BACKUP_WORKER_FUNCTION"
aws lambda get-function-configuration --region "$REGION" --function-name "$API_FN" --query 'Environment.Variables' --output json > "$TMP/apienv.json"
python3 - "$TMP/apienv.json" "$TMP/apienv-new.json" "$BUCKET" "$FN" <<'PY'
import json,sys
env=json.load(open(sys.argv[1])); old={k:env.get(k) for k in("NUXT_BACKUP_BUCKET","NUXT_BACKUP_WORKER_FUNCTION")}
env["NUXT_BACKUP_BUCKET"]=sys.argv[3]; env["NUXT_BACKUP_WORKER_FUNCTION"]=sys.argv[4]
json.dump({"Variables":env},open(sys.argv[2],"w"))
print("   NUXT_BACKUP_BUCKET:", old["NUXT_BACKUP_BUCKET"] or "(nicht gesetzt)", "->", sys.argv[3]); print("   NUXT_BACKUP_WORKER_FUNCTION:", old["NUXT_BACKUP_WORKER_FUNCTION"] or "(nicht gesetzt)", "->", sys.argv[4])
print(f"   {len(env)-2} weitere Variablen bleiben unverändert (Werte werden nie angezeigt)")
PY
if [[ "$MODE" == "--apply" ]]; then
  aws lambda update-function-configuration --region "$REGION" --function-name "$API_FN" --environment "file://$TMP/apienv-new.json" --query LastUpdateStatus --output text >/dev/null
  aws lambda wait function-updated --region "$REGION" --function-name "$API_FN"
  say; say "Fertig. Jetzt: scripts/aws/deploy-backend.sh --config-only  (macht die Umgebungsvariablen wirksam). Rückweg: scripts/aws/setup-backup.sh --remove"
else say; say "(Probelauf: nichts geändert)"; fi
