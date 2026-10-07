import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listRoutes, concretePath } from '../security/routeScan'
import { isPublicRoute } from '../../server/utils/routePolicy'
import { needForRoute } from '../../server/utils/rolePolicy'
import { roleAllows, ROLE_LABELS, type Role } from '../../shared/roles'

let enforce: any = ''
let role: Role = 'member'
let roleError: any = null
const warns: string[] = []
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => Object.assign(new Error(o.message), { statusCode: o.statusCode, data: o.data }))
vi.stubGlobal('useRuntimeConfig', () => ({ rolesEnforce: enforce }))
vi.spyOn(console, 'warn').mockImplementation((...a: any[]) => { warns.push(a.join(' ')) }); vi.spyOn(console, 'error').mockImplementation(() => {})
vi.mock('../../server/utils/teamRole', async () => {
  const actual = await vi.importActual<any>('../../server/utils/teamRole')
  return { ...actual, resolveRole: async () => { if (roleError) throw roleError; return { role, tenantId: 'chef@firma.de' } } }
})
const { default: mw } = await import('../../server/middleware/roles')
const AUTH = { userId: 's', email: 'sylvia@firma.de', groups: ['customers'] }
const run = async (path: string, method = 'GET', auth: any = AUTH) => { try { await (mw as any)({ path, method, context: { auth } }); return { status: 200, err: null as any } } catch (e: any) { return { status: e.statusCode as number, err: e } } }
beforeEach(() => { enforce = ''; role = 'member'; roleError = null; warns.length = 0 })

describe('Beobachtungsmodus (NUXT_ROLES_ENFORCE nicht gesetzt)', () => {
  it('lässt alles durch und protokolliert, was abgelehnt WÜRDE (Mandant nur als Hash)', async () => {
    expect((await run('/api/finance')).status).toBe(200)
    expect(warns.some(w => w.includes('würde ablehnen') && w.includes('"required":"admin"') && w.includes('"role":"member"') && w.includes('"path":"/api/finance"'))).toBe(true)
    expect(warns.join('')).not.toContain('chef@firma.de')
  })
  it('erlaubte Aufrufe werden nicht protokolliert', async () => { await run('/api/contacts'); expect(warns).toEqual([]) })
  it('Ausfall der Rollenabfrage blockiert nichts', async () => { roleError = Object.assign(new Error('x'), { statusCode: 503 }); expect((await run('/api/finance')).status).toBe(200) })
})

describe('Scharf (NUXT_ROLES_ENFORCE=true)', () => {
  beforeEach(() => { enforce = 'true' })
  it('Mitglied auf Admin-Route: 403 mit fester Form und verständlicher Meldung', async () => {
    const r = await run('/api/finance'); expect(r.status).toBe(403)
    expect(r.err.data).toEqual({ code: 'ROLE_REQUIRED', requiredRole: 'admin', yourRole: 'member' })
    expect(r.err.message).toBe('Dafür brauchst du die Rolle Admin. Du bist als Mitglied angemeldet.')
  })
  it('Admin auf Inhaber-Route: 403 "Inhaber"', async () => {
    role = 'admin'; const r = await run('/api/team/invite', 'POST'); expect(r.status).toBe(403); expect(r.err.message).toMatch(/Inhaber/); expect(r.err.data.yourRole).toBe('admin')
  })
  it('Inhaber darf alles außer Plattform-Routen; Betreiber alles', async () => {
    role = 'owner'; expect((await run('/api/finance')).status).toBe(200); expect((await run('/api/backup/jobs', 'POST')).status).toBe(200); expect((await run('/api/aws/dynamo')).status).toBe(403)
    role = 'platform'; expect((await run('/api/aws/dynamo')).status).toBe(200); expect((await run('/api/backup/jobs', 'POST')).status).toBe(200)
  })
  it('jedes Konto: Entwürfe, Einladung annehmen, Upload – auch ohne Rollenabfrage (kein Ausfall möglich)', async () => {
    roleError = Object.assign(new Error('x'), { statusCode: 503 })
    for (const [p, m] of [['/api/drafts/x', 'GET'], ['/api/team/accept', 'POST'], ['/api/team/invite-preview', 'POST'], ['/api/aws/s3-upload', 'POST'], ['/api/team/role', 'GET'], ['/api/notifications', 'GET']] as const) expect((await run(p, m)).status, `${m} ${p}`).toBe(200)
  })
  it('Ausfall der Rollenabfrage: Fehler 503, nie "alles erlaubt"', async () => {
    roleError = Object.assign(new Error('x'), { statusCode: 503 }); expect((await run('/api/contacts')).status).toBe(503)
  })
  it('öffentliche Routen, OPTIONS, Aufrufe ohne Anmeldung und Seiten gehen die Rolle nichts an', async () => {
    expect((await run('/api/public/T1/termine/book', 'POST')).status).toBe(200); expect((await run('/api/forms/f1/submit', 'POST')).status).toBe(200)
    expect((await run('/api/finance', 'OPTIONS')).status).toBe(200); expect((await run('/api/finance', 'GET', null)).status).toBe(200); expect((await run('/finance')).status).toBe(200)
  })
  it('eine Route ohne Rollenregel verlangt "owner"', async () => { expect((await run('/api/erfunden/neu')).status).toBe(403); role = 'owner'; expect((await run('/api/erfunden/neu')).status).toBe(200) })
  it('"true" als Text oder Wahrheitswert schaltet scharf, alles andere nicht', async () => {
    enforce = true; expect((await run('/api/finance')).status).toBe(403)
    for (const v of ['false', '', 'yes', '1', 0]) { enforce = v; expect((await run('/api/finance')).status, String(v)).toBe(200) }
  })
})

