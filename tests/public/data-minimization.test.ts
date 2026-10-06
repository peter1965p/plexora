import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Fake-Datenbank ───────────────────────────────────────────────────────────────────────
const db: Record<string, any> = {}
vi.mock('../../server/utils/dynamodb', () => ({
  getDynamoClient: () => ({
    async send(cmd: any) {
      const n = cmd.constructor.name; const i = cmd.input; const t = i.TableName
      if (n === 'ScanCommand' && t === 'plexora-marketing') return { Items: db.campaigns || [] }
      if (n === 'ScanCommand' && t === 'plexora-forms') return { Items: db.forms || [] }
      if (n === 'GetCommand' && t === 'plexora-settings') return { Item: db.settings?.[`${i.Key.settingId}|${i.Key.scope}`] }
      if (n === 'GetCommand' && t === 'plexora-licenses') return { Item: db.licenses?.[i.Key.licenseKey] }
      if (n === 'QueryCommand' && t === 'plexora-pages') return { Items: db.pages || [] }
      if (n === 'QueryCommand' && t === 'plexora-marketing')
        return { Items: (db.campaigns || []).filter((c: any) => c.userId === i.ExpressionAttributeValues[':uid'] && c.campaignId === i.ExpressionAttributeValues[':cid']) }
      if (n === 'QueryCommand' && t === 'plexora-email-sends')
        return { Items: (db.sends || []).filter((s: any) => s.campaignId === i.ExpressionAttributeValues[':cid']) }
      return {}
    },
  }),
}))
vi.mock('../../server/utils/tenant', () => ({
  resolveUserId: async (e: string) => ({ 'maria@firma.de': 'chef@firma.de' } as Record<string, string>)[e] || e,
}))
class HttpError extends Error { statusCode: number; constructor(o: any) { super(o.message); this.statusCode = o.statusCode } }
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => new HttpError(o))
vi.stubGlobal('getRouterParam', (e: any, n: string) => e.params?.[n])
vi.stubGlobal('getQuery', (e: any) => e.query || {})

const { default: landing } = await import('../../server/api/marketing/public/[slug].get')
const { default: pageBySlug } = await import('../../server/api/pages/[slug].get')
const { default: company } = await import('../../server/api/settings/company.get')
const { default: license } = await import('../../server/api/licenses/[key].get')
const { default: emailStats } = await import('../../server/api/marketing/email-stats.get')

const OWNER = 'chef@firma.de'
const ev = (extra: any = {}) => ({ context: {}, params: {}, query: {}, ...extra })
const status = (p: Promise<any>) => p.then(() => 200, (e: any) => e.statusCode)

beforeEach(() => {
  db.campaigns = [{ userId: OWNER, campaignId: 'c1', slug: 'beratung', formId: 'f1', headline: 'Hallo', subtext: 'Sub', accentColor: '#fff',
    contentItems: ['a'], appointmentTypeId: 'typ-1', active: true, endsAt: '2027-01-01', internalNote: 'intern', created: 'x' }]
  db.forms = [{ formId: 'f1', userId: OWNER, notifyEmail: 'boss@firma.de', title: 'Formular', fields: [{ id: 1, label: 'E-Mail' }], submitLabel: 'Los', successMsg: 'Danke', created: 'c', updated: 'u' }]
  db.settings = {
    [`branding|${OWNER}`]: { settingId: 'branding', scope: OWNER, brandName: 'Marke', primaryColor: '#123', logoUrl: 'l.png', secretFlag: 'x', updated: 'u' },
    'company|global': { settingId: 'company', scope: 'global', legalName: 'Plexora GmbH', street: 'Weg 1', zipCity: '12345 Ort', email: 'info@plexora.eu',
      iban: 'DE0012345678', bic: 'BICXXX', bankName: 'Meine Bank', paymentNote: 'Bitte zahlen', updated: 'u' },
    [`company|${OWNER}`]: { settingId: 'company', scope: OWNER, legalName: 'Firma GmbH', iban: 'DE99', bankName: 'Bank' },
  }
  db.licenses = { 'PLXR-AAAA': { licenseKey: 'PLXR-AAAA', status: 'active', tier: 'pro', modules: ['crm'], validFrom: '2026-01-01', validUntil: '2027-01-01',
    customerEmail: 'kunde@firma.de', customerName: 'Kunde', note: 'intern', createdManually: true, stripeCustomerId: 'cus_1' } }
  db.pages = []
  db.sends = [
    { campaignId: 'c1', userId: OWNER, contactId: 'k1', contactName: 'A', email: 'a@x.de', status: 'sent', sentAt: 't' },
    { campaignId: 'c1', userId: OWNER, contactId: 'k2', contactName: 'B', email: 'b@x.de', status: 'opened', sentAt: 't', openedAt: 't2' },
    { campaignId: 'c1', userId: 'fremd@andere.de', contactId: 'k3', contactName: 'C', email: 'c@x.de', status: 'sent', sentAt: 't' },
  ]
})

