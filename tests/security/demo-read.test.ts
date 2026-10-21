import { describe, it, expect, vi, beforeAll } from 'vitest'
import { isDemoReadAllowed, requireAdminOrDemoRead, DEMO_READ_ROUTES } from '../../server/utils/demoRead'

class HttpError extends Error { statusCode: number; constructor(o: any) { super(o.message); this.statusCode = o.statusCode } }
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => new HttpError(o))
const item = { activeGateway: 'stripe', stripeSecretKey: 'sk_live_geheim', stripePublishableKey: 'pk_live_abc', stripeWebhookSecret: 'whsec_x', paypalClientId: 'client-id-123', paypalSecret: 's', customName: 'Meine Bank', customApiUrl: 'https://intern.example/api', customApiKey: 'k', updated: 'x' }
vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => ({ async send() { return { Item: item } } }) }))
vi.mock('../../server/utils/analyticsTracker', () => ({ getSeoStats: async () => ({ visits: 12, recentIps: [{ ts: '1', ip: '203.0.113.5', country: 'DE', city: 'Köln', page: '/' }] }) }))
const H: Record<string, any> = {}
beforeAll(async () => { H.pay = (await import('../../server/api/settings/payment.get')).default; H.seo = (await import('../../server/api/admin/seo-stats.get')).default; H.dun = (await import('../../server/api/settings/dunning.get')).default; H.payPost = (await import('../../server/api/settings/payment.post')).default })
const ev = (email: string | null, groups: string[], path: string, method = 'GET', body?: any) => ({ method, path, body, context: { auth: email ? { userId: 'u', email, groups } : undefined } })
const call = async (fn: any, e: any) => { try { return { code: 200, res: await fn(e) } } catch (x: any) { return { code: x.statusCode as number } } }
const DEMO = ['demo@plexora.eu', ['customers']] as const

describe('Demo-Konto: Betreiber-Seiten nur lesen', () => {
  it('erlaubt nur GET/HEAD auf die freigegebenen Routen', () => {
    const a = { email: 'demo@plexora.eu', groups: ['customers'] }
    for (const p of ['/api/settings/payment', '/api/settings/landing-theme', '/api/admin/seo-stats?x=1']) expect(isDemoReadAllowed(a, 'GET', p), p).toBe(true)
    expect(isDemoReadAllowed(a, 'head', '/api/settings/dunning')).toBe(true)
    for (const m of ['POST', 'PUT', 'PATCH', 'DELETE']) expect(isDemoReadAllowed(a, m, '/api/settings/payment'), m).toBe(false)
    for (const p of ['/api/aws/dynamo', '/api/aws/s3', '/api/licenses', '/api/licenses/PLXR-1', '/api/admin/data-integrity/scan', '/api/finance/batch-dunning', '/api/settings/payment/x', '/api/settings/paymentX']) expect(isDemoReadAllowed(a, 'GET', p), p).toBe(false)
    expect(isDemoReadAllowed({ email: 'chef@firma.de', groups: ['customers'] }, 'GET', '/api/settings/payment')).toBe(false)
    expect(isDemoReadAllowed(undefined, 'GET', '/api/settings/payment')).toBe(false); expect(DEMO_READ_ROUTES.length).toBe(3)
    expect(isDemoReadAllowed({ email: 'x@y.de', groups: ['demo'] }, 'GET', '/api/settings/dunning')).toBe(true)      // Cognito-Gruppe "demo" zählt ebenfalls
  })
  it('requireAdminOrDemoRead: Betreiber ja, Demo nur lesend, Kunde 403, ohne Anmeldung 401', () => {
    expect(requireAdminOrDemoRead(ev('peter@x.de', ['admins'], '/api/settings/payment', 'POST')).demo).toBe(false)
    expect(requireAdminOrDemoRead(ev(...DEMO, '/api/settings/payment')).demo).toBe(true)
    expect(() => requireAdminOrDemoRead(ev(...DEMO, '/api/settings/payment', 'POST'))).toThrow(/Nur für Admins/)
    expect(() => requireAdminOrDemoRead(ev('chef@firma.de', ['customers'], '/api/settings/payment'))).toThrow(/Nur für Admins/)
    expect(() => requireAdminOrDemoRead(ev(null, [], '/api/settings/payment'))).toThrow()
  })
  it('Payment: Demo sieht nur "eingerichtet", nie Schlüssel oder Adressen; Betreiber sieht die öffentlichen Kennungen', async () => {
    const d = (await call(H.pay, ev(...DEMO, '/api/settings/payment'))).res.payment
    expect(d).toMatchObject({ activeGateway: 'stripe', stripeSecretKeyConfigured: true, paypalSecretConfigured: true, stripePublishableKey: '', paypalClientId: '', customName: '', customApiUrl: '' })
    expect(JSON.stringify(d)).not.toMatch(/pk_live|client-id|intern\.example|sk_live|whsec|geheim/)
    expect((await call(H.pay, ev('peter@x.de', ['admins'], '/api/settings/payment'))).res.payment.stripePublishableKey).toBe('pk_live_abc')
  })
  it('SEO-Statistik: Demo ohne Besucher-IP-Adressen, Betreiber mit', async () => {
    const d = (await call(H.seo, ev(...DEMO, '/api/admin/seo-stats'))).res
    expect(d.recentIps).toEqual([]); expect(d.visits).toBe(12); expect(JSON.stringify(d)).not.toContain('203.0.113.5')
    expect((await call(H.seo, ev('peter@x.de', ['admins'], '/api/admin/seo-stats'))).res.recentIps.length).toBe(1)
  })
  it('Lesen geht, Schreiben bleibt dem Betreiber vorbehalten (403 für Demo)', async () => {
    expect((await call(H.dun, ev(...DEMO, '/api/settings/dunning'))).code).toBe(200)
    expect((await call(H.payPost, ev(...DEMO, '/api/settings/payment', 'POST', { activeGateway: 'stripe' }))).code).toBe(403)
    expect((await call(H.dun, ev('chef@firma.de', ['customers'], '/api/settings/dunning'))).code).toBe(403)
  })
})
