import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PLAN_LIMITS, PLAN_KEYS, TIER_FALLBACK_MODULES, planFromLicenses, planAllows, formatBytes, type PlanInfo } from '../../shared/plans'
import { TIER_MODULES } from '../../server/utils/license'

const free: PlanInfo = { plan: 'free', exempt: null, modules: [] }
const starter: PlanInfo = { plan: 'starter', exempt: null, modules: TIER_FALLBACK_MODULES.starter }

describe('Tarife', () => {
  it('der Spiegel der Tarif-Module ist gleich TIER_MODULES in license.ts', () => {
    expect(TIER_FALLBACK_MODULES).toEqual(TIER_MODULES)
  })
  it('Limits steigen mit dem Tarif (nie ein höherer Tarif mit weniger)', () => {
    for (let i = 1; i < PLAN_KEYS.length; i++) {
      const a = PLAN_LIMITS[PLAN_KEYS[i - 1]], b = PLAN_LIMITS[PLAN_KEYS[i]]
      for (const k of ['mailSystemPerDay', 'mailBulkPerDay', 'uploadMaxBytes', 'uploadsPerDay', 'storageBytes'] as const) expect(b[k], `${PLAN_KEYS[i]}.${k}`).toBeGreaterThanOrEqual(a[k])
    }
  })
  it('Free: keine Massenmails, nur Datensatz-Grenzen für CRM/Projekte/Support', () => {
    expect(PLAN_LIMITS.free.mailBulkPerDay).toBe(0)
    expect(PLAN_LIMITS.free.records).toEqual({ crm: 50, projects: 25, support: 25 })
    expect(PLAN_LIMITS.starter.records).toBeNull()
  })
  it('formatBytes', () => { expect(formatBytes(1048576)).toBe('1 MB'); expect(formatBytes(5 * 1048576)).toBe('5 MB'); expect(formatBytes(5 * 1024 * 1048576)).toBe('5 GB') })
})

describe('Tarif aus Lizenzen', () => {
  const act = (o: any = {}) => ({ tier: 'pro', status: 'active', validUntil: null, modules: ['crm', 'finance'], ...o })
  it('keine Lizenz -> free', () => expect(planFromLicenses([])).toEqual({ plan: 'free', modules: [] }))
  it('aktive Lizenz -> Tarif und Module der Lizenz', () => expect(planFromLicenses([act()])).toEqual({ plan: 'pro', modules: ['crm', 'finance'] }))
  it('höchster Tarif gewinnt, Module werden vereinigt', () => {
    const r = planFromLicenses([act({ tier: 'starter', modules: ['crm'] }), act({ tier: 'enterprise', modules: ['hr'] })])
    expect(r.plan).toBe('enterprise'); expect(r.modules.sort()).toEqual(['crm', 'hr'])
  })
  it('gesperrt/gekündigt/abgelaufen zählt nicht', () => {
    expect(planFromLicenses([act({ status: 'suspended' })]).plan).toBe('free')
    expect(planFromLicenses([act({ status: 'cancelled' })]).plan).toBe('free')
    expect(planFromLicenses([act({ validUntil: '2020-01-01' })]).plan).toBe('free')
    expect(planFromLicenses([act({ validUntil: '2999-01-01' })]).plan).toBe('pro')
  })
  it('Lizenz ohne Modulliste nutzt die Module des Tarifs', () => expect(planFromLicenses([act({ modules: undefined, tier: 'starter' })]).modules).toEqual(TIER_FALLBACK_MODULES.starter))
  it('unbekannte Stufe in einer aktiven Lizenz: mindestens Starter, nie Free (zahlende Kunden)', () => {
    expect(planFromLicenses([act({ tier: 'sonder', modules: ['crm'] })]).plan).toBe('starter')
    expect(planFromLicenses([act({ tier: undefined })]).plan).toBe('starter')
    expect(planFromLicenses([act({ tier: 'constructor' })]).plan).toBe('starter')
  })
  it('DynamoDB-Set als Modulliste', () => expect(planFromLicenses([act({ modules: new Set(['Shop']) })]).modules).toEqual(['shop']))
})

describe('Was ein Tarif darf', () => {
  it('none: jeder; paid: nur mit Lizenz', () => {
    expect(planAllows(free, 'none')).toBe(true)
    expect(planAllows(free, 'paid')).toBe(false); expect(planAllows(starter, 'paid')).toBe(true)
  })
  it('Free darf CRM/Projekte/Support, nicht Finanzen/HR/Newsletter', () => {
    expect(planAllows(free, { module: 'crm', free: true })).toBe(true)
    expect(planAllows(free, { module: 'support', free: true })).toBe(true)
    expect(planAllows(free, { module: 'finance' })).toBe(false)
    expect(planAllows(free, { module: 'newsletter' })).toBe(false)
    // "free: true" öffnet nur die Freigabe-Module, nicht jedes beliebige Modul
    expect(planAllows(free, { module: 'finance', free: true })).toBe(false)
  })
  it('Starter: Module der Lizenz ja, andere nein', () => {
    expect(planAllows(starter, { module: 'finance' })).toBe(true)
    expect(planAllows(starter, { module: 'hr' })).toBe(false)
    expect(planAllows(starter, { module: ['marketing', 'nexora'] })).toBe(true)
  })
  it('Branchenpaket: mit Lizenz oder wenn installiert, sonst nicht', () => {
    expect(planAllows(free, { branch: 'praxis' })).toBe(false)
    expect(planAllows({ ...free, branches: ['praxis'] }, { branch: 'praxis' })).toBe(true)
    expect(planAllows({ ...free, branches: ['praxis'] }, { branch: 'gastro' })).toBe(false)
    expect(planAllows(starter, { branch: 'praxis' })).toBe(true)
  })
  it('Betreiber und Demo sind ausgenommen', () => {
    expect(planAllows({ ...free, exempt: 'platform' }, { module: 'finance' })).toBe(true)
    expect(planAllows({ ...free, exempt: 'demo' }, 'paid')).toBe(true)
  })
})

