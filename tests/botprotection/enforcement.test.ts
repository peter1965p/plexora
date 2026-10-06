import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { db, cloudflare, fakeDynamo, installGlobals, resetDb, resolveUserIdFake, code } from './helpers'

const mails: any[] = []
const sideEffects: string[] = []
vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => fakeDynamo() }))
vi.mock('../../server/utils/tenant', () => ({ resolveUserId: (e: string) => resolveUserIdFake(e) }))
vi.mock('../../server/utils/automations', () => ({ fireAutomations: (...a: any[]) => { sideEffects.push('automation') } }))
vi.mock('../../server/utils/sequences', () => ({ startSequences: async () => { sideEffects.push('sequence') } }))
vi.mock('../../server/utils/campaignAppointments', () => ({ findCampaignAppointmentTypeId: async () => '' }))
vi.mock('../../server/utils/mailer', () => ({ sendMail: async (m: any) => { mails.push(m) } }))
vi.mock('../../server/utils/termine', async (orig) => ({
  ...(await orig() as any),
  computeFreeSlots: async () => ['10:00'],
  createGoogleCalendarEvent: async () => null,
}))
installGlobals()

const { default: submit } = await import('../../server/api/forms/[id]/submit.post')
const { default: book } = await import('../../server/api/public/[tenantId]/termine/book.post')
const { default: contact } = await import('../../server/api/public/[tenantId]/contact.post')

const OWNER = 'chef@firma.de'
const SECRET = 'good-secret-123'
let ipN = 0
const ip = () => `203.0.113.${(ipN = (ipN + 1) % 250)}`      // jede Anfrage von einer neuen Adresse, die Drossel stört nicht

const submitEv = (body: any, formId = 'f1') => ({ headers: { 'x-forwarded-for': ip() }, params: { id: formId }, query: {}, body: { data: { Email: 'lead@kunde.de', Name: 'Lea' }, ...body } })
const bookEv = (body: any = {}) => ({ headers: { 'x-forwarded-for': ip() }, params: { tenantId: 'T1' }, body: { typeId: 'ty1', date: '2026-12-01', startTime: '10:00', customerName: 'Kai', customerEmail: 'kai@kunde.de', ...body } })
const contactEv = (body: any = {}, tenant = 'T1') => ({ headers: { 'x-forwarded-for': ip() }, params: { tenantId: tenant }, method: 'POST', body: { name: 'Kai K', email: 'kai@kunde.de', message: 'Hallo', ...body } })

function setup({ campaignOn = true, mainOn = true, contactOn = true } = {}) {
  db.settings.set('bot-protection|chef@firma.de', {
    settingId: 'bot-protection', scope: OWNER, enabled: mainOn, siteKey: '0x4AAAAAAAtestKeyForPlexora', mode: 'managed',
    secretEncrypted: encrypt(SECRET), secretMasked: '••••••••-123', contactProtection: contactOn, hostnames: [],
  })
  db.forms = [{ formId: 'f1', userId: OWNER, title: 'Beratung', successMsg: 'Danke' }, { formId: 'f2', userId: OWNER, title: 'Ohne Kampagne' }]
  db.campaigns = [{ userId: OWNER, campaignId: 'c1', formId: 'f1', turnstileEnabled: campaignOn, appointmentTypeId: 'ty1' }]
  db.nexora = [{ tenantId: 'T1', email: OWNER, status: 'active', termineEnabled: true, customDomain: 'www.paeffgen-it.de', companyName: 'Päffgen IT' }]
  db.types = [{ tenantId: 'T1', typeId: 'ty1', name: 'Beratung', active: true, campaignId: 'c1', durationMinutes: 30 },
              { tenantId: 'T1', typeId: 'ty2', name: 'Allgemein', active: true, durationMinutes: 30 }]
}
let encrypt: (s: string) => string
beforeEach(async () => {
  resetDb(); mails.length = 0; sideEffects.length = 0
  ;({ encryptSecret: encrypt } = await import('../../server/utils/crypto'))
  setup()
})
const leads = () => db.writes.filter(w => w === 'plexora-contacts:PutCommand' || w === 'plexora-submissions:PutCommand')
const bookings = () => db.writes.filter(w => w === 'plexora-termine-bookings:PutCommand')

