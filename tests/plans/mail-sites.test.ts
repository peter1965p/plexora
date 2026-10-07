import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// ── Wächter: jede Stelle, die über Resend Mails versendet, geht durch das Tageslimit (server/utils/mailQuota.ts) – oder steht hier mit Begründung ──
const walk = (d: string): string[] => readdirSync(d).flatMap(n => { const f = join(d, n); return statSync(f).isDirectory() ? walk(f) : f.endsWith('.ts') ? [f] : [] })
const SENDS = /\b(emails\.send|batch\.send)\s*\(/
const EXEMPT: Record<string, string> = {
  'server/utils/mailer.ts': 'sendMail ist die zentrale Stelle und prüft selbst (reserveMail)',
  'server/api/webhooks/stripe.post.ts': 'Plattform-Mails an Käufer der Lizenz (Willkommen, Quittung), kein Mandant als Absender',
  'server/utils/moduleProvisioner.ts': 'Plattform-Mail nach dem Kauf eines Moduls',
  'server/api/newsletter/campaigns/[id]/test-send.post.ts': 'Testsendung an die eigene Adresse des Absenders; absichtlich nicht gezählt, damit Vorschauen nie am Limit scheitern',
}
describe('Mail-Versandstellen und Tageslimit', () => {
  const files = walk('server').filter(f => SENDS.test(readFileSync(f, 'utf8')))
  it('es gibt Versandstellen (Plausibilität)', () => expect(files.length).toBeGreaterThan(10))
  it('jede Datei mit direktem Resend-Versand ruft reserveMail/assertMailQuota auf oder ist begründet ausgenommen', () => {
    const missing = files.filter(f => !EXEMPT[f] && !/\b(reserveMail|assertMailQuota)\s*\(/.test(readFileSync(f, 'utf8')))
    expect(missing, `Versand ohne Tageslimit – mailQuota einbauen oder mit Begründung in EXEMPT eintragen:\n${missing.join('\n')}`).toEqual([])
  })
  it('die Ausnahmen sind begründet und gibt es noch', () => {
    for (const [f, why] of Object.entries(EXEMPT)) { expect(why.length).toBeGreaterThan(20); expect(files, f).toContain(f) }
  })
  it('die Prüfung steht VOR dem Versand (nicht danach)', () => {
    for (const f of files.filter(f => !EXEMPT[f])) {
      const src = readFileSync(f, 'utf8'); const q = src.search(/\b(reserveMail|assertMailQuota)\s*\(/), s = src.search(SENDS)
      expect(q, f).toBeGreaterThan(-1); expect(q, `${f}: Prüfung nach dem Versand`).toBeLessThan(s)
    }
  })
})

// ── Verhalten am Beispiel Newsletter-Import: ganz oder gar nicht, nichts gespeichert, nichts gesendet ──
const st = { licenses: [] as any[], counters: new Map<string, number>(), writes: [] as string[], sent: [] as any[], enforce: 'true' as any }
class HttpError extends Error { statusCode: number; data: any; constructor(o: any) { super(o.message); this.statusCode = o.statusCode; this.data = o.data } }
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => new HttpError(o))
vi.stubGlobal('readBody', async (e: any) => e.body)
vi.stubGlobal('useRuntimeConfig', () => ({ planEnforce: st.enforce, adminEmail: '', resendApiKey: 'k', public: { apiBase: 'https://api.example' } }))
vi.spyOn(console, 'warn').mockImplementation(() => {}); vi.spyOn(console, 'error').mockImplementation(() => {})
vi.mock('resend', () => ({ Resend: class { batch = { send: async (m: any) => { st.sent.push(...m); return { data: {}, error: null } } } } }))
vi.mock('../../server/utils/dynamodb', () => ({
  getDynamoClient: () => ({
    async send(cmd: any) {
      const n = cmd.constructor.name; const i = cmd.input; const t = i.TableName || Object.keys(i.RequestItems || {})[0]; const v = i.ExpressionAttributeValues || {}
      if (t === 'plexora-newsletter-ratelimit') { const k = i.Key.throttleKey; const c = (st.counters.get(k) || 0) + v[':n']; st.counters.set(k, c); return { Attributes: { count: c } } }
      if (t === 'plexora-licenses') return { Items: st.licenses.filter(l => l.customerEmail === v[':e']) }
      if (n === 'BatchWriteCommand') st.writes.push(t)
      return { Items: [] }
    },
  }),
}))
const { default: importRoute } = await import('../../server/api/newsletter/subscribers/import.post')
const { invalidatePlanCache } = await import('../../server/utils/tenantPlan')
const AUTH = { userId: 's', email: 'chef@firma.de', groups: ['customers'] }
const run = async (n: number) => { try { return { code: 200, res: await (importRoute as any)({ context: { auth: AUTH }, body: { subscribers: Array.from({ length: n }, (_, i) => ({ email: `s${i}@x.de` })) } }) } } catch (e: any) { return { code: e.statusCode as number, data: e.data } } }
beforeEach(() => { st.licenses = []; st.counters.clear(); st.writes.length = 0; st.sent.length = 0; st.enforce = 'true'; invalidatePlanCache() })

describe('Newsletter-Import und Massen-Limit', () => {
  it('Free: 402, es wird nichts gespeichert und nichts gesendet', async () => {
    const r = await run(3); expect(r.code).toBe(402); expect(r.data).toMatchObject({ code: 'PLAN_REQUIRED' }); expect(st.writes).toEqual([]); expect(st.sent).toEqual([])
  })
  it('Starter (200 am Tag): 150 gehen, weitere 100 werden ganz abgelehnt (429), danach geht der Rest', async () => {
    st.licenses = [{ customerEmail: 'chef@firma.de', tier: 'starter', status: 'active', modules: ['newsletter'] }]
    expect((await run(150)).code).toBe(200); expect(st.sent).toHaveLength(150)
    st.writes.length = 0; st.sent.length = 0
    const over = await run(100); expect(over.code).toBe(429); expect(over.data).toMatchObject({ code: 'MAIL_LIMIT', limit: 200, used: 150 }); expect(st.writes).toEqual([]); expect(st.sent).toEqual([])
    expect((await run(50)).code).toBe(200); expect(st.sent).toHaveLength(50)
  })
  it('Beobachtungsmodus: Free darf weiter importieren', async () => {
    st.enforce = ''; expect((await run(3)).code).toBe(200); expect(st.sent).toHaveLength(3)
  })
})