describe('Landingpage-Schnittstelle: keine Besitzerdaten', () => {
  it('liefert, was die Seite braucht, aber weder Besitzer-E-Mail noch Benachrichtigungsadresse noch interne Felder', async () => {
    const res: any = await landing(ev({ params: { slug: 'c1' } }) as any)
    expect(res.campaign).toMatchObject({ campaignId: 'c1', formId: 'f1', headline: 'Hallo', subtext: 'Sub', accentColor: '#fff' })
    expect(res.form).toMatchObject({ formId: 'f1', title: 'Formular', submitLabel: 'Los', successMsg: 'Danke' })
    expect(res.form.fields).toHaveLength(1)
    expect(res.branding).toMatchObject({ brandName: 'Marke', primaryColor: '#123', logoUrl: 'l.png' })
    const json = JSON.stringify(res)
    for (const secret of ['chef@firma.de', 'boss@firma.de', 'typ-1', 'intern', 'secretFlag', '"userId"', '"scope"', '"notifyEmail"', 'settingId'])
      expect(json, secret).not.toContain(secret)
  })
  it('unbekannte Kampagne liefert weiter leere Werte', async () => {
    db.campaigns = []
    expect(await landing(ev({ params: { slug: 'nix' } }) as any)).toEqual({ campaign: null, form: null, branding: null })
  })
  it('ein neues, nicht freigegebenes Feld in der Datenbank wird nicht ausgeliefert', async () => {
    db.campaigns[0].geheim = 'sk_live_123'
    expect(JSON.stringify(await landing(ev({ params: { slug: 'c1' } }) as any))).not.toContain('sk_live_123')
  })
})

describe('Seiten: nur veröffentlicht, Entwürfe nur für den Besitzer', () => {
  const page = (status: string, userId = OWNER) => ({ slug: 'meine-seite', status, userId, title: 'T', blocks: [] })
  it('veröffentlichte Seite: ohne userId', async () => {
    db.pages = [page('published')]
    const res: any = await pageBySlug(ev({ params: { slug: 'meine-seite' } }) as any)
    expect(res.page).toMatchObject({ slug: 'meine-seite', title: 'T' })
    expect(res.page.userId).toBeUndefined()
  })
  it('Entwurf: anonym 404, fremder Nutzer 404, Besitzer und Team-Mitglied sehen ihn', async () => {
    db.pages = [page('draft')]
    expect(await status(pageBySlug(ev({ params: { slug: 'meine-seite' } }) as any))).toBe(404)
    expect(await status(pageBySlug(ev({ params: { slug: 'meine-seite' }, context: { auth: { email: 'fremd@andere.de' } } }) as any))).toBe(404)
    expect(await status(pageBySlug(ev({ params: { slug: 'meine-seite' }, context: { auth: { email: OWNER } } }) as any))).toBe(200)
    expect(await status(pageBySlug(ev({ params: { slug: 'meine-seite' }, context: { auth: { email: 'maria@firma.de' } } }) as any))).toBe(200)
  })
  it('gleicher Slug bei mehreren Mandanten: anonym wird die veröffentlichte Seite geliefert, nie der fremde Entwurf', async () => {
    db.pages = [page('draft', 'fremd@andere.de'), page('published')]
    const res: any = await pageBySlug(ev({ params: { slug: 'meine-seite' } }) as any)
    expect(res.page.status).toBe('published')
  })
})

