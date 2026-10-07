# Entscheidungen in Welle 2 (Stand 07.10.2026)

Pro offener Entscheidung aus den Plänen: was gewählt wurde und warum. Leitlinie: im Zweifel die sicherere Option, die bestehende Nutzer **nicht** einschränkt.
Alle Durchsetzungen starten im **Beobachtungsmodus** (nur Protokoll "würde ablehnen"); Umschalten mit `scripts/aws/set-enforce.sh plan|roles on|off` und `deploy-backend.sh --config-only`.

## a) Offene Registrierung, Limits, Lizenzprüfung

| Entscheidung | Gewählt | Warum |
|---|---|---|
| Durchsetzung sofort oder erst beobachten? | Erst beobachten (`NUXT_PLAN_ENFORCE` leer). Scharf schaltest du, nachdem das Protokoll (`[plan] würde ablehnen …`) gelesen ist. | Ich konnte keinen Bestandsbericht über Mandanten ohne Lizenz erzeugen (Tabellenscan wurde verweigert). Ein falsches Scharfschalten würde dich, Sylvia oder Kunden aussperren. |
| Wer ist ausgenommen? | Cognito-Gruppe `admins`, das Demo-Konto und der Mandant mit der E-Mail aus `NUXT_ADMIN_EMAIL` | Dein Konto, Sylvia (Team-Mitglied erbt den Tarif des Inhabers) und der Demo-Mandant bleiben unverändert. |
| Unbekannte Lizenzstufe in einer aktiven Lizenz | mindestens Starter | Zahlende Kunden fallen nie auf Free. |
| Darf Free Daten speichern? | Ja, begrenzt: CRM 50 (Kontakte+Firmen+Deals zusammen), Projekte 25, Support 25; Lesen und Ändern bleibt immer möglich | Ausprobieren ja, dauerhaft kostenlos nutzen nein. Geprüft beim Anlegen. |
| Mail-Töpfe | Zwei Töpfe (System / Massen). Zahlen: Free 5/0, Starter 100/200, Pro 500/1000, Enterprise 2000/5000 pro Tag; je Empfänger 3 pro Tag | Systemmails (Rechnung, Bestätigung) scheitern nie am Marketing-Limit. Alle Werte stehen in `shared/plans.ts`. |
| Free und Mail | Systemmails nur an die eigene Adresse, keine Massenmails | Verhindert, dass die Plattform-Domain als Spam-Relay dient. |
| Massenversand über dem Limit | ganz abgelehnt (429), nie halb gesendet; Meldung nennt den Rest ("noch 50 von 200") | Plan: "ganz oder gar nicht". Eine Teil-Zustellung mit Fortsetzen am nächsten Tag ist ein eigener Auftrag. |
| Öffentliche Abläufe (Bewerbung, Newsletter-Anmeldung, Shop-Bestellung) bei Limit | speichern weiter, nur die Bestätigungsmail entfällt | Eine Bewerbung oder Bestellung darf nie am Mail-Limit verloren gehen. |
| Interne Sicherheitsmeldungen und Testsendungen | nicht gezählt | Sicherungs-Meldungen an den Inhaber dürfen nie blockiert werden; Vorschau-Mails an sich selbst auch nicht. |
| Plattform-Mails (Willkommen nach Kauf, Modul-Kauf) | nicht gezählt | Absender ist die Plattform, nicht ein Mandant. |
| Upload: Schlüssel | `<Präfix>/<Mandanten-Ordner>/<Name>` | Schließt das Überschreiben fremder Dateien mit bekanntem Namen. Bestehende Dateien ohne Ordner bleiben lesbar (keine Migration nötig). |
| Upload: Inhalt | Dateiinhalt (Magic Bytes) muss zur Endung passen | HTML/Skript als `bild.png` kommt nie in den öffentlichen Bucket. |
| Upload: SVG | nur mit Lizenz **und** nur ohne Skript, Ereignis-Attribute, Entities, fremde Verweise | SVG komplett zu verbieten würde bestehende Logos brechen; ohne Prüfung ist es aktiver Inhalt. |
| Upload: Gesamtspeicher je Mandant | **nicht umgesetzt** | Das Löschen kennt die Dateigröße nicht, ein Zähler würde nur wachsen. Stattdessen Dateigröße + Anzahl pro Stunde/Tag. Sauber lösbar mit einem monatlichen Abgleich (eigener Auftrag). |
| Module serverseitig prüfen | zentrale Middleware mit Präfixregeln (`server/utils/moduleAccess.ts`), Routen-Test erzwingt eine Regel je Route; ohne Regel gilt "paid" | Eine neue Route kann das Modul nicht vergessen. |
| Branchenpakete | erlaubt mit jeder aktiven Lizenz **oder** wenn das Paket beim Mandanten installiert ist | Kostenlose Pakete haben keine Lizenz; die Installation wurde schon beim Installieren geprüft. |
| Öffentliche Seiten/Formulare von Free-Mandanten sperren | **nicht umgesetzt** | Ohne Bestandsbericht könnte ich laufende Kundenseiten abschalten. Folgeauftrag nach der Beobachtungsphase. |
| 90-Tage-Löschung von Free-Konten | **nicht umgesetzt** | Löschen von Daten außerhalb deines Auftrags; dazu braucht es dein Okay und ein eigenes Skript. |
| Neue Konten in den ersten 7 Tagen halbe Limits | **nicht umgesetzt** | Das Kontoalter steht nicht im Mandanten-Datensatz; Free hat ohnehin die kleinsten Limits. |
| Registrierung: offen lassen, Turnstile, E-Mail-Bestätigung | Offen lassen (Weg 1), Schutz über die Free-Stufe. Turnstile auf der Registrierung **nicht** umgesetzt | Die Registrierung läuft direkt im Browser gegen Cognito; ein Turnstile-Token könnte nur der Pre-Sign-up-Trigger prüfen und bräuchte dort ein Secret (neuer AWS-Teil). Google-Konten sind durch den Trigger schon auf bestätigte Adressen begrenzt. |
| Ausfall der Tarifabfrage | letzter bekannter Tarif bis 10 Minuten, danach scharf 503 (Beobachtungsmodus: durchlassen) | Nie "alles erlaubt". |
