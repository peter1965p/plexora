import { describe, it, expect, vi, beforeEach } from 'vitest'

const st = { licenses: [] as any[], counters: new Map<string, number>(), enforce: '' as any, sent: [] as any[], logs: [] as any[] }
class HttpError extends Error { statusCode: number; constructor(o: any) { super(o.message); this.statusCode = o.statusCode } }
vi.stubGlobal('createError', (o: any) => new HttpError(o))
vi.stubGlobal('useRuntimeConfig', () => ({ planEnforce: st.enforce, adminEmail: '', resendApiKey: 'k' }))
vi.spyOn(console, 'warn').mockImplementation(() => {}); vi.spyOn(console, 'error').mockImplementation(() => {})
vi.mock('resend', () => ({ Resend: class { emails = { send: async (m: any) => { st.sent.push(m); return { data: { id: '1' }, error: null } } } } }))
vi.mock('../../server/utils/notifications', () => ({ notifySystem: async () => {} }))
vi.mock('../../server/utils/dynamodb', () => ({
  getDynamoClient: () => ({
    async send(cmd: any) {
      const i = cmd.input; const t = i.TableName; const v = i.ExpressionAttributeValues || {}
      if (t === 'plexora-newsletter-ratelimit') { const k = i.Key.throttleKey; const c = (st.counters.get(k) || 0) + v[':n']; st.counters.set(k, c); return { Attributes: { count: c } } }
      if (t === 'plexora-licenses') return { Items: st.licenses.filter(l => l.customerEmail === v[':e']) }
      if (t === 'plexora-mail-log') { st.logs.push(i.Item); return {} }
      return { Items: [] }
    },
  }),
}))
const { sendMail } = await import('../../server/utils/mailer')
const { invalidatePlanCache } = await import('../../server/utils/tenantPlan')
const mail = (over: any = {}) => sendMail({ userId: 'chef@firma.de', kind: 'booking_confirmation', from: 'a@plexora.eu', to: 'kunde@x.de', subject: 'S', text: 'T', ...over })
beforeEach(() => { st.licenses = []; st.counters.clear(); st.enforce = ''; st.sent.length = 0; st.logs.length = 0; invalidatePlanCache() })

describe('sendMail und das Tageslimit', () => {
  it('Beobachtungsmodus: Free sendet an Dritte weiter (nur Protokoll)', async () => {
    expect(await mail()).toBe('sent'); expect(st.sent).toHaveLength(1)
  })
  it('scharf: Free an einen Dritten -> nicht gesendet, im Protokoll "skipped" mit Begründung, Resend wird nie aufgerufen', async () => {
    st.enforce = 'true'
    expect(await mail()).toBe('skipped'); expect(st.sent).toHaveLength(0)
    expect(st.logs[0]).toMatchObject({ status: 'skipped', to: 'kunde@x.de' }); expect(st.logs[0].error).toMatch(/eigene Adresse/)
  })
  it('scharf: Free an die eigene Adresse und ein Mandant mit Lizenz an Kunden gehen', async () => {
    st.enforce = 'true'
    expect(await mail({ to: 'chef@firma.de' })).toBe('sent')
    st.licenses = [{ customerEmail: 'chef@firma.de', tier: 'starter', status: 'active', modules: ['crm'] }]; invalidatePlanCache()
    expect(await mail()).toBe('sent')
  })
  it('scharf: Sicherheitsmeldungen (kind internal) werden nie begrenzt', async () => {
    st.enforce = 'true'
    expect(await mail({ kind: 'internal', to: 'irgendwer@x.de' })).toBe('sent')
  })
  it('scharf: nach dem Tageslimit (Starter 100) wird nicht mehr gesendet', async () => {
    st.enforce = 'true'; st.licenses = [{ customerEmail: 'chef@firma.de', tier: 'starter', status: 'active', modules: ['crm'] }]
    const res: string[] = []
    for (let i = 0; i < 101; i++) res.push(await mail({ to: `k${i}@x.de` }))
    expect(res.filter(r => r === 'sent')).toHaveLength(100); expect(res[100]).toBe('skipped'); expect(st.sent).toHaveLength(100)
  })
})
