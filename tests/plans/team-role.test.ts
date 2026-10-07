import { describe, it, expect, vi, beforeEach } from 'vitest'

const st = { members: [] as any[], fail: false, updates: [] as any[], scans: 0 }
class HttpError extends Error { statusCode: number; constructor(o: any) { super(o.message); this.statusCode = o.statusCode } }
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => new HttpError(o))
vi.stubGlobal('readBody', async (e: any) => e.body)
vi.stubGlobal('getRouterParam', (e: any, n: string) => e.params?.[n])
vi.stubGlobal('useRuntimeConfig', () => ({ rolesEnforce: '' }))
vi.mock('../../server/utils/dynamodb', () => ({
  getDynamoClient: () => ({
    async send(cmd: any) {
      const n = cmd.constructor.name; const i = cmd.input; const v = i.ExpressionAttributeValues || {}
      if (i.TableName !== 'plexora-team-members') return {}
      if (n === 'ScanCommand') { st.scans++; if (st.fail) throw new Error('down'); return { Items: st.members.filter(m => m.memberEmail === v[':e'] && m.status === v[':active']) } }
      if (n === 'GetCommand') return { Item: st.members.find(m => m.tenantId === i.Key.tenantId && m.memberEmail === i.Key.memberEmail) }
      if (n === 'UpdateCommand') { st.updates.push(i); const m = st.members.find(x => x.tenantId === i.Key.tenantId && x.memberEmail === i.Key.memberEmail); if (m) m.role = v[':r']; return {} }
      return {}
    },
  }),
}))
const { resolveRole, invalidateRoleCache } = await import('../../server/utils/teamRole')
const { default: roleRoute } = await import('../../server/api/team/role.get')
const { default: patchRoute } = await import('../../server/api/team/[email].patch')
const { invalidateTenantCache } = await import('../../server/utils/tenant')

const mem = (over: any = {}) => ({ tenantId: 'chef@firma.de', memberEmail: 'sylvia@firma.de', role: 'member', status: 'active', ...over })
beforeEach(() => { st.members = []; st.fail = false; st.updates.length = 0; st.scans = 0; invalidateRoleCache(); invalidateTenantCache('sylvia@firma.de'); invalidateTenantCache('chef@firma.de'); vi.useRealTimers() })
const as = (email: string, groups: string[] = ['customers']) => ({ email, groups })

describe('resolveRole', () => {
  it('Konto ohne Team-Zeile = Inhaber seines eigenen Mandanten', async () => { expect(await resolveRole(as('chef@firma.de'))).toEqual({ role: 'owner', tenantId: 'chef@firma.de' }) })
  it('aktives Mitglied: Rolle aus der Zeile (admin oder member), Mandant des Inhabers', async () => {
    st.members = [mem({ role: 'admin' })]; expect(await resolveRole(as('sylvia@firma.de'))).toEqual({ role: 'admin', tenantId: 'chef@firma.de' })
    invalidateRoleCache(); st.members = [mem({ role: 'member' })]; expect(await resolveRole(as('sylvia@firma.de'))).toMatchObject({ role: 'member' })
  })
  it('im Zweifel weniger Rechte: fehlende, kaputte oder unbekannte Rolle in der Zeile = Mitglied', async () => {
    for (const role of [undefined, '', 'owner', 'superadmin', 'ADMIN', 5, null, {}]) { invalidateRoleCache(); st.members = [mem({ role })]; expect((await resolveRole(as('sylvia@firma.de'))).role, String(role)).toBe('member') }
  })
  it('nur ACTIVE-Zeilen zählen: eingeladen oder entfernt = kein Mitglied (eigener Mandant)', async () => {
    st.members = [mem({ status: 'invited' })]; expect((await resolveRole(as('sylvia@firma.de'))).role).toBe('owner')
  })
  it('Betreiber (Gruppe admins) = platform, ohne Datenbankzugriff; Demo = owner seines Mandanten', async () => {
    expect(await resolveRole(as('peter@x.de', ['admins']))).toMatchObject({ role: 'platform' }); expect(await resolveRole(as('demo@plexora.eu'))).toMatchObject({ role: 'owner' }); expect(st.scans).toBe(0)
  })
  it('Zwischenspeicher 60 s; invalidateRoleCache wirkt sofort', async () => {
    vi.useFakeTimers(); st.members = [mem()]
    await resolveRole(as('sylvia@firma.de')); await resolveRole(as('sylvia@firma.de')); expect(st.scans).toBe(1)
    invalidateRoleCache('sylvia@firma.de'); await resolveRole(as('sylvia@firma.de')); expect(st.scans).toBe(2)
    vi.advanceTimersByTime(61_000); await resolveRole(as('sylvia@firma.de')); expect(st.scans).toBe(3)
  })
  it('Ausfall: letzter Stand bis 10 Minuten, danach 503; ohne früheren Stand 503 – NIE ein Rückfall auf "owner"', async () => {
    vi.useFakeTimers(); st.members = [mem()]; await resolveRole(as('sylvia@firma.de'))
    st.fail = true; vi.advanceTimersByTime(5 * 60_000); expect(await resolveRole(as('sylvia@firma.de'))).toMatchObject({ role: 'member', stale: true })
    vi.advanceTimersByTime(6 * 60_000); await expect(resolveRole(as('sylvia@firma.de'))).rejects.toMatchObject({ statusCode: 503 })
    await expect(resolveRole(as('neu@firma.de'))).rejects.toMatchObject({ statusCode: 503 })
  })
  it('E-Mail-Schreibweise teilt sich den Zwischenspeicher nicht auf unsichere Weise (Schlüssel klein)', async () => {
    st.members = [mem()]; await resolveRole(as('sylvia@firma.de')); await resolveRole(as('Sylvia@Firma.de')); expect(st.scans).toBeLessThanOrEqual(2)
  })
})

