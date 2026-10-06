import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Fake-DynamoDB: echte lib-dynamodb-Commands, Speicher im Arbeitsspeicher, Protokoll aller Tabellen
const store = new Map<string, any>()
const touchedTables: string[] = []
vi.mock('../../server/utils/dynamodb', () => ({
  getDynamoClient: () => ({
    async send(cmd: any) {
      const name = cmd.constructor.name
      const { TableName, Key, Item } = cmd.input
      touchedTables.push(TableName)
      const k = (o: any) => `${TableName}|${o.owner}|${o.formType}`
      if (name === 'GetCommand') return { Item: store.get(k(Key)) }
      if (name === 'PutCommand') { store.set(k(Item), structuredClone(Item)); return {} }
      if (name === 'DeleteCommand') { store.delete(k(Key)); return {} }
      throw new Error('unerwarteter Befehl: ' + name)
    },
  }),
}))
// Tenant-Auflösung: E-Mail -> Besitzer des Kontos (Team-Mitglied maria gehört zu tenant-1)
vi.mock('../../server/utils/tenant', () => ({
  resolveUserId: async (email: string) => ({ 'maria@firma.de': 'chef@firma.de' } as Record<string, string>)[email] || email,
}))

// Nitro-Auto-Imports als Stubs
class HttpError extends Error { statusCode: number; constructor(o: any) { super(o.message); this.statusCode = o.statusCode } }
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => new HttpError(o))
vi.stubGlobal('getRouterParam', (e: any, n: string) => e.params?.[n])
vi.stubGlobal('readBody', async (e: any) => e.body)

const { default: getRoute } = await import('../../server/api/drafts/[type].get')
const { default: putRoute } = await import('../../server/api/drafts/[type].put')
const { default: delRoute } = await import('../../server/api/drafts/[type].delete')

const T = 'marketing-campaign'
const userA = { userId: 'sub-A', email: 'chef@firma.de', groups: ['admins'] }
const userB = { userId: 'sub-B', email: 'maria@firma.de', groups: ['customers'] } // Team, gleicher Tenant
const userC = { userId: 'sub-C', email: 'fremd@andere.de', groups: ['customers'] } // anderer Tenant
const ev = (auth: any, extra: any = {}) => ({ context: { auth }, params: { type: T }, ...extra })
const status = async (p: Promise<any>) => p.then(() => 200, (e: any) => e.statusCode)

beforeEach(() => { store.clear(); touchedTables.length = 0 })

describe('Anmeldung (ohne Token = 401)', () => {
  it('GET, PUT und DELETE ohne Token liefern 401', async () => {
    expect(await status(getRoute(ev(undefined) as any))).toBe(401)
    expect(await status(putRoute(ev(undefined, { body: { data: { name: 'x' } } }) as any))).toBe(401)
    expect(await status(delRoute(ev(undefined) as any))).toBe(401)
    expect(store.size).toBe(0)
    expect(touchedTables).toEqual([])
  })

  it('ein gefälschter x-user-email-Header ersetzt die Anmeldung nicht', async () => {
    const e = { ...ev(undefined), headers: { 'x-user-email': 'chef@firma.de' } }
    expect(await status(getRoute(e as any))).toBe(401)
  })

  it('ein Token ohne E-Mail/Nutzer-ID wird abgelehnt', async () => {
    expect(await status(putRoute(ev({ userId: '', email: 'a@b.de', groups: [] }, { body: { data: {} } }) as any))).toBe(401)
  })
})

