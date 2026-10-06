import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installGlobals, authEv, code } from '../botprotection/helpers'

const store = { payment: undefined as any, puts: [] as any[] }
const stripeKeys: string[] = []
const webhookSecrets: string[] = []
vi.mock('../../server/utils/dynamodb', () => ({
  getDynamoClient: () => ({
    async send(cmd: any) {
      const n = cmd.constructor.name; const i = cmd.input
      if (i.TableName === 'plexora-settings' && n === 'GetCommand' && i.Key.settingId === 'payment') return { Item: store.payment }
      if (i.TableName === 'plexora-settings' && n === 'PutCommand' && i.Item.settingId === 'payment') { store.puts.push(i.Item); store.payment = i.Item }
      return {}
    },
  }),
}))
vi.mock('stripe', () => ({
  default: class { constructor(key: string) { stripeKeys.push(key) }
    checkout = { sessions: { create: async () => ({ url: 'https://stripe.test/pay', id: 'cs_1' }) } }
    customers = { list: async () => ({ data: [] }) }
    webhooks = { constructEvent: (_b: any, _s: any, secret: string) => { webhookSecrets.push(secret); throw new Error('Signatur (Test)') } } },
}))
vi.mock('resend', () => ({ Resend: class { emails = { send: async () => ({ data: { id: 'x' }, error: null }) } } }))
installGlobals()
vi.stubGlobal('useRuntimeConfig', () => ({ resendApiKey: 're_test', encryptionKey: Buffer.alloc(32, 7).toString('base64'), stripeSecretKey: 'sk_test_ENVFALLBACK', public: { awsUserPoolId: 'p' } }))
vi.stubGlobal('readRawBody', async () => '{}')
const { encryptSecret } = await import('../../server/utils/crypto')
const { sealSecret, revealSecret, isEncryptedSecret, PAYMENT_SECRET_FIELDS } = await import('../../server/utils/paymentSecrets')
const { default: save } = await import('../../server/api/settings/payment.post')
const { default: read } = await import('../../server/api/settings/payment.get')
const { default: licenseCheckout } = await import('../../server/api/licenses/checkout.post')
const { default: stripeWebhook } = await import('../../server/api/webhooks/stripe.post')

const SK = 'sk_test_PLAINTEXTKEY1234567890'
const WH = 'whsec_PLAINTEXTWEBHOOK1234567890'
beforeEach(() => { store.payment = undefined; store.puts = []; stripeKeys.length = 0; webhookSecrets.length = 0 })
const admin = ['admins']

describe('Hilfsfunktionen', () => {
  it('verschlüsseln und entschlüsseln: gleicher Wert; Format wird erkannt; doppelt verschlüsseln gibt es nicht', () => {
    const sealed = sealSecret(SK)
    expect(sealed).not.toContain('PLAINTEXT'); expect(isEncryptedSecret(sealed)).toBe(true)
    expect(revealSecret(sealed)).toBe(SK)
    expect(sealSecret(sealed)).toBe(sealed)
    expect(isEncryptedSecret(encryptSecret('x'))).toBe(true)
    expect(isEncryptedSecret(SK)).toBe(false)
  })
  it('Altwerte im Klartext bleiben lesbar (bis zur Migration), leer bleibt leer, manipuliertes Chiffrat schlägt fehl', () => {
    expect(revealSecret(SK)).toBe(SK); expect(revealSecret('')).toBe(''); expect(revealSecret(undefined)).toBe(''); expect(sealSecret('')).toBe('')
    const sealed = sealSecret(SK); const bad = sealed.slice(0, -2) + (sealed.endsWith('00') ? '11' : '00')
    expect(() => revealSecret(bad)).toThrow()
  })
})

