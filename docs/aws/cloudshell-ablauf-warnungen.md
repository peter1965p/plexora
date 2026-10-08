# CloudShell-Ablauf: Access Analyzer und Meldung bei Bucket-Änderungen

Stand 08.10.2026. Zwei Skripte, beide mit Probelauf (`--dry-run`) als Standard, beide nur Anlegen/Entfernen von Meldewegen (nichts an den Buckets selbst):

| Skript | Was es meldet |
|---|---|
| `scripts/aws/setup-access-analyzer.sh` | IAM Access Analyzer: Buckets/Rollen/Funktionen, die **von außerhalb des Kontos oder öffentlich** erreichbar sind (auch wenn es erst nach einem Deploy in der Konsole passiert). Dauert bis zur Meldung bis zu ca. 30 Minuten. |
| `scripts/aws/setup-bucket-change-alerts.sh` | Jede Änderung an **Bucket-Policy, Block Public Access oder Bucket-ACL** von `plexora-*` binnen Minuten. Sagt "was, wer, wann", nicht ob der neue Zustand in Ordnung ist (dafür `check-storage.sh`). Aether-OS-Buckets sind nicht erfasst. |

Beide schicken an das vorhandene SNS-Thema `plexora-alerts` (dieselbe Mail-Adresse wie die CloudWatch-Alarme).

## Rechte
In der CloudShell als Inhaber/Administrator hast du alles. Für einen eingeschränkten Benutzer braucht es für `--apply`/`--remove`:
`access-analyzer:CreateAnalyzer`, `access-analyzer:DeleteAnalyzer`, `access-analyzer:ListAnalyzers`, `access-analyzer:ListFindings`, `iam:CreateServiceLinkedRole` (einmalig, legt die Dienstrolle des Analyzers an),
`events:PutRule`, `events:PutTargets`, `events:RemoveTargets`, `events:DeleteRule`, `events:DescribeRule`, `events:TestEventPattern`,
`sns:GetTopicAttributes`, `sns:SetTopicAttributes`, `sns:ListSubscriptionsByTopic`.
Der Probelauf braucht davon nichts außer `events:TestEventPattern` (fehlt es, sagt er es und prüft den Rest nicht).
`plexora-app` hat diese Rechte **nicht** und soll sie nicht bekommen.

## Ablauf (jeder Block einzeln einfügen)

### 0) Vorbereiten
Region oben rechts in der Konsole auf **Europa (Frankfurt) eu-central-1** stellen, dann CloudShell öffnen (Symbol `>_` in der Kopfzeile).
```bash
echo "Region: $AWS_REGION"; aws sts get-caller-identity --query Arn --output text
```
Erwartet: `eu-central-1` und **dein** Administrator-Benutzer oder deine Rolle, **nicht** `user/plexora-app`.

### 1) Skripte hochladen
Menü **Actions → Upload file**, nacheinander diese zwei Dateien von deinem Rechner (`~/Dev/plexora/scripts/aws/`):
`setup-access-analyzer.sh` und `setup-bucket-change-alerts.sh`. (Die Skripte brauchen nur `bash`, `aws` und `python3`, die CloudShell mitbringt; kein Git-Zugang nötig.)
```bash
chmod +x setup-access-analyzer.sh setup-bucket-change-alerts.sh
```

### 2) Probelauf (ändert nichts)
```bash
./setup-access-analyzer.sh --dry-run
./setup-bucket-change-alerts.sh --dry-run
```
Erwartet beim zweiten: acht Zeilen `OK … meldet` bzw. `OK … meldet nicht` (z. B. `PutBucketPolicy an plexora-files -> meldet`, `PutObject an plexora-files -> meldet nicht`) und am Ende `(Probelauf: nichts geändert)`. Steht irgendwo `FEHLER` oder `ABBRUCH`, **nicht weitermachen** und mir die Ausgabe zeigen.
Beim ersten steht jetzt (als Administrator) bei "Ist-Zustand" `Analyzer: nicht vorhanden` und `SNS-Thema plexora-alerts: vorhanden`.

### 3) Anlegen
```bash
./setup-access-analyzer.sh --apply
./setup-bucket-change-alerts.sh --apply
```
Beide enden mit `Fertig. Rückweg: … --remove`. Ein Fehler wie `AccessDenied` heißt: das Recht aus der Liste oben fehlt.

### 4) Prüfen, dass alles steht
```bash
ACC=$(aws sts get-caller-identity --query Account --output text)
TOPIC=arn:aws:sns:eu-central-1:$ACC:plexora-alerts
aws accessanalyzer list-analyzers --query "analyzers[?name=='plexora-external-access'].[name,status,type]" --output text
aws events describe-rule --name plexora-access-analyzer-findings --query '[Name,State]' --output text
aws events describe-rule --name plexora-bucket-changes --query '[Name,State]' --output text
aws events list-targets-by-rule --rule plexora-bucket-changes --query 'Targets[].Arn' --output text
aws sns get-topic-attributes --topic-arn $TOPIC --query 'Attributes.Policy' --output text | python3 -c 'import sys,json; print([s["Sid"] for s in json.load(sys.stdin)["Statement"]])'
aws sns list-subscriptions-by-topic --topic-arn $TOPIC --query 'Subscriptions[].[Protocol,SubscriptionArn]' --output text
```
Erwartet: Analyzer `ACTIVE ACCOUNT`; beide Regeln `ENABLED`; ein Ziel mit der Thema-Adresse; in der Themen-Richtlinie die Einträge `AccessAnalyzerRegel` und `BucketAenderungenRegel` (und was schon da war); beim Abo `email …` mit einer **echten** ARN. Steht dort `PendingConfirmation`, ist die Mail-Adresse noch nicht bestätigt und es kommt **keine** Meldung: Bestätigungsmail suchen (auch Spam) und den Link anklicken.

