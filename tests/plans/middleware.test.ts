import { describe, it, expect, vi, beforeEach } from 'vitest'

let enforce: any = ''
let plan: any = { tenantId: 'a@b.de', plan: 'free', exempt: null, modules: [], branches: [] }
let planError: any = null
const warns: string[] = []
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => Object.assign(new Error(o.message), { statusCode: o.statusCode, data: o.data }))
vi.stubGlobal('useRuntimeConfig', () => ({ planEnforce: enforce }))
vi.spyOn(console, 'warn').mockImplementation((...a: any[]) => { warns.push(a.join(' ')) })
vi.spyOn(console, 'error').mockImplementation(() => {})
vi.mock('../../server/utils/tenantPlan', async () => {
  const actual = await vi.importActual<any>('../../server/utils/tenantPlan')
  return { ...actual, resolvePlan: async () => { if (planError) throw planError; return plan } }
})
const { default: mw } = await import('../../server/middleware/plan')

const AUTH = { userId: 's', email: 'a@b.de', groups: ['customers'] }
const run = async (path: string, method = 'GET', auth: any = AUTH) => {
  try { await (mw as any)({ path, method, context: { auth } }); return { status: 200 as number, err: null as any } } catch (e: any) { return { status: e.statusCode as number, err: e } }
}
beforeEach(() => { enforce = ''; plan = { tenantId: 'a@b.de', plan: 'free', exempt: null, modules: [], branches: [] }; planError = null; warns.length = 0 })

describe('Beobachtungsmodus (NUXT_PLAN_ENFORCE nicht gesetzt)', () => {
  it('lässt alles durch und protokolliert nur "würde ablehnen"', async () => {
    expect((await run('/api/finance')).status).toBe(200)
    expect(warns.some(w => w.includes('würde ablehnen') && w.includes('"path":"/api/finance"') && w.includes('"plan":"free"'))).toBe(true)
  })
  it('im Protokoll steht nur ein Hash des Mandanten, nie die E-Mail', async () => {
    await run('/api/finance'); expect(warns.join('')).not.toContain('a@b.de')
  })
  it('Ausfall der Tarifabfrage blockiert nichts', async () => {
    planError = Object.assign(new Error('x'), { statusCode: 503 }); expect((await run('/api/finance')).status).toBe(200)
  })
})

describe('Scharf (NUXT_PLAN_ENFORCE=true)', () => {
  beforeEach(() => { enforce = 'true' })
  it('Free: Finanzen 402 mit maschinenlesbarem Code, Meldung nennt Tarif und Modul-Store', async () => {
    const r = await run('/api/finance'); expect(r.status).toBe(402)
    expect(r.err.data).toEqual({ code: 'PLAN_REQUIRED', need: 'finance', plan: 'free' })
    expect(r.err.message).toMatch(/Free/); expect(r.err.message).toMatch(/Modul-Store/)
  })
  it('Free: CRM/Support/Projekte, Konto, Kauf, Sicherung, Einladung annehmen gehen', async () => {
    for (const [p, m] of [['/api/contacts', 'GET'], ['/api/support', 'GET'], ['/api/projects', 'POST'], ['/api/settings/account', 'GET'], ['/api/store/checkout', 'POST'], ['/api/backup/export', 'POST'], ['/api/team/accept', 'POST'], ['/api/notifications', 'GET']] as const)
      expect((await run(p, m)).status, `${m} ${p}`).toBe(200)
  })
  it('Free: Newsletter, HR, KI, Team-Einladung, Mail-Vorlage 402', async () => {
    for (const [p, m] of [['/api/newsletter/campaigns', 'GET'], ['/api/hr', 'GET'], ['/api/ai/assistant/execute', 'POST'], ['/api/team/invite', 'POST'], ['/api/settings/mail-templates/invite', 'PUT']] as const)
      expect((await run(p, m)).status, `${m} ${p}`).toBe(402)
  })
  it('Lizenz mit Modul: erlaubt, ohne das Modul 402', async () => {
    plan = { ...plan, plan: 'starter', modules: ['finance', 'crm'] }
    expect((await run('/api/finance')).status).toBe(200)
    expect((await run('/api/hr')).status).toBe(402)
  })
  it('Branchenpaket: Free mit installiertem Paket ja, ohne nein', async () => {
    expect((await run('/api/praxis/patients')).status).toBe(402)
    plan = { ...plan, branches: ['praxis'] }; expect((await run('/api/praxis/patients')).status).toBe(200)
  })
  it('eine Route ganz ohne Modulregel wird wie "paid" behandelt (Free 402), nie stillschweigend frei', async () => {
    expect((await run('/api/erfunden/neu')).status).toBe(402)
    plan = { ...plan, plan: 'starter', modules: ['crm'] }; expect((await run('/api/erfunden/neu')).status).toBe(200)
  })
  it('Betreiber und Demo nie abgelehnt', async () => {
    plan = { ...plan, exempt: 'platform' }; expect((await run('/api/finance')).status).toBe(200)
    plan = { ...plan, exempt: 'demo' }; expect((await run('/api/hr')).status).toBe(200)
  })
  it('öffentliche Routen, OPTIONS und Aufrufe ohne Anmeldung gehen den Tarif nichts an', async () => {
    expect((await run('/api/public/T1/termine/book', 'POST')).status).toBe(200)
    expect((await run('/api/forms/f1/submit', 'POST')).status).toBe(200)
    expect((await run('/api/finance', 'OPTIONS')).status).toBe(200)
    expect((await run('/api/finance', 'GET', null)).status).toBe(200)
    expect((await run('/pages/finance')).status).toBe(200)
  })
  it('Ausfall der Tarifabfrage: Fehler (503), nie "alles erlaubt"', async () => {
    planError = Object.assign(new Error('x'), { statusCode: 503 }); expect((await run('/api/finance')).status).toBe(503)
  })
  it('Grundfunktionen brauchen die Tarifabfrage gar nicht (kein Ausfall für Konto/Kauf)', async () => {
    planError = Object.assign(new Error('x'), { statusCode: 503 }); expect((await run('/api/settings/account')).status).toBe(200)
  })
  it('"true" als Text oder Wahrheitswert schaltet scharf, alles andere nicht', async () => {
    enforce = true; expect((await run('/api/finance')).status).toBe(402)
    for (const v of ['false', '', 'yes', '1', 0]) { enforce = v; expect((await run('/api/finance')).status, String(v)).toBe(200) }
  })
})
