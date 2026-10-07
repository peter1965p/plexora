import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import Stripe from 'stripe'
import { installGlobals } from '../botprotection/helpers'
import { signedRequest, probeEvent } from '../../scripts/security/stripe-webhook-probe.mjs'

// Echte Stripe-Signaturprüfung (die Bibliothek ist NICHT ersetzt): dasselbe Ereignis, das die Probe vor und nach der Migration an den Live-Webhook schickt.
const store = { payment: undefined as any, writes: [] as string[] }
vi.mock('../../server/utils/dynamodb', () => ({
  getDynamoClient: () => ({
    async send(cmd: any) {
      const n = cmd.constructor.name; const i = cmd.input
      if (i.TableName === 'plexora-settings' && n === 'GetCommand' && i.Key.settingId === 'payment') return { Item: store.payment }
      if (/^(Put|Update|Delete)/.test(n)) store.writes.push(`${n}:${i.TableName}`)
      return {}
    },
  }),
}))
vi.mock('resend', () => ({ Resend: class { emails = { send: async () => { store.writes.push('mail'); return { data: { id: 'x' }, error: null } } } } }))
installGlobals()
let rawBody = ''
vi.stubGlobal('useRuntimeConfig', () => ({ resendApiKey: 're_test', encryptionKey: Buffer.alloc(32, 7).toString('base64'), stripeSecretKey: 'sk_test_ENV', public: { awsUserPoolId: 'p' } }))
vi.stubGlobal('readRawBody', async () => rawBody)
const { sealSecret } = await import('../../server/utils/paymentSecrets')
const { default: webhook } = await import('../../server/api/webhooks/stripe.post')

const WH = 'whsec_ProbeSecret0123456789abcdef'
beforeEach(() => { store.payment = undefined; store.writes = [] })
const call = async (payload: string, header: string) => { rawBody = payload; try { return { status: 200, r: await (webhook as any)({ headers: { 'stripe-signature': header }, context: {}, body: {}, query: {}, params: {} }) } } catch (e: any) { return { status: e.statusCode as number, r: null } } }

describe('Stripe-Probe: dasselbe Ereignis vor und nach der Verschlüsselung', () => {
  it('die Probe signiert so, dass die echte Stripe-Bibliothek sie annimmt; falsches Secret, veränderte Nutzlast und alter Zeitstempel werden abgelehnt', () => {
    const s = new Stripe('sk_test_x'); const p = probeEvent(); const ok = signedRequest(p, WH)
    expect(s.webhooks.constructEvent(ok.payload, ok.header, WH).type).toBe('plexora.probe')
    expect(() => s.webhooks.constructEvent(ok.payload, signedRequest(p, 'whsec_' + 'x'.repeat(32)).header, WH)).toThrow()
    expect(() => s.webhooks.constructEvent(p.replace('probe', 'andere'), ok.header, WH)).toThrow()
    expect(() => s.webhooks.constructEvent(p, signedRequest(p, WH, Math.floor(Date.now() / 1000) - 3600).header, WH)).toThrow()
  })
  it('VORHER (Klartext in der Datenbank): gültig 200 ohne jede Nebenwirkung, falsche Signatur 400', async () => {
    store.payment = { settingId: 'payment', scope: 'global', stripeWebhookSecret: WH }
    const p = probeEvent(); expect((await call(p, signedRequest(p, WH).header)).status).toBe(200); expect((await call(p, signedRequest(p, 'whsec_' + 'x'.repeat(32)).header)).status).toBe(400)
    expect(store.writes).toEqual([])
  })
  it('NACHHER (verschlüsselt in der Datenbank): gleiches Ergebnis – 200 mit gültiger, 400 mit falscher Signatur', async () => {
    store.payment = { settingId: 'payment', scope: 'global', stripeWebhookSecret: sealSecret(WH) }
    expect(store.payment.stripeWebhookSecret).not.toContain('whsec_')
    const p = probeEvent(); const a = await call(p, signedRequest(p, WH).header); expect(a.status).toBe(200); expect(a.r).toEqual({ received: true })
    expect((await call(p, signedRequest(p, 'whsec_' + 'x'.repeat(32)).header)).status).toBe(400); expect(store.writes).toEqual([])
  })
  it('wird der Schlüssel zum Entschlüsseln verfehlt (falscher NUXT_ENCRYPTION_KEY), lehnt der Webhook ab statt etwas durchzulassen – die Probe "nachher" schlägt dann rot an', async () => {
    store.payment = { settingId: 'payment', scope: 'global', stripeWebhookSecret: sealSecret(WH) }
    vi.stubGlobal('useRuntimeConfig', () => ({ resendApiKey: 're_test', encryptionKey: Buffer.alloc(32, 9).toString('base64'), stripeSecretKey: 'sk_test_ENV', public: { awsUserPoolId: 'p' } }))
    const p = probeEvent(); expect((await call(p, signedRequest(p, WH).header)).status).toBe(400)
    vi.stubGlobal('useRuntimeConfig', () => ({ resendApiKey: 're_test', encryptionKey: Buffer.alloc(32, 7).toString('base64'), stripeSecretKey: 'sk_test_ENV', public: { awsUserPoolId: 'p' } }))
  })
})

describe('Probe-Skript: Sicherheit', () => {
  const src = readFileSync('scripts/security/stripe-webhook-probe.mjs', 'utf8')
  it('liest das Secret nur aus der Umgebung, gibt höchstens die ersten 4 Zeichen aus und schreibt nichts nach AWS', () => {
    expect(src).toContain('process.env.STRIPE_WEBHOOK_SECRET'); expect(src).toContain('secret.slice(0, 4)'); expect(src).not.toMatch(/console\.(log|error)\([^)]*\bsecret\b(?!\.slice)/)
    expect(src).not.toMatch(/PutItem|UpdateItem|DeleteItem|aws-sdk|execFileSync/)
  })
  it('Ereignistyp ist harmlos (wird vom Webhook nicht ausgewertet) und der Checkout-Test legt weder Lizenz noch Zahlung an', () => {
    expect(JSON.parse(probeEvent()).type).toBe('plexora.probe'); expect(src).toContain("/api/licenses/checkout"); expect(src).toContain('unbezahlte Checkout-Sitzung')
  })
})
