# Status aller Aufträge (Stand 08.10.2026)

Stände: **erledigt** · **offen** (meine Arbeit) · **wartet auf dich** · **wartet auf Rechte** (Administrator nötig).
Live: Backend Version 40 (previous 39), Pre-signup Version 2, alle drei Prüfungen grün (`check-public-flows.sh`, `check-demo-login.sh`, `check-storage.sh`).

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
| Willkommensmail mit Einmal-Link statt Start-Passwort | gebaut und deployt, **Schalter aus** (alter Ablauf läuft); Live-Test ohne Browser vorbereitet (`scripts/security/welcome-flow-test.mjs`: signiertes Kaufereignis, Mail über die Resend-API lesen, Link einlösen, Anmeldung, Aufräumen) | **erledigt und live (08.10.2026, Version 21)**: Recht von dir gesetzt, Schalter `welcome` AN. Live-Test bestanden (12 von 12 Prüfungen): Mail mit Link, ohne Passwort und ohne Lizenzschlüssel; Link setzt das Passwort, zweiter Versuch 400; Bestätigungsmail ohne Link; Anmeldung mit dem neuen Passwort klappt; Konto CONFIRMED. Testdaten (Konto, Lizenz) gelöscht und belegt |
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
| Alarm: Log-Filter `[request error]` | **erledigt (08.10.2026)**: Filter von dir in der CloudShell gesetzt, Metrik `Plexora/RequestErrors` existiert (lesend bestätigt) | – |
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

## 7. Angebote (neu, 11.10.2026)

| Punkt | Stand | Was noch fehlt |
|---|---|---|
| Angebote in Finanzen (Tab "Angebot", Menü Neu), Nummer AN-JJJJ-NNN, Positionen mit Katalog, PDF, Versand per Mail mit Annahme-Link, Status Entwurf/Gesendet/Angenommen/Abgelehnt/Abgelaufen, "In Rechnung umwandeln" | **erledigt und live (Version 22)**; Routen anonym geprüft (401, öffentliche Ansicht bei falschem Link 404); drei Prüfungen grün | wartet auf dich: ein Angebot an dich selbst senden und den Link in der Mail öffnen (annehmen, dann Rechnung daraus) |
| Kunde nimmt online an (`/angebot/<Link>`, geheimer Link, nur Hash gespeichert) | erledigt, live | – |
| Buttons "Angebot erstellen" bei Kontakt und Deal (CRM) | erledigt, live (Formular vorbefüllt, nichts wird ohne Speichern angelegt) | – |
| Kampagne: Schalter "Bei Anfrage Angebot-Entwurf anlegen" (Paket, Preis netto, Gültigkeit, Aktionsende) | erledigt, live; es entsteht nur ein **Entwurf** + Benachrichtigung, nie ein automatischer Versand | wartet auf dich: Schalter in der Aktions-Kampagne einschalten (Paket "Website-Paket", 450 €) und einmal testen |
| Umsatzsteuer | folgt deinen Rechnungs-Einstellungen (Standard 19 %, Kleinunternehmer möglich) | wartet auf dich: bitte prüfen, ob 450 € netto oder brutto gemeint sind und ob Kleinunternehmer gilt |

## 8. Ferienwohnungen (neu, 13.10.2026)

| Punkt | Stand | Was noch fehlt |
|---|---|---|
| Branchenpaket Ferienwohnungen (`/fewo`): Unterkünfte, Buchungen, Belegungsplan, Preise, Rechnung aus Buchung | **erledigt und live (Version 30)**; Tabellen angelegt; drei Prüfungen grün; neue Routen anonym 401/404 | wartet auf dich: einmal ausprobieren (Unterkunft, Buchung, Rechnung) |
| Booking.com/Airbnb per iCal (Link raus, Kanal-Kalender rein) | erledigt, live; Anleitung `docs/fewo-modul.md` | wartet auf dich: echten Booking-Link eintragen und prüfen, ob Booking den Plexora-Link annimmt (das kann nur dein Konto zeigen) |
| Modul-Store-Eintrag mit Preis (Menüpunkt in der Seitenleiste) | nicht angelegt (Preis ist deine Entscheidung; Käufer kämen sonst in einen Checkout) | wartet auf dich: Preis nennen |
| Automatischer Abgleich, Gäste-Verfügbarkeit auf der Webseite, Booking.com-Live-Schnittstelle | nicht gebaut | auf Anforderung; Live-Schnittstelle nur nach Zulassung als Connectivity Partner |

## 9. Startseite plexora.eu (neu, 13.10.2026)

| Punkt | Stand | Was noch fehlt |
|---|---|---|
| Freundliches helles Design als Standard (Creme, weiche Karten, Orange); dunkles Design bleibt per Umschalter | erledigt, live | wartet auf dich: ansehen |
| Einstellungen → "Startseite (Design)": Hell / Dunkel / Eigene Farben (Hintergrund + Deckkraft, Akzent, Textfarbe), Vorlagen (u. a. "Deep Blue auf 75 % Schwarz"), Live-Vorschau, Kontrastwarnung | erledigt, live (Backend Version 31); nur für Betreiber | wartet auf dich: Vorlage wählen und speichern |
| Seitenrand der Abschnitte (klebten bei 1440 px am Rand) | behoben | – |