### 5) Testen, dass eine Meldung ankommt
Ein leerer Wegwerf-Bucket mit dem Namen `plexora-alerttest-…`. Er bekommt nie Inhalt, und du löschst ihn in Schritt 6 sofort wieder.
Hinweis: Solange er existiert, würde `scripts/aws/check-storage.sh` (und damit ein Deploy) ihn als "nicht deklarierten Bucket" melden. Teste also nicht während eines Deploys.

**5a) Meldung "Bucket geändert" (kommt nach 1–5 Minuten):**
```bash
T=plexora-alerttest-$ACC
aws s3api create-bucket --bucket $T --region eu-central-1 --create-bucket-configuration LocationConstraint=eu-central-1
aws s3api put-public-access-block --bucket $T --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```
Erwartet: eine Mail mit `Speicher-Änderung: PutBucketPublicAccessBlock an Bucket plexora-alerttest-… durch … um … (IP …)`. (Das Anlegen des Buckets selbst meldet nichts, das ist so gewollt.)

**5b) Meldung des Access Analyzers (bis ca. 30 Minuten):** der Bucket wird kurz öffentlich lesbar (leer, nichts zu lesen) und liefert einen "öffentlich"-Fund.
```bash
aws s3api put-public-access-block --bucket $T --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false
cat > /tmp/p.json <<JSON
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":"*","Action":"s3:GetObject","Resource":"arn:aws:s3:::$T/*"}]}
JSON
aws s3api put-bucket-policy --bucket $T --policy file:///tmp/p.json
```
Sofort kommen zwei Mails der Regel "Bucket geändert" (`PutBucketPublicAccessBlock`, `PutBucketPolicy`). Später kommt eine Mail des Access Analyzers (Roh-Ereignis, darin `"resource": "arn:aws:s3:::plexora-alerttest-…"` und `"isPublic": true`). Den Fund siehst du auch hier:
```bash
AN=$(aws accessanalyzer list-analyzers --query "analyzers[?name=='plexora-external-access'].arn" --output text)
aws accessanalyzer list-findings --analyzer-arn $AN --filter '{"status":{"eq":["ACTIVE"]}}' --query 'findings[].[resource,isPublic,status]' --output table
```

### 6) Aufräumen (sofort nach dem Test)
```bash
aws s3api delete-bucket-policy --bucket $T 2>/dev/null
aws s3api delete-bucket --bucket $T
aws s3api head-bucket --bucket $T 2>&1 | head -1
```
Die letzte Zeile muss einen Fehler (`404`/`Not Found`) zeigen: der Bucket ist weg. Der Fund im Analyzer wechselt von selbst auf `RESOLVED`.

## Wenn keine Mail kommt
1. `PendingConfirmation` beim Abo (Schritt 4)? Dann bestätigen.
2. Wurde die Regel ausgelöst? (Zahl > 0 = ja)
```bash
for R in plexora-bucket-changes plexora-access-analyzer-findings; do echo $R; for M in TriggeredRules FailedInvocations; do aws cloudwatch get-metric-statistics --namespace AWS/Events --metric-name $M --dimensions Name=RuleName,Value=$R --start-time $(date -u -d '-2 hours' +%FT%TZ) --end-time $(date -u +%FT%TZ) --period 7200 --statistics Sum --query "[\`$M\`, Datapoints[0].Sum]" --output text; done; done
```
`TriggeredRules` > 0 und `FailedInvocations` > 0: die Regel feuert, aber das Thema lässt sie nicht herein → Themen-Richtlinie in Schritt 4 prüfen. `TriggeredRules` leer: die Regel wurde nicht ausgelöst (falsche Region? Schritt 0).
3. Spam-Ordner; Mails kommen von `no-reply@sns.amazonaws.com`.

## Rückweg
```bash
./setup-bucket-change-alerts.sh --remove
./setup-access-analyzer.sh --remove
```
Entfernt Regeln, Ziele und den Analyzer. Das Thema `plexora-alerts` und die Mail-Abos bleiben.

## Grenzen
- Gemeldet wird, **dass** etwas geändert wurde, nicht ob es falsch ist: danach `scripts/aws/check-storage.sh` laufen lassen (vergleicht mit `infra/storage-policy.ts`).
- Änderungen an der Kontoebene (Block Public Access für das ganze Konto) und an Verschlüsselung/Lifecycle/Versionierung meldet die Regel nicht; sie fallen beim nächsten `check-storage.sh`/Deploy auf. Der Analyzer meldet nur "extern erreichbar".
- Die Aether-OS-Buckets sind bewusst nicht in der Regel; der Analyzer sieht sie trotzdem (öffentlicher Bucket `aether-os-assets-…` taucht dort als Fund auf, solange er öffentlich ist; er ist als bekannt deklariert, die Mail dazu ist zu erwarten).
