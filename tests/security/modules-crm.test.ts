import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calls, rows, reset, fakeClient, resolveFake, anon, tok, status, writes, everything, setup } from './demoHarness'

vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => fakeClient() }))
vi.mock('../../server/utils/tenant', () => ({ resolveUserId: (e: string) => resolveFake(e), invalidateTenantCache: () => {} }))
setup()

const routes = import.meta.glob('../../server/api/**/*.ts')
const load = async (rel: string): Promise<any> => ((await routes[`../../server/api/${rel}.ts`]()) as any).default

const MODULES = [
  { name: 'companies', table: 'plexora-companies', body: { name: 'Muster GmbH' } },
  { name: 'contacts',  table: 'plexora-contacts',  body: { firstName: 'Max', lastName: 'Muster', email: 'max@muster.de' } },
  { name: 'deals',     table: 'plexora-deals',     body: { name: 'Deal', value: 100, stage: 'neu' } },
  { name: 'contracts', table: 'plexora-contracts', body: { title: 'Vertrag' } },
] as const

for (const m of MODULES) {
  describe(`Modul ${m.name}: kein Rückfall auf demo-user`, async () => {
    const post: any = await load(`${m.name}/index.post`)
    const get: any = await load(`${m.name}/index.get`)
    beforeEach(() => {
      reset()
      rows[m.table] = [
        { userId: 'demo-user', id: 'a', marker: 'anonym' },
        { userId: 'demo@plexora.eu', id: 'b', marker: 'demo-login' },
        { userId: 'chef@firma.de', id: 'c', marker: 'echt' },
      ]
    })

    it('ohne Token: Anlegen und Lesen 401, keine Datenbankzugriffe', async () => {
      expect(await status(post(anon()))).toBe(401)
      expect(await status(get(anon()))).toBe(401)
      expect(calls).toHaveLength(0)
    })
    it('Demo-Login (demo@plexora.eu): liest nur den eigenen Bestand, nie demo-user oder echte Daten', async () => {
      const res: any = await get(tok('demo@plexora.eu'))
      const list = Object.values(res)[0] as any[]
      expect(list.map(r => r.marker)).toEqual(['demo-login'])
    })
    it('Demo-Login: Anlegen schreibt unter demo@plexora.eu, nie unter demo-user', async () => {
      await post(tok('demo@plexora.eu', { body: m.body }))
      const w = writes()
      expect(w).toHaveLength(1)
      expect(w[0].input.Item.userId).toBe('demo@plexora.eu')
      expect(everything()).not.toContain('"demo-user"')
    })
    it('Team-Mitglied schreibt und liest im Mandanten des Inhabers; Fremdmandant sieht nichts davon', async () => {
      await post(tok('maria@firma.de', { body: m.body }))
      expect(writes()[0].input.Item.userId).toBe('chef@firma.de')
      const own: any = await get(tok('maria@firma.de'))
      expect((Object.values(own)[0] as any[]).map(r => r.marker)).toEqual(['echt'])
      const other: any = await get(tok('fremd@andere.de'))
      expect(Object.values(other)[0]).toEqual([])
    })
    it('Mandant aus dem Request (Body/Query) wird ignoriert', async () => {
      await post(tok('fremd@andere.de', { body: { ...m.body, userId: 'chef@firma.de' }, query: { userId: 'chef@firma.de' } }))
      const it0 = writes()[0].input.Item
      expect(it0.userId).toBe('fremd@andere.de')
    })
  })
}
