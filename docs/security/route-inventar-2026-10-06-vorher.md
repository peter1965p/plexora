# Bestandsaufnahme: Anmeldung, `demo-user`-Rückfall und Demo-Zugang

Stand: 06.10.2026 · Erstellt per statischer Analyse von `server/api/**` (370 Routen; vier Formular-Routen sind trotz Muster-Treffer geschützt und entsprechend korrigiert), `server/middleware/auth.ts`, DynamoDB-Zählung (nur lesend) und AWS-Konfiguration (nur lesend). Es wurde **nichts geändert** und **nichts ausgelöst** (keine Schreib-/Mail-/KI-Aufrufe gegen Produktion).

> Grenzen der Analyse: Die Einstufung ist ein Textmuster-Scan. Anmeldung in Hilfsfunktionen (z. B. `draftContext`) erkennt er nicht; bekannte Fälle sind markiert. Aussagen zu Mail-/KI-Missbrauch stammen aus dem Code, nicht aus Versuchen.

## 1. Zusammenfassung

| Einstufung | Routen |
|---|---:|
| geschützt (Token) | 216 |
| Rückfall demo-user | 76 |
| offen – in Middleware-Allowlist | 41 |
| OFFEN – nicht in Allowlist | 22 |
| geschützt (Token) + Guard (Body-Wert) | 8 |
| Rückfall demo-user + Guard (wirkungslos, Body-Wert) | 4 |
| geschützt (Token, Hilfsfunktion) | 3 |
| **gesamt** | **370** |

Hinweis zu „OFFEN – nicht in Allowlist“ (22): 8 davon (`settings/{branding,company,invoice,branch-packages}` GET, `team/{members,invite,[email]}`, `store/checkout`) lesen `context.auth` ohne Rückfall und prüfen teils selbst auf leere E-Mail; sie sind nicht grundsätzlich offen, aber uneinheitlich. Die übrigen 14 haben keinerlei Prüfung (Presets, Rechtstexte, `pages/[slug]`, `licenses/[key]`, `marketing/email-stats`, `update-redirects`, `analytics/vitals`, Stripe-/Shop-Webhook, `team/accept`, `google-callback`, `marketing/public/[slug]`).

Wichtigste Befunde (Details in Abschnitt 4–6):

- **Ungültiges/abgelaufenes Token wird still zu `demo-user`** (Middleware setzt `context.auth` nur bei gültigem Token, `NUXT_AUTH_ENFORCE` ist nicht gesetzt). 80 Routen greifen dann auf `demo-user` zurück (das Textmuster fand 84; vier davon, die Formular-Verwaltung `/api/forms/[id]`, sind per `requireAuth` und `assertOwner` geschützt).
- **Anonym schreibbar:** 57 Routen schreiben ohne Anmeldung unbegrenzt Daten unter `demo-user` (Kontakte, Rechnungen, Kampagnen, HR …), davon 4 mit dem wirkungslosen `demoGuard`. Kein Rate-Limit, kein Größenlimit.
- **Anonymer Mailversand über die Plattform-Domain (per Code):** `POST /api/finance/[id]/send` und `/dunning` (Empfänger `body.toEmail`, Absender `billing@plexora.eu`) sowie `POST /api/marketing/[id]/send-email` (an selbst angelegte Kontakte, freier Text). Ein Aufrufer ohne Token kann die nötigen Rechnungen/Kontakte vorher selbst unter `demo-user` anlegen. Nicht ausprobiert.
- **`demoGuard` schützt nicht:** Er prüft `body.userId`, also einen Wert, den der Aufrufer selbst schickt. Er blockiert nur ehrliche Aufrufe. Er gilt nur für 12 Settings-Routen.
- **`GET /api/marketing/email-stats?campaignId=…` ist offen** und liefert pro Empfänger Name, E-Mail und Status. Die Kampagnen-ID steht in der öffentlichen Landingpage-Adresse (`/lead/<campaignId>`). Bei Kampagnen mit Versand wären Empfängerdaten abrufbar (an deiner Kampagne `eeb06c2a…` aktuell leer, daher nicht mit echten Daten bestätigt).
- **Google-Callback ohne Bindung:** `GET /api/termine/google-callback` nimmt `state` = Tenant-ID ohne Sitzungsbindung. Wer die Tenant-ID kennt, kann sein eigenes Google-Konto an einen fremden Tenant hängen (Termine landen dann bei ihm).
- **`POST /api/webhooks/resend` hat keine Signaturprüfung** (Stripe-Webhooks haben sie). Gefälschte Bounce-Ereignisse könnten Abonnenten sperren.
- **Limits fehlen fast überall:** Rate-Limits gibt es nur bei Newsletter-Anmeldung/-Bestätigung/-Abmeldung, Seitenaufrufen und dem öffentlichen KI-Chat (200/Tag/Tenant). Terminbuchung, Formulare, Kontakt, Bewerbungen, Bestellungen, `analytics/vitals` und alle `demo-user`-Schreibrouten sind unbegrenzt.
- **KI/Stripe:** Kein Plattform-KI-Schlüssel in der Lambda-Umgebung (`NUXT_ANTHROPIC_API_KEY` fehlt), also derzeit keine KI-Kosten durch `demo-user`; der Code hat aber einen Plattform-Fallback, der bei späterem Setzen sofort für `demo-user` gelten würde.

## 2. Wie der Demo-Zugang heute aufgebaut ist

| | Demo-Login-Konto | Anonymer Rückfall `demo-user` |
|---|---|---|
| Wie | echtes Cognito-Konto `demo@plexora.eu` (Benutzername `demo-plexora`), Passwort steht auf der Startseite | kein/ungültiges Token → Serverkennung `demo-user` |
| Rechte | Gruppe `customers` (keine Admin-Rechte) | keine Anmeldung |
| Datenbereich (Besitzer-String) | `demo@plexora.eu` · 55 Zeilen | `demo-user` · 50 Zeilen |
| Wer nutzt es | alle Besucher gemeinsam (ein Konto, geteilter Stand) | jeder Aufrufer der API |
| Gewollt? | ja (Startseite „Demo ausprobieren“) | Altlast: `demoTracker`/`demoGuard` deuten auf einen früheren anonymen Demo-Modus hin; die Oberfläche selbst leitet ohne Login auf `/login` |

Daten in Tabellen (nur Zählung): `demo-user`: hr 2, contacts 4, deals 3, projects 3, companies 1, contracts 1, finance 2, cashbook 10, hr-timelog 10, leave 4, products 10. `demo@plexora.eu`: hr 7, contacts 11, deals 11, projects 6, support 3, marketing 1, companies 1, contracts 2, finance 10, forms 1, settings 2.

## 3. Antworten auf deine vier Fragen

### 3.1 Bewusst ohne Anmeldung vs. zufälliger Rückfall

- **Bewusst öffentlich** (Allowlist, Abschnitt 5): Landingpages, Lead-Formular, Terminbuchung, Nexora-Website-Routen, Newsletter-Links, Zahlungslinks, Webhooks, Cron-Routen. Sie brauchen keinen `demo-user`.
- **Bewusst Demo:** Das Demo-Login-Konto (echtes Token). Es läuft über den normalen geschützten Pfad.
- **Nur zufällig auf `demo-user`:** alle 80 Rückfall-Routen. Nur 12 Settings-Routen (8 davon mit Token, 4 mit Rückfall) treffen überhaupt eine Demo-Entscheidung (`demoGuard`), und die wirkt nicht (Body-Wert). Für die übrigen 76 gibt es keine bewusste Demo-Regel.