## 10. Google raus, eigener Kalender (neu, 14.10.2026)

| Punkt | Stand | Was noch fehlt |
|---|---|---|
| Google-Kalender-Anbindung (Verbinden, Meet, Kalenderanzeige, Routen, Einstellungen, Datenschutz-Abschnitt dazu) | **ausgebaut, live (Version 34)**; "Anmelden mit Google" (Login) bleibt | **Gespeicherte Google-Zugänge in der Datenbank gelöscht (14.10.2026, auf dein Okay; 1 Mandant, danach 0)**; wartet auf dich: Zugriff im Google-Konto entziehen, Cloud-Projekt prüfen (Kalender-Berechtigungen entfernen), Lambda-Variablen für Google-Kalender entfernen (Secrets setzt du) |
| Eigener Terminkalender in Termine (Monat/Woche/Tag, Klick auf freie Stelle trägt Termin ein, Details und Stornieren) | erledigt, live | wartet auf dich: ansehen |
| Abo-Link (.ics) für Google/Apple/Outlook, Kalenderdatei (.ics) in der Terminbestätigung | erledigt, live | wartet auf dich: Abo-Link einrichten und eine Testbuchung machen |
| Video-Termine: Jitsi ist jetzt der Standard | erledigt | – |
| Gantt-Projektplaner (wie MS Project) in Projekte → Reiter "Planer": Balken mit Fortschritt, Meilensteine, Abhängigkeiten mit Pfeilen, Zuständige, kritischer Pfad, Ziehen/Dehnen/Verknüpfen mit der Maus | **erledigt, live (Version 35)** | wartet auf dich: ausprobieren (Projekt anlegen, Vorgänge anlegen) |

## 11. Blog: Tags, Autor, Kommentare (neu, 16.10.2026)

| Punkt | Stand | Was noch fehlt |
|---|---|---|
| Tags sind anklickbar, `/blog?tag=…` filtert die Liste, Tag-Leiste oben | erledigt, live (Website) | – |
| Autor wird beim Beitrag und in der Liste angezeigt (Feld "Autor" im Editor, Standard: Kontoname bzw. Firma) | erledigt, live | wartet auf dich: bei älteren Beiträgen den Autor eintragen (bis dahin steht der Firmenname) |
| **16.10.: Kommentare eingeschaltet (Modus "erst nach Freigabe") und live durchgespielt (27 Prüfungen bestanden, Testkonto samt Testkommentar wieder gelöscht, `scripts/security/visitor-comments-live-test.mjs`)**; nicht bestätigte Konten verfallen nach 7 Tagen | – |
| **17.10.: Cloudflare-Bot-Schutz (Turnstile) für "Konto anlegen" und "Passwort vergessen" bei Kommentaren, Schalter unter Einstellungen → Bot-Schutz ("Konto und Kommentare"); bei dir eingeschaltet, live geprüft (ohne/falsches Token: 403)** | – |
| Kommentare nur mit Konto (Registrierung mit Mail-Bestätigung, Anmeldung, Passwort vergessen, Konto selbst löschen); Schalter Aus / sofort sichtbar / erst nach Freigabe; Beitrag kann einzeln abschalten; Verwaltung im Blog-Admin (Reiter "Kommentare") | erledigt, live (Backend Version 38 + Website + Verwaltung); **standardmäßig AUS** | wartet auf dich: im Blog-Admin → Kommentare einschalten, mit eigener Adresse Konto anlegen und kommentieren; **Datenschutzerklärung der Webseite: Entwurf liegt vor (`docs/entwurf-datenschutz-paeffgen-it.html`, 13 Abschnitte); der veröffentlichte Text enthält bisher nur den nicht mehr zutreffenden Google-Kalender-Abschnitt; Impressum und AGB sind nur Platzhalter. Einsetzen mit `scripts/aws/set-site-privacy-page.sh PLXR-GOD0-MODE-0000-PETE docs/entwurf-datenschutz-paeffgen-it.html --apply` erst nach deiner Freigabe** |

## Empfohlene Reihenfolge
0. Erledigt am 08.10.: Zahlungs-Secrets verschlüsselt.
1. **Turnstile-Beweis** (2 Minuten): Formular absenden, ich prüfe das Log; Secret rotieren.
2. **CloudShell: Access Analyzer und Bucket-Meldungen** (30 Minuten, Ablauf liegt bereit).
3. ~~Willkommensmail aktivieren~~ erledigt am 08.10.: kein Start-Passwort mehr in Mails. Noch offen dazu: ein echter Stripe-Testkauf mit Bezahlseite (nur im Browser möglich).
4. **Zahlungs-Secrets verschlüsseln** (Migration mit Probe).
5. **Rollen mit Sylvia testen**, Protokoll auswerten, scharf schalten; gleichzeitig Einladung mit zwei Konten, Logo und Mail in Gmail/Outlook.
6. **`NUXT_AUTH_ENFORCE`** nach deinem Klicktest.
7. **Tarif-Limits** 1–2 Wochen beobachten, dann scharf.
8. **Review Phase B bis E** zusammen mit A-6 und A-8.
9. Jederzeit nebenbei: **Lambda-Limit-Antrag** (5 Minuten), Aether-Entscheidung, Datenschutztext Päffgen IT.
