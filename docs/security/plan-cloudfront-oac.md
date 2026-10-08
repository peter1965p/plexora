# Plan: Bilder hinter CloudFront (Origin Access Control), Bucket komplett privat

Stand 08.10.2026. **Nur Planung, nichts gebaut.** Gehört zur Speicher-Regel (`infra/storage-policy.ts`, `scripts/aws/check-storage.sh`).

## 1. Ziel und warum
Heute ist `plexora-files` über eine Bucket-Policy für 13 Präfixe öffentlich lesbar (`Principal "*"`, nur `s3:GetObject`). Das Gate prüft, dass es dabei bleibt – aber solange es eine öffentliche Policy gibt,
- darf **Block Public Access** nicht komplett an sein (`BlockPublicPolicy`/`RestrictPublicBuckets` müssen aus bleiben), und
- kann **Block Public Access auf Kontoebene** nicht aktiviert werden (die Policy würde wirkungslos, die Bilder wären weg).

Mit CloudFront + OAC liest nur noch CloudFront (Dienst-Principal, begrenzt auf genau diese Distribution per `AWS:SourceArn`) aus dem Bucket. Der Bucket hat **keine** öffentliche Policy mehr, Block Public Access ist überall an, und eine versehentlich öffentliche Policy wird von AWS selbst abgewiesen.

## 2. Ablauf in Phasen (jede einzeln rückholbar)
| Phase | Inhalt | Rückweg |
|---|---|---|
| 0 | Messen: S3-Zugriffsprotokolle (Server Access Logs) für `plexora-files` einschalten, 4 Wochen sammeln: Welche Schlüssel werden von wem direkt abgerufen? | Protokoll ausschalten |
| 1 | CloudFront-Distribution mit OAC anlegen, Behaviors nur für die deklarierten Präfixe (alles andere → 403), eigene Domain `bilder.plexora.eu` (ACM-Zertifikat in us-east-1, DNS-Eintrag bei Cloudflare), Antwort-Header-Richtlinie mit CORS (GET/HEAD, Ursprung plexora.eu und `*.pages.dev`), Cache-Control wie heute. Bucket-Policy **zusätzlich** um die CloudFront-Anweisung ergänzen, die alte öffentliche bleibt. | Distribution löschen |
| 2 | Code: **eine** Funktion `imageUrl(key)` (Server und Oberfläche) liefert die CDN-Adresse; Uploads (`aws/s3-upload`, Mail-Logo) geben sie zurück; `isLogoUrl`/`isAcceptUrl`-Prüfungen und die Prüfung "beginnt mit https://plexora-files…" (Mail-Vorlage, Editoren, `check-public-flows.sh`) akzeptieren beide Hosts. Gespeicherte alte Adressen werden beim Anzeigen auf die CDN-Adresse umgeschrieben. | alte Funktion zurück, beide Hosts bleiben gültig |
| 3 | Migration der **gespeicherten** Adressen in DynamoDB (Kampagnen, Blog, Produkte, Branding, Nexora, Newsletter-Vorlagen, Mail-Vorlagen) mit Probelauf und Sicherung vorher (Export "Meine Daten" / `backup-plexora.py`). | Sicherung zurückspielen |
| 4 | Beobachten (CloudFront-Protokoll + S3-Protokoll): Wie viel geht noch direkt an S3? **Entscheidung** über die alten Mail-Bilder (siehe Risiko 1). | – |
| 5 | Öffentliche Policy entfernen, Block Public Access am Bucket komplett an, danach Konto-Ebene an. `infra/storage-policy.ts` ändert sich: `plexora-files` wird `private`, `accountBlockPublicAccess` wird gesetzt; das Gate prüft das ab dann. | `secure-bucket.sh --rollback` (Policy zurück) |

## 3. Aufwand
| Teil | Schätzung |
|---|---|
| Distribution, OAC, Zertifikat, DNS, Header-Richtlinie, Bucket-Policy-Skript mit `--dry-run` (Rechte kommen wie immer als Skript für dich) | 0,5–1 Tag |
| Code (`imageUrl`, beide Hosts akzeptieren, Tests) | 1–2 Tage |
| Migrationsskript mit Probelauf, Tests, Sicherung | 1 Tag |
| Beobachtung | 4 Wochen Kalenderzeit, kaum Arbeit |
| Gate/Deklaration anpassen (Phase 5) | 0,5 Tag |