### 3.2 Trennung von echten Mandanten (Lesen und Schreiben)

- **Lesen:** Listen-Routen nutzen `getUserId`/`queryByUser` und damit nur die Token-E-Mail oder `demo-user`; ein echter Mandant ist ein E-Mail-String und kann nicht `demo-user` sein. Im ganzen Server gibt es **keine** Route, die die Mandanten-Identität aus `body.userId`, `query.userId` oder `x-user-email` übernimmt (global gesucht).
- **Schreiben:** Create-Routen setzen `userId` aus der Token-E-Mail bzw. `demo-user`. Änderungen/Löschen per ID laufen über `assertOwner` (Vergleich mit dem aufgelösten Besitzer); mit Rückfall betrifft das nur `demo-user`-Zeilen.
- **Lücken in der Trennung:** (a) `GET /api/marketing/email-stats` hat gar keine Besitzerprüfung; (b) `GET /api/licenses/[key]` liefert den gesamten Lizenzdatensatz zu einem Schlüssel; (c) `demoGuard` und die Trennung hängen an String-Konventionen statt an einem festen Demo-Mandanten.
- **Demo-Login-Konto:** teilt sich einen Stand für alle Besucher. Es ist kein Admin, kann aber alle Kundenfunktionen nutzen (Rechnungen, Mails, Team einladen, …), weil `demoGuard` nur den Text `demo-user` blockiert.

### 3.3 Echte Nebenwirkungen und Kosten mit `demo-user` (bzw. ohne Anmeldung)

| Route | Nebenwirkung | Anmerkung |
|---|---|---|
| `POST /api/finance/[id]/send` | Mail mit PDF (Resend, billing@plexora.eu) | Empfänger `body.toEmail` frei wählbar; Rechnung vorher anonym per `POST /api/finance` anlegbar |
| `POST /api/finance/[id]/dunning` | Mahn-Mail (Resend) | wie oben |
| `POST /api/marketing/[id]/send-email` | Mails an alle Kontakte des Besitzers + optional KI-Text | Kontakte vorher anonym anlegbar, freier Text im manuellen Modus |
| `POST /api/marketing/[id]/preview-email` | KI-Aufruf (nur wenn Plattform-Schlüssel gesetzt) | derzeit kein Plattform-Schlüssel in der Lambda |
| `POST /api/forms/[id]/submit` | Mails/Funnel-Starts beim Formular-Eigentümer | öffentlich gewollt; ohne Rate-Limit |
| `POST /api/marketing` | Kampagnen-Termin (nur wenn Tenant existiert) | für `demo-user` wirkungslos (kein Tenant) |
| `POST /api/public/[tenantId]/termine/book` | Bestätigungsmail an `customerEmail`, Google-Termin | öffentlich gewollt; keine Drossel, Empfänger frei |
| `POST /api/jobs/[id]/apply, /newsletter/signup, /contact` | Mail bzw. Datensatz | Newsletter-Anmeldung ist gedrosselt, Rest nicht |
| `POST /api/licenses/checkout, /pay/[id]/checkout, /shop/checkout, /store/checkout` | Stripe-Checkout-Sitzungen | öffentlich gewollt; unbegrenzt anlegbar |
| `POST /api/analytics/vitals` | unbegrenzte DynamoDB-Schreibzugriffe | öffentlich, ohne Drossel |
| `POST /api/finance/bank-import, /hr/*, /contacts, /deals …` | Schreibzugriffe (DynamoDB On-Demand) | Kosten gering, aber unbegrenzt |

Kosten: Resend (Mailkontingent, Reputation der Domain `plexora.eu`), DynamoDB-Schreibzugriffe und Lambda-Aufrufe (derzeit im Gratis-Bereich), Stripe (keine Gebühren für nicht bezahlte Sitzungen). Kein KI-Aufwand, solange kein Plattform-Schlüssel gesetzt ist.

### 3.4 Limits

- **Rate-Limit in der Anwendung:** nur `checkRateLimit` (Tabelle `plexora-newsletter-ratelimit`): Seitenaufruf-Tracking 200/h/IP, Newsletter-Anmeldung 10/h/IP und 3/h/E-Mail, Bestätigung und Abmeldung 30/h/IP, öffentlicher KI-Chat 200/Tag/Tenant (zusätzlich 6 Nachrichten Verlauf, 500 Zeichen).
- **Größe:** keine Anwendungsgrenze (Plattform: API Gateway 10 MB, Lambda 6 MB). Die neuen Entwurfs-Routen haben 32 KB.
- **API Gateway:** keine eigene Drosselung konfiguriert (Standard des Kontos). **Lambda:** keine reservierte Parallelität; das Konto-Limit liegt bei 10 gleichzeitigen Ausführungen. Das wirkt wie eine Notbremse, bedeutet aber auch: Eine Flut anonymer Anfragen kann die gesamte Anwendung für echte Nutzer ausbremsen.
- **WAF:** nicht prüfbar (IAM-Benutzer `plexora-app` darf `wafv2` nicht lesen). Die API wird direkt über die execute-api-Adresse aufgerufen, Cloudflare-Schutz der Webseiten greift dort nicht.
- **Antwort auf die Frage:** Ja, anonym lassen sich unbegrenzt Datensätze anlegen und (per Code) Mails über `plexora.eu` auslösen. KI-Aufrufe sind derzeit nicht möglich, weil kein Plattform-Schlüssel gesetzt ist.

## 4. Weitere Befunde am Rand

- `NUXT_AUTH_ENFORCE` ist nicht gesetzt; eine Anmeldung wird nur von Routen erzwungen, die selbst `requireAuth`/`requireAdmin`/`requireTenantId` aufrufen.
- Ungültiges Token ⇒ stiller Wechsel auf `demo-user` statt 401 (erklärt `userId=demo-user` in den Server-Logs).
- `GET /api/settings/{branding,company,invoice,branch-packages}` und `/api/team/*`, `POST /api/store/checkout` lesen `context.auth` ohne Rückfall, haben aber keine einheitliche 401-Behandlung; bitte einzeln prüfen.
- `POST /api/marketing/update-redirects` ist ein No-Op (Kommentar im Code) und kann entfernt werden.
- `GET /api/licenses/[key]` ist offen und gibt den ganzen Datensatz zurück (Schlüssel gilt als Geheimnis).

## 5. Allowlist der bewusst öffentlichen Routen (Vorschlag)

Diese Routen bleiben ohne Anmeldung. Jede sollte eine eigene Schutzmaßnahme haben (Rate-Limit, Secret, Signatur oder unratbarer Schlüssel). Spalte „Schutz heute“ zeigt den Ist-Zustand.

