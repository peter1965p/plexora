import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calls, rows, reset, fakeClient, resolveFake, anon, tok, status, writes, everything, setup } from './demoHarness'

vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => fakeClient() }))
vi.mock('../../server/utils/tenant', () => ({ resolveUserId: (e: string) => resolveFake(e), invalidateTenantCache: () => {} }))
setup()
const routes = import.meta.glob('../../server/api/**/*.ts')
const load = async (rel: string): Promise<any> => ((await routes[`../../server/api/${rel}.ts`]()) as any).default

// Die sechs Finanz-Routen, die bisher auf demo-user zurückfielen
const WRITE_ROUTES = [
  { name: 'POST /api/finance', file: 'finance/index.post', body: { client: 'Kunde', dueDate: '2026-12-01', amount: 10 } },
  { name: 'POST /api/finance/cashbook', file: 'finance/cashbook.post', body: { date: '2026-10-01', description: 'Test', amount: 5, type: 'einnahme' } },
  { name: 'DELETE /api/finance/cashbook', file: 'finance/cashbook.delete', body: { cashId: 'c1' } },
  { name: 'POST /api/finance/bank-import', file: 'finance/bank-import.post', body: { csv: 'Buchungstag;Betrag;Verwendungszweck\n01.10.2026;10,00;Test' } },
  { name: 'POST /api/finance/bank-match', file: 'finance/bank-match.post', body: { txnId: 't1', invoiceId: 'i1', markPaid: true } },
] as const

// Alle Finanz-Leseroute, die per getUserId/queryByUser laufen
const READ_ROUTES = [
  { name: 'GET /api/finance', file: 'finance/index.get', table: 'plexora-finance' },
  { name: 'GET /api/finance/cashbook', file: 'finance/cashbook.get', table: 'plexora-cashbook' },
  { name: 'GET /api/finance/bank-txns', file: 'finance/bank-txns.get', table: 'plexora-bank-txn' },
] as const

beforeEach(() => reset())

describe('Modul Finanzen: schreibende Routen ohne demo-user-Rückfall', () => {
  for (const r of WRITE_ROUTES) {
    describe(r.name, () => {
      it('ohne Token 401, keine Datenbankzugriffe', async () => {
        expect(await status((await load(r.file))(anon()))).toBe(401)
        expect(calls).toHaveLength(0)
      })
      it('Demo-Login schreibt/löscht nur unter demo@plexora.eu', async () => {
        await (await load(r.file))(tok('demo@plexora.eu', { body: r.body })).catch(() => {})
        expect(everything()).not.toContain('"demo-user"')
        const w = writes()
        expect(w.length).toBeGreaterThan(0)
        for (const c of w) expect(JSON.stringify(c.input.Item || c.input.Key)).toContain('demo@plexora.eu')
      })
      it('Team-Mitglied arbeitet im Mandanten des Inhabers, Mandant aus dem Request wird ignoriert', async () => {
        await (await load(r.file))(tok('maria@firma.de', { body: { ...r.body, userId: 'fremd@andere.de' }, query: { userId: 'fremd@andere.de' } })).catch(() => {})
        for (const c of writes()) { const s = JSON.stringify(c.input.Item || c.input.Key); expect(s).toContain('chef@firma.de'); expect(s).not.toContain('fremd@andere.de') }
      })
    })
  }
})

describe('Modul Finanzen: XRechnung', () => {
  it('ohne Token 401; Demo-Login findet nur eigene Rechnungen, nie demo-user', async () => {
    const h = await load('finance/[id]/xrechnung.get')
    expect(await status(h(anon()))).toBe(401)
    expect(calls).toHaveLength(0)
    rows['plexora-finance'] = [{ userId: 'demo-user', invoiceId: 'i1' }]
    expect(await status(h(tok('demo@plexora.eu', { params: { id: 'i1' } })))).toBe(404)
    expect(everything()).not.toContain('"demo-user"')
  })
})

describe('Modul Finanzen: Lesen (Demo-Login-Test)', () => {
  for (const r of READ_ROUTES) {
    it(`${r.name}: ohne Token 401; Demo-Login sieht nur den eigenen Bestand`, async () => {
      const h = await load(r.file)
      expect(await status(h(anon()))).toBe(401)
      rows[r.table] = [{ userId: 'demo-user', marker: 'anonym', date: '2026-01-01' }, { userId: 'demo@plexora.eu', marker: 'demo-login', date: '2026-01-02' }, { userId: 'chef@firma.de', marker: 'echt', date: '2026-01-03' }]
      const res: any = await h(tok('demo@plexora.eu'))
      const list = (Object.values(res).find(Array.isArray) as any[]) || []
      expect(list.map(x => x.marker)).toEqual(['demo-login'])
    })
  }
})
