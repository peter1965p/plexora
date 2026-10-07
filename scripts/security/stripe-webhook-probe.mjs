#!/usr/bin/env node
// Prüft VOR und NACH der Verschlüsselung der Zahlungs-Schlüssel, dass Stripe-Webhook und Checkout weiter funktionieren.
//
//   STRIPE_WEBHOOK_SECRET=whsec_… node scripts/security/stripe-webhook-probe.mjs vorher            Webhook-Signaturprüfung (ohne Nebenwirkung)
//   STRIPE_WEBHOOK_SECRET=whsec_… node scripts/security/stripe-webhook-probe.mjs nachher --checkout   zusätzlich: Stripe-Sitzung anlegen (Test des Stripe-Schlüssels)
//
// 1) Ein von dir signiertes, harmloses Ereignis (Typ "plexora.probe", löst nichts aus) muss mit 200 angenommen werden. Das beweist: der Server liest das
//    gespeicherte Webhook-Secret (auch verschlüsselt) und die Signatur stimmt.
// 2) Dasselbe Ereignis mit falscher Signatur muss mit 400 abgelehnt werden (Gegenprobe: die Prüfung ist wirksam).
// 3) --checkout: POST /api/licenses/checkout muss eine Stripe-Adresse liefern. Das beweist: der Stripe-Schlüssel wird entschlüsselt und von Stripe akzeptiert.
//    Es entsteht eine unbezahlte Checkout-Sitzung bei Stripe (läuft von selbst ab), keine Lizenz, keine Mail, keine Zahlung.
// Das Secret steht nur im Speicher (Umgebungsvariable); ausgegeben werden höchstens die ersten 4 Zeichen. Es wird nichts in AWS geschrieben.
import Stripe from 'stripe'

const API = process.env.PLEXORA_API || 'https://7hrkm580pb.execute-api.eu-central-1.amazonaws.com'
const phase = process.argv[2] || 'probe'
const wantCheckout = process.argv.includes('--checkout')

export function signedRequest(payload, key, now = Math.floor(Date.now() / 1000)) {
  const stripe = new Stripe('sk_test_probe')
  return { payload, header: stripe.webhooks.generateTestHeaderString({ payload, secret: key, timestamp: now }) }
}
export const probeEvent = () => JSON.stringify({ id: `evt_plx_probe_${Date.now()}`, object: 'event', api_version: '2024-06-20', created: Math.floor(Date.now() / 1000), livemode: false, type: 'plexora.probe', data: { object: { id: 'probe' } } })

const post = async (path, body, headers) => { const r = await fetch(`${API}${path}`, { method: 'POST', headers, body }); let t = ''; try { t = (await r.text()).slice(0, 160) } catch {} return { status: r.status, text: t } }

async function main() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET || ''
  if (!/^whsec_[A-Za-z0-9]{16,}$/.test(secret)) { console.error('STRIPE_WEBHOOK_SECRET (whsec_…) fehlt oder hat ein falsches Format. Es wird nur im Speicher verwendet und nicht ausgegeben.'); process.exit(2) }
  console.log(`Stripe-Probe (${phase}) gegen ${API}  | Secret ${secret.slice(0, 4)}… (nicht weiter ausgegeben)`)
  const payload = probeEvent()
  const good = signedRequest(payload, secret)
  const bad = signedRequest(payload, 'whsec_' + 'x'.repeat(32))
  const a = await post('/api/webhooks/stripe', good.payload, { 'content-type': 'application/json', 'stripe-signature': good.header })
  const b = await post('/api/webhooks/stripe', bad.payload, { 'content-type': 'application/json', 'stripe-signature': bad.header })
  const rows = [
    ['Webhook, gültige Signatur', a.status, a.status === 200, 'erwartet 200'],
    ['Webhook, falsche Signatur', b.status, b.status === 400, 'erwartet 400'],
  ]
  if (wantCheckout) {
    const c = await post('/api/licenses/checkout', JSON.stringify({ tier: process.env.PROBE_TIER || 'starter', email: 'news24regional+plxtest@gmail.com' }), { 'content-type': 'application/json' })
    rows.push(['Checkout (Stripe-Sitzung)', c.status, c.status === 200 && /checkout\.stripe\.com|stripe\.com/.test(c.text), 'erwartet 200 mit Stripe-Adresse'])
  }
  let ok = true
  for (const [name, status, pass, hint] of rows) { console.log(`  ${pass ? 'OK    ' : 'FEHLER'} ${name.padEnd(28)} Status ${status}  (${hint})`); ok = ok && pass }
  console.log(ok ? `\n${phase}: alles in Ordnung.` : `\n${phase}: FEHLER – bei "nachher" sofort zurückrollen: node scripts/security/encrypt-payment-secrets.mjs --rollback <Export>`)
  process.exit(ok ? 0 : 1)
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error('Fehler:', e.message); process.exit(1) })
