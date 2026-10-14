import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

const T = new Map<string, any>(); let bookings: any[] = []
const db = { async send(cmd: any) {
  const c = cmd.constructor.name, i = cmd.input
  if (c === 'GetCommand') return { Item: T.get(i.Key.tenantId) }
  if (c === 'QueryCommand') return { Items: bookings.filter(b => b.tenantId === i.ExpressionAttributeValues[':t']) }
  if (c === 'UpdateCommand') { if (i.TableName === 'plexora-newsletter-ratelimit') return { Attributes: { count: 1 } }; const row = T.get(i.Key.tenantId); if (!row) { const e: any = new Error('c'); e.name = 'ConditionalCheckFailedException'; throw e } row.termineIcalToken = i.ExpressionAttributeValues[':t']; return {} }
  return {}
} }
class HttpError extends Error { statusCode: number; constructor(o: any) { super(o.message); this.statusCode = o.statusCode } }
vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => db }))
vi.mock('../../server/utils/auth', () => ({ requireTenantId: async (e: any) => { if (!e.context.auth?.email) throw new HttpError({ statusCode: 401, message: 'x' }); return e.context.auth.email === 'chef@firma.de' ? 'T-A' : 'T-B' } }))
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => new HttpError(o))
vi.stubGlobal('getRouterParam', (e: any, n: string) => e.params?.[n])
vi.stubGlobal('getHeader', (e: any, n: string) => e.headers?.[n.toLowerCase()])
vi.stubGlobal('setHeader', (e: any, n: string, v: string) => { (e.out ||= {})[n] = v })
vi.stubGlobal('useRuntimeConfig', () => ({ planEnforce: '' }))
const H: Record<string, any> = {}
beforeAll(async () => { H.feed = (await import('../../server/api/public/termine/ical/[ref].get')).default; H.get = (await import('../../server/api/termine/ical-token.get')).default; H.post = (await import('../../server/api/termine/ical-token.post')).default })
let ip = 0
const ev = (auth: any, params: any = {}) => ({ context: { auth }, params, headers: { 'x-forwarded-for': `203.0.113.${++ip % 250}` } })
const call = async (fn: any, e: any) => { try { return { code: 200, res: await fn(e) } } catch (x: any) { return { code: x.statusCode as number } } }
const OWNER = { userId: 'u1', email: 'chef@firma.de', groups: ['customers'] }, OTHER = { userId: 'u2', email: 'fremd@firma.de', groups: ['customers'] }, DEMO = { userId: 'd', email: 'demo@plexora.eu', groups: ['customers'] }
beforeEach(() => { T.clear(); T.set('T-A', { tenantId: 'T-A', companyName: 'Firma A', termineTimezone: 'Europe/Berlin' }); T.set('T-B', { tenantId: 'T-B' }); ip = 0
  bookings = [{ tenantId: 'T-A', bookingId: 'a1', typeName: 'Beratung', date: '2999-01-01', startTime: '10:00', endTime: '10:30', customerName: 'Anna', customerEmail: 'anna@geheim.de', notes: 'vertraulich', channel: 'video', status: 'confirmed', videoLink: 'https://meet.jit.si/Plexora-x' },
    { tenantId: 'T-A', bookingId: 'a2', typeName: 'Beratung', date: '2999-01-02', startTime: '10:00', endTime: '10:30', customerName: 'Storno', status: 'cancelled' },
    { tenantId: 'T-B', bookingId: 'b1', typeName: 'Fremd', date: '2999-01-01', startTime: '11:00', endTime: '11:30', customerName: 'Fremder Gast', status: 'confirmed' }] })
const refOf = (url: string) => url.split('/ical/')[1]

describe('Abo-Link des Terminkalenders', () => {
  it('Link erzeugen: nur angemeldet, Demo gesperrt; erneuern macht den alten ungültig', async () => {
    expect((await call(H.post, ev(undefined))).code).toBe(401)
    expect((await call(H.post, ev(DEMO))).code).toBe(403)
    expect((await H.get(ev(OWNER))).url).toBeNull()
    const u1 = (await H.post(ev(OWNER))).url
    expect(u1).toMatch(/^https:\/\/app\.plexora\.eu\/api\/public\/termine\/ical\/T-A\.[A-Za-z0-9_-]{32}\.ics$/)
    expect((await H.get(ev(OWNER))).url).toBe(u1)
    expect((await call(H.feed, ev(undefined, { ref: refOf(u1) }))).code).toBe(200)
    const u2 = (await H.post(ev(OWNER))).url
    expect(u2).not.toBe(u1)
    expect((await call(H.feed, ev(undefined, { ref: refOf(u1) }))).code).toBe(404)
    expect((await call(H.feed, ev(undefined, { ref: refOf(u2) }))).code).toBe(200)
  })
  it('Mandanten getrennt: jeder Link zeigt nur die eigenen Termine', async () => {
    const a = (await H.post(ev(OWNER))).url, b = (await H.post(ev(OTHER))).url
    const fa = await H.feed(ev(undefined, { ref: refOf(a) })), fb = await H.feed(ev(undefined, { ref: refOf(b) }))
    expect(fa).toContain('Beratung – Anna'); expect(fa).not.toContain('Fremd')
    expect(fb).toContain('Fremd – Fremder Gast'); expect(fb).not.toContain('Anna')
  })
  it('Datei: keine stornierten Termine, keine E-Mail, keine Notizen', async () => {
    const u = (await H.post(ev(OWNER))).url
    const f = await H.feed(ev(undefined, { ref: refOf(u) }))
    expect((f.match(/BEGIN:VEVENT/g) || []).length).toBe(1)
    for (const s of ['Storno', 'anna@geheim.de', 'vertraulich']) expect(f).not.toContain(s)
  })
  it('falsches Geheimnis, falsche Form, unbekannter Mandant: einheitlich 404', async () => {
    const u = (await H.post(ev(OWNER))).url
    for (const ref of [`T-A.${'x'.repeat(32)}.ics`, `T-A.ics`, 'quatsch', `T-Z.${refOf(u).split('.')[1]}.ics`, `T-B.${refOf(u).split('.')[1]}.ics`, `../x.${'A'.repeat(32)}.ics`]) expect((await call(H.feed, ev(undefined, { ref }))).code, ref).toBe(404)
  })
})