// ── resolvePlan mit gefälschter Datenbank ──
const st = { licenses: [] as any[], team: [] as any[], nexora: [] as any[], fail: false, scans: 0 }
vi.stubGlobal('createError', (o: any) => Object.assign(new Error(o.message), { statusCode: o.statusCode }))
vi.mock('../../server/utils/dynamodb', () => ({
  getDynamoClient: () => ({
    async send(cmd: any) {
      const t = cmd.input.TableName; const v = cmd.input.ExpressionAttributeValues || {}
      if (t === 'plexora-licenses') { st.scans++; if (st.fail) throw new Error('down'); return { Items: st.licenses.filter(l => l.customerEmail === v[':e']) } }
      if (t === 'plexora-team-members') return { Items: st.team.filter(m => m.memberEmail === v[':e'] && m.status === 'active') }
      if (t === 'plexora-nexora') return { Items: st.nexora.filter(n => n.email === v[':e']) }
      return {}
    },
  }),
}))
const { resolvePlan, invalidatePlanCache } = await import('../../server/utils/tenantPlan')

describe('resolvePlan', () => {
  beforeEach(() => { st.licenses = []; st.team = []; st.nexora = []; st.fail = false; st.scans = 0; invalidatePlanCache(); vi.useRealTimers() })
  const lic = { customerEmail: 'chef@firma.de', tier: 'pro', status: 'active', modules: ['crm', 'finance'] }

  it('Inhaber mit Lizenz', async () => {
    st.licenses = [lic]
    expect(await resolvePlan({ email: 'chef@firma.de', groups: ['customers'] })).toMatchObject({ tenantId: 'chef@firma.de', plan: 'pro', exempt: null, modules: ['crm', 'finance'] })
  })
  it('Team-Mitglied erbt den Tarif des Inhabers', async () => {
    st.licenses = [lic]; st.team = [{ tenantId: 'chef@firma.de', memberEmail: 'sylvia@firma.de', status: 'active' }]
    expect(await resolvePlan({ email: 'sylvia@firma.de', groups: [] })).toMatchObject({ tenantId: 'chef@firma.de', plan: 'pro' })
  })
  it('eingeladenes, noch nicht angenommenes Mitglied hat den Free-Tarif', async () => {
    st.licenses = [lic]; st.team = [{ tenantId: 'chef@firma.de', memberEmail: 'neu@x.de', status: 'invited' }]
    expect((await resolvePlan({ email: 'neu@x.de', groups: [] })).plan).toBe('free')
  })
  it('Konto ohne Lizenz = free, mit installierten Branchenpaketen', async () => {
    st.nexora = [{ email: 'a@b.de', branchModules: [{ key: 'Praxis', status: 'active' }, { key: 'gastro', status: 'disabled' }] }]
    expect(await resolvePlan({ email: 'a@b.de', groups: [] })).toMatchObject({ plan: 'free', branches: ['praxis'] })
  })
  it('Betreiber und Demo: ausgenommen, ohne Datenbankzugriff', async () => {
    expect(await resolvePlan({ email: 'peter@x.de', groups: ['admins'] })).toMatchObject({ exempt: 'platform' })
    expect(await resolvePlan({ email: 'demo@plexora.eu', groups: [] })).toMatchObject({ exempt: 'demo' })
    expect(st.scans).toBe(0)
  })
  it('Zwischenspeicher: zweiter Aufruf liest nicht erneut, nach 60 s schon', async () => {
    vi.useFakeTimers(); st.licenses = [lic]
    await resolvePlan({ email: 'chef@firma.de', groups: [] }); await resolvePlan({ email: 'chef@firma.de', groups: [] })
    expect(st.scans).toBe(1)
    vi.advanceTimersByTime(61_000); await resolvePlan({ email: 'chef@firma.de', groups: [] })
    expect(st.scans).toBe(2)
  })
  it('Ausfall der Abfrage: zuletzt bekannter Tarif bis 10 Minuten, danach Fehler 503, nie "alles erlaubt"', async () => {
    vi.useFakeTimers(); st.licenses = [lic]
    await resolvePlan({ email: 'chef@firma.de', groups: [] })
    st.fail = true; vi.advanceTimersByTime(5 * 60_000)
    expect(await resolvePlan({ email: 'chef@firma.de', groups: [] })).toMatchObject({ plan: 'pro', stale: true })
    vi.advanceTimersByTime(6 * 60_000)
    await expect(resolvePlan({ email: 'chef@firma.de', groups: [] })).rejects.toMatchObject({ statusCode: 503 })
  })
  it('Ausfall ohne frühere Antwort: Fehler 503', async () => {
    st.fail = true
    await expect(resolvePlan({ email: 'neu@x.de', groups: [] })).rejects.toMatchObject({ statusCode: 503 })
  })
})