describe('GET /api/team/role', () => {
  const call = (auth: any) => (roleRoute as any)({ context: { auth } })
  it('ohne Anmeldung 401', async () => { await expect((roleRoute as any)({ context: {} })).rejects.toMatchObject({ statusCode: 401 }) })
  it('Mitglied sieht seine Rolle und den Inhaber seines Teams; Inhaber und Betreiber nur ihre Rolle', async () => {
    st.members = [mem({ role: 'admin' })]
    expect(await call({ userId: 's', email: 'sylvia@firma.de', groups: [] })).toEqual({ role: 'admin', label: 'Admin', owner: 'chef@firma.de', enforced: false })
    expect(await call({ userId: 's', email: 'chef@firma.de', groups: [] })).toEqual({ role: 'owner', label: 'Inhaber', owner: null, enforced: false })
    expect(await call({ userId: 's', email: 'peter@x.de', groups: ['admins'] })).toEqual({ role: 'platform', label: 'Plattform-Betreiber', owner: null, enforced: false })
  })
})

describe('PATCH /api/team/[email]', () => {
  const call = (email: string, body: any, who = 'chef@firma.de', groups: string[] = []) => (patchRoute as any)({ context: { auth: { userId: 's', email: who, groups } }, params: { email: encodeURIComponent(email) }, body }).then((r: any) => ({ code: 200, r }), (e: any) => ({ code: e.statusCode as number, msg: e.message }))
  it('Inhaber ändert die Rolle eines Mitglieds; wirkt sofort (Zwischenspeicher geleert)', async () => {
    st.members = [mem()]; expect((await resolveRole(as('sylvia@firma.de'))).role).toBe('member')
    expect(await call('sylvia@firma.de', { role: 'admin' })).toMatchObject({ code: 200, r: { success: true, role: 'admin' } })
    expect((await resolveRole(as('sylvia@firma.de'))).role).toBe('admin')
  })
  it('nur "admin" oder "member": alles andere 400 (auch "owner"), nichts wird gespeichert', async () => {
    st.members = [mem()]
    for (const role of ['owner', 'platform', '', undefined, null, 'ADMIN', 5, { $ne: 1 }]) expect((await call('sylvia@firma.de', { role })).code, String(role)).toBe(400)
    expect(st.updates).toEqual([])
  })
  it('Admin und Mitglied dürfen keine Rollen ändern (403), sich selbst auch der Inhaber nicht (400), Demo 403, fremdes Mitglied 404', async () => {
    st.members = [mem(), mem({ memberEmail: 'max@firma.de', role: 'admin' })]
    expect((await call('max@firma.de', { role: 'member' }, 'sylvia@firma.de')).code).toBe(403)        // Sylvia ist Mitglied
    expect((await call('sylvia@firma.de', { role: 'admin' }, 'max@firma.de')).code).toBe(403)         // Max ist Admin
    expect((await call('chef@firma.de', { role: 'member' })).code).toBe(400)
    expect((await call('sylvia@firma.de', { role: 'admin' }, 'demo@plexora.eu')).code).toBe(403)
    expect((await call('niemand@firma.de', { role: 'admin' })).code).toBe(404)
    expect(st.updates).toEqual([])
  })
  it('ohne Anmeldung 401', async () => { await expect((patchRoute as any)({ context: {}, params: { email: 'a@b.de' }, body: { role: 'admin' } })).rejects.toMatchObject({ statusCode: 401 }) })
  it('ein mitgeschickter Mandant in der Anfrage wird ignoriert: nur die Zeile des eigenen Teams ändert sich', async () => {
    st.members = [mem(), mem({ tenantId: 'anderer@firma.de' })]
    expect((await call('sylvia@firma.de', { role: 'admin', tenantId: 'anderer@firma.de' })).code).toBe(200)
    expect(st.members.map(m => `${m.tenantId}:${m.role}`)).toEqual(['chef@firma.de:admin', 'anderer@firma.de:member'])
  })
  it('ein Inhaber ändert nur Mitglieder SEINES Teams (Mandant aus dem Token, nie aus der Anfrage)', async () => {
    st.members = [mem({ tenantId: 'anderer@firma.de', memberEmail: 'fremd@firma.de' })]
    expect((await call('fremd@firma.de', { role: 'admin' })).code).toBe(404); expect(st.members[0].role).toBe('member')
  })
})
