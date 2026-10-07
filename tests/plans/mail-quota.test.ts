import { describe, it, expect, vi, beforeEach } from 'vitest'

const st = { licenses: [] as any[], counters: new Map<string, number>(), enforce: '' as any, admin: '', fail: false, warns: [] as string[] }
class HttpError extends Error { statusCode: number; data: any; constructor(o: any) { super(o.message); this.statusCode = o.statusCode; this.data = o.data } }
vi.stubGlobal('createError', (o: any) => new HttpError(o))
vi.stubGlobal('useRuntimeConfig', () => ({ planEnforce: st.enforce, adminEmail: st.admin }))
vi.spyOn(console, 'warn').mockImplementation((...a: any[]) => { st.warns.push(a.join(' ')) }); vi.spyOn(console, 'error').mockImplementation(() => {})
vi.mock('../../server/utils/dynamodb', () => ({
  getDynamoClient: () => ({
    async send(cmd: any) {
      const i = cmd.input; const t = i.TableName; const v = i.ExpressionAttributeValues || {}
      if (t === 'plexora-newsletter-ratelimit') { const k = i.Key.throttleKey; const c = (st.counters.get(k) || 0) + v[':n']; st.counters.set(k, c); return { Attributes: { count: c } } }
      if (st.fail) throw new Error('down')
      if (t === 'plexora-licenses') return { Items: st.licenses.filter(l => l.customerEmail === v[':e']) }
      return { Items: [] }
    },
  }),
}))
const { reserveMail, assertMailQuota } = await import('../../server/utils/mailQuota')
const { invalidatePlanCache } = await import('../../server/utils/tenantPlan')
const { PLAN_LIMITS } = await import('../../shared/plans')

const lic = (tier: string) => ({ customerEmail: 'chef@firma.de', tier, status: 'active', modules: ['crm'] })
beforeEach(() => { st.licenses = []; st.counters.clear(); st.enforce = 'true'; st.admin = ''; st.fail = false; st.warns.length = 0; invalidatePlanCache() })
const sys = (rcpt: string, tenant = 'chef@firma.de') => reserveMail({ tenantId: tenant, pool: 'system', recipients: [rcpt] })
const used = (prefix: string) => [...st.counters.entries()].filter(([k]) => k.startsWith(prefix)).map(([, v]) => v)

describe('Systemmails', () => {
  it('Free: 5 pro Tag, nur an die eigene Adresse', async () => {
    const r: boolean[] = []
    for (let i = 0; i < 6; i++) r.push((await sys('chef@firma.de')).ok)   // je Empfänger gilt zusätzlich 3/Tag: Free trifft zuerst diese Grenze
    expect(r.filter(Boolean).length).toBe(3)
    expect((await sys('kunde@x.de')).reason).toBe('free-recipient'); expect((await sys('kunde@x.de')).message).toMatch(/eigene Adresse/)
  })
  it('Starter: 100 pro Tag; Zähler zählt je Mandant getrennt', async () => {
    st.licenses = [lic('starter')]
    for (let i = 0; i < 100; i++) expect((await reserveMail({ tenantId: 'chef@firma.de', pool: 'system', count: 1 })).ok, String(i)).toBe(true)
    const over = await reserveMail({ tenantId: 'chef@firma.de', pool: 'system', count: 1 }); expect(over).toMatchObject({ ok: false, reason: 'daily', limit: 100 })
    expect((await reserveMail({ tenantId: 'andere@firma.de', pool: 'system', count: 1 })).ok).toBe(true)   // anderer Mandant (Free) ist unberührt
  })
  it('höchstens 3 Mails pro Tag an dieselbe Adresse', async () => {
    st.licenses = [lic('pro')]
    for (let i = 0; i < 3; i++) expect((await sys('kunde@x.de')).ok).toBe(true)
    expect(await sys('kunde@x.de')).toMatchObject({ ok: false, reason: 'recipient', limit: 3 })
    expect((await sys('anderer@x.de')).ok).toBe(true)
    expect((await sys('KUNDE@x.de ')).ok).toBe(false)   // Schreibweise und Leerzeichen umgehen es nicht
  })
  it('eine wegen "je Empfänger" abgelehnte Mail verbraucht das Tageskontingent nicht', async () => {
    st.licenses = [lic('pro')]
    for (let i = 0; i < 3; i++) await sys('kunde@x.de'); await sys('kunde@x.de')
    expect(used('mail:system:')).toEqual([3])
  })
})

