import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'

// ── Fakes ───────────────────────────────────────────────────────────────────────────────────
let stripeEvent: any
const updates: any[] = []; const provisioned: any[] = []; const logged: string[] = []
let registry: Record<string, any> = {}
vi.mock('stripe', () => ({ default: class { webhooks = { constructEvent: () => stripeEvent } } }))
vi.mock('resend', () => ({ Resend: class { emails = { send: async () => ({ data: {}, error: null }) } } }))
vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: class { send = async () => ({}) },
  AdminCreateUserCommand: class {}, AdminAddUserToGroupCommand: class {},
}))
vi.mock('../../server/utils/moduleProvisioner', () => ({ provisionModule: async (...a: any[]) => { provisioned.push(a) } }))
vi.mock('../../server/utils/dynamodb', () => ({
  getDynamoClient: () => ({
    async send(cmd: any) {
      const n = cmd.constructor.name; const i = cmd.input
      if (n === 'GetCommand' && i.TableName === 'plexora-plugin-registry') return { Item: registry[i.Key.key] }
      if (n === 'ScanCommand' && i.TableName === 'plexora-licenses')
        return { Items: [{ licenseKey: 'LIC-1', customerEmail: 'kunde@firma.de', status: 'active', modules: ['crm'] }] }
      if (n === 'UpdateCommand' && i.TableName === 'plexora-licenses') updates.push(i)
      return {}
    },
  }),
}))
class HttpError extends Error { statusCode: number; constructor(o: any) { super(o.message); this.statusCode = o.statusCode } }
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => new HttpError(o))
vi.stubGlobal('readRawBody', async () => 'raw')
vi.stubGlobal('getHeader', () => 'sig')
vi.stubGlobal('useRuntimeConfig', () => ({ stripeSecretKey: 'sk', resendApiKey: 'k', public: {} }))
vi.spyOn(console, 'error').mockImplementation((...a: any[]) => { logged.push(a.join(' ')) })
vi.spyOn(console, 'log').mockImplementation(() => {})

const { default: webhook } = await import('../../server/api/webhooks/stripe.post')
const { verifyModulePurchase, getCatalogEntry } = await import('../../server/utils/storeCatalog')

const session = (over: any = {}) => ({
  id: 'cs_1', payment_status: 'paid', currency: 'eur', amount_subtotal: 900, customer: 'cus_1',
  metadata: { type: 'module_purchase', moduleKey: 'crm', email: 'kunde@firma.de' }, ...over,
})
const run = (s: any) => { stripeEvent = { type: 'checkout.session.completed', data: { object: s } }; return webhook({} as any) }

beforeEach(() => { updates.length = 0; provisioned.length = 0; logged.length = 0; registry = {} })

describe('Webhook: Freischaltung nur bei passendem bezahltem Betrag', () => {
  it('korrekter Betrag (9 EUR für crm) schaltet frei', async () => {
    await run(session({ metadata: { type: 'module_purchase', moduleKey: 'finance', email: 'kunde@firma.de' }, amount_subtotal: 1200 }))
    expect(updates.length).toBe(1)
    expect(updates[0].ExpressionAttributeValues[':m']).toContain('finance')
    expect(provisioned.length).toBe(1)
  })
  it('manipulierter Preis (1 Cent) wird abgelehnt: keine Freischaltung, keine Bereitstellung, Fehler im Log', async () => {
    await run(session({ amount_subtotal: 1, metadata: { type: 'module_purchase', moduleKey: 'finance', email: 'kunde@firma.de' } }))
    expect(updates).toEqual([]); expect(provisioned).toEqual([])
    expect(logged.join('\n')).toMatch(/\[module_purchase\] ABGELEHNT finance/)
  })
  it('nicht bezahlt, falsche Währung oder fehlender Betrag: abgelehnt', async () => {
    for (const bad of [{ payment_status: 'unpaid' }, { payment_status: undefined }, { currency: 'usd' }, { amount_subtotal: null }, { amount_subtotal: 901 }, { amount_subtotal: 899 }]) {
      updates.length = 0
      await run(session(bad))
      expect(updates, JSON.stringify(bad)).toEqual([])
    }
  })
  it('unbekanntes Modul wird nicht freigeschaltet', async () => {
    await run(session({ metadata: { type: 'module_purchase', moduleKey: 'phantom', email: 'kunde@firma.de' } }))
    expect(updates).toEqual([])
  })
  it('Registry-Modul: Betrag muss dem Registry-Preis entsprechen', async () => {
    registry['plugin-x'] = { key: 'plugin-x', name: 'X', price: 29 }
    const meta = { type: 'module_purchase', moduleKey: 'plugin-x', email: 'kunde@firma.de' }
    await run(session({ metadata: meta, amount_subtotal: 100 })); expect(updates).toEqual([])
    await run(session({ metadata: meta, amount_subtotal: 2900 })); expect(updates.length).toBe(1)
  })
})