| Gruppe | Routen | Schutz heute | Lücke |
|---|---|---|---|
| Landingpages/Kampagnen | `GET /api/marketing/public/[slug]`, `GET /api/public/s/[code]` (Kurzlink) | keiner (Slug/Code) | Rate-Limit |
| Lead-Formulare | `POST /api/forms/[id]/submit` | Formular-ID als Schlüssel | Rate-Limit je IP/E-Mail, Captcha/Honeypot |
| Terminbuchung | `GET /api/public/[tenantId]/termine`, `…/termine/availability`, `POST …/termine/book` | Tenant-ID | Rate-Limit, Empfängerprüfung (Mail an Fremde) |
| Nexora-Website | `GET /api/public/[tenantId]/{blog,blog/[slug],branding,clients,content,layout,menu,pages,properties,robots,services,stack,vehicles,shop,github}`, `GET /api/public/{resolve,testimonials}` | Tenant-ID, nur lesend | Caching/Rate-Limit optional |
| Nexora-Aktionen | `POST /api/public/[tenantId]/{contact,orders,track,plexi-chat,shop/checkout,newsletter/signup}` | track/signup/plexi-chat gedrosselt | Rate-Limit für contact, orders, shop/checkout |
| Newsletter-Links | `GET /api/public/newsletter/{confirm,unsubscribe,track/click,track/open}/[token]` | Token, Drossel bei confirm/unsubscribe | track ohne Drossel |
| Zahlung/Lizenz | `POST /api/licenses/{checkout,validate}`, `GET /api/pay/[invoiceId]`, `POST /api/pay/[invoiceId]/checkout` | UUID bzw. Stripe | Rate-Limit |
| Portale mit Secret-Link | `GET/POST /api/support/portal/[token](/comment)`, `GET /api/jobs/[id]`, `POST /api/jobs/[id]/apply` | Token/UUID im Link | Rate-Limit bei apply (Mail) |
| Webhooks | `POST /api/webhooks/stripe`, `POST /api/shop/webhook` (Stripe-Signatur geprüft), `POST /api/webhooks/resend` | Stripe: Signatur; Resend: keine | Resend-Signatur (svix) ergänzen |
| Cron mit Secret-Header | `POST /api/newsletter/cron/run-automations`, `/api/sequences/cron/sweep`, `/api/termine/cron/reminders` | geheimer Header | – |
| Rechtstexte/Presets | `GET /api/settings/{agb,datenschutz}`, `GET /api/settings/branding` (anonym: global), `GET /api/pages/[slug]`, Preset-Listen | nur lesend | prüfen, ob `pages/[slug]` öffentlich sein soll |
| Technisch | `GET /api/termine/google-callback` (OAuth-Rücksprung), `POST /api/analytics/vitals` | Google-Code bzw. keiner | State an Sitzung binden; Drossel/Aggregation für vitals |

**Nicht öffentlich gedacht, aber heute offen (Kandidaten zum Schließen):** `GET /api/marketing/email-stats`, `GET /api/licenses/[key]`, `POST /api/marketing/update-redirects` (entfernen), `POST /api/team/accept` (prüfen, ob Anmeldung nötig ist).

## 6. Vorschlag: ausdrücklicher Demo-Modus

**Grundsatz**
- Ohne gültiges Token ⇒ **401**, nie Rückfall. `demo-user` wird abgeschafft.
- Demo ist eine **Rolle**, kein String: eigene Cognito-Gruppe `demo` für das Demo-Login-Konto.

**Eigener Mandant**
- Fester Demo-Mandant (z. B. Scope `tenant:demo`), den `resolveUserId` für jedes Token der Gruppe `demo` zurückgibt, unabhängig von E-Mail oder Body.
- Echte Mandanten können diesen Scope nicht annehmen (Test: Scope-Präfix für Kundenkonten verboten).
- `demoGuard` entfällt; stattdessen **eine zentrale Richtlinie** `assertDemoAllowed(event)` anhand der Token-Gruppe.

**Nebenwirkungen aus**
- Zentral im Mailer: für Demo kein Versand (Status „übersprungen“, nur Protokoll). Gleiches für KI, Stripe, Google-Anbindung, S3-Uploads, Team-Einladungen, Kampagnen-Termine, Kurzlinks, externe Webhooks.
- Als **Allowlist** umgesetzt (Demo darf nur, was ausdrücklich erlaubt ist), nicht als Sperrliste.

**Limits**
- Pro Demo-Sitzung/IP: Schreibzugriffe z. B. 60/Stunde, Antwort 429.
- Größe: Body ≤ 100 KB, Obergrenze je Tabelle im Demo-Mandanten (z. B. 50 Zeilen), danach nur lesen.
- Für öffentliche Routen mit Mail-Wirkung (Buchung, Formulare, Bewerbung): Drossel je IP und je Empfänger, optional Captcha.
- API Gateway: Drosselung je Route; Lambda: reservierte Parallelität für Demo/öffentlich, damit echte Nutzer nicht verdrängt werden.

**Zurücksetzen**
- Nächtlicher EventBridge-Job (`plexora-demo-reset`): Demo-Mandant leeren und aus einer Seed-Datei neu befüllen; zusätzlich TTL (`expiresAt`, 24 h) auf allen Demo-Zeilen.
- Optional später: eigene Sandbox-Kopie je Besucher statt eines geteilten Standes.

**Absicherung gegen Rückfall**
- Test, der alle Routen inventarisiert und fehlschlägt, wenn eine Route weder `requireAuth` noch einen Eintrag in der Allowlist hat (dieses Inventar als Grundlage).
- Rollout in Stufen: (0) Inventar-Test und Allowlist, (1) Frontend-Prüfung, dass überall `Authorization` gesendet wird, (2) `NUXT_AUTH_ENFORCE` im Probelauf mit Protokoll statt Ablehnung, (3) scharf schalten, (4) Rückfall entfernen.

Reihenfolge-Empfehlung: zuerst die Befunde mit Datenabfluss/Missbrauch schließen (`email-stats`, Mail-Routen ohne Anmeldung, Resend-Signatur, OAuth-State), danach den Demo-Modus.

## 7. Alle Routen

Legende Status: **geschützt** = Route ruft `requireAuth`/`requireAdmin`/`requireTenantId` o. Ä. auf · **Rückfall** = fällt ohne Token auf `demo-user` zurück · **offen** = keine Anmeldeprüfung im Code. Nebenwirkungen und Schreibzugriff sind aus dem Quelltext abgeleitet.

### /api/admin

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| POST | `/api/admin/data-integrity/migrate` | geschützt (Token) | – | – |
| GET | `/api/admin/data-integrity/scan` | geschützt (Token) | – | – |
| GET | `/api/admin/demo-stats` | geschützt (Token) | – | – |
| GET | `/api/admin/seo-stats` | geschützt (Token) | – | – |

### /api/ai

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| POST | `/api/ai/assistant` | geschützt (Token) | KI | – |
| POST | `/api/ai/assistant/execute` | geschützt (Token) | – | – |
| POST | `/api/ai/chat` | geschützt (Token) | KI | – |
| POST | `/api/ai/content` | geschützt (Token) | KI | – |
| POST | `/api/ai/insights` | geschützt (Token) | KI | – |

### /api/analytics

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| POST | `/api/analytics/vitals` | OFFEN – nicht in Allowlist | – | ja |
| GET | `/api/analytics/vitals-stats` | geschützt (Token) | – | – |

### /api/articles

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/articles` | geschützt (Token) | – | – |
| POST | `/api/articles` | geschützt (Token) | – | ja |
| DELETE | `/api/articles/[id]` | geschützt (Token) | – | ja |
| PATCH | `/api/articles/[id]` | geschützt (Token) | – | ja |

### /api/automations

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/automations` | geschützt (Token) | – | – |
| POST | `/api/automations` | geschützt (Token) | – | ja |
| DELETE | `/api/automations/[id]` | geschützt (Token) | – | ja |
| PATCH | `/api/automations/[id]` | geschützt (Token) | – | ja |

