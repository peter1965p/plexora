import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calls, reset, fakeClient, resolveFake, anon, tok, status, writes, everything, setup } from './demoHarness'

vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => fakeClient() }))
vi.mock('../../server/utils/tenant', () => ({ resolveUserId: (e: string) => resolveFake(e), invalidateTenantCache: () => {} }))
setup()
const routes = import.meta.glob('../../server/api/**/*.ts')
const load = async (rel: string): Promise<any> => ((await routes[`../../server/api/${rel}.ts`]()) as any).default

const ROUTES = [
  { name: 'POST /api/pages', file: 'pages/index.post', params: {}, body: { slug: 'Meine Seite', title: 'T', blocks: [] } },
  { name: 'POST /api/shop/products', file: 'shop/products/index.post', params: {}, body: { name: 'P', price: 5, category: 'x' } },
  { name: 'PATCH /api/shop/products/[id]', file: 'shop/products/[id].patch', params: { id: 'p1' }, body: { name: 'P', price: 6, category: 'x' } },
] as const
beforeEach(() => reset())

for (const r of ROUTES) {
  describe(r.name, () => {
    it('ohne Token 401, keine Datenbankzugriffe', async () => {
      expect(await status((await load(r.file))({ ...anon(), params: r.params }))).toBe(401)
      expect(calls).toHaveLength(0)
    })
    it('Demo-Login: nur unter demo@plexora.eu, nie demo-user', async () => {
      await (await load(r.file))(tok('demo@plexora.eu', { params: r.params, body: r.body })).catch(() => {})
      expect(everything()).not.toContain('"demo-user"')
      expect(writes().length).toBeGreaterThan(0)
      for (const c of writes()) expect(JSON.stringify(c.input.Item || c.input.Key)).toContain('demo@plexora.eu')
    })
    it('Team-Mitglied im Mandanten des Inhabers; Mandant aus dem Request ignoriert', async () => {
      await (await load(r.file))(tok('maria@firma.de', { params: r.params, body: { ...r.body, userId: 'fremd@andere.de' }, query: { userId: 'fremd@andere.de' } })).catch(() => {})
      for (const c of writes()) { const s = JSON.stringify(c.input.Item || c.input.Key); expect(s).toContain('chef@firma.de'); expect(s).not.toContain('fremd@andere.de') }
    })
  })
}