describe('Lead-Formular einer Kampagne', () => {
  it('Schalter AUS: funktioniert ohne Token, Cloudflare wird nicht gefragt', async () => {
    setup({ campaignOn: false })
    expect(await code(submit(submitEv({}) as any))).toBe(200)
    expect(cloudflare.calls).toHaveLength(0); expect(leads().length).toBeGreaterThan(0)
  })
  it('Schalter AN: ohne Token 403 und nichts gespeichert, keine Mail/Funnel', async () => {
    const err: any = await submit(submitEv({}) as any).catch(e => e)
    expect(err.statusCode).toBe(403); expect(err.message).toMatch(/Sicherheitsprüfung/)
    expect(leads()).toHaveLength(0); expect(sideEffects).toHaveLength(0)
  })
  it('Schalter AN: ungültiges Token 403, leeres/zu langes/Nicht-String-Token 403', async () => {
    for (const t of ['garbage', '', '   ', 'x'.repeat(3000), 123, { a: 1 }, null])
      expect(await code(submit(submitEv({ turnstileToken: t }) as any)), String(t).slice(0, 10)).toBe(403)
    expect(leads()).toHaveLength(0)
  })
  it('Schalter AN: gültiges Token → 200, Lead gespeichert; Secret und Token wurden an Cloudflare gesendet', async () => {
    expect(await code(submit(submitEv({ turnstileToken: 'valid-token' }) as any))).toBe(200)
    expect(leads().length).toBeGreaterThan(0)
    expect(cloudflare.calls[0]).toMatchObject({ secret: SECRET, response: 'valid-token' })
    expect(cloudflare.calls[0].remoteip).toMatch(/^203\./)
  })
  it('ohne Token wird Cloudflare gar nicht erst gefragt; abgelehntes Token wird auch bei passendem Hostnamen abgewiesen', async () => {
    expect(await code(submit(submitEv({}) as any))).toBe(403)
    expect(cloudflare.calls).toHaveLength(0)
    cloudflare.respond = () => ({ success: false, hostname: 'app.plexora.eu', 'error-codes': ['timeout-or-duplicate'] })
    expect(await code(submit(submitEv({ turnstileToken: 'replayed' }) as any))).toBe(403)
    expect(leads()).toHaveLength(0)
  })
  it('Token von fremder Seite (Hostname nicht erlaubt) → 403', async () => {
    expect(await code(submit(submitEv({ turnstileToken: 'other-host-token' }) as any))).toBe(403)
    expect(leads()).toHaveLength(0)
  })
  it('Manipulationsversuch: Flags im Request schalten die Prüfung nicht ab', async () => {
    const tricks = { turnstileEnabled: false, botProtection: false, skipTurnstile: true, protected: false, data: { Email: 'a@b.de', turnstileEnabled: false } }
    expect(await code(submit({ ...submitEv({ ...tricks }), query: { turnstileEnabled: 'false', turnstile: '0' } } as any))).toBe(403)
    expect(leads()).toHaveLength(0)
  })
  it('Direktaufruf ohne Kampagne umgeht den Schutz nicht: Formular, das eine geschützte Kampagne nutzt, bleibt geschützt', async () => {
    db.campaigns.push({ userId: OWNER, campaignId: 'c9', formId: 'f1', turnstileEnabled: false })
    expect(await code(submit(submitEv({}, 'f1') as any))).toBe(403)
  })
  it('Formular ohne geschützte Kampagne bleibt frei', async () => {
    expect(await code(submit(submitEv({}, 'f2') as any))).toBe(200)
  })
  it('Hauptschalter AUS: Schutz ruht, Kampagnen-Schalter bleiben gespeichert', async () => {
    setup({ mainOn: false })
    expect(await code(submit(submitEv({}) as any))).toBe(200)
    expect(db.campaigns[0].turnstileEnabled).toBe(true)
  })
  it('Cloudflare nicht erreichbar: geschlossen (503, Hinweis „später erneut“), nichts gespeichert, Vorfall geloggt', async () => {
    cloudflare.down = true
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const err: any = await submit(submitEv({ turnstileToken: 'valid-token' }) as any).catch(e => e)
    expect(err.statusCode).toBe(503); expect(err.message).toMatch(/später erneut/)
    expect(log.mock.calls.flat().join(' ')).toContain('[turnstile] Cloudflare nicht erreichbar'); log.mockRestore()
    expect(leads()).toHaveLength(0)
  })
  it('Fremdmandant: Schutz eines anderen Inhabers wirkt nicht auf dieses Formular', async () => {
    db.forms.push({ formId: 'fx', userId: 'fremd@andere.de', title: 'Fremd' })
    expect(await code(submit(submitEv({}, 'fx') as any))).toBe(200)
  })
  it('Secret taucht in keiner Fehlermeldung auf', async () => {
    const errs = await Promise.all([submit(submitEv({}) as any), submit(submitEv({ turnstileToken: 'bad' }) as any)].map(p => p.catch(e => e)))
    for (const e of errs) { expect(JSON.stringify({ m: e.message })).not.toContain(SECRET) }
  })
})

