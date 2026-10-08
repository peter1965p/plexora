# Plan: tägliche Speicherprüfung als zeitgesteuerte Lambda (nur lesend, Meldung per SNS)

Stand 08.10.2026. **Nur Plan, nichts gebaut. Du entscheidest.** Gehört zur Speicher-Regel (`infra/storage-policy.ts`, `scripts/aws/check-storage.sh`).

## Warum
Das Deploy-Gate sieht nur den Zustand zum Zeitpunkt des Deploys. Wird danach in der Konsole ein Bucket geöffnet (Policy, Block Public Access, neuer Bucket), bemerkt das erst der nächste Deploy. Die Lambda führt dieselbe Prüfung täglich aus und meldet Abweichungen per Mail.

## Aufbau
| Teil | Entscheidung |
|---|---|
| Code | Dieselbe Prüflogik (`infra/storage-check.ts`) und dieselbe Deklaration, eingebettet in eine kleine Lambda `plexora-storage-check` (Node 22, 128 MB, 60 s). Der Zugriff auf AWS läuft über das AWS-SDK statt über die CLI. Dafür wird `collectBucket` von "CLI-Befehle" auf eine kleine Schnittstelle (`getPolicy`, `getPublicAccessBlock` …) umgestellt; beide Wege (CLI und SDK) werden mit denselben Tests geprüft. |
| Auslöser | EventBridge-Zeitplan, täglich 06:00 UTC. |
| Rolle (nur lesend) | `s3:ListAllMyBuckets`, `s3:GetBucketLocation/Policy/PolicyStatus/PublicAccessBlock/Versioning/Acl/OwnershipControls/Website`, `s3:GetEncryptionConfiguration`, `s3:GetLifecycleConfiguration`, `s3:GetAccountPublicAccessBlock` (Konto), `sns:Publish` **nur** auf das Thema `plexora-alerts`, CloudWatch Logs der eigenen Funktion. **Kein** `s3:GetObject`, kein Schreibrecht, kein `s3:ListBucket` (siehe Entscheidung 2). |
| HTTP-Prüfungen | Auflisten 403 und feste private Beispielschlüssel 403 (aus der Deklaration) über das öffentliche Internet; die Lambda läuft nicht im VPC. Öffentliche Präfixe: nur mit festen, deklarierten Beispielschlüsseln. |
| Meldung | Abweichung an einem Plexora-Bucket oder ein nicht deklarierter Bucket: sofort eine Mail an `plexora-alerts` (Betreff "Speicher-Prüfung: FEHLER", Text wie das Gate, ohne Adressen). Warnungen (fremde Buckets): höchstens einmal pro Woche und nur, wenn sich die Liste ändert. Zusätzlich schlägt die Funktion bei Fehlern fehl, damit der vorhandene Lambda-Fehler-Alarm anschlägt. |
| Ausrollen | Eigenes Skript `scripts/aws/deploy-storage-check.sh` mit `--dry-run` (Standard), `--apply`, `--rollback`, Versionen und Aliase wie `deploy-pre-signup.sh`. Die Rolle und die Funktion legt ein Administrator-Skript an (`grant-…`, mit `--dry-run`), nicht `plexora-app`. |

## Entscheidungen für dich
1. **Soll es die Lambda überhaupt geben**, oder reicht der Access Analyzer (`scripts/aws/setup-access-analyzer.sh`) plus das Deploy-Gate? Die Lambda deckt zusätzlich Verschlüsselung, Versionierung, Lifecycle und die Deklaration selbst ab; der Access Analyzer nur "extern erreichbar".
2. **Schlüsselstichproben mit `s3:ListBucket`?** Das Gate nimmt beim Deploy einen echten Schlüssel je Präfix und prüft per HTTP, dass er 200 liefert. Die Lambda kann das nur mit dem Recht, Schlüsselnamen aufzulisten (kein Inhalt). Ohne dieses Recht prüft sie nur Auflisten und feste Beispiele. Empfehlung: ohne Listenrecht starten.
3. **Warnungen bei fremden Buckets** (Aether OS): als wöchentliche Mail oder gar nicht?
4. **Zusätzlich sofortige Meldung bei Änderungen** (Option C, siehe unten).

## Option C: sofortige Meldung statt Abfrage
EventBridge kann API-Aufrufe der Verwaltung (CloudTrail-Verwaltungsereignisse) ohne eigenen Trail als Ereignis zustellen. Eine Regel auf `PutBucketPolicy`, `DeleteBucketPolicy`, `PutBucketPublicAccessBlock`, `DeletePublicAccessBlock`, `PutBucketAcl`, `CreateBucket`, `DeleteBucket`, `PutBucketVersioning`, `PutBucketEncryption`, `PutBucketLifecycle` und `PutAccountPublicAccessBlock` schickt die Änderung binnen Minuten an `plexora-alerts`. Vorteil: nahezu in Echtzeit, kein Code. Nachteil: sagt nur "es wurde etwas geändert" (wer, was), nicht "ist es jetzt noch in Ordnung"; die Lambda beantwortet das. Beides zusammen ist die stärkste Kombination und kostet praktisch nichts. Aufwand ~0,5 Tag (Skript mit `--dry-run`); Rechte für `events:PutRule/PutTargets`.

## Kosten und Risiken
- **Kosten:** 1 Lauf pro Tag, wenige Sekunden: weit unter dem Gratisanteil von Lambda; SNS-Mail und EventBridge praktisch 0.
- **Risiko Fehlalarm:** gewollte Änderungen in der Konsole lösen eine Mail aus, bis die Deklaration angepasst **und** die Lambda neu ausgerollt ist (Deklaration steckt im Paket). Mitigation: Ausrollen gehört in `deploy-backend.sh`-Ablauf oder in denselben Handgriff wie die Deklarationsänderung; die Mail nennt den Stand der Deklaration (Git-Stand).
- **Risiko Lesezugriff:** Die Rolle kann Policies und Einstellungen aller Buckets lesen (nicht die Objekte). Das ist der Zweck, aber ein Rechteumfang, den du freigeben musst.
- **Risiko Pflege:** Zwei Wege (CLI und SDK) für denselben Zustand; die gemeinsamen Tests sind Pflicht.
- **Wer prüft die Prüfung?** Fällt die Lambda aus, kommt keine Mail. Deshalb: CloudWatch-Alarm auf "keine Ausführung in 26 Stunden" (Metrik `Invocations` mit "fehlende Daten = auslösend").