### /api/automotive

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/automotive` | geschützt (Token) | – | – |
| POST | `/api/automotive` | geschützt (Token) | – | ja |
| DELETE | `/api/automotive/[id]` | geschützt (Token) | – | ja |
| PUT | `/api/automotive/[id]` | geschützt (Token) | – | ja |
| GET | `/api/automotive/[id]/pricetag` | geschützt (Token) | – | – |
| GET | `/api/automotive/pricetag-templates` | geschützt (Token) | – | – |
| POST | `/api/automotive/pricetag-templates` | geschützt (Token) | – | ja |
| DELETE | `/api/automotive/pricetag-templates/[id]` | geschützt (Token) | – | ja |
| PATCH | `/api/automotive/pricetag-templates/[id]` | geschützt (Token) | – | ja |
| GET | `/api/automotive/pricetag-templates/presets` | OFFEN – nicht in Allowlist | – | – |
| POST | `/api/automotive/pricetag-templates/render` | geschützt (Token) | – | – |
| GET | `/api/automotive/settings` | geschützt (Token) | – | – |
| PUT | `/api/automotive/settings` | geschützt (Token) | – | ja |

### /api/aws

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/aws/dynamo` | geschützt (Token) | – | – |
| GET | `/api/aws/lambda` | geschützt (Token) | – | – |
| GET | `/api/aws/logs` | geschützt (Token) | – | – |
| GET | `/api/aws/s3` | geschützt (Token) | – | – |
| POST | `/api/aws/s3-delete` | geschützt (Token) | – | – |
| POST | `/api/aws/s3-upload` | geschützt (Token) | S3-Upload | – |

### /api/billing

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| POST | `/api/billing/portal` | geschützt (Token) | Stripe | – |

### /api/blog

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/blog` | geschützt (Token) | – | – |
| POST | `/api/blog` | geschützt (Token) | – | ja |
| DELETE | `/api/blog/[id]` | geschützt (Token) | – | ja |
| PUT | `/api/blog/[id]` | geschützt (Token) | – | ja |

### /api/campaigns

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/campaigns/presets` | OFFEN – nicht in Allowlist | – | – |

### /api/companies

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/companies` | Rückfall demo-user | – | – |
| POST | `/api/companies` | Rückfall demo-user | – | ja |
| DELETE | `/api/companies/[id]` | Rückfall demo-user | – | ja |
| PATCH | `/api/companies/[id]` | Rückfall demo-user | – | ja |

### /api/contacts

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/contacts` | Rückfall demo-user | – | – |
| POST | `/api/contacts` | Rückfall demo-user | – | ja |
| DELETE | `/api/contacts/[id]` | Rückfall demo-user | – | ja |
| PATCH | `/api/contacts/[id]` | Rückfall demo-user | – | ja |
| POST | `/api/contacts/[id]/convert` | Rückfall demo-user | – | ja |
| POST | `/api/contacts/[id]/touch` | Rückfall demo-user | – | ja |

### /api/contracts

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/contracts` | Rückfall demo-user | – | – |
| POST | `/api/contracts` | Rückfall demo-user | – | ja |
| DELETE | `/api/contracts/[id]` | Rückfall demo-user | – | ja |
| PATCH | `/api/contracts/[id]` | Rückfall demo-user | – | ja |

### /api/deals

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/deals` | Rückfall demo-user | – | – |
| POST | `/api/deals` | Rückfall demo-user | – | ja |
| DELETE | `/api/deals/[id]` | Rückfall demo-user | – | ja |
| PATCH | `/api/deals/[id]` | Rückfall demo-user | – | ja |

### /api/drafts

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| DELETE | `/api/drafts/[type]` | geschützt (Token, Hilfsfunktion) | – | – |
| GET | `/api/drafts/[type]` | geschützt (Token, Hilfsfunktion) | – | – |
| PUT | `/api/drafts/[type]` | geschützt (Token, Hilfsfunktion) | – | – |

### /api/finance

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/finance` | Rückfall demo-user | – | – |
| POST | `/api/finance` | Rückfall demo-user | – | ja |
| DELETE | `/api/finance/[id]` | Rückfall demo-user | – | ja |
| POST | `/api/finance/[id]/dunning` | Rückfall demo-user | Mail | ja |
| POST | `/api/finance/[id]/finalize` | Rückfall demo-user | – | ja |
| GET | `/api/finance/[id]/pdf` | geschützt (Token) | Stripe | – |
| POST | `/api/finance/[id]/send` | Rückfall demo-user | Mail, Stripe | ja |
| PUT | `/api/finance/[id]/status` | Rückfall demo-user | – | ja |
| GET | `/api/finance/[id]/xrechnung` | Rückfall demo-user | – | – |
| POST | `/api/finance/bank-import` | Rückfall demo-user | – | ja |
| POST | `/api/finance/bank-match` | Rückfall demo-user | – | ja |
| GET | `/api/finance/bank-txns` | Rückfall demo-user | – | – |
| POST | `/api/finance/batch-dunning` | geschützt (Token) | Mail | ja |
| DELETE | `/api/finance/cashbook` | Rückfall demo-user | – | ja |
| GET | `/api/finance/cashbook` | Rückfall demo-user | – | – |
| POST | `/api/finance/cashbook` | Rückfall demo-user | – | ja |
| GET | `/api/finance/datev` | Rückfall demo-user | – | – |
| GET | `/api/finance/ustva` | Rückfall demo-user | – | – |

### /api/forms

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/forms` | geschützt (Token) | – | – |
| POST | `/api/forms` | geschützt (Token) | – | ja |
| DELETE | `/api/forms/[id]` | geschützt (Token) | – | ja |
| GET | `/api/forms/[id]` | geschützt (Token) | – | – |
| PUT | `/api/forms/[id]` | geschützt (Token) | – | ja |
| GET | `/api/forms/[id]/submissions` | geschützt (Token) | – | – |
| POST | `/api/forms/[id]/submit` | Rückfall demo-user | Mail | ja |

### /api/gastro-menu

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/gastro-menu` | geschützt (Token) | – | – |
| POST | `/api/gastro-menu` | geschützt (Token) | – | ja |
| DELETE | `/api/gastro-menu/[id]` | geschützt (Token) | – | ja |
| PUT | `/api/gastro-menu/[id]` | geschützt (Token) | – | ja |
| GET | `/api/gastro-menu/settings` | geschützt (Token) | – | – |
| PUT | `/api/gastro-menu/settings` | geschützt (Token) | – | ja |

### /api/gastro-orders

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/gastro-orders` | geschützt (Token) | – | – |
| PUT | `/api/gastro-orders/[id]` | geschützt (Token) | – | ja |

### /api/gastro-staff

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/gastro-staff` | geschützt (Token) | – | – |
| POST | `/api/gastro-staff` | geschützt (Token) | – | ja |
| DELETE | `/api/gastro-staff/[id]` | geschützt (Token) | – | ja |
| PUT | `/api/gastro-staff/[id]` | geschützt (Token) | – | ja |

### /api/gastro-tables

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/gastro-tables` | geschützt (Token) | – | – |
| POST | `/api/gastro-tables` | geschützt (Token) | – | ja |
| DELETE | `/api/gastro-tables/[id]` | geschützt (Token) | – | ja |
| PUT | `/api/gastro-tables/[id]` | geschützt (Token) | – | ja |