## 4. Kosten (Größenordnung, bitte in der aktuellen AWS-Preisliste gegenprüfen)
- **CloudFront:** Der dauerhafte Gratisanteil (laut AWS-Preisseite 1 TB Ausgang und 10 Mio. Anfragen pro Monat) deckt das Volumen dieser Bilder mit großer Wahrscheinlichkeit ab → voraussichtlich **0 €**. Darüber ungefähr 0,08–0,09 USD je GB in Europa.
- **ACM-Zertifikat:** kostenlos. **OAC:** kostenlos.
- **S3:** weniger direkte GET-Anfragen; Protokollspeicher wenige Cent.
- **IAM Access Analyzer (Auswertung externer Zugriffe, enthält "Access Analyzer für S3"):** nach meinem Wissen ohne Zusatzkosten; die Auswertung ungenutzter Zugriffe kostet extra und wird nicht gebraucht.
- **AWS Config (Regeln `s3-bucket-public-read-prohibited`, `s3-bucket-level-public-access-prohibited`):** abhängig von der Zahl erfasster Ressourcen, in einem so kleinen Konto grob einstellige Euro pro Monat; Config zeichnet alle Ressourcentypen auf, wenn man es nicht einschränkt.

## 5. Risiken
1. **Bild-Adressen ändern sich – und alte bleiben im Umlauf.** Bereits versendete Newsletter und Einladungsmails, Beiträge auf fremden Seiten und gespeicherte Kampagnen verweisen auf `https://plexora-files.s3.eu-central-1.amazonaws.com/…`. Die S3-Adresse lässt sich nicht auf CloudFront umleiten. Sobald der Bucket privat ist, laden diese Bilder **nicht mehr**. Entscheidungen dafür (Phase 4): (a) Präfixe `newsletter/` und `mail-logos/` bleiben öffentlich, Konto-Ebene bleibt dann aus; (b) Bilder in alten Mails gehen verloren (bewusst, nach Messung der Zugriffe); (c) alte Mails werden nicht angefasst, neue Mails nutzen nur die CDN-Adresse und der Bucket bleibt, bis die Zugriffe auf alte Adressen gegen null gehen.
2. **Zwischenspeicher:** Dateien mit gleichem Namen, die überschrieben werden, erscheinen bis zum Ablauf der Cache-Zeit alt. Der Upload nutzt jetzt Mandanten-Ordner und die Mail-Logos Zufallsnamen, das entschärft es; für überschreibbare Namen (z. B. `branding/logo.jpg`) braucht es kurze Cache-Zeiten oder Invalidierungen (je 1000 Pfade pro Monat kostenlos).
3. **CORS:** `ImageUploadCrop.vue` und Editoren laden Bilder per `fetch`/Canvas. Die Bucket-CORS-Regel gilt für S3, nicht für CloudFront; ohne Antwort-Header-Richtlinie bricht der Zuschnitt.
4. **Eigene Domain/DNS:** Zertifikat und CNAME bei Cloudflare; fällt die Domain aus, fallen alle Bilder aus. Fallback: die `*.cloudfront.net`-Adresse bleibt gültig.
5. **Konto-Block-Public-Access betrifft auch fremde Projekte:** `aether-os-assets-…` ist per Policy komplett öffentlich lesbar und würde mit der Konto-Einstellung aufhören zu funktionieren. Vorher mit dem Aether-OS-Projekt klären (eigene CloudFront-Lösung oder Ausnahme).
6. **Rechte:** CloudFront, ACM und Route/DNS-Änderungen sind Administratorrechte. Sie kommen als Skript mit `--dry-run` an dich, nicht als Freibrief für `plexora-app`.

## 6. Zusätzliches Netz (unabhängig von CloudFront)
- **Access Analyzer:** Ein Analyzer für das Konto (kostenloser Typ "externer Zugriff") meldet öffentliche oder kontoübergreifende Buckets laufend – auch bei Änderungen in der Konsole **nach** dem Deploy, die das Gate nicht sieht. Meldung per EventBridge → SNS → E-Mail. Aufwand ~0,5 Tag (Skript mit `--dry-run`).
- **AWS Config:** Regeln für öffentliche Buckets, gleiche Zustellung der Meldung. Deckt zusätzlich Änderungen an Verschlüsselung/Versionierung ab (mit Regeln `s3-bucket-server-side-encryption-enabled`, `s3-bucket-versioning-enabled`). Teurer als der Access Analyzer; sinnvoll erst, wenn mehr Dienste dazukommen.
- **Billigste Variante ohne neuen Dienst:** `check-storage.sh` täglich per EventBridge-Zeitplan als kleine Lambda laufen lassen, Fehler lösen den bestehenden CloudWatch-Alarmweg aus. Schließt die Lücke "nur zum Deploy-Zeitpunkt" ohne Zusatzkosten, braucht aber eine Lambda-Rolle mit denselben lesenden Rechten.

## 7. Empfehlung
Reihenfolge: **Access Analyzer jetzt** (billig, schließt die Lücke nach dem Deploy) → Phase 0 (Messen) → entscheiden, ob alte Mail-Bilder erhalten bleiben müssen → erst dann Phasen 1–5.
