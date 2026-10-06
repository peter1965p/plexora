# Antrag: Erhöhung des Lambda-Limits für gleichzeitige Ausführungen

Einzureichen unter: AWS Console → Service Quotas → AWS Lambda → "Concurrent executions" (Quota-Code L-B99A9384) → "Erhöhung auf Kontoebene beantragen".

- Konto: <Konto-ID>
- Region: eu-central-1 (Frankfurt)
- Aktueller Wert: 10
- Gewünschter Wert: 200

## Text für das Anfrageformular (englisch)

We run a production SaaS backend on a single Lambda function (plexora-api, Node.js 22.x, 1536 MB, avg. duration ~2 s) behind API Gateway (HTTP API). Our account-level concurrent executions quota in eu-central-1 is currently 10. The account moved from the free plan to the paid plan on 2026-10-04, so the quota was not raised automatically.

Impact observed over the last 30 days (CloudWatch):
- The ConcurrentExecutions metric reached the limit of 10 on 31 of 32 days.
- 23,385 throttled invocations against 194,853 total invocations (about 10.7 %).
- Peak: 3,473 throttles on a single day (2026-09-18).
- Throttled requests are returned to our users as HTTP 5xx, including public endpoints (lead forms, appointment booking, landing pages).

Cause: one dashboard page load issues roughly a dozen parallel API calls, so a single active user already uses most of the quota; scheduled jobs (EventBridge) add to it.

Request: please raise "Concurrent executions" to 200. Besides absorbing normal traffic, this lets us reserve concurrency for the critical public endpoints, because Lambda requires at least 100 unreserved executions in the account. We have no burst or batch workloads and expect typical concurrency well below 50.
