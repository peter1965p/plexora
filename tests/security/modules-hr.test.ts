import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calls, rows, reset, fakeClient, resolveFake, anon, tok, status, writes, everything, setup } from './demoHarness'

vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => fakeClient() }))
vi.mock('../../server/utils/tenant', () => ({ resolveUserId: (e: string) => resolveFake(e), invalidateTenantCache: () => {} }))
setup()
const routes = import.meta.glob('../../server/api/**/*.ts')
const load = async (rel: string): Promise<any> => ((await routes[`../../server/api/${rel}.ts`]()) as any).default

const WRITE_ROUTES = [
  { name: 'POST /api/hr', file: 'hr/index.post', body: { firstName: 'A', lastName: 'B', email: 'a@b.de', department: 'IT', role: 'Dev', startDate: '2026-01-01' } },
  { name: 'POST /api/hr/campaigns', file: 'hr/campaigns/index.post', body: { title: 'Stelle', department: 'IT', location: 'Köln', description: 'x', requirements: 'y' } },
  { name: 'POST /api/hr/leave', file: 'hr/leave.post', body: { employeeId: 'e1', employeeName: 'A B', startDate: '2026-11-01', endDate: '2026-11-02' } },
  { name: 'POST /api/hr/timelog', file: 'hr/timelog.post', body: { employeeId: 'e1', employeeName: 'A B', date: '2026-10-01', clockIn: '08:00', clockOut: '16:00' } },
  { name: 'POST /api/hr/stempel', file: 'hr/stempel.post', body: { action: 'in', employeeId: 'e1', employeeName: 'A B' } },
] as const
const READ_ROUTES = [
  { name: 'GET /api/hr', file: 'hr/index.get', table: 'plexora-hr' },
  { name: 'GET /api/hr/leave', file: 'hr/leave.get', table: 'plexora-leave' },
  { name: 'GET /api/hr/timelog', file: 'hr/timelog.get', table: 'plexora-hr-timelog' },
] as const

beforeEach(() => reset())

describe('Modul HR: schreibende Routen ohne demo-user-Rückfall', () => {
  for (const r of WRITE_ROUTES) {
    describe(r.name, () => {
      it('ohne Token 401, keine Datenbankzugriffe', async () => {
        expect(await status((await load(r.file))(anon()))).toBe(401)
        expect(calls).toHaveLength(0)
      })
      it('Demo-Login schreibt nur unter demo@plexora.eu', async () => {
        await (await load(r.file))(tok('demo@plexora.eu', { body: r.body })).catch(() => {})
        expect(everything()).not.toContain('"demo-user"')
        expect(writes().length).toBeGreaterThan(0)
        for (const c of writes()) expect(JSON.stringify(c.input.Item || c.input.Key)).toContain('demo@plexora.eu')
      })
      it('Team-Mitglied im Mandanten des Inhabers; Mandant aus dem Request ignoriert', async () => {
        await (await load(r.file))(tok('maria@firma.de', { body: { ...r.body, userId: 'fremd@andere.de' }, query: { userId: 'fremd@andere.de' } })).catch(() => {})
        for (const c of writes()) { const s = JSON.stringify(c.input.Item || c.input.Key); expect(s).toContain('chef@firma.de'); expect(s).not.toContain('fremd@andere.de') }
      })
    })
  }
})

describe('Modul HR: Lesen (Demo-Login-Test)', () => {
  for (const r of READ_ROUTES) {
    it(`${r.name}: ohne Token 401; Demo-Login sieht nur den eigenen Bestand`, async () => {
      const h = await load(r.file)
      expect(await status(h(anon()))).toBe(401)
      rows[r.table] = [{ userId: 'demo-user', marker: 'anonym', date: '2026-01-01', startDate: '2026-01-01' }, { userId: 'demo@plexora.eu', marker: 'demo-login', date: '2026-01-02', startDate: '2026-01-02' }, { userId: 'chef@firma.de', marker: 'echt', date: '2026-01-03', startDate: '2026-01-03' }]
      const res: any = await h(tok('demo@plexora.eu'))
      const list = (Object.values(res).find(Array.isArray) as any[]) || []
      expect(list.map(x => x.marker)).toEqual(['demo-login'])
    })
  }
  it('GET /api/hr/stempel: ohne Token 401, Demo-Login fragt nur unter demo@plexora.eu ab', async () => {
    const h = await load('hr/stempel.get')
    expect(await status(h(anon()))).toBe(401)
    expect(calls).toHaveLength(0)
    await h(tok('demo@plexora.eu'))
    expect(everything()).toContain('demo@plexora.eu'); expect(everything()).not.toContain('"demo-user"')
  })
})
