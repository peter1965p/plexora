# Antrag: Erhöhung des Lambda-Limits für gleichzeitige Ausführungen (Stand 21.10.2026)

**Kosten:** keine. Die Erhöhung eines Limits kostet nichts und braucht keinen Support-Plan. Bezahlt wird nur Nutzung (Aufrufe und Rechenzeit), und die liegt weit unter den dauerhaft freien Kontingenten (1 Mio. Aufrufe, 400.000 GB-Sekunden je Monat).

## So geht's (ca. 3 Minuten, als Kontoinhaber in der AWS-Konsole)
1. Region **Europa (Frankfurt) eu-central-1** wählen.
2. **Service Quotas** öffnen → **AWS-Services** → **AWS Lambda** → **Concurrent executions** (Quota-Code **L-B99A9384**). Direktlink: https://eu-central-1.console.aws.amazon.com/servicequotas/home/services/lambda/quotas/L-B99A9384
3. **Erhöhung auf Kontoebene beantragen**, neuer Wert **1000**. Das Formular erlaubt nur Werte ab dem Standardwert 1000 (neue Konten starten mit 10; 1000 ist der normale AWS-Standard). Das Formular hat kein Begründungsfeld: kleinere Erhöhungen werden oft automatisch genehmigt. Landet die Anfrage beim AWS Support, den englischen Text unten als Antwort im Fall einfügen (oder über **Support Center → Fall erstellen → Service Limit Increase**).
4. Antwort kommt per Mail, meist innerhalb von Stunden bis wenigen Tagen. Bietet AWS weniger an (bei jungen Konten üblich): annehmen und mit den Zahlen unten nachfragen.
5. Danach: mir Bescheid geben. Ich prüfe mit `aws lambda get-account-settings` den neuen Wert und kann dann Reservierungen für die öffentlichen Endpunkte einrichten.

- Aktueller Wert: 10, gewünscht: 1000 (AWS-Standardwert). Danach Kostenbremse einbauen: Reservierung für plexora-api (z. B. 300) und/oder Drosselung am API Gateway, damit ein Ansturm oder Missbrauch nicht unbegrenzt Last und Kosten erzeugt.

## Text für das Anfrageformular (englisch, gemessene Werte)

We run a production SaaS backend on one main Lambda function (plexora-api, Node.js 22.x, 1536 MB, x86_64, average duration about 60 ms) behind API Gateway (HTTP API), plus a few small helper functions. Our account-level concurrent executions quota in eu-central-1 is 10. The account moved from the free plan to the paid plan on 2026-10-04, so the quota was not raised automatically.

Measured in CloudWatch for plexora-api, last 30 days (2026-09-21 to 2026-10-21):
- The ConcurrentExecutions metric hit the limit of 10 on 28 of 31 days (and on every one of the last 7 days).
- 53,753 throttled invocations versus 169,061 accepted invocations, i.e. about 24 % of attempted invocations were throttled over the 30 days (peak day 2026-10-06 with 41,919 throttles). In the last 7 days the rate was lower (334 throttles versus 30,182 accepted invocations, about 1.1 %), but the limit was still reached every single day.
- Throttled requests are returned to users as HTTP 5xx, including public endpoints (lead forms, appointment booking, landing pages, public demo login).

Cause: a single dashboard page load issues roughly a dozen parallel API calls, so one active user already uses most of the quota. Scheduled jobs (EventBridge) and a public demo (each demo start makes several consecutive calls) add to it.

Request: please raise "Concurrent executions" to 1000 (the standard default value; new accounts start at 10). We expect typical concurrency well below 50 and have no burst or batch workloads. The extra headroom lets us absorb normal peaks and lets us reserve concurrency for the critical public endpoints (Lambda requires at least 100 unreserved executions in the account). Costs are unaffected by the limit itself: we pay per request and duration, currently far inside the free tier, and we have rate limiting on all public routes and a budget alarm in place.

## Hintergrund (Zahlen live gelesen am 21.10.2026)
- `aws lambda get-account-settings`: Limit 10, nicht reserviert 10.
- Drosselungen je Tag (14.–20.10.): 75, 45, 30, 76, 18, 30, 60; Spitze der gleichzeitigen Ausführungen jeden Tag 10.
- Alarm `plexora-lambda-throttles` besteht (Benachrichtigung über SNS `plexora-alerts`).
- Beim Wert 1000 empfohlene Folgeschritte: Reservierung für die öffentlichen Routen und den Demo-Start (damit ein Ansturm das Dashboard der Kunden nicht verdrängt), ein zweiter Budget-Alarm bei 5 bis 10 USD.