### /api/gastro-tips

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/gastro-tips` | geschützt (Token) | – | – |
| POST | `/api/gastro-tips` | geschützt (Token) | – | ja |
| DELETE | `/api/gastro-tips/[id]` | geschützt (Token) | – | ja |

### /api/handwerk

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/handwerk/aufmass` | geschützt (Token) | – | – |
| POST | `/api/handwerk/aufmass` | geschützt (Token) | – | ja |
| DELETE | `/api/handwerk/aufmass/[id]` | geschützt (Token) | – | ja |
| PUT | `/api/handwerk/aufmass/[id]` | geschützt (Token) | – | ja |
| GET | `/api/handwerk/baustellen` | geschützt (Token) | – | – |
| POST | `/api/handwerk/baustellen` | geschützt (Token) | – | ja |
| DELETE | `/api/handwerk/baustellen/[id]` | geschützt (Token) | – | ja |
| PUT | `/api/handwerk/baustellen/[id]` | geschützt (Token) | – | ja |
| GET | `/api/handwerk/baustellen/[id]/pdf` | geschützt (Token) | – | – |

### /api/hr

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/hr` | Rückfall demo-user | – | – |
| POST | `/api/hr` | Rückfall demo-user | – | ja |
| GET | `/api/hr/campaigns` | geschützt (Token) | – | – |
| POST | `/api/hr/campaigns` | Rückfall demo-user | – | ja |
| GET | `/api/hr/campaigns/[id]` | Rückfall demo-user | – | – |
| PATCH | `/api/hr/campaigns/[id]` | Rückfall demo-user | – | ja |
| GET | `/api/hr/campaigns/[id]/applications` | Rückfall demo-user | – | – |
| GET | `/api/hr/leave` | Rückfall demo-user | – | – |
| POST | `/api/hr/leave` | Rückfall demo-user | – | ja |
| POST | `/api/hr/leave/[id]/approve` | Rückfall demo-user | – | ja |
| POST | `/api/hr/leave/[id]/reject` | Rückfall demo-user | – | ja |
| GET | `/api/hr/stempel` | Rückfall demo-user | – | – |
| POST | `/api/hr/stempel` | Rückfall demo-user | – | ja |
| GET | `/api/hr/timelog` | Rückfall demo-user | – | – |
| POST | `/api/hr/timelog` | Rückfall demo-user | – | ja |

### /api/jobs

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/jobs/[id]` | offen – in Middleware-Allowlist | – | – |
| POST | `/api/jobs/[id]/apply` | offen – in Middleware-Allowlist | Mail | ja |

### /api/licenses

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/licenses` | geschützt (Token) | – | – |
| POST | `/api/licenses` | geschützt (Token) | – | ja |
| DELETE | `/api/licenses/[key]` | geschützt (Token) | – | ja |
| GET | `/api/licenses/[key]` | OFFEN – nicht in Allowlist | – | – |
| PATCH | `/api/licenses/[key]` | geschützt (Token) | – | ja |
| POST | `/api/licenses/checkout` | offen – in Middleware-Allowlist | Stripe | – |
| GET | `/api/licenses/my` | geschützt (Token) | – | – |
| POST | `/api/licenses/portal` | geschützt (Token) | Stripe | – |
| POST | `/api/licenses/validate` | offen – in Middleware-Allowlist | – | – |

### /api/mail-log

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/mail-log` | geschützt (Token) | – | – |

### /api/marketing

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/marketing` | Rückfall demo-user | – | – |
| POST | `/api/marketing` | Rückfall demo-user | Termin/Kurzlink | ja |
| DELETE | `/api/marketing/[id]` | Rückfall demo-user | – | ja |
| GET | `/api/marketing/[id]` | Rückfall demo-user | – | – |
| PATCH | `/api/marketing/[id]` | Rückfall demo-user | – | ja |
| POST | `/api/marketing/[id]/preview-email` | Rückfall demo-user | KI | – |
| POST | `/api/marketing/[id]/send-email` | Rückfall demo-user | Mail, KI | ja |
| GET | `/api/marketing/email-stats` | OFFEN – nicht in Allowlist | – | – |
| GET | `/api/marketing/public/[slug]` | OFFEN – nicht in Allowlist | – | – |
| POST | `/api/marketing/run-followups` | geschützt (Token) | Mail | ja |
| GET | `/api/marketing/shortlinks` | geschützt (Token) | Termin/Kurzlink | – |
| POST | `/api/marketing/shortlinks` | geschützt (Token) | Termin/Kurzlink | ja |
| DELETE | `/api/marketing/shortlinks/[id]` | geschützt (Token) | Termin/Kurzlink | ja |
| GET | `/api/marketing/shortlinks/settings` | geschützt (Token) | – | – |
| POST | `/api/marketing/shortlinks/settings` | geschützt (Token) | – | ja |
| GET | `/api/marketing/stats` | geschützt (Token) | – | – |
| POST | `/api/marketing/update-redirects` | OFFEN – nicht in Allowlist | – | – |

### /api/newsletter

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/newsletter/automation-rules` | geschützt (Token) | – | – |
| POST | `/api/newsletter/automation-rules` | geschützt (Token) | – | ja |
| DELETE | `/api/newsletter/automation-rules/[id]` | geschützt (Token) | – | ja |
| PATCH | `/api/newsletter/automation-rules/[id]` | geschützt (Token) | – | ja |
| GET | `/api/newsletter/campaigns` | geschützt (Token) | – | – |
| POST | `/api/newsletter/campaigns` | geschützt (Token) | – | ja |
| DELETE | `/api/newsletter/campaigns/[id]` | geschützt (Token) | – | ja |
| GET | `/api/newsletter/campaigns/[id]` | geschützt (Token) | – | – |
| PATCH | `/api/newsletter/campaigns/[id]` | geschützt (Token) | – | ja |
| POST | `/api/newsletter/campaigns/[id]/send` | geschützt (Token) | Mail | ja |
| GET | `/api/newsletter/campaigns/[id]/stats` | geschützt (Token) | – | – |
| POST | `/api/newsletter/campaigns/[id]/test-send` | geschützt (Token) | Mail | – |
| POST | `/api/newsletter/cron/run-automations` | geschützt (Token) | – | ja |
| GET | `/api/newsletter/subscribers` | geschützt (Token) | – | – |
| POST | `/api/newsletter/subscribers/import` | geschützt (Token) | Mail | ja |
| GET | `/api/newsletter/templates` | geschützt (Token) | – | – |
| POST | `/api/newsletter/templates` | geschützt (Token) | – | ja |
| DELETE | `/api/newsletter/templates/[id]` | geschützt (Token) | – | ja |
| PATCH | `/api/newsletter/templates/[id]` | geschützt (Token) | – | ja |

### /api/nexora

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| POST | `/api/nexora/github-repos` | geschützt (Token) | – | – |
| GET | `/api/nexora/my` | geschützt (Token) | KI | – |
| PUT | `/api/nexora/my` | geschützt (Token) | KI | ja |
| GET | `/api/nexora/site-analytics` | geschützt (Token) | – | – |

