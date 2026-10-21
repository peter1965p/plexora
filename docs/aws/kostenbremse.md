# Kostenbremse für Lambda und API (Stand 21.10.2026)

Nach der Erhöhung des Lambda-Limits von 10 auf 1000 (Antrag vom 21.10.2026, genehmigt) gelten diese Bremsen, damit ein Ansturm oder Missbrauch nicht unbegrenzt Last und Kosten erzeugt:

| Bremse | Wert | Wo | Rückgängig |
|---|---|---|---|
| Reservierte Gleichzeitigkeit für `plexora-api` | 300 (Rest 700 frei für die anderen Funktionen) | Lambda | `aws lambda delete-function-concurrency --function-name plexora-api` |
| Drosselung API Gateway (Stage `$default`, alle Routen) | 100 Anfragen/s, Spitze 200 | API `7hrkm580pb` | `aws apigatewayv2 update-stage --api-id 7hrkm580pb --stage-name '$default' --default-route-settings DetailedMetricsEnabled=false` |
| Drossel je Route und Adresse | Formulare, Buchung, Newsletter, Demo-Start (12/Stunde) | Code (`server/utils/rateLimit.ts`) | – |
| Schreibgrenze Demo-Konto | 1500 Schreibzugriffe bis zum Zurücksetzen | Code (`demoSandbox.ts`) | – |
| Budget „Zero Spend“ | Warnung ab 1 USD | AWS Budgets (von dir angelegt) | – |

## Noch offen (nur du darfst, `plexora-app` hat keine Budget-Rechte)
**Zweiter Budget-Alarm:** AWS-Konsole → Billing → Budgets → Budget erstellen → Kostenbudget, monatlich, **10 USD**, Warnungen bei **80 % tatsächlich** und **100 % prognostiziert** an die eigene E-Mail-Adresse.

## Messen
`aws lambda get-account-settings` (Limit), CloudWatch `Throttles` und `ConcurrentExecutions` für `plexora-api`, Alarm `plexora-lambda-throttles`. Werden legitime Anfragen gedrosselt (HTTP 429 vom Gateway oder 5xx), die Werte oben anheben.