describe('Funktion', () => {
  it('PUT legt an, zweites PUT aktualisiert denselben Entwurf (Upsert), GET liefert ihn', async () => {
    await putRoute(ev(userA, { body: { data: { name: 'Erster' } } }) as any)
    const res: any = await putRoute(ev(userA, { body: { data: { name: 'Zweiter', slug: 's' } } }) as any)
    expect(res.draft).toMatchObject({ status: 'draft', name: 'Zweiter' })
    expect(store.size).toBe(1)
    const got: any = await getRoute(ev(userA) as any)
    expect(got.draft.data).toEqual({ name: 'Zweiter', slug: 's' })
  })

  it('GET ohne Entwurf liefert { draft: null }', async () => {
    expect(await getRoute(ev(userA) as any)).toEqual({ draft: null })
  })

  it('DELETE entfernt den Entwurf', async () => {
    await putRoute(ev(userA, { body: { data: { name: 'x' } } }) as any)
    await delRoute(ev(userA) as any)
    expect(await getRoute(ev(userA) as any)).toEqual({ draft: null })
  })

  it('unbekannter Typ = 404, zu große Payload = 413', async () => {
    expect(await status(getRoute(ev(userA, { params: { type: 'gibts-nicht' } }) as any))).toBe(404)
    expect(await status(putRoute(ev(userA, { body: { data: { junk: 'z'.repeat(40_000) } } }) as any))).toBe(413)
  })
})

describe('IDOR: kein Zugriff auf fremde Entwürfe', () => {
  it('Team-Mitglied im selben Tenant sieht den Entwurf des Chefs nicht und umgekehrt', async () => {
    await putRoute(ev(userA, { body: { data: { name: 'Chef-Entwurf' } } }) as any)
    await putRoute(ev(userB, { body: { data: { name: 'Maria-Entwurf' } } }) as any)
    expect(store.size).toBe(2)
    expect(((await getRoute(ev(userA) as any)) as any).draft.name).toBe('Chef-Entwurf')
    expect(((await getRoute(ev(userB) as any)) as any).draft.name).toBe('Maria-Entwurf')
  })

  it('ein Nutzer aus einem anderen Tenant sieht nichts und kann nichts löschen', async () => {
    await putRoute(ev(userA, { body: { data: { name: 'Chef-Entwurf' } } }) as any)
    expect(await getRoute(ev(userC) as any)).toEqual({ draft: null })
    await delRoute(ev(userC) as any)
    expect(((await getRoute(ev(userA) as any)) as any).draft.name).toBe('Chef-Entwurf')
  })

  it('Besitzer-Angaben im Body (owner, userId, tenantId, Pfad-Tricks) ändern nichts', async () => {
    await putRoute(ev(userA, { body: { data: { name: 'Chef-Entwurf' } } }) as any)
    await putRoute(ev(userC, { body: { owner: 'chef@firma.de#sub-A', userId: 'sub-A', tenantId: 'chef@firma.de', data: { name: 'Angriff', owner: 'chef@firma.de#sub-A' } } }) as any)
    expect(((await getRoute(ev(userA) as any)) as any).draft.name).toBe('Chef-Entwurf')
    const owners = [...store.values()].map(r => r.owner).sort()
    expect(owners).toEqual(['chef@firma.de#sub-A', 'fremd@andere.de#sub-C'])
    // Typ-Parameter mit Besitzer-Syntax wird als unbekannter Typ abgelehnt
    expect(await status(getRoute(ev(userC, { params: { type: 'marketing-campaign#chef@firma.de#sub-A' } }) as any))).toBe(404)
  })
})

describe('Keine Nebenwirkungen', () => {
  it('Entwurfs-Routen berühren ausschließlich die Tabelle plexora-drafts', async () => {
    await putRoute(ev(userA, { body: { data: { name: 'x', slug: 'kurz', appointmentEnabled: true, formId: 'f1' } } }) as any)
    await getRoute(ev(userA) as any)
    await delRoute(ev(userA) as any)
    expect(touchedTables.length).toBeGreaterThan(0)
    expect(new Set(touchedTables)).toEqual(new Set(['plexora-drafts']))
  })

  it('der Quellcode der Routen verwendet weder Kampagnen-, Termin-, Kurzlink- noch Mail-Code', async () => {
    const { readFileSync, readdirSync } = await import('node:fs')
    const files = [
      ...readdirSync('server/api/drafts').map(f => `server/api/drafts/${f}`),
      ...readdirSync('server/utils/drafts').map(f => `server/utils/drafts/${f}`),
    ]
    const forbidden = /plexora-marketing|plexora-termine|plexora-shortlinks|campaignAppointments|mailer|sendMail|automations|sequences|shortlink/i
    for (const f of files) expect(readFileSync(f, 'utf8'), f).not.toMatch(forbidden)
  })
})