### /api/notifications

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/notifications` | Rückfall demo-user | – | – |
| DELETE | `/api/notifications/[id]` | Rückfall demo-user | – | ja |
| PATCH | `/api/notifications/[id]` | Rückfall demo-user | – | ja |

### /api/pages

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/pages` | geschützt (Token) | – | – |
| POST | `/api/pages` | Rückfall demo-user | – | ja |
| DELETE | `/api/pages/[slug]` | Rückfall demo-user | – | ja |
| GET | `/api/pages/[slug]` | OFFEN – nicht in Allowlist | – | – |
| PUT | `/api/pages/[slug]` | Rückfall demo-user | – | ja |

### /api/pay

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/pay/[invoiceId]` | offen – in Middleware-Allowlist | Stripe | – |
| POST | `/api/pay/[invoiceId]/checkout` | offen – in Middleware-Allowlist | Stripe | ja |

### /api/plugins

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/plugins/[key]/data` | geschützt (Token) | – | – |
| POST | `/api/plugins/[key]/data` | geschützt (Token) | – | ja |

### /api/portal

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/portal/documents` | geschützt (Token) | – | – |
| GET | `/api/portal/invoices` | geschützt (Token) | – | – |
| GET | `/api/portal/orders` | geschützt (Token) | – | – |

### /api/praxis

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/praxis/patienten` | geschützt (Token) | – | – |
| POST | `/api/praxis/patienten` | geschützt (Token) | – | ja |
| DELETE | `/api/praxis/patienten/[id]` | geschützt (Token) | – | ja |
| PUT | `/api/praxis/patienten/[id]` | geschützt (Token) | – | ja |
| GET | `/api/praxis/rezepte` | geschützt (Token) | – | – |
| POST | `/api/praxis/rezepte` | geschützt (Token) | – | ja |
| DELETE | `/api/praxis/rezepte/[id]` | geschützt (Token) | – | ja |
| GET | `/api/praxis/rezepte/[id]/pdf` | geschützt (Token) | – | – |
| GET | `/api/praxis/termine` | geschützt (Token) | – | – |
| POST | `/api/praxis/termine` | geschützt (Token) | – | ja |
| DELETE | `/api/praxis/termine/[id]` | geschützt (Token) | – | ja |
| PUT | `/api/praxis/termine/[id]` | geschützt (Token) | – | ja |

### /api/projects

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/projects` | Rückfall demo-user | – | – |
| POST | `/api/projects` | Rückfall demo-user | – | ja |
| DELETE | `/api/projects/[id]` | Rückfall demo-user | – | ja |
| PATCH | `/api/projects/[id]` | Rückfall demo-user | – | ja |
| POST | `/api/projects/[id]/tasks` | Rückfall demo-user | – | ja |
| PATCH | `/api/projects/[id]/tasks/[taskId]` | Rückfall demo-user | – | ja |

### /api/properties

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/properties` | geschützt (Token) | – | – |
| POST | `/api/properties` | geschützt (Token) | – | ja |
| DELETE | `/api/properties/[id]` | geschützt (Token) | – | ja |
| PUT | `/api/properties/[id]` | geschützt (Token) | – | ja |
| GET | `/api/properties/settings` | geschützt (Token) | – | – |
| PUT | `/api/properties/settings` | geschützt (Token) | – | ja |

### /api/public

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/public/[tenantId]/blog` | offen – in Middleware-Allowlist | – | – |
| GET | `/api/public/[tenantId]/blog/[slug]` | offen – in Middleware-Allowlist | – | – |
| GET | `/api/public/[tenantId]/branding` | offen – in Middleware-Allowlist | – | – |
| GET | `/api/public/[tenantId]/clients` | offen – in Middleware-Allowlist | – | – |
| GET | `/api/public/[tenantId]/contact` | offen – in Middleware-Allowlist | – | – |
| POST | `/api/public/[tenantId]/contact` | offen – in Middleware-Allowlist | – | ja |
| GET | `/api/public/[tenantId]/content` | offen – in Middleware-Allowlist | – | – |
| GET | `/api/public/[tenantId]/github` | offen – in Middleware-Allowlist | – | – |
| GET | `/api/public/[tenantId]/layout` | offen – in Middleware-Allowlist | – | – |
| GET | `/api/public/[tenantId]/menu` | offen – in Middleware-Allowlist | – | – |
| POST | `/api/public/[tenantId]/newsletter/signup` | offen – in Middleware-Allowlist | Mail | ja |
| POST | `/api/public/[tenantId]/orders` | offen – in Middleware-Allowlist | – | ja |
| GET | `/api/public/[tenantId]/pages` | offen – in Middleware-Allowlist | – | – |
| POST | `/api/public/[tenantId]/plexi-chat` | offen – in Middleware-Allowlist | KI | – |
| GET | `/api/public/[tenantId]/properties` | offen – in Middleware-Allowlist | – | – |
| GET | `/api/public/[tenantId]/robots` | offen – in Middleware-Allowlist | – | – |
| GET | `/api/public/[tenantId]/services` | offen – in Middleware-Allowlist | – | – |
| GET | `/api/public/[tenantId]/shop` | offen – in Middleware-Allowlist | – | – |
| POST | `/api/public/[tenantId]/shop/checkout` | offen – in Middleware-Allowlist | Stripe | ja |
| GET | `/api/public/[tenantId]/stack` | offen – in Middleware-Allowlist | – | – |
| GET | `/api/public/[tenantId]/termine` | offen – in Middleware-Allowlist | – | – |
| GET | `/api/public/[tenantId]/termine/availability` | offen – in Middleware-Allowlist | – | – |
| POST | `/api/public/[tenantId]/termine/book` | offen – in Middleware-Allowlist | Mail, Termin/Kurzlink | ja |
| POST | `/api/public/[tenantId]/track` | offen – in Middleware-Allowlist | – | – |
| GET | `/api/public/[tenantId]/vehicles` | offen – in Middleware-Allowlist | – | – |
| GET | `/api/public/newsletter/confirm/[token]` | offen – in Middleware-Allowlist | – | ja |
| GET | `/api/public/newsletter/track/click/[token]` | offen – in Middleware-Allowlist | – | ja |
| GET | `/api/public/newsletter/track/open/[token]` | offen – in Middleware-Allowlist | – | ja |
| GET | `/api/public/newsletter/unsubscribe/[token]` | offen – in Middleware-Allowlist | – | ja |
| GET | `/api/public/resolve` | offen – in Middleware-Allowlist | – | – |
| GET | `/api/public/s/[code]` | offen – in Middleware-Allowlist | Termin/Kurzlink | ja |
| GET | `/api/public/testimonials` | offen – in Middleware-Allowlist | – | – |

### /api/renters

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/renters` | geschützt (Token) | – | – |
| POST | `/api/renters` | geschützt (Token) | – | ja |
| DELETE | `/api/renters/[id]` | geschützt (Token) | – | ja |
| PUT | `/api/renters/[id]` | geschützt (Token) | – | ja |

### /api/retail

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/retail/closings` | geschützt (Token) | – | – |
| POST | `/api/retail/closings` | geschützt (Token) | – | ja |
| GET | `/api/retail/sales` | geschützt (Token) | – | – |
| POST | `/api/retail/sales` | geschützt (Token) | – | ja |

### /api/returns

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/returns` | geschützt (Token) | – | – |
| POST | `/api/returns` | geschützt (Token) | Stripe | ja |

