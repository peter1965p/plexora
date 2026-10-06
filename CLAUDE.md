# Projektregeln für Claude (Plexora)

## Secrets niemals im Klartext ausgeben
- Secrets, Tokens, API-Schlüssel, Passwörter, Cron-Secrets und Client-Secrets werden **nie im Klartext** ausgegeben – weder im Chat noch in Dateien, Commits, Notizen oder Logs.
- Beim Auslesen von **EventBridge-Regeln, Umgebungsvariablen, Lambda-Konfigurationen, Logs und Konfigurationsdateien** werden Werte **maskiert**: höchstens die **ersten 4 Zeichen** zeigen, der Rest als `…` bzw. `********`.
- Befehle so bauen, dass der Klartext gar nicht erst ausgegeben wird (z. B. `--query` auf Schlüsselnamen statt auf Werte, Ausgabe durch `cut`/`sed` maskieren, Werte nur in Variablen verwenden, nie `echo`en). Das gilt auch für `Input`-Felder von EventBridge-Zielen (`x-internal-cron-secret`), `Environment.Variables`, Header in Logs und Stripe-/Google-/Cloudflare-Schlüssel.
- Taucht ein Secret trotzdem in einer Ausgabe oder einem Screenshot auf: sofort melden und Rotation empfehlen; den Wert nirgends weiterverwenden oder speichern.
- Secrets gehören nur in die Lambda-Umgebung bzw. verschlüsselte Datenbankfelder (AES-GCM, im Frontend nur maskiert), nie ins Repo oder Memory.

## Deploys
- Kein Deploy und kein `git push` ohne ausdrückliche Freigabe von Peter. Backend: `scripts/aws/deploy-backend.sh` (Rückweg: `scripts/aws/rollback-backend.sh`). Frontend: `git push` auf main (Cloudflare Pages). Frontend vor Backend, wenn das Backend ein neues Token verlangt.
- Nach jedem Deploy `scripts/aws/check-public-flows.sh` ausführen und berichten.

## Routen und Anmeldung
- Jede API-Route braucht eine Anmeldung oder einen begründeten Eintrag in `server/utils/routePolicy.ts`; der Test `tests/security/route-policy.test.ts` erzwingt das. Die Altlast-Liste `tests/security/legacyRoutes.ts` darf nur schrumpfen.
