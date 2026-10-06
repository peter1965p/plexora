import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'

const sessions: any[] = []
let registry: Record<string, any> = {}
vi.mock('stripe', () => ({
  default: class {
    customers = { list: async () => ({ data: [] }) }
    checkout = { sessions: { create: async (p: any) => { sessions.push(p); return { url: 'https://stripe.test/s' } } } }
  },
}))
vi.mock('../../server/utils/dynamodb', () => ({
  getDynamoClient: () => ({
    async send(cmd: any) {
      const n = cmd.constructor.name; const i = cmd.input
      if (n === 'GetCommand' && i.TableName === 'plexora-plugin-registry') return { Item: registry[i.Key.key] }
      if (n === 'ScanCommand') return { Items: [] }
      return {}
    },
  }),
}))
class HttpError extends Error { statusCode: number; constructor(o: any) { super(o.message); this.statusCode = o.statusCode } }
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => new HttpError(o))
vi.stubGlobal('readBody', async (e: any) => e.body)
vi.stubGlobal('getHeader', () => 'https://app.plexora.eu')
vi.stubGlobal('useRuntimeConfig', () => ({ stripeSecretKey: 'sk_test' }))

const { default: checkout } = await import('../../server/api/store/checkout.post')
const { BUILTIN_MODULES } = await import('../../server/utils/storeCatalog')

const user = { userId: 'sub-1', email: 'kunde@firma.de', groups: ['customers'] }
const demo = { userId: 'sub-d', email: 'demo@plexora.eu', groups: ['customers'] }
const ev = (auth: any, body: any) => ({ context: { auth }, body })
const status = (p: Promise<any>) => p.then(() => 200, (e: any) => e.statusCode)

beforeEach(() => { sessions.length = 0; registry = {} })

describe('Anmeldung', () => {
  it('ohne Token 401, Demo-Konto 403, keine Stripe-Sitzung', async () => {
    expect(await status(checkout(ev(undefined, { moduleKey: 'crm' }) as any))).toBe(401)
    expect(await status(checkout(ev({ userId: '', email: '', groups: [] }, { moduleKey: 'crm' }) as any))).toBe(401)
    expect(await status(checkout(ev(demo, { moduleKey: 'crm' }) as any))).toBe(403)
    expect(sessions).toEqual([])
  })
})

describe('Preis ausschließlich aus dem Server-Katalog', () => {
  it('manipulierter Preis und Name aus dem Request werden ignoriert', async () => {
    await checkout(ev(user, { moduleKey: 'crm', name: 'Gratis-Modul', priceEur: 0.01 }) as any)
    const s = sessions[0]
    expect(s.line_items[0].price_data.unit_amount).toBe(900)            // 9 EUR aus dem Katalog, nicht 1 Cent
    expect(s.line_items[0].price_data.product_data.name).toBe('Plexora — CRM')
    expect(s.metadata).toMatchObject({ type: 'module_purchase', moduleKey: 'crm', moduleName: 'CRM', email: 'kunde@firma.de' })
  })
  it('auch negative, riesige oder nicht numerische Preise im Body ändern nichts', async () => {
    for (const bad of [-5, 0, 1e9, 'kostenlos', null, { $gt: 0 }]) {
      sessions.length = 0
      await checkout(ev(user, { moduleKey: 'finance', priceEur: bad }) as any)
      expect(sessions[0].line_items[0].price_data.unit_amount, String(bad)).toBe(1200)
    }
  })
  it('ohne priceEur im Body funktioniert der Kauf (Preis kommt vom Server)', async () => {
    expect(await status(checkout(ev(user, { moduleKey: 'termine' }) as any))).toBe(200)
    expect(sessions[0].line_items[0].price_data.unit_amount).toBe(1500)
  })
  it('die E-Mail stammt aus dem Token, nicht aus dem Body', async () => {
    await checkout(ev(user, { moduleKey: 'crm', email: 'opfer@fremd.de' }) as any)
    expect(sessions[0].metadata.email).toBe('kunde@firma.de')
  })
  it('Schlüssel wird normalisiert (Großschreibung)', async () => {
    await checkout(ev(user, { moduleKey: ' CRM ' }) as any)
    expect(sessions[0].metadata.moduleKey).toBe('crm')
  })
})

describe('Katalog: unbekannt oder nicht kaufbar', () => {
  it('unbekannte und manipulierte Schlüssel liefern 404 ohne Sitzung', async () => {
    for (const k of ['gibts-nicht', '../etc', '__proto__', 'constructor', 'a'.repeat(80), '', 'crm;drop'])
      expect(await status(checkout(ev(user, { moduleKey: k, priceEur: 1 }) as any)), k).toBe(k === '' ? 400 : 404)
    expect(sessions).toEqual([])
  })
  it('Plugin-Modul aus der Registry: Preis aus der Datenbank', async () => {
    registry['plugin-x'] = { key: 'plugin-x', name: 'Plugin X', price: 29 }
    await checkout(ev(user, { moduleKey: 'plugin-x', priceEur: 1 }) as any)
    expect(sessions[0].line_items[0].price_data.unit_amount).toBe(2900)
  })
  it('Registry-Modul mit Preis 0, negativ oder unsinnig ist nicht kaufbar (404)', async () => {
    for (const price of [0, -3, 'abc', 1e6, null, undefined]) {
      registry['plugin-y'] = { key: 'plugin-y', name: 'Y', price }
      expect(await status(checkout(ev(user, { moduleKey: 'plugin-y' }) as any)), String(price)).toBe(404)
    }
    expect(sessions).toEqual([])
  })
})

describe('Server-Preisliste und Store-Seite stimmen überein', () => {
  it('jeder eingebaute Modulpreis in store.vue entspricht BUILTIN_MODULES', () => {
    const page = readFileSync('app/pages/store.vue', 'utf8')
    const found = [...page.matchAll(/key: '([^']+)', name: '([^']+)'[\s\S]*?price: '€(\d+(?:[.,]\d+)?)'/g)]
    expect(found.length).toBe(Object.keys(BUILTIN_MODULES).length)
    for (const [, key, name, price] of found) {
      expect(BUILTIN_MODULES[key], key).toBeDefined()
      expect(BUILTIN_MODULES[key].priceEur, key).toBe(Number(price.replace(',', '.')))
      expect(BUILTIN_MODULES[key].name, key).toBe(name)
    }
  })
  it('die Store-Seite schickt nur den Modul-Schlüssel, keinen Preis', () => {
    const page = readFileSync('app/pages/store.vue', 'utf8')
    const call = page.slice(page.indexOf('async function checkout()'), page.indexOf('async function checkout()') + 1400)
    expect(call).toContain('body: { moduleKey: buyItem.value.key }')
    expect(call).not.toContain('priceEur')
  })
  it('die Checkout-Route liest weder priceEur noch name aus dem Request', () => {
    const src = readFileSync('server/api/store/checkout.post.ts', 'utf8')
    expect(src).not.toMatch(/priceEur\s*[,}]|\bname\s*,\s*priceEur|body\??\.priceEur|body\??\.name/)
  })
})