### /api/sequences

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/sequences` | geschützt (Token) | – | – |
| POST | `/api/sequences` | geschützt (Token) | – | ja |
| DELETE | `/api/sequences/[id]` | geschützt (Token) | – | ja |
| PUT | `/api/sequences/[id]` | geschützt (Token) | – | ja |
| POST | `/api/sequences/cron/sweep` | geschützt (Token) | – | – |
| GET | `/api/sequences/runs` | geschützt (Token) | – | – |

### /api/services

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/services` | geschützt (Token) | – | – |
| POST | `/api/services` | geschützt (Token) | – | ja |
| DELETE | `/api/services/[id]` | geschützt (Token) | – | ja |
| PATCH | `/api/services/[id]` | geschützt (Token) | – | ja |

### /api/settings

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/settings/account` | geschützt (Token) | – | – |
| POST | `/api/settings/account` | geschützt (Token) | – | ja |
| GET | `/api/settings/agb` | OFFEN – nicht in Allowlist | – | – |
| POST | `/api/settings/agb` | geschützt (Token) + Guard (Body-Wert) | – | ja |
| GET | `/api/settings/ai-providers` | geschützt (Token) | KI | – |
| POST | `/api/settings/ai-providers` | geschützt (Token) | KI | ja |
| POST | `/api/settings/ai-providers-models` | geschützt (Token) | KI | – |
| POST | `/api/settings/ai-providers-test` | geschützt (Token) | KI | – |
| GET | `/api/settings/branch-packages` | OFFEN – nicht in Allowlist | – | – |
| POST | `/api/settings/branch-packages` | geschützt (Token) | – | ja |
| GET | `/api/settings/branding` | OFFEN – nicht in Allowlist | – | ja |
| POST | `/api/settings/branding` | Rückfall demo-user + Guard (wirkungslos, Body-Wert) | – | ja |
| GET | `/api/settings/categories` | geschützt (Token) | – | – |
| POST | `/api/settings/categories` | geschützt (Token) + Guard (Body-Wert) | – | ja |
| GET | `/api/settings/company` | OFFEN – nicht in Allowlist | – | – |
| POST | `/api/settings/company` | Rückfall demo-user + Guard (wirkungslos, Body-Wert) | – | ja |
| GET | `/api/settings/datenschutz` | OFFEN – nicht in Allowlist | Stripe | – |
| POST | `/api/settings/datenschutz` | geschützt (Token) + Guard (Body-Wert) | – | ja |
| GET | `/api/settings/dunning` | geschützt (Token) | – | – |
| POST | `/api/settings/dunning` | geschützt (Token) + Guard (Body-Wert) | – | ja |
| GET | `/api/settings/invoice` | OFFEN – nicht in Allowlist | – | – |
| POST | `/api/settings/invoice` | Rückfall demo-user + Guard (wirkungslos, Body-Wert) | – | ja |
| GET | `/api/settings/invoice-payment` | geschützt (Token) | Stripe | – |
| POST | `/api/settings/invoice-payment` | geschützt (Token) + Guard (Body-Wert) | Stripe | ja |
| GET | `/api/settings/invoice-presets` | OFFEN – nicht in Allowlist | – | – |
| GET | `/api/settings/invoice-template` | Rückfall demo-user | – | – |
| PUT | `/api/settings/invoice-template` | Rückfall demo-user + Guard (wirkungslos, Body-Wert) | – | ja |
| POST | `/api/settings/invoice-template/render` | geschützt (Token) | Stripe | – |
| GET | `/api/settings/modules` | geschützt (Token) | – | – |
| POST | `/api/settings/modules` | geschützt (Token) + Guard (Body-Wert) | – | ja |
| GET | `/api/settings/newsletter` | geschützt (Token) | – | – |
| POST | `/api/settings/newsletter` | geschützt (Token) | Mail | ja |
| GET | `/api/settings/payment` | geschützt (Token) | Stripe | – |
| POST | `/api/settings/payment` | geschützt (Token) + Guard (Body-Wert) | Stripe | ja |
| GET | `/api/settings/session` | geschützt (Token) | – | – |
| POST | `/api/settings/session` | geschützt (Token) + Guard (Body-Wert) | – | ja |
| GET | `/api/settings/testimonials` | geschützt (Token) | – | – |
| POST | `/api/settings/testimonials` | geschützt (Token) | – | ja |
| GET | `/api/settings/theme` | geschützt (Token) | – | – |
| POST | `/api/settings/theme` | geschützt (Token) | – | ja |

### /api/shop

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/shop/orders` | geschützt (Token) | – | – |
| GET | `/api/shop/products` | geschützt (Token) | – | – |
| POST | `/api/shop/products` | Rückfall demo-user | – | ja |
| DELETE | `/api/shop/products/[id]` | geschützt (Token) | – | ja |
| PATCH | `/api/shop/products/[id]` | Rückfall demo-user | – | ja |
| GET | `/api/shop/purchase-orders` | geschützt (Token) | – | – |
| POST | `/api/shop/purchase-orders` | geschützt (Token) | Mail | ja |
| PATCH | `/api/shop/purchase-orders/[id]` | geschützt (Token) | – | ja |
| GET | `/api/shop/suppliers` | geschützt (Token) | – | – |
| POST | `/api/shop/suppliers` | geschützt (Token) | – | ja |
| DELETE | `/api/shop/suppliers/[id]` | geschützt (Token) | – | ja |
| PATCH | `/api/shop/suppliers/[id]` | geschützt (Token) | – | ja |
| POST | `/api/shop/webhook` | OFFEN – nicht in Allowlist | Mail, Stripe | ja |

### /api/store

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/store/branch-modules` | geschützt (Token) | – | – |
| POST | `/api/store/branch-modules` | geschützt (Token) | – | ja |
| POST | `/api/store/checkout` | OFFEN – nicht in Allowlist | Stripe | – |

### /api/support

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/support` | Rückfall demo-user | – | – |
| POST | `/api/support` | Rückfall demo-user | – | ja |
| PATCH | `/api/support/[id]` | Rückfall demo-user | – | ja |
| POST | `/api/support/[id]/comment` | Rückfall demo-user | – | ja |
| GET | `/api/support/portal/[token]` | offen – in Middleware-Allowlist | – | – |
| POST | `/api/support/portal/[token]/comment` | offen – in Middleware-Allowlist | – | ja |

### /api/team

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| DELETE | `/api/team/[email]` | OFFEN – nicht in Allowlist | – | ja |
| POST | `/api/team/accept` | OFFEN – nicht in Allowlist | – | ja |
| POST | `/api/team/invite` | OFFEN – nicht in Allowlist | Mail | ja |
| GET | `/api/team/members` | OFFEN – nicht in Allowlist | – | – |

### /api/termine

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/termine/bookings` | geschützt (Token) | – | – |
| POST | `/api/termine/bookings` | geschützt (Token) | Termin/Kurzlink | ja |
| PUT | `/api/termine/bookings/[id]` | geschützt (Token) | Mail | ja |
| POST | `/api/termine/cron/reminders` | geschützt (Token) | Mail | – |
| GET | `/api/termine/google-auth` | geschützt (Token) | – | – |
| PUT | `/api/termine/google-calendar` | geschützt (Token) | – | ja |
| GET | `/api/termine/google-calendars` | geschützt (Token) | – | – |
| GET | `/api/termine/google-callback` | OFFEN – nicht in Allowlist | – | ja |
| POST | `/api/termine/google-disconnect` | geschützt (Token) | – | ja |
| GET | `/api/termine/google-events` | geschützt (Token) | – | – |
| GET | `/api/termine/settings` | geschützt (Token) | – | – |
| PUT | `/api/termine/settings` | geschützt (Token) | – | ja |
| GET | `/api/termine/types` | geschützt (Token) | – | – |
| POST | `/api/termine/types` | geschützt (Token) | – | ja |
| DELETE | `/api/termine/types/[id]` | geschützt (Token) | – | ja |
| PUT | `/api/termine/types/[id]` | geschützt (Token) | – | ja |

### /api/video

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/video/settings` | geschützt (Token) | – | – |
| POST | `/api/video/settings` | geschützt (Token) | – | ja |