describe('Speichern und Lesen der Zahlungs-Einstellungen', () => {
  it('alle fünf Geheimnisfelder werden verschlüsselt abgelegt; die Antwort enthält nie ein Geheimnis', async () => {
    await (save as any)(authEv('chef@plexora.eu', { body: { activeGateway: 'stripe', stripeSecretKey: SK, stripeWebhookSecret: WH, paypalSecret: 'pp-secret-123456', mollieApiKey: 'live_mollie123456', customApiKey: 'custom-key-123456' } }, admin))
    const item = store.puts[0]
    for (const f of PAYMENT_SECRET_FIELDS) { expect(isEncryptedSecret(item[f]), f).toBe(true) }
    expect(JSON.stringify(item)).not.toMatch(/PLAINTEXT|pp-secret|live_mollie|custom-key/)
    const res = await (read as any)(authEv('chef@plexora.eu', {}, admin))
    expect(res.payment).toMatchObject({ stripeSecretKeyConfigured: true, stripeWebhookSecretConfigured: true, paypalSecretConfigured: true })
    expect(JSON.stringify(res)).not.toMatch(/PLAINTEXT|sk_test|whsec|[0-9a-f]{24}:[0-9a-f]{32}/)
  })
  it('leeres Feld lässt das gespeicherte (verschlüsselte oder alte) Geheimnis unverändert, ohne es doppelt zu verschlüsseln', async () => {
    store.payment = { settingId: 'payment', scope: 'global', stripeSecretKey: SK, stripeWebhookSecret: sealSecret(WH) }
    await (save as any)(authEv('chef@plexora.eu', { body: { activeGateway: 'stripe' } }, admin))
    expect(store.puts[0].stripeSecretKey).toBe(SK)                        // Altwert bleibt, bis die Migration läuft
    expect(revealSecret(store.puts[0].stripeWebhookSecret)).toBe(WH)
  })
  it('nur Plattform-Admins, Demo-Konto 403, nichts gespeichert', async () => {
    expect(await code((save as any)(authEv('kunde@firma.de', { body: { stripeSecretKey: SK } })))).toBe(403)
    expect(await code((save as any)(authEv('demo@plexora.eu', { body: { stripeSecretKey: SK } }, admin)))).toBe(403)
    expect(store.puts).toHaveLength(0)
  })
})

describe('Checkout und Webhook arbeiten mit dem entschlüsselten Schlüssel', () => {
  const checkout = () => (licenseCheckout as any)({ headers: { origin: 'https://app.plexora.eu' }, body: { tier: Object.keys((globalThis as any).__tiers || {}).length ? 'starter' : 'starter', email: 'k@example.com' }, context: {}, query: {}, params: {} })
  it('verschlüsselt gespeichert: Stripe bekommt den Klartext-Schlüssel', async () => {
    store.payment = { settingId: 'payment', scope: 'global', stripeSecretKey: sealSecret(SK) }
    await checkout().catch(() => {})
    expect(stripeKeys).toEqual([SK])
  })
  it('alter Klartext-Wert (vor der Migration) funktioniert weiter; ohne DB-Wert gilt die Umgebungsvariable', async () => {
    store.payment = { settingId: 'payment', scope: 'global', stripeSecretKey: SK }
    await checkout().catch(() => {}); expect(stripeKeys).toEqual([SK])
    stripeKeys.length = 0; store.payment = undefined
    await checkout().catch(() => {}); expect(stripeKeys).toEqual(['sk_test_ENVFALLBACK'])
  })
  it('Webhook: die Signatur wird mit dem entschlüsselten Webhook-Secret geprüft (Klartext und verschlüsselt)', async () => {
    const ev = { headers: { 'stripe-signature': 't=1,v1=x' }, context: {}, body: {}, query: {}, params: {} }
    store.payment = { settingId: 'payment', scope: 'global', stripeWebhookSecret: sealSecret(WH) }
    await expect((stripeWebhook as any)(ev)).rejects.toMatchObject({ statusCode: 400 })
    store.payment = { settingId: 'payment', scope: 'global', stripeWebhookSecret: WH }
    await expect((stripeWebhook as any)(ev)).rejects.toMatchObject({ statusCode: 400 })
    expect(webhookSecrets).toEqual([WH, WH])
  })
})

describe('Migrationsskript: gleiches Format wie der Server', () => {
  it('vom Skript verschlüsselte Werte entschlüsselt der Server, und umgekehrt', async () => {
    const m = await import('../../scripts/security/payment-crypto.mjs')
    const key = Buffer.alloc(32, 7)
    const fromScript = m.seal(key, SK)
    expect(m.ENC.test(fromScript)).toBe(true); expect(isEncryptedSecret(fromScript)).toBe(true)
    expect(revealSecret(fromScript)).toBe(SK)
    expect(m.reveal(key, sealSecret(WH))).toBe(WH)
    expect(() => m.reveal(Buffer.alloc(32, 9), fromScript)).toThrow()          // falscher Schlüssel schlägt fehl
  })
})
