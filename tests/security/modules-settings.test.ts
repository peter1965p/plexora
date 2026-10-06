import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { calls, rows, reset, fakeClient, resolveFake, anon, tok, status, writes, everything, setup } from './demoHarness'

vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => fakeClient() }))
vi.mock('../../server/utils/tenant', () => ({ resolveUserId: (e: string) => resolveFake(e), invalidateTenantCache: () => {} }))
setup()
const routes = import.meta.glob('../../server/api/**/*.ts')
const load = async (rel: string): Promise<any> => ((await routes[`../../server/api/${rel}.ts`]()) as any).default
beforeEach(() => reset())

// Einstellungen, die ein Mandant für sich speichert (Scope = Inhaber)
const TENANT_WRITES = [
  { file: 'settings/branding.post', body: { brandName: 'Marke' } },
  { file: 'settings/company.post', body: { legalName: 'Firma GmbH' } },
  { file: 'settings/invoice-template.put', body: { html: '<p>Vorlage</p>' } },
  { file: 'settings/invoice.post', body: { dueDays: 14 } },
  { file: 'settings/invoice-payment.post', body: { iban: 'DE00' } },
  { file: 'settings/categories.post', body: { area: 'blog', categories: ['a'] } },
  { file: 'settings/modules.post', body: { modules: [] } },
  { file: 'settings/session.post', body: { timeoutMinutes: 30 } },
] as const
// Globale Texte/Einstellungen: nur Plattform-Admins
const ADMIN_WRITES = ['settings/agb.post', 'settings/datenschutz.post', 'settings/payment.post', 'settings/dunning.post'] as const

describe('Einstellungen schreiben', () => {
  for (const r of TENANT_WRITES) {
    describe(r.file, () => {
      it('ohne Token 401, keine Datenbankzugriffe', async () => {
        expect(await status((await load(r.file))(anon()))).toBe(401); expect(calls).toHaveLength(0)
      })
      it('Demo-Konto: 403 und es wird nichts gespeichert (Erkennung am Token, nicht am Body)', async () => {
        expect(await status((await load(r.file))(tok('demo@plexora.eu', { body: { ...r.body, userId: 'demo@plexora.eu' } })))).toBe(403)
        expect(await status((await load(r.file))(tok('x@y.de', { body: { ...r.body, userId: 'x@y.de' } }, ['demo'])))).toBe(403)
        expect(writes()).toHaveLength(0)
      })
      it('Inhaber/Team-Mitglied schreibt nur in den Mandanten des Inhabers, nie unter demo-user', async () => {
        await (await load(r.file))(tok('maria@firma.de', { body: { ...r.body, userId: 'fremd@andere.de' } })).catch(() => {})
        expect(everything()).not.toContain('"demo-user"'); expect(everything()).not.toContain('fremd@andere.de')
      })
    })
  }
  for (const f of ADMIN_WRITES) {
    it(`${f}: ohne Token 401, Kunde 403, Demo-Konto 403, nichts geschrieben`, async () => {
      const h = await load(f)
      expect(await status(h(anon()))).toBe(401)
      expect(await status(h(tok('chef@firma.de', { body: { content: 'x' } })))).toBe(403)
      expect(await status(h(tok('demo@plexora.eu', { body: { content: 'x' } })))).toBe(403)
      expect(writes()).toHaveLength(0)
    })
  }
})

describe('Rechnungsvorlage lesen (Demo-Login-Test)', () => {
  it('ohne Token 401; Demo-Login liest nur unter demo@plexora.eu', async () => {
    const h = await load('settings/invoice-template.get')
    expect(await status(h(anon()))).toBe(401); expect(calls).toHaveLength(0)
    rows['plexora-invoice-templates'] = [{ userId: 'demo@plexora.eu', html: '<p>demo</p>', presetKey: 'x' }]
    await h(tok('demo@plexora.eu'))
    expect(everything()).toContain('demo@plexora.eu'); expect(everything()).not.toContain('"demo-user"')
  })
})

describe('Altlast demoGuard', () => {
  it('der wirkungslose demoGuard (prüfte body.userId) ist entfernt und wird nirgends mehr verwendet', () => {
    const hits: string[] = []
    const walk = (d: string) => { for (const n of readdirSync(d)) { const f = join(d, n); statSync(f).isDirectory() ? walk(f) : f.endsWith('.ts') && /demoGuard\(/.test(readFileSync(f, 'utf8')) && hits.push(f) } }
    walk('server')
    expect(hits).toEqual([])
  })
})
