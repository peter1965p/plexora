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

## b) Willkommensmail ohne Start-Passwort

| Entscheidung | Gewählt | Warum |
|---|---|---|
| Weg A (eigener Einmal-Link) oder B (Cognito „Passwort vergessen“) | **A** | Ein Schritt für den Kunden, kein Passwort in der Mail, kein zweiter Mailversand über Cognito. |
| Laufzeit des Links | 60 Minuten, einmalig; je Konto gilt nur der neueste Link | Kurzes Fenster; ein abgelaufener Link lässt sich über „Neuen Link anfordern“ ersetzen. |
| Lizenzschlüssel in der Mail | **Nein**, nur in der App (Einstellungen → Lizenzen) | Ein Geheimnis weniger im Postfach; die Lizenz ist an die E-Mail gebunden, der Schlüssel wird für den Betrieb nicht gebraucht. |
| Passwortlänge | mindestens 12 (Pool verlangt 8) | Empfehlung des Plans; serverseitig durchgesetzt, in der Oberfläche live angezeigt. |
| Wann wird der neue Ablauf aktiv? | Erst mit dem Schalter `NUXT_WELCOME_LINK=true` (`scripts/aws/set-enforce.sh welcome on`) **nach** `grant-set-password-right.sh --apply` | Ohne das AWS-Recht würde ein Kunde einen Link bekommen, der nicht funktioniert. Bis dahin läuft der bisherige Ablauf unverändert. |
| Link für Konten, die schon ein Passwort haben | wirkungslos (nur Status „wartet auf erstes Passwort“) | Ein alter Link darf nie ein eingerichtetes Konto übernehmen. |
| Konto-Orakel bei „Neuen Link anfordern“ | immer dieselbe Antwort; je Adresse 3 Mails/Stunde | Verrät nicht, welche Adressen ein Konto haben. Das Antwortverhalten (Zeit) ist nicht angeglichen; es verrät höchstens, dass ein Kauf-Konto auf sein erstes Passwort wartet. |
| Turnstile auf dem „Neuen Link“-Formular | **nicht umgesetzt** | Drossel je IP und je Adresse stattdessen; Turnstile kann nachgerüstet werden (Bot-Schutz-Modul vorhanden). |
| Token im Mail-Protokoll | Art `welcome`: nie eine Vorschau | Das Protokoll ist für alle Konten eines Mandanten lesbar. |

## c) Rollen (Inhaber, Admin, Mitglied)

| Entscheidung | Gewählt | Warum |
|---|---|---|
| Durchsetzung | Beobachtungsmodus zuerst (`NUXT_ROLES_ENFORCE` leer): die Middleware prüft und protokolliert nur „würde ablehnen“. Auswertung: `scripts/aws/enforce-report.sh`. Scharf: `scripts/aws/set-enforce.sh roles on` + `deploy-backend.sh --config-only`; Rückweg `roles off` + `--config-only` oder `rollback-backend.sh`. | Sperrt die Middleware Berechtigte aus, ist das teurer als eine fehlende Rolle. Das Umschalten machst du nach dem Test mit Sylvia als Mitglied. |
| Newsletter, Sequenzen, Automatisierungen | Admin | Sie versenden Massenmails. |
| KI-Assistent | Admin | `ai/assistant/execute` führt Aktionen in allen Modulen aus und würde die Sperren eines Mitglieds umgehen. |
| Branchenmodule | Admin | Enthalten teils sensible Daten (Praxis: Patienten). |
| Termin-Einstellungen/Google-Kalender | Admin; Buchungen und Termintypen: Mitglied | Wie im Plan. |
| Zahlungs- und KI-Schlüssel, Einladungsvorlage | nur Inhaber | Kostenfolgen bzw. Team-Verwaltung. |
| Formulare | Mitglied | Kampagnen brauchen ein Formular. |
| Rolle nachträglich ändern | `PATCH /api/team/[email]`, nur Inhaber, nur `admin`/`member`; wirkt sofort | Bisher gab es nur Entfernen. |
| Unbekannte oder kaputte Rolle in der Team-Zeile | Mitglied | Im Zweifel weniger Rechte. |
| Ausfall der Rollenabfrage | scharf 503 (nach höchstens 10 Minuten mit letztem Stand), nie Rückfall auf „Inhaber“ | `resolveUserId` fällt bei Störungen auf die eigene Adresse zurück; das würde ein Mitglied zum Inhaber machen. |
| Menü und Seitenschutz in der Oberfläche | nur, wenn der Server durchsetzt (`enforced` aus `GET /api/team/role`) | Im Beobachtungsmodus ändert sich für niemanden etwas. |
| Modul-Store | Seite nur für den Inhaber (Kauf) | Admin soll nichts kaufen. |

**Abweichungen von der Zuordnung im Plan (Fehler im Entwurf, anhand der Handler korrigiert):**
- `aws/s3-upload`: war „Betreiber“, ist aber der Bild-Upload aller Konten (Profilbild, Kampagnen, Newsletter) → jedes angemeldete Konto.
- `team/accept` und `team/invite-preview`: waren „Inhaber“, müssen aber für den Eingeladenen gehen → jedes angemeldete Konto.
- `finance/batch-dunning` und `store/branch-modules` (POST): Handler verlangen die Gruppe `admins` → Betreiber.
- `licenses/portal` → Inhaber (Abrechnung); `licenses` (Verwaltung) → Betreiber.