describe('Rabattcodes und Gutscheine führen nicht zur Ablehnung', () => {
  const meta = { type: 'module_purchase', moduleKey: 'finance', email: 'kunde@firma.de' }
  it('Prozent-/Betragsrabatt: Endbetrag niedriger, Betrag vor Rabatt = Katalogpreis -> freigeschaltet', async () => {
    await run(session({ metadata: meta, amount_subtotal: 1200, amount_total: 960 })) // 20 % Rabatt
    expect(updates.length).toBe(1)
    expect(logged.join('\n')).not.toMatch(/ABGELEHNT/)
  })
  it('100-Prozent-Gutschein: Status no_payment_required, Endbetrag 0 -> freigeschaltet', async () => {
    await run(session({ metadata: meta, amount_subtotal: 1200, amount_total: 0, payment_status: 'no_payment_required' }))
    expect(updates.length).toBe(1)
  })
  it('Steuer erhöht nur den Endbetrag -> freigeschaltet', async () => {
    await run(session({ metadata: meta, amount_subtotal: 1200, amount_total: 1428 })) // 19 % Steuer
    expect(updates.length).toBe(1)
  })
  it('ein Rabatt macht aber einen falschen Positionsbetrag nicht richtig (Preis vor Rabatt zählt)', async () => {
    await run(session({ metadata: meta, amount_subtotal: 100, amount_total: 100 }))
    expect(updates).toEqual([])
  })
  it('offene Zahlung (unpaid) schaltet nichts frei, auch nicht mit korrektem Betrag', async () => {
    await run(session({ metadata: meta, amount_subtotal: 1200, payment_status: 'unpaid' }))
    expect(updates).toEqual([])
  })
})

describe('verifyModulePurchase', () => {
  const entry = { key: 'crm', name: 'CRM', priceEur: 9, source: 'builtin' as const }
  it('ok nur bei bezahlt + EUR + exaktem Betrag', () => {
    expect(verifyModulePurchase({ payment_status: 'paid', currency: 'EUR', amount_subtotal: 900 }, entry)).toEqual({ ok: true })
    expect(verifyModulePurchase({ payment_status: 'paid', currency: 'eur', amount_subtotal: 899 }, entry).ok).toBe(false)
    expect(verifyModulePurchase({ payment_status: 'paid', currency: 'eur', amount_subtotal: 900 }, null).ok).toBe(false)
  })
  it('Katalog: Rundung auf Cent und Grenzen', async () => {
    const e = await getCatalogEntry('p', async () => ({ name: 'P', price: 19.999 }))
    expect(e?.priceEur).toBe(20)
    expect(await getCatalogEntry('p', async () => ({ price: 10_001 }))).toBeNull()
  })
})

describe('Quellcode', () => {
  it('die Prüfung steht vor dem Lizenz-Update', () => {
    const src = readFileSync('server/api/webhooks/stripe.post.ts', 'utf8')
    const fall3 = src.slice(src.indexOf('FALL 3'), src.indexOf('FALL 4'))
    expect(fall3.indexOf('verifyModulePurchase')).toBeGreaterThan(-1)
    expect(fall3.indexOf('verifyModulePurchase')).toBeLessThan(fall3.indexOf("TableName: 'plexora-licenses'"))
  })
})
