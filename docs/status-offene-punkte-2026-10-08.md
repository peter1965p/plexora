# Status aller Aufträge (Stand 08.10.2026)

Stände: **erledigt** · **offen** (meine Arbeit) · **wartet auf dich** · **wartet auf Rechte** (Administrator nötig).
Live: Backend Version 20 (previous 19), Pre-signup Version 2, alle drei Prüfungen grün (`check-public-flows.sh`, `check-demo-login.sh`, `check-storage.sh`).

## 1. Sicherheit: Review (Phase A) und was daraus wurde

| Punkt | Stand | Was noch fehlt |
|---|---|---|
| A-1 Rollen Inhaber/Admin/Mitglied | gebaut und deployt, **nur Beobachtung** | wartet auf dich: Test mit Sylvia als Mitglied und die Meldung "Sylvi getestet"; dann führe ich `enforce-report.sh` aus und berichte, was abgelehnt worden wäre (**ich schalte nicht scharf**; das machst du danach selbst mit `set-enforce.sh roles on`) |
| A-2 Einladung nimmt dem Opfer den Arbeitsbereich | erledigt, deployt | wartet auf dich: Browser-Test mit zwei Konten |
| A-3 Anmeldetoken in der URL (Google-Kalender) | erledigt, deployt (Einmalwert 60 s) | – |
| A-4 Einladungslinks laufen nie ab | erledigt, deployt | – |
| A-5 Routen-Test mit schwachen Belegen | erledigt (echte Aufrufe, Nachweis je öffentlicher Route) | – |
| A-6 Request-Bodys 1:1 in Datensätze (21 Routen) | **offen** | Positivliste je Route; gehört vor oder mit Phase B |
| A-7 Kein serverseitiges Netz | Routen-Test, Tarif- und Rollen-Middleware erledigt | wartet auf dich: `NUXT_AUTH_ENFORCE` nach deinem Klicktest (ich setze es nicht) |
| A-8 Ein Secret für vier Zwecke | **offen** | eigenes Secret je Zweck; Secrets setzt du selbst |
| A-9 Absenderadresse ungeprüft in der Einladungsmail | erledigt (Mail-Baustein maskiert) | – |
| Phase B (Ein-/Ausgaben, Referrer), C (Vollständigkeit der Demo-Sperre), D (Cognito-Einstellungen), E | **offen** | starten auf dein Wort. Du hattest sie bis zum Deploy von 1 bis 5 zurückgestellt, das ist jetzt erfolgt. Der Inhalt von Phase E steht nicht im Bericht, das ist dein Auftrag |

## 2. Welle 2

| Punkt | Stand | Was noch fehlt |
|---|---|---|
| Offene Registrierung: Tarifmodell, Mail-Tageslimit, Upload-Härtung, Free-Mengen, Anzeige | gebaut und deployt, **nur Beobachtung** | wartet auf dich: Protokoll lesen (`enforce-report.sh`), dann `set-enforce.sh plan on` |
| Registrierung: Turnstile beim Anmelden, Gesamtspeicher je Mandant, Sperre öffentlicher Seiten von Free-Mandanten, 90-Tage-Löschung | bewusst nicht gebaut (Begründung in `docs/security/entscheidungen-welle-2.md`) | offen: nur auf Anforderung |
| Willkommensmail mit Einmal-Link statt Start-Passwort | gebaut und deployt, **Schalter aus** (alter Ablauf läuft); Live-Test ohne Browser vorbereitet (`scripts/security/welcome-flow-test.mjs`: signiertes Kaufereignis, Mail über die Resend-API lesen, Link einlösen, Anmeldung, Aufräumen) | wartet auf Rechte: CloudShell-Teil A in `docs/aws/cloudshell-ablauf-willkommensmail-und-logfilter.md` (`grant-set-password-right.sh --apply`), dann "Recht gesetzt" melden; danach schalte ich `welcome on` und teste selbst |
| Rollen scharf | siehe A-1 | wartet auf dich |
| Mail-Baustein für weitere Systemmails | **zurückgestellt** bis Zahlungs-Secrets, Willkommensmail, Log-Filter und Rollen-Auswertung durch sind | Einladung und Passwort-Mails nutzen eigene Layouts; rund 17 Versandstellen haben noch eigenes HTML. Erst ein Plan, dann umbauen |
| Mail-Vorlage (Einladung): Logo, Editor | erledigt (Upload bis 3 MB, Speichern-Fehler behoben, deployt) | wartet auf dich: Logo erneut hochladen, Testmail in Gmail und Outlook ansehen |
| Kontenwähler beim Einladen (`select_account`) | gebaut, deployt | wartet auf dich: echter Test mit zwei Google-Konten |

## 3. Cognito, Mail, Zahlung, Limits

