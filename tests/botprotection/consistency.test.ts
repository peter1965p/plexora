import { describe, it, expect, vi, beforeEach } from 'vitest'
import { db, cloudflare, fakeDynamo, installGlobals, resetDb, resolveUserIdFake, code } from './helpers'

// Konsistenz zwischen Widget (öffentliche Ausgabe) und serverseitiger Prüfung: Verlangt der Server bei der Buchung ein Token, MUSS die Buchungsseite ein Widget zeigen,
// sonst scheitert jede Buchung. Umgekehrt zeigt die Seite kein Widget, wenn der Server nichts prüft. Geprüft über ALLE Kombinationen der Schalter.
vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => fakeDynamo() }))
vi.mock('../../server/utils/tenant', () => ({ resolveUserId: (e: string) => resolveUserIdFake(e) }))
vi.mock('../../server/utils/automations', () => ({ fireAutomations: () => {} }))
vi.mock('../../server/utils/sequences', () => ({ startSequences: async () => {} }))
vi.mock('../../server/utils/campaignAppointments', () => ({ findCampaignAppointmentTypeId: async () => '' }))
vi.mock('../../server/utils/mailer', () => ({ sendMail: async () => 'sent' }))
vi.mock('../../server/utils/termine', async (orig) => ({ ...(await orig() as any), computeFreeSlots: async () => ['10:00'], createGoogleCalendarEvent: async () => null }))
installGlobals()

const { default: termineGet } = await import('../../server/api/public/[tenantId]/termine.get')
const { default: book } = await import('../../server/api/public/[tenantId]/termine/book.post')
const { default: contactGet } = await import('../../server/api/public/[tenantId]/contact.get')
const { default: contactPost } = await import('../../server/api/public/[tenantId]/contact.post')
const { default: publicCampaign } = await import('../../server/api/marketing/public/[slug].get')
const { default: submit } = await import('../../server/api/forms/[id]/submit.post')
const { encryptSecret } = await import('../../server/utils/crypto')

const OWNER = 'chef@firma.de'
let ipN = 0
const ip = () => `198.51.100.${(ipN = (ipN + 1) % 250)}`
interface Cfg { mainOn: boolean; keys: boolean; campaignOn: boolean; contactOn: boolean; typeKind: 'campaign' | 'plain' }
function setup(c: Cfg) {
  resetDb()
  db.settings.set(`bot-protection|${OWNER}`, { settingId: 'bot-protection', scope: OWNER, enabled: c.mainOn, siteKey: c.keys ? '0x4AAAAAAAtestKeyForPlexora' : '', mode: 'managed',
    secretEncrypted: c.keys ? encryptSecret('good-secret-123') : '', secretMasked: '', contactProtection: c.contactOn, hostnames: [] })
  db.forms = [{ formId: 'f1', userId: OWNER, title: 'Beratung', successMsg: 'Danke' }]
  db.campaigns = [{ userId: OWNER, campaignId: 'c1', slug: 'beratung', formId: 'f1', turnstileEnabled: c.campaignOn, appointmentTypeId: 'ty1', headline: 'H', status: 'active' }]
  db.nexora = [{ tenantId: 'T1', email: OWNER, status: 'active', termineEnabled: true, customDomain: 'www.paeffgen-it.de', companyName: 'Päffgen IT' }]
  db.types = [{ tenantId: 'T1', typeId: 'ty1', name: 'Beratung', active: true, durationMinutes: 30, ...(c.typeKind === 'campaign' ? { campaignId: 'c1' } : {}) }]
}
const bookEv = (body: any = {}) => ({ headers: { 'x-forwarded-for': ip() }, params: { tenantId: 'T1' }, body: { typeId: 'ty1', date: '2026-12-01', startTime: '10:00', customerName: 'Kai', customerEmail: 'kai@kunde.de', ...body } })
const pageEv = (type?: string) => ({ headers: {}, params: { tenantId: 'T1' }, query: type ? { type } : {} })
const bools = [true, false]
const combos: Cfg[] = []
for (const mainOn of bools) for (const keys of bools) for (const campaignOn of bools) for (const typeKind of ['campaign', 'plain'] as const) combos.push({ mainOn, keys, campaignOn, contactOn: true, typeKind })
// Schutz an, Hauptschalter an, aber keine Schlüssel: kaputte Konfiguration. Sie lässt sich über die Einstellungen nicht herstellen (Test unten), der Server schließt (503, Protokoll).
const BROKEN = (c: Cfg, protectedHere: boolean) => c.mainOn && !c.keys && protectedHere
const label = (c: Cfg) => `Hauptschalter ${c.mainOn ? 'an' : 'aus'}, Schlüssel ${c.keys ? 'da' : 'fehlen'}, Kampagne ${c.campaignOn ? 'an' : 'aus'}, Terminart ${c.typeKind}`