### /api/viewings

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/viewings` | geschützt (Token) | – | – |
| POST | `/api/viewings` | geschützt (Token) | – | ja |
| DELETE | `/api/viewings/[id]` | geschützt (Token) | – | ja |
| PUT | `/api/viewings/[id]` | geschützt (Token) | – | ja |

### /api/webhooks

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| POST | `/api/webhooks/resend` | offen – in Middleware-Allowlist | Mail | ja |
| POST | `/api/webhooks/stripe` | Rückfall demo-user | Mail, Stripe, Cognito-Nutzer | ja |

### /api/workshop

| Methode | Pfad | Status | Nebenwirkung | schreibt |
|---|---|---|---|---|
| GET | `/api/workshop` | geschützt (Token) | – | – |
| POST | `/api/workshop` | geschützt (Token) | – | ja |
| DELETE | `/api/workshop/[id]` | geschützt (Token) | – | ja |
| PUT | `/api/workshop/[id]` | geschützt (Token) | – | ja |

## 8. Einordnung der 22 offenen Routen außerhalb der Allowlist (Stand 06.10.2026, nur gelesen)

Legende: **bleibt öffentlich** = gewollt, ggf. mit Auflage · **schließen** = Anmeldung verlangen (oder entfernen) · Block = geplante Umsetzung.
Die drei Entwurfs-Routen (`/api/drafts/[type]`) stehen im Scan als „ohne Prüfung“, sind aber über `draftContext()` geschützt (Fehlalarm).

| # | Route | Was sie tut / wer sie nutzt | Urteil | Auflage / Block |
|---|---|---|---|---|
| 1 | `GET /api/settings/branch-packages` | liefert ohne Token `[]`, sonst die Branchen-Module des Tenants; `useBranchModules`, Store | bleibt öffentlich (anonym leer) | in d: 401 statt `[]` prüfen, falls Frontend es ohne Login nicht ruft |
| 2 | `GET /api/settings/branding` | anonym: globales Plexora-Branding (Login, Editoren) | **bleibt öffentlich** | nur global ausliefern; nichts Tenant-Internes |
| 3 | `GET /api/settings/company` | anonym: globale Firmendaten (Impressum/Datenschutz-Seite) | **bleibt öffentlich** | **Felder beschränken:** Antwort enthält auch `iban`, `bic`, `bankName`, `paymentNote` (derzeit leer, würden sofort öffentlich) → nur Impressum-Felder (b) |
| 4 | `GET /api/settings/invoice` | anonym: globale Rechnungs-Standardwerte; nur im Login-Bereich genutzt | **schließen** | d |
| 5 | `POST /api/store/checkout` | Stripe-Checkout für Module; Preis und Modul kommen aus dem Request | **schließen + Preis serverseitig** | **dringend:** `unit_amount = priceEur * 100` aus dem Body; der Webhook schaltet danach das Modul frei → Modul für beliebigen Preis kaufbar. Eigener Block (vor d) |
| 6 | `DELETE /api/team/[email]` | Mitglied entfernen; Adminprüfung nur über Namensgleichheit | **schließen** | `requireAuth`; ohne Token entsteht 500 statt 401 (d) |
| 7 | `POST /api/team/invite` | Einladung per Mail an frei wählbare Adresse | **schließen + Mail-Schutz** | `requireMailSender` (Demo-Konto darf nicht einladen) – in Block a vergessen, nachziehen |
| 8 | `GET /api/team/members` | Mitgliederliste; ohne Token `[]` | **schließen** | d |
| 9 | `POST /api/analytics/vitals` | Ladezeit-Messung der Seiten (anonym, schreibt Zähler) | **bleibt öffentlich** | Rate-Limit je IP, Größe/Name begrenzen (Allowlist-Auflage) |
| 10 | `GET /api/automotive/pricetag-templates/presets` | statische Vorlagen, nur im Login-Bereich genutzt | **schließen** (niedrig) | d |
| 11 | `GET /api/campaigns/presets` | statische Vorlagen, nur im Login-Bereich | **schließen** (niedrig) | d |
| 12 | `GET /api/licenses/[key]` | gibt den **ganzen** Lizenzdatensatz zu einem Schlüssel zurück (Kunde, E-Mail, Module); **kein Aufrufer im Frontend** | **schließen** (Admin) oder entfernen | b: wenn Zugriff nötig, nur Status/Gültigkeit/Module |
| 13 | `GET /api/marketing/email-stats` | Empfängerliste (Name, E-Mail, Status) je Kampagne ohne Besitzerprüfung; Kampagnen-ID steht in der öffentlichen Landingpage-Adresse | **schließen** | **b** (Besitzerprüfung) |
| 14 | `POST /api/marketing/update-redirects` | No-Op (Kommentar im Code); Frontend ruft ihn noch auf | **entfernen** | Route und Aufruf löschen (b oder Aufräumen) |
| 15 | `GET /api/marketing/public/[slug]` | Daten der Landingpage | **bleibt öffentlich** | **b:** `userId` (Besitzer-E-Mail), `notifyEmail`, interne Felder nicht ausliefern |
| 16 | `GET /api/pages/[slug]` | öffentliche Seiten (`p/[slug]`) | **bleibt öffentlich** | **Auflage:** kein Statusfilter, Entwürfe wären per Slug abrufbar → nur veröffentlichte Seiten |
| 17 | `GET /api/settings/agb` | AGB-Seite | **bleibt öffentlich** | – |
| 18 | `GET /api/settings/datenschutz` | Datenschutz-Seite | **bleibt öffentlich** | – |
| 19 | `GET /api/settings/invoice-presets` | statische Vorlagen, nur im Login-Bereich | **schließen** (niedrig) | d |
| 20 | `POST /api/shop/webhook` | Stripe-Webhook, Signatur wird geprüft | **bleibt öffentlich** | – |
| 21 | `POST /api/team/accept` | Einladung annehmen; Token + E-Mail aus dem Body | **bleibt öffentlich, aber härten** | E-Mail aus dem Token statt Body, `requireAuth` (d) |
| 22 | `GET /api/termine/google-callback` | OAuth-Rücksprung von Google | **bleibt öffentlich** | **c:** `state` an die Sitzung binden (heute = Tenant-ID im Klartext) |

Zusammenfassung: **9 bleiben öffentlich** (2, 3, 9, 15, 16, 17, 18, 20, 22; mit Auflagen bei 3, 9, 15, 16, 22), **12 werden geschlossen oder entfernt** (4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 19, 21 gehärtet), **1 bleibt anonym-leer** (1).
Neue Funde aus dieser Einordnung: (a) `store/checkout` Preismanipulation, (b) `team/invite` ohne Mail-Schutz für das Demo-Konto, (c) `pages/[slug]` liefert Entwürfe, (d) `settings/company` würde Bankdaten öffentlich machen, (e) `licenses/[key]` ungenutzt und zu offen.
