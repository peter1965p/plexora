import { describe, it, expect, vi, beforeEach } from 'vitest'

const st = { licenses: [] as any[], counters: new Map<string, number>(), enforce: '' as any }
class HttpError extends Error { statusCode: number; constructor(o: any) { super(o.message); this.statusCode = o.statusCode } }
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => new HttpError(o))
vi.stubGlobal('useRuntimeConfig', () => ({ planEnforce: st.enforce, adminEmail: '' }))
vi.mock('../../server/utils/dynamodb', () => ({
  getDynamoClient: () => ({
    async send(cmd: any) {
      const i = cmd.input; const t = i.TableName; const v = i.ExpressionAttributeValues || {}
      if (t === 'plexora-newsletter-ratelimit') {
        if (cmd.constructor.name === 'GetCommand') { const c = st.counters.get(i.Key.throttleKey); return { Item: c === undefined ? undefined : { count: c } } }
        const k = i.Key.throttleKey; const c = (st.counters.get(k) || 0) + v[':n']; st.counters.set(k, c); return { Attributes: { count: c } }
      }
      if (t === 'plexora-licenses') return { Items: st.licenses.filter(l => l.customerEmail === v[':e']) }
      return { Items: [] }
    },
  }),
}))
const { default: route } = await import('../../server/api/plan/index.get')
const { reserveMail } = await import('../../server/utils/mailQuota')
const { invalidatePlanCache } = await import('../../server/utils/tenantPlan')
const call = (email: string, groups: string[] = []) => (route as any)({ context: { auth: { userId: 's', email, groups } } })
beforeEach(() => { st.licenses = []; st.counters.clear(); st.enforce = ''; invalidatePlanCache() })

describe('GET /api/plan', () => {
  it('ohne Anmeldung 401', async () => { await expect((route as any)({ context: {} })).rejects.toMatchObject({ statusCode: 401 }) })
  it('Free: Tarif, Limits, Verbrauch 0; liest nur, zählt nicht mit', async () => {
    const r = await call('neu@x.de'); expect(r).toMatchObject({ plan: 'free', label: 'Free', enforced: false, usage: { system: 0, bulk: 0 } })
    expect(r.limits).toMatchObject({ mailSystemPerDay: 5, mailBulkPerDay: 0, uploadMaxBytes: 1048576 }); expect(st.counters.size).toBe(0)
  })
  it('Starter: zeigt den heutigen Verbrauch', async () => {
    st.licenses = [{ customerEmail: 'chef@firma.de', tier: 'starter', status: 'active', modules: ['crm'] }]
    await reserveMail({ tenantId: 'chef@firma.de', pool: 'bulk', count: 40 }); await reserveMail({ tenantId: 'chef@firma.de', pool: 'system', count: 7 })
    expect(await call('chef@firma.de')).toMatchObject({ plan: 'starter', usage: { system: 7, bulk: 40 }, limits: { mailBulkPerDay: 200 } })
  })
  it('Betreiber: ausgenommen, Antwort enthält nur Zahlen des eigenen Mandanten (keine fremden Schlüssel)', async () => {
    const r = await call('peter@x.de', ['admins']); expect(r.exempt).toBe('platform')
    expect(Object.keys(r).sort()).toEqual(['enforced', 'exempt', 'label', 'limits', 'modules', 'plan', 'usage'])
  })
})