beforeEach(() => { resetDb() })

describe('Terminbuchung: Widget ⇔ Token-Pflicht (alle 16 Kombinationen)', () => {
  it('die Buchungsseite (mit ?type=) zeigt genau dann ein Widget, wenn der Server ohne Token ablehnt', async () => {
    const wrong: string[] = []; const seen = { widgetAndRequired: 0, neither: 0, broken: 0 }
    for (const c of combos) {
      setup(c)
      const page: any = await termineGet(pageEv('ty1') as any)               // was die Seite sieht (Deep-Link ?type=ty1)
      const widget = !!page.botProtection
      const status = await code(book(bookEv() as any))                       // Buchung ohne Token (wie von einem Besucher ohne Widget)
      const required = status === 403 || status === 503
      // Einzige bewusste Ausnahme: Schutz verlangt, aber Schlüssel fehlen (nicht über die Oberfläche herstellbar, siehe unten): geschlossen mit 503, kein Widget möglich
      if (BROKEN(c, c.typeKind === 'campaign' && c.campaignOn)) { expect(status, label(c)).toBe(503); expect(widget, label(c)).toBe(false); seen.broken++; continue }
      if (widget !== required) wrong.push(`${label(c)}: Widget ${widget ? 'ja' : 'NEIN'}, Server ${required ? `verlangt Token (${status})` : `verlangt keins (${status})`}`)
      else if (widget) seen.widgetAndRequired++; else seen.neither++
      // Mit gültigem Token klappt es dort, wo ein Widget da ist; ohne Widget klappt es ohne Token
      if (widget) expect(await code(book(bookEv({ turnstileToken: 'valid-token' }) as any)), label(c)).toBe(200)
      else expect(status, label(c)).toBe(200)
    }
    expect(wrong, `Inkonsistenz Widget/Server – jede Buchung würde scheitern:\n${wrong.join('\n')}`).toEqual([])
    expect(seen.widgetAndRequired).toBeGreaterThan(0); expect(seen.neither).toBeGreaterThan(0); expect(seen.broken).toBeGreaterThan(0)       // alle drei Arten kommen vor (der Test prüft etwas)
  })
  it('das Widget gehört nur zur angeforderten Terminart: ohne ?type= (Kampagnen-Terminart unsichtbar) kommt keines, andere Typen sind nie geschützt', async () => {
    setup({ mainOn: true, keys: true, campaignOn: true, contactOn: true, typeKind: 'campaign' })
    expect(((await termineGet(pageEv() as any)) as any).botProtection).toBeNull(); expect(((await termineGet(pageEv('nicht-da') as any)) as any).botProtection).toBeNull()
    expect(((await termineGet(pageEv('ty1') as any)) as any).botProtection).toMatchObject({ siteKey: '0x4AAAAAAAtestKeyForPlexora', mode: 'managed' })
    setup({ mainOn: true, keys: true, campaignOn: true, contactOn: true, typeKind: 'plain' })
    expect(((await termineGet(pageEv('ty1') as any)) as any).botProtection).toBeNull(); expect(await code(book(bookEv() as any))).toBe(200)
  })
  it('das Widget enthält nie das Secret', async () => {
    setup({ mainOn: true, keys: true, campaignOn: true, contactOn: true, typeKind: 'campaign' })
    expect(JSON.stringify(await termineGet(pageEv('ty1') as any))).not.toMatch(/good-secret|secretEncrypted|secret/i)
  })
  it('Token der Buchungsseite (Domain des Mandanten, mit und ohne www) wird akzeptiert, Token einer fremden Seite nicht – sonst scheiterte jede Buchung auf der echten Domain', async () => {
    setup({ mainOn: true, keys: true, campaignOn: true, contactOn: true, typeKind: 'campaign' })
    for (const [host, status] of [['www.paeffgen-it.de', 200], ['paeffgen-it.de', 200], ['app.plexora.eu', 200], ['evil.example', 403], ['localhost', 403]] as const) {
      cloudflare.respond = (_s, t) => t === 'tok' ? { success: true, hostname: host } : { success: false, 'error-codes': ['invalid-input-response'] }
      expect(await code(book(bookEv({ turnstileToken: 'tok' }) as any)), host).toBe(status)
    }
  })
})