describe('Zählerschlüssel', () => {
  it('Groß-/Kleinschreibung der Mandanten-Adresse ergibt denselben Zähler', async () => {
    await reserveMail({ tenantId: 'Chef@Firma.de', pool: 'system', count: 1 }); await reserveMail({ tenantId: 'chef@firma.de', pool: 'system', count: 1 })
    expect(used('mail:system:')).toHaveLength(1)
  })
})

describe('Massenmails', () => {
  it('Free: gar keine; Starter 200 pro Tag, ganz oder gar nicht', async () => {
    expect(await reserveMail({ tenantId: 'chef@firma.de', pool: 'bulk', count: 1 })).toMatchObject({ ok: false, reason: 'bulk-not-allowed' })
    st.licenses = [lic('starter')]; invalidatePlanCache()
    expect((await reserveMail({ tenantId: 'chef@firma.de', pool: 'bulk', count: 150 })).ok).toBe(true)
    const over = await reserveMail({ tenantId: 'chef@firma.de', pool: 'bulk', count: 100 })
    expect(over).toMatchObject({ ok: false, reason: 'daily', limit: 200, used: 150 }); expect(over.message).toMatch(/noch 50 von 200/)
    expect(used('mail:bulk:')).toEqual([150])                                  // nichts halb verbraucht
    expect((await reserveMail({ tenantId: 'chef@firma.de', pool: 'bulk', count: 50 })).ok).toBe(true)   // der Rest geht
  })
  it('die zwei Töpfe sind getrennt: ein voller Marketing-Topf blockiert keine Rechnung', async () => {
    st.licenses = [lic('starter')]
    await reserveMail({ tenantId: 'chef@firma.de', pool: 'bulk', count: PLAN_LIMITS.starter.mailBulkPerDay })
    expect((await reserveMail({ tenantId: 'chef@firma.de', pool: 'bulk', count: 1 })).ok).toBe(false)
    expect((await sys('kunde@x.de')).ok).toBe(true)
  })
})

describe('Ausnahmen und Modi', () => {
  it('Plattform-Betreiber (NUXT_ADMIN_EMAIL) wird nie begrenzt', async () => {
    st.admin = 'Peter@Plexora.eu'
    expect((await reserveMail({ tenantId: 'peter@plexora.eu', pool: 'bulk', count: 100000 })).ok).toBe(true); expect(used('mail:')).toEqual([])
  })
  it('Beobachtungsmodus: nie verweigert, aber protokolliert (ohne Adressen) und gezählt', async () => {
    st.enforce = ''
    expect((await reserveMail({ tenantId: 'chef@firma.de', pool: 'bulk', count: 5 })).ok).toBe(true)
    expect(st.warns.some(w => w.includes('würde ablehnen') && w.includes('bulk-not-allowed'))).toBe(true)
    expect(st.warns.join('')).not.toContain('chef@firma.de')
  })
  it('Ausfall der Tarifabfrage: scharf nicht senden, im Beobachtungsmodus durchlassen', async () => {
    st.fail = true
    expect(await reserveMail({ tenantId: 'chef@firma.de', pool: 'system', count: 1 })).toMatchObject({ ok: false, reason: 'plan-unknown' })
    st.enforce = ''; invalidatePlanCache(); expect((await reserveMail({ tenantId: 'chef@firma.de', pool: 'system', count: 1 })).ok).toBe(true)
  })
  it('assertMailQuota wirft 402 (Tarif), 429 (Tageslimit) mit Meldung und Code', async () => {
    const e1: any = await assertMailQuota({ tenantId: 'chef@firma.de', pool: 'bulk', count: 1 }).catch(e => e)
    expect(e1.statusCode).toBe(402); expect(e1.data).toMatchObject({ code: 'PLAN_REQUIRED', reason: 'bulk-not-allowed' })
    st.licenses = [lic('starter')]; invalidatePlanCache()
    const e2: any = await assertMailQuota({ tenantId: 'chef@firma.de', pool: 'bulk', count: 201 }).catch(e => e)
    expect(e2.statusCode).toBe(429); expect(e2.data).toMatchObject({ code: 'MAIL_LIMIT', reason: 'daily', limit: 200 }); expect(e2.message).toMatch(/200/)
    await expect(assertMailQuota({ tenantId: 'chef@firma.de', pool: 'bulk', count: 10 })).resolves.toBeUndefined()
  })
})
