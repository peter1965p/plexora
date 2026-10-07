# Zahlungs-Schlüssel verschlüsseln: Ablauf mit Stripe-Probe vorher und nachher

Alle Befehle im Ordner `~/Dev/plexora`. Du führst sie selbst aus. Werte (Secrets) werden nie ausgegeben.

**Voraussetzung:** Das Backend mit `server/utils/paymentSecrets.ts` ist deployt (liest Klartext UND verschlüsselt). Das Migrationsskript bricht sonst von selbst ab.

## 1. Vorher: Probe (Baseline)
Das Webhook-Secret (`whsec_…`) aus dem Stripe-Dashboard (Entwickler → Webhooks → dein Endpunkt → Signing secret). Nur für diese Sitzung in die Umgebung, nicht in eine Datei:

```bash
export STRIPE_WEBHOOK_SECRET='whsec_…'
node scripts/security/stripe-webhook-probe.mjs vorher --checkout
```
Erwartung: dreimal `OK` (Webhook gültig 200, Webhook falsch 400, Checkout 200 mit Stripe-Adresse). Bei `FEHLER` **nicht weitermachen**, schick mir die Ausgabe.
`--checkout` legt bei Stripe eine unbezahlte Sitzung an (läuft von selbst ab). Es entsteht keine Lizenz, keine Mail, keine Zahlung.

## 2. Migration (Probelauf, dann anwenden)
```bash
node scripts/security/encrypt-payment-secrets.mjs --dry-run
node scripts/security/encrypt-payment-secrets.mjs --apply
```
`--apply` legt vorher einen Export an (`~/Dev/backups/plexora/payment-secrets-export-….json`, Klartext, Rechte 600), verschlüsselt, liest zurück und prüft.

## 3. Nachher: dieselbe Probe
```bash
node scripts/security/stripe-webhook-probe.mjs nachher --checkout
```
Erwartung: genau dasselbe Ergebnis wie vorher.

## 4. Wenn "nachher" nicht grün ist: sofort zurück
```bash
node scripts/security/encrypt-payment-secrets.mjs --rollback ~/Dev/backups/plexora/payment-secrets-export-….json
```
Danach die Probe noch einmal laufen lassen. Der Export enthält Klartext: **erst löschen (shred), wenn alles ein paar Tage sauber lief.**

## 5. Aufräumen
```bash
unset STRIPE_WEBHOOK_SECRET
```
Optional: In Stripe einen echten Testkauf im Testmodus durchführen, um die Lizenzfreischaltung Ende zu Ende zu sehen (das ist eine Zahlung im Testmodus, kein Echtgeld).

## Was die Probe beweist
- Webhook gültig 200 + falsch 400: der Server liest das gespeicherte Webhook-Secret (auch verschlüsselt), und die Prüfung wirkt.
- Checkout 200: der gespeicherte Stripe-Schlüssel wird entschlüsselt und von Stripe akzeptiert.
- Nicht bewiesen: die Freischaltung einer echten Lizenz nach Zahlung (braucht einen Kauf im Testmodus, siehe Schritt 5).