describe('Gleiche Konsistenz bei Kontaktseite und Lead-Formular', () => {
  it('Kontaktseite: Widget in contact.get ⇔ Server verlangt Token bei contact.post (alle Kombinationen)', async () => {
    const wrong: string[] = []
    for (const c of combos.filter(x => x.typeKind === 'plain')) for (const contactOn of bools) {
      setup({ ...c, contactOn })
      const widget = !!((await contactGet({ headers: {}, params: { tenantId: 'T1' }, query: {} } as any)) as any).botProtection
      const status = await code(contactPost({ headers: { 'x-forwarded-for': ip() }, params: { tenantId: 'T1' }, method: 'POST', body: { name: 'Kai K', email: 'kai@kunde.de', message: 'Hallo' } } as any))
      const required = status === 403 || status === 503
      if (BROKEN(c, contactOn)) { expect(status).toBe(503); expect(widget).toBe(false); continue }
      if (widget !== required) wrong.push(`${label(c)}, Kontaktschutz ${contactOn ? 'an' : 'aus'}: Widget ${widget}, Server ${status}`)
    }
    expect(wrong).toEqual([])
  })
  it('Lead-Formular: Widget in der Kampagnenausgabe ⇔ Server verlangt Token beim Absenden (alle Kombinationen)', async () => {
    const wrong: string[] = []
    for (const c of combos.filter(x => x.typeKind === 'plain')) {
      setup(c)
      const widget = !!((await publicCampaign({ headers: {}, params: { slug: 'beratung' }, query: {} } as any)) as any).botProtection
      const status = await code(submit({ headers: { 'x-forwarded-for': ip() }, params: { id: 'f1' }, query: {}, body: { data: { Email: 'lead@kunde.de' } } } as any))
      const required = status === 403 || status === 503
      if (BROKEN(c, c.campaignOn)) { expect(status).toBe(503); expect(widget).toBe(false); continue }
      if (widget !== required) wrong.push(`${label(c)}: Widget ${widget}, Server ${status}`)
    }
    expect(wrong).toEqual([])
  })
})

describe('Die kaputte Konfiguration (Schutz an, Schlüssel fehlen) lässt sich über die Einstellungen nicht herstellen', () => {
  it('Einschalten ohne Schlüssel: 400; Schlüssel entfernen, solange etwas davon abhängt: 409; nach dem Entfernen ist alles aus', async () => {
    resetDb(); const { default: settingsPost } = await import('../../server/api/settings/bot-protection.post'); const { authEv } = await import('./helpers')
    const post = (body: any) => settingsPost(authEv(OWNER, { body }) as any)
    expect(await code(post({ enabled: true }))).toBe(400); expect(await code(post({ contactProtection: true }))).toBe(400)
    setup({ mainOn: true, keys: true, campaignOn: true, contactOn: false, typeKind: 'campaign' })
    expect(await code(post({ remove: true }))).toBe(409)                                              // Kampagne nutzt den Schutz
    db.campaigns[0].turnstileEnabled = false
    const r: any = await post({ remove: true }); expect(r.enabled).toBe(false); expect(r.siteKey).toBe(''); expect(r.contactProtection).toBe(false)
  })
})
