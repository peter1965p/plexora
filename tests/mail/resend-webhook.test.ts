import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { verifySvix, svixSign, SVIX_TOLERANCE_SECONDS } from '../../server/utils/svix'

const writes: any[] = []
vi.mock('../../server/utils/dynamodb', () => ({
  getDynamoClient: () => ({ async send(cmd: any) { const n = cmd.constructor.name; if (/^(Update|Put|Delete)/.test(n)) writes.push(`${n}:${cmd.input.TableName}`); return { Attributes: { tenantId: 'T', email: 'abo@x.de' } } } }),
}))
let cfg: any = {}
class HttpError extends Error { statusCode: number; constructor(o: any) { super(o.message); this.statusCode = o.statusCode } }
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => new HttpError(o))
vi.stubGlobal('useRuntimeConfig', () => cfg)
vi.stubGlobal('getHeader', (e: any, n: string) => e.headers?.[n.toLowerCase()])
vi.stubGlobal('readRawBody', async (e: any) => e.rawBody)
const { default: hook } = await import('../../server/api/webhooks/resend.post')

const SECRET = 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw'
const body = JSON.stringify({ type: 'email.bounced', data: { reason: 'x', tags: [{ name: 'source', value: 'newsletter' }, { name: 'campaignId', value: 'c1' }, { name: 'subscriberId', value: 's1' }] } })
const now = () => Math.floor(Date.now() / 1000)
const signed = (over: any = {}) => { const id = over.id ?? 'msg_abc123', ts = over.ts ?? String(now()), raw = over.body ?? body; return { id, ts, raw, headers: { 'svix-id': id, 'svix-timestamp': ts, 'svix-signature': over.sig ?? `v1,${svixSign(over.secret ?? SECRET, id, ts, raw)}` } } }
const call = async (m: ReturnType<typeof signed>) => { writes.length = 0; try { return { code: 200, r: await (hook as any)({ headers: m.headers, rawBody: m.raw }) } } catch (e: any) { return { code: e.statusCode as number, r: null } } }
beforeEach(() => { cfg = { resendWebhookSecret: SECRET }; writes.length = 0 })

describe('Svix-Verfahren', () => {
  it('Referenzwert aus der Svix-Dokumentation (bekannte Antwort): Secret, ID, Zeitstempel und Nutzlast ergeben genau diese Signatur', () => {
    expect(svixSign('whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw', 'msg_p5jXN8AQM9LWM0D4loKWxJek', '1614265330', '{"test": 2432232314}')).toBe('g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=')
  })
  it('gültig; mehrere Signaturen (Secret-Wechsel): eine gültige genügt, Reihenfolge egal', () => {
    const t = String(now()), good = svixSign(SECRET, 'm1', t, body)
    for (const sig of [`v1,${good}`, `v1,AAAA v1,${good}`, `v1,${good} v1,AAAA`, `v2,xxx v1,${good}`]) expect(verifySvix({ id: 'm1', timestamp: t, signature: sig, body, secret: SECRET }), sig).toBe(true)
  })
  it('abgelehnt: falsches Secret, veränderte Nutzlast, andere ID, anderer Zeitstempel, nur v2/leer/Müll, fehlende Teile', () => {
    const t = String(now()), good = `v1,${svixSign(SECRET, 'm1', t, body)}`
    const bad: any[] = [{ secret: 'whsec_' + Buffer.from('anderes-geheimnis-xxxxxxxx').toString('base64') }, { body: body + ' ' }, { id: 'm2' }, { timestamp: String(now() - 1) }, { signature: good.replace('v1,', 'v2,') }, { signature: 'v1,' }, { signature: '' }, { signature: 'v1,!!!' }, { signature: undefined }, { id: undefined }, { timestamp: undefined }, { timestamp: 'abc' }, { secret: '' }, { secret: 'kurz' }]
    for (const o of bad) expect(verifySvix({ id: 'm1', timestamp: t, signature: good, body, secret: SECRET, ...o }), JSON.stringify(o)).toBe(false)
  })
  it('Zeitfenster 5 Minuten: knapp innerhalb gültig, knapp außerhalb (alt und aus der Zukunft) abgelehnt', () => {
    expect(SVIX_TOLERANCE_SECONDS).toBe(300); const n = now()
    for (const [d, ok] of [[-299, true], [299, true], [-301, false], [301, false], [-86400, false], [86400, false]] as const) { const t = String(n + d); expect(verifySvix({ id: 'm', timestamp: t, signature: `v1,${svixSign(SECRET, 'm', t, body)}`, body, secret: SECRET, now: n * 1000 }), String(d)).toBe(ok) }
  })
})

describe('Webhook-Route', () => {
  it('gültige Signatur: Ereignis wird verarbeitet (Bounce schreibt in die Datenbank)', async () => { const r = await call(signed()); expect(r.code).toBe(200); expect(r.r).toEqual({ ok: true }); expect(writes.length).toBeGreaterThan(0) })
  it('falsche/fehlende/zu alte Signatur: 401 und NICHTS wird geschrieben', async () => {
    for (const m of [signed({ sig: 'v1,ungueltig' }), signed({ secret: 'whsec_' + Buffer.from('falsches-secret-12345678').toString('base64') }), signed({ ts: String(now() - 3600) }), signed({ ts: String(now() + 3600) }), { ...signed(), headers: {} }, { ...signed(), headers: { 'svix-id': 'x' } }, { ...signed(), raw: body + 'x' }]) {
      const r = await call(m as any); expect(r.code).toBe(401); expect(writes).toEqual([])
    }
  })
  it('ohne gesetztes Secret wird jeder Aufruf abgelehnt (auch ein "gültig" signierter mit leerem Secret), nichts geschrieben', async () => {
    for (const c of [{}, { resendWebhookSecret: '' }, { resendWebhookSecret: undefined }]) { cfg = c; for (const m of [signed(), signed({ secret: '' })]) { const r = await call(m); expect(r.code).toBe(401); expect(writes).toEqual([]) } }
  })
  it('gültig signierte, aber kaputte Nutzlast: 400, nichts geschrieben', async () => { const raw = 'kein json'; const r = await call(signed({ body: raw })); expect(r.code).toBe(400); expect(writes).toEqual([]) })
  it('die Prüfung geschieht VOR jeder Verarbeitung (statisch: verifySvix steht vor dem Parsen und vor jedem Datenbankzugriff)', () => {
    const src = readFileSync('server/api/webhooks/resend.post.ts', 'utf8'); const i = src.indexOf('verifySvix({')
    expect(i).toBeGreaterThan(-1); expect(i).toBeLessThan(src.indexOf('JSON.parse')); expect(i).toBeLessThan(src.indexOf('dynamo.send')); expect(src).toContain('readRawBody')
  })
  it('Vergleich zeitkonstant', () => { expect(readFileSync('server/utils/svix.ts', 'utf8')).toContain('timingSafeEqual') })
})
