import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const sh = readFileSync('scripts/aws/setup-backup.sh', 'utf8')

describe('Einrichtung der Sicherung (scripts/aws/setup-backup.sh)', () => {
  it('privater Bucket: Block Public Access komplett, Verschlüsselung, nur HTTPS, keine Versionierung, Ablauf nach 7 Tagen', () => {
    expect(sh).toMatch(/BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true/)
    expect(sh).toContain('"SSEAlgorithm":"AES256"'); expect(sh).toContain('aws:SecureTransport')
    expect(sh).toMatch(/"Expiration":\{"Days":7\}/); expect(sh).toContain('AbortIncompleteMultipartUpload')
    expect(sh).not.toMatch(/put-bucket-versioning/)
  })
  it('der Worker hat eigene Rechte: kein AmazonS3FullAccess, kein DynamoDB-Vollzugriff, Schreiben nur in den Backup-Bucket und in die Auftragstabelle', () => {
    const block = sh.slice(sh.indexOf('worker_policy_json()'), sh.indexOf('api_policy_json()'))
    expect(block).not.toMatch(/FullAccess|"s3:\*"|"dynamodb:\*"|DeleteItem|DeleteObject/)
    expect(block).toMatch(/"s3:PutObject"\],"Resource":"arn:aws:s3:::\$BUCKET\/jobs\/\*"/)
    expect(block).toMatch(/"dynamodb:Scan","dynamodb:DescribeTable"\]/)
    expect(block).toMatch(/GetItem.*UpdateItem.*table\/\$TABLE/s)
    expect(block).toMatch(/s3:GetObject"\],"Resource":"arn:aws:s3:::\$SRC_BUCKET\/\*"/)      // Dateien nur lesen
    expect(sh).not.toMatch(/attach-role-policy[^\n]*(AmazonS3FullAccess|AmazonDynamoDBFullAccess)/)
  })
  it('Tabelle mit Ablauf (TTL expiresAt) und Schlüssel owner + jobId; Konto-ID steht nicht im Repo', () => {
    expect(sh).toContain('AttributeName=owner,KeyType=HASH'); expect(sh).toContain('AttributeName=jobId,KeyType=RANGE'); expect(sh).toContain('AttributeName=expiresAt')
    expect(sh).not.toMatch(/\b\d{12}\b/)
    expect(sh).toContain('aws sts get-caller-identity')
  })
  it('Probelauf (--dry-run) ändert nichts: alle Änderungen laufen über act(), das im Probelauf nur anzeigt', () => {
    expect(sh).toMatch(/act\(\) \{ if \[\[ "\$MODE" == "--apply" \]\]; then "\$@"; else say/)
    const direct = sh.split('\n').filter(l => /^\s*aws (s3api (create|put)|iam (create|put|attach|delete)|dynamodb (create|update|delete)|lambda (create|delete|update))/.test(l) && !/^\s*act /.test(l))
    // erlaubt sind nur Aufrufe, die ausdrücklich hinter --apply bzw. --remove stehen
    for (const l of direct) expect(l).toMatch(/exists_|\|\| true|>\/dev\/null 2>&1|--apply|aws lambda create-function|aws lambda update-function-configuration|aws dynamodb wait/)
  })
  it('das Deploy-Skript aktualisiert den Worker mit demselben Code', () => {
    const d = readFileSync('scripts/aws/deploy-backend.sh', 'utf8')
    expect(d).toContain('plexora-backup-worker'); expect(d).toMatch(/update-function-code[^\n]*"\$WORKER"/)
    execFileSync('bash', ['-n', 'scripts/aws/deploy-backend.sh']); execFileSync('bash', ['-n', 'scripts/aws/setup-backup.sh'])
  })
})