describe('Firmendaten: anonym nur Anbieterkennzeichnung', () => {
  it('ohne Anmeldung keine Bankdaten und keine internen Felder', async () => {
    const res: any = await company(ev() as any)
    expect(res.company).toMatchObject({ legalName: 'Plexora GmbH', street: 'Weg 1', zipCity: '12345 Ort', email: 'info@plexora.eu', country: 'Deutschland' })
    const json = JSON.stringify(res)
    for (const secret of ['DE0012345678', 'BICXXX', 'Meine Bank', 'Bitte zahlen', 'iban', 'bic', 'bankName', 'paymentNote', 'settingId', 'scope'])
      expect(json, secret).not.toContain(secret)
  })
  it('angemeldeter Mandant bekommt seinen vollständigen Datensatz, Plattform-Admin den globalen', async () => {
    const tenant: any = await company(ev({ context: { auth: { email: OWNER, groups: ['customers'] } } }) as any)
    expect(tenant.company).toMatchObject({ legalName: 'Firma GmbH', iban: 'DE99' })
    const admin: any = await company(ev({ context: { auth: { email: 'peter@plexora.eu', groups: ['admins'] } } }) as any)
    expect(admin.company).toMatchObject({ legalName: 'Plexora GmbH', iban: 'DE0012345678' })
  })
})

describe('Lizenz per Schlüssel: nur nötige Felder', () => {
  it('liefert Status, Stufe, Module, Gültigkeit, keine Kundendaten', async () => {
    const res: any = await license(ev({ params: { key: 'plxr-aaaa' } }) as any)
    expect(res.license).toEqual({ status: 'active', tier: 'pro', modules: ['crm'], validFrom: '2026-01-01', validUntil: '2027-01-01' })
    const json = JSON.stringify(res)
    for (const secret of ['kunde@firma.de', 'Kunde', 'intern', 'cus_1', 'PLXR-AAAA']) expect(json, secret).not.toContain(secret)
  })
  it('unbekannter Schlüssel: 404', async () => {
    expect(await status(license(ev({ params: { key: 'nix' } }) as any))).toBe(404)
  })
})

describe('Versandstatistik: Anmeldung und Besitzerprüfung', () => {
  const q = { campaignId: 'c1' }
  it('ohne Token 401 (die Kampagnen-ID aus der öffentlichen Adresse reicht nicht)', async () => {
    expect(await status(emailStats(ev({ query: q }) as any))).toBe(401)
    expect(await status(emailStats(ev({ query: q, context: { auth: { userId: 'x', email: '' } } }) as any))).toBe(401)
  })
  it('fremder Mandant: 404, keine Empfängerdaten', async () => {
    const e = ev({ query: q, context: { auth: { userId: 'x', email: 'fremd@andere.de' } } })
    expect(await status(emailStats(e as any))).toBe(404)
  })
  it('Besitzer (auch Team-Mitglied) sieht Statistik und Empfänger, aber nur Zeilen des eigenen Mandanten', async () => {
    for (const email of [OWNER, 'maria@firma.de']) {
      const res: any = await emailStats(ev({ query: q, context: { auth: { userId: 'x', email } } }) as any)
      expect(res.stats).toMatchObject({ sent: 2, opened: 1, openRate: 50 })
      expect(res.items.map((i: any) => i.email).sort()).toEqual(['a@x.de', 'b@x.de'])
    }
  })
  it('ohne campaignId: leere Antwort für Angemeldete', async () => {
    expect(await emailStats(ev({ context: { auth: { userId: 'x', email: OWNER } } }) as any)).toEqual({ stats: null, items: [] })
  })
})