// ── Matrix: jede nicht öffentliche Route × jede Rolle, mit echten Aufrufen der Middleware ──
describe('Matrix Route × Rolle (scharf)', () => {
  const routes = listRoutes().filter(r => !isPublicRoute(concretePath(r.path), r.method))
  it('es sind über 300 Routen', () => expect(routes.length).toBeGreaterThan(300))
  it('jede Rolle bekommt genau dort 403, wo ihr Rang unter der verlangten Rolle liegt – mit fester Antwortform', async () => {
    enforce = 'true'; const wrong: string[] = []; let denied = 0, allowed = 0
    for (const r of routes) {
      const path = concretePath(r.path), need = needForRoute(path, r.method).need
      for (const ro of ['member', 'admin', 'owner', 'platform'] as Role[]) {
        role = ro; const out = await run(path, r.method)
        const should = roleAllows(ro, need)
        if (should ? out.status !== 200 : out.status !== 403) { wrong.push(`${ro} ${r.key}: Status ${out.status}`); continue }
        if (!should) { denied++; const d = out.err.data; if (d?.code !== 'ROLE_REQUIRED' || d.requiredRole !== need || d.yourRole !== ro || !out.err.message.includes(ROLE_LABELS[need as Role])) wrong.push(`${ro} ${r.key}: Antwortform`) } else allowed++
      }
    }
    expect(wrong).toEqual([]); expect(denied).toBeGreaterThan(300); expect(allowed).toBeGreaterThan(300)
  })
  it('Mitglied kommt an keine Finanz-, HR-, Team-, Sicherungs- oder Schlüssel-Route (unabhängige Stichprobe, nicht aus der Tabelle berechnet)', async () => {
    enforce = 'true'; role = 'member'
    for (const [p, m] of [['/api/finance', 'GET'], ['/api/finance/x/send', 'POST'], ['/api/hr', 'GET'], ['/api/contracts', 'GET'], ['/api/team/invite', 'POST'], ['/api/team/x', 'DELETE'], ['/api/backup/jobs', 'POST'], ['/api/settings/ai-providers', 'POST'], ['/api/settings/invoice', 'POST'], ['/api/ai/assistant/execute', 'POST'], ['/api/newsletter/campaigns/x/send', 'POST'], ['/api/billing/portal', 'POST'], ['/api/store/checkout', 'POST'], ['/api/praxis/patients', 'GET']] as const)
      expect((await run(p, m)).status, `${m} ${p}`).toBe(403)
    for (const [p, m] of [['/api/contacts', 'GET'], ['/api/deals', 'POST'], ['/api/support', 'GET'], ['/api/projects', 'GET'], ['/api/marketing', 'GET'], ['/api/forms', 'GET'], ['/api/termine/bookings', 'GET']] as const) expect((await run(p, m)).status, `${m} ${p}`).toBe(200)
  })
})
