# Demo-Konto als Sandkasten (Stand 21.10.2026)

Das Demo-Konto (demo@plexora.eu, Passwort steht öffentlich auf der Startseite) darf in den normalen Bereichen **ausprobieren**; alles wird auf den **Standard** zurückgesetzt.

## Was darf Demo schreiben?
Erlaubnisliste in `server/utils/demoSandbox.ts` (`DEMO_WRITE_ALLOW`), durchgesetzt von `server/middleware/demo.ts`: CRM (Kontakte, Firmen, Deals), Support, Projekte (inkl. Planer), Finanzen (Rechnungen, Kassenbuch, Eingangsrechnungen), Angebote, Artikel/Leistungen, HR, Verträge, Retouren, Formulare, Shop, Termine, alle Branchen-Pakete, Firmen- und Rechnungsangaben (E-Rechnung).
Nur lesen (403 beim Schreiben): Blog, Lead-Seiten/Marketing, Newsletter, Website (Nexora), Payment, Bot-Schutz, KI, Team, Sicherung, Store, Lizenzen, AWS, Datenintegrität, Startseiten-Design, alle sonstigen Einstellungen.
Immer gesperrt, auch in erlaubten Bereichen (Außenwirkung): E-Mail-Versand (Rechnung, Mahnung, Angebot), Einkaufsbestellungen, Termin-Statuswechsel (Mails), iCal-Abrufe und -Links, Uploads, KI.
Missbrauchsbremse: nach 1500 Schreibzugriffen seit dem letzten Zurücksetzen antwortet die API mit 429.

## Zurücksetzen
- **Wann:** beim Abmelden (Knopf und automatischer Leerlauf-Logout), beim Start der Demo („Demo ausprobieren“) und als Sicherheitsnetz nach 30 Minuten ohne Schreibzugriff (der 5-Minuten-Zeitplan `termine/cron/reminders` ruft `demoResetIfIdle()` auf).
- **Was:** `POST /api/demo/reset` (nur das Demo-Konto). Alle Besitzer-Tabellen aus `shared/backupConfig.json` (außer `RESET_EXCLUDE`: Nexora, Blog, Seiten, Marketing, Newsletter, Team, Lizenzen …) werden mit dem gespeicherten Standard verglichen: Neues wird gelöscht, Gelöschtes und Geändertes wiederhergestellt. Andere Mandanten und globale Einstellungen werden nie angefasst.
- **Standard:** Zeilen in `plexora-settings` (`demo-snapshot:*`, Scope `global`). Neu speichern, wenn sich der gewünschte Demo-Stand ändert: erst das Demo-Konto einrichten (`scripts/demo/seed-*.mjs`), dann `npx vite-node scripts/demo/snapshot.mjs`. Ohne gespeicherten Standard löscht das Zurücksetzen nichts.
- **Grenze:** Das Konto ist für alle Besucher dasselbe. Wer gleichzeitig arbeitet, sieht die Änderungen des anderen, und ein Zurücksetzen (Logout eines Besuchers) betrifft auch den anderen. Für ein eigenes Konto je Besucher müsste die Mandanten-Erkennung umgebaut werden.

## Oberfläche
Demo-Banner im Dashboard-Layout (`DemoBanner.vue`, ausblendbar). Betreiber-Reiter (Startseite, Payment, Mahnwesen, Testimonials, AGB, Datenschutz) sind für Demo sichtbar, aber nur lesend; Payment ohne Schlüssel, SEO ohne IP-Adressen (`server/utils/demoRead.ts`).

## Prüfung
`DEMO_PASSWORD=… scripts/aws/check-demo-login.sh` (Lesen, Sperren, Anlegen und Zurücksetzen live), Tests `tests/security/demo-sandbox.test.ts`, `demo-read.test.ts`.

## Pool: eigenes Konto je Besucher (Stand 21.10.2026)
- **Konten:** `demo@plexora.eu` (Ausgangskonto, „Lobby“, Vorlage) und zehn Poolkonten `demo01` bis `demo10@plexora.eu` (gleiches öffentliches Passwort, Gruppe customers). Erkennung überall über `shared/demo.ts` (`isDemoEmail`).
- **Ablauf „Demo ausprobieren“:** Anmeldung mit dem Ausgangskonto → `POST /api/demo/lease` vergibt ein freies Poolkonto (Besitz 45 Minuten oder bis zum Abmelden, Drossel 12 Starts je Stunde und Adresse) und füllt es aus der Vorlage → Wechsel auf das Poolkonto. Ist alles belegt oder etwas schiefgeht, arbeitet der Besucher im Ausgangskonto (gemeinsam, wird zurückgesetzt).
- **Eigene Kopie:** Die Vorlage (gespeicherter Standard des Ausgangskontos) wird je Poolkonto umgeschrieben: E-Mail und Mandanten-ID ersetzt, jede Kennung (Rechnungs-, Kontakt-, Eintrags-ID …) bekommt ein eindeutiges Ende `-dNN`, Verweise zwischen Zeilen werden mitgeführt (`makeTransform`). So verwechseln Abfragen nach Kennung nichts.
- **Abmelden und Leerlauf:** `POST /api/demo/reset` mit `release` setzt das eigene Konto zurück und gibt es frei; der 5-Minuten-Zeitplan setzt verlassene Konten nach 30 Minuten ohne Schreibzugriff zurück und hebt abgelaufene Besitzvermerke auf.
- **Anlegen/Erneuern:** `DEMO_PASSWORD=… npx vite-node scripts/demo/provision-pool.mjs --apply` (Cognito-Konto, Mandant in plexora-nexora, erste Befüllung; Vorhandenes bleibt). Nach Änderungen am Ausgangskonto: `npx vite-node scripts/demo/snapshot.mjs`; Poolkonten holen die neue Vorlage beim nächsten Vergeben.