| Punkt | Stand | Was noch fehlt |
|---|---|---|
| Cognito pre-signup (Regel `separate`) | angewendet (auf deine ausdrückliche Anweisung), live Version 2, Rückweg `--rollback` | wartet auf dich: Regel bestätigen oder `reject`/`delete` wählen; Angriffstest mit echtem Konto (Schritte auf Anfrage) |
| Resend-Webhook-Secret | **entfallen**: du hast keinen Webhook in Resend; der Endpunkt lehnt ohne Signatur ab | optional später: Webhook anlegen, damit Newsletter-Bounces erfasst werden |
| Lambda-Limit (Throttling, Konto-Limit 10) | Antragstext liegt in `docs/aws/antrag-lambda-limit.md` | wartet auf dich: Antrag selbst einreichen (`plexora-app` darf keine Service Quotas) |
| Stripe-Secrets in der Datenbank | **erledigt (08.10.2026)**: Stripe-Schlüssel (Länge 107) und Webhook-Secret (Länge 38) sind verschlüsselt; Probe vorher/nachher gleich (Webhook gültig 200, falsch 400, Checkout 200); Probe-Entschlüsselung stimmt; drei Prüfungen grün | wartet auf dich: den Klartext-Export (Rechte 600) unter `~/Dev/backups/plexora/payment-secrets-export-….json` nach ein paar sauberen Tagen mit `shred -u` löschen; Rückweg bis dahin `encrypt-payment-secrets.mjs --rollback <Export>` |
| Stripe-Schlüssel rotieren | nicht beauftragt | deine Entscheidung |
| Alarm: Log-Filter `[request error]` | Alarme laufen, Filter fehlt (Metrik `Plexora/RequestErrors` existiert noch nicht, heute lesend geprüft) | wartet auf Rechte: fertiger Befehl in Teil B desselben Dokuments, dann "Filter gesetzt" melden; ich prüfe lesend, ob die Metrik erscheint |
| Protokoll-Maskierung, Svix, Lizenzprüfung ohne E-Mail | erledigt | – |

## 4. Turnstile

| Punkt | Stand | Was noch fehlt |
|---|---|---|
| Serverprüfung erreicht Cloudflare | belegt (ungültiges Token: `invalid-input-response`, Secret gültig) | – |
| "Siteverify isn't being called" | wahrscheinliche Ursache: Widget läuft bei jedem Aufruf, Siteverify nur beim Absenden; Erfolgsprotokoll deployt (`[turnstile] bestätigt`) | wartet auf dich: einmal das Kampagnenformular absenden, dann lese ich das Log |
| Terminbuchung: Widget und Serverprüfung | geprüft: Abgleich in allen 16 Kombinationen, echter Browserlauf (Bot-Schutz an/aus/Widget nicht ladbar), Prüfung in `check-public-flows.sh` | – |
| Turnstile-Secret im Screenshot gezeigt | Rotation empfohlen | wartet auf dich (Cloudflare, dann Einstellungen → Bot-Schutz) |
| Datenschutztext Päffgen IT um den Turnstile-Absatz ergänzen | offen | wartet auf dich: veröffentlichter Rechtstext, erst zeigen; Cloudflare-Aussage prüfen |

## 5. Speicher-Regel

| Punkt | Stand | Was noch fehlt |
|---|---|---|
| Deklaration, Offline-Tests, Deploy-Gate | erledigt, deployt (Fremd-Buckets nur Warnung) | – |
| Access Analyzer und Meldung bei Bucket-Änderungen | Skripte und CloudShell-Ablauf fertig, nur `--dry-run` gelaufen | wartet auf Rechte: du führst `--apply` in der CloudShell aus (`docs/aws/cloudshell-ablauf-warnungen.md`) |
| Aether-OS-Bucket `aether-os-assets-…` ganz öffentlich | Zustand festgeschrieben, Gate warnt nur bei Abweichung | wartet auf dich: soll das so bleiben? (Projekt nicht Plexora) |
| Tägliche Prüf-Lambda | Plan liegt in `docs/aws/plan-taegliche-speicherpruefung.md` | zurückgestellt |
| S3-Zugriffsprotokoll, CloudFront | Plan liegt, nichts gebaut | zurückgestellt |

## 6. Ältere Punkte (Auszug aus den Notizen)

| Punkt | Stand |
|---|---|
| Google-App-Verifizierung (steht im Testmodus), `plexora.eu` ohne www zeigt auf fremden Server, Idle-Abmeldung leitet auf `/` statt `/login?reason=idle` | wartet auf dich |
| Historie der öffentlichen Git-Repos (Entscheidung, ob bereinigt wird) | wartet auf dich |
| Verschlüsselung des Sicherungsordners mit `encrypt-backup.sh` (deine Passphrase) | wartet auf dich |
| Kampagnen-Kennzeichnung in der Terminart-Liste, Zoom/Teams, Umzug Dogado | offen, nicht beauftragt |
| Sicherung, Beispieldaten-Bereinigung, Demo-Mandant mit Seed, Entwurfs-Autosave, Lead-Seiten-Editor, Hero-Bild | erledigt |

## Empfohlene Reihenfolge
0. Erledigt am 08.10.: Zahlungs-Secrets verschlüsselt.
1. **Turnstile-Beweis** (2 Minuten): Formular absenden, ich prüfe das Log; Secret rotieren.
2. **CloudShell: Access Analyzer und Bucket-Meldungen** (30 Minuten, Ablauf liegt bereit).
3. **Willkommensmail aktivieren** (Recht vergeben, Schalter, Testkauf): danach steht kein Start-Passwort mehr in Mails.
4. **Zahlungs-Secrets verschlüsseln** (Migration mit Probe).
5. **Rollen mit Sylvia testen**, Protokoll auswerten, scharf schalten; gleichzeitig Einladung mit zwei Konten, Logo und Mail in Gmail/Outlook.
6. **`NUXT_AUTH_ENFORCE`** nach deinem Klicktest.
7. **Tarif-Limits** 1–2 Wochen beobachten, dann scharf.
8. **Review Phase B bis E** zusammen mit A-6 und A-8.
9. Jederzeit nebenbei: **Lambda-Limit-Antrag** (5 Minuten), Aether-Entscheidung, Datenschutztext Päffgen IT.