describe('Terminbuchung einer Kampagne', () => {
  it('Kampagnen-Termin, Schalter AN: ohne Token 403 (keine Buchung, keine Mail), ungültig 403, gültig 200', async () => {
    expect(await code(book(bookEv({ typeId: 'ty1' }) as any))).toBe(403)
    expect(await code(book(bookEv({ typeId: 'ty1', turnstileToken: 'nope' }) as any))).toBe(403)
    expect(bookings()).toHaveLength(0); expect(mails).toHaveLength(0)
    expect(await code(book(bookEv({ typeId: 'ty1', turnstileToken: 'valid-token' }) as any))).toBe(200)
    expect(bookings()).toHaveLength(1); expect(mails).toHaveLength(1)
  })
  it('Schalter AUS: Kampagnen-Termin ohne Token funktioniert', async () => {
    setup({ campaignOn: false })
    expect(await code(book(bookEv({ typeId: 'ty1' }) as any))).toBe(200)
    expect(cloudflare.calls).toHaveLength(0)
  })
  it('allgemeine Terminart (keine Kampagne) bleibt ohne Bot-Schutz', async () => {
    expect(await code(book(bookEv({ typeId: 'ty2' }) as any))).toBe(200)
  })
  it('Token von der Domain des Mandanten (www.paeffgen-it.de) wird akzeptiert', async () => {
    cloudflare.respond = (s, t) => t === 'tok-pit' ? { success: true, hostname: 'www.paeffgen-it.de' } : { success: false, 'error-codes': ['invalid-input-response'] }
    expect(await code(book(bookEv({ typeId: 'ty1', turnstileToken: 'tok-pit' }) as any))).toBe(200)
  })
  it('Manipulationsversuch: Flag im Request hilft nicht', async () => {
    expect(await code(book(bookEv({ typeId: 'ty1', turnstileEnabled: false, campaignId: 'andere', protected: false }) as any))).toBe(403)
  })
})

describe('Kontaktseite (Päffgen IT / Plexora)', () => {
  it('Kontaktseite AUS (Schalter aus): ohne Token 200', async () => {
    setup({ contactOn: false })
    expect(await code(contact(contactEv() as any))).toBe(200)
    expect(cloudflare.calls).toHaveLength(0)
  })
  it('Kontaktseite AN: ohne Token 403, ungültig 403, gültig 200; vor dem Speichern abgewiesen', async () => {
    expect(await code(contact(contactEv() as any))).toBe(403)
    expect(await code(contact(contactEv({ turnstileToken: 'bad' }) as any))).toBe(403)
    expect(leads()).toHaveLength(0)
    expect(await code(contact(contactEv({ turnstileToken: 'valid-token' }) as any))).toBe(200)
    expect(leads()).toHaveLength(1)
  })
  it('Flag im Request hilft nicht', async () => {
    expect(await code(contact(contactEv({ contactProtection: false, turnstileEnabled: false }) as any))).toBe(403)
  })
  it('Kontaktschutz beeinflusst Kampagnen-Schalter nicht und umgekehrt', async () => {
    setup({ contactOn: false, campaignOn: true })
    expect(await code(contact(contactEv() as any))).toBe(200)
    setup({ contactOn: true, campaignOn: false })
    expect(await code(submit(submitEv({}) as any))).toBe(200)
  })
})

describe('Drossel gilt immer – auch mit ausgeschaltetem Bot-Schutz', () => {
  it('6. Anfrage derselben IP in einer Minute: 429 auf Formular, Buchung und Kontakt', async () => {
    setup({ campaignOn: false, contactOn: false })
    const fixed = '198.51.100.7'
    const same = (ev: any) => ({ ...ev, headers: { 'x-forwarded-for': fixed } })
    for (const [name, mk, call] of [
      ['Formular', () => submitEv({}), submit], ['Buchung', () => bookEv({ typeId: 'ty2' }), book], ['Kontakt', () => contactEv(), contact],
    ] as any) {
      for (let i = 0; i < 5; i++) expect(await code(call(same(mk()) as any)), `${name} ${i}`).not.toBe(429)
      expect(await code(call(same(mk()) as any)), name).toBe(429)
    }
  })
})

describe('Geltungsbereich', () => {
  it('Webhooks und angemeldete Routen enthalten keine Bot-Prüfung', () => {
    for (const f of ['server/api/webhooks/stripe.post.ts', 'server/api/webhooks/resend.post.ts', 'server/api/shop/webhook/index.post.ts', 'server/api/team/invite.post.ts'])
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/verifyBotToken/)
  })
})
