import { describe, it, expect, vi, beforeEach } from 'vitest'
import { db, fakeDynamo, installGlobals, resetDb, code } from '../botprotection/helpers'
import { parseAutoQuote, autoQuoteValidUntil, addDays, todayIso } from '../../shared/quotes'

const created: any[] = []
const notes: any[] = []
let failCreate = false
vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => fakeDynamo() }))
vi.mock('../../server/utils/tenant', () => ({ resolveUserId: async (e: string) => e }))
vi.mock('../../server/utils/automations', () => ({ fireAutomations: () => {} }))
vi.mock('../../server/utils/sequences', () => ({ startSequences: async () => {} }))
vi.mock('../../server/utils/campaignAppointments', () => ({ findCampaignAppointmentTypeId: async () => '' }))
vi.mock('../../server/utils/quoteStore', () => ({ createDraftQuote: async (t: string, input: any, extra: any) => { if (failCreate) throw new Error('boom'); const q = { number: 'AN-2026-001', ...input, ...extra, tenant: t }; created.push(q); return q } }))
vi.mock('../../server/utils/notifications', () => ({ notifySystem: async (n: any) => { notes.push(n) } }))
installGlobals()
const { default: submit } = await import('../../server/api/forms/[id]/submit.post')
const ev = (id: string, data: any) => ({ headers: { 'x-forwarded-for': '198.51.100.21' }, params: { id }, query: {}, body: { data } })
const AQ = { enabled: true, description: 'Website-Paket', price: 450, validDays: 14, title: 'Aktion' }
beforeEach(() => { resetDb(); created.length = 0; notes.length = 0; failCreate = false; db.forms = [{ formId: 'f1', title: 'Aktion', userId: 'chef@firma.de' }] })

describe('parseAutoQuote / Gültigkeit', () => {
  it('ohne Beschreibung, ohne Preis oder nicht ausdrücklich true ist die Automatik aus', () => {
    expect(parseAutoQuote({ enabled: true, price: 450 }).enabled).toBe(false)
    expect(parseAutoQuote({ enabled: true, description: 'x', price: 'abc' }).enabled).toBe(false)
    expect(parseAutoQuote({ enabled: 'true', description: 'x', price: 1 }).enabled).toBe(false)
    expect(parseAutoQuote(undefined).enabled).toBe(false)
    expect(parseAutoQuote(AQ).enabled).toBe(true)
  })
  it('Tage werden auf 1 bis 90 begrenzt, Preis gerundet', () => {
    expect(parseAutoQuote({ ...AQ, validDays: 9999 }).validDays).toBe(90)
    expect(parseAutoQuote({ ...AQ, validDays: -5 }).validDays).toBe(1)
    expect(parseAutoQuote({ ...AQ, price: 449.999 }).price).toBe(450)
  })
  it('Gültig bis endet nie nach dem Aktionsende und nie in der Vergangenheit', () => {
    const t = todayIso()
    expect(autoQuoteValidUntil(parseAutoQuote(AQ))).toBe(addDays(t, 14))
    expect(autoQuoteValidUntil(parseAutoQuote({ ...AQ, promoUntil: addDays(t, 5) }))).toBe(addDays(t, 5))
    expect(autoQuoteValidUntil(parseAutoQuote({ ...AQ, promoUntil: addDays(t, -3) }))).toBe(addDays(t, 14))
    expect(autoQuoteValidUntil(parseAutoQuote({ ...AQ, promoUntil: addDays(t, 60) }))).toBe(addDays(t, 14))
  })
})

describe('Anfrage über das Formular legt einen Entwurf an', () => {
  it('mit aktiver Kampagnen-Automatik: ein Entwurf für den Besitzer, Benachrichtigung', async () => {
    db.campaigns = [{ userId: 'chef@firma.de', campaignId: 'c1', formId: 'f1', autoQuote: AQ }]
    expect(await code(submit(ev('f1', { Vorname: 'Anna', Nachname: 'Muster', Email: 'anna@kunde.de' }) as any))).toBe(200)
    expect(created).toHaveLength(1)
    expect(created[0]).toMatchObject({ tenant: 'chef@firma.de', client: 'Anna Muster', clientEmail: 'anna@kunde.de', source: 'campaign' })
    expect(created[0].items).toEqual([{ description: 'Website-Paket', qty: 1, price: 450 }])
    expect(notes).toHaveLength(1)
  })
  it('ohne Automatik, ohne E-Mail oder bei Kampagne eines anderen Formulars: kein Angebot', async () => {
    db.campaigns = [{ userId: 'chef@firma.de', campaignId: 'c1', formId: 'f1', autoQuote: { ...AQ, enabled: false } }]
    await submit(ev('f1', { Email: 'a@b.de' }) as any)
    db.campaigns = [{ userId: 'chef@firma.de', campaignId: 'c1', formId: 'f1', autoQuote: AQ }]
    await submit(ev('f1', { Name: 'Nur Name' }) as any)
    db.campaigns = [{ userId: 'chef@firma.de', campaignId: 'c2', formId: 'andere', autoQuote: AQ }]
    await submit(ev('f1', { Email: 'a@b.de' }) as any)
    expect(created).toHaveLength(0)
  })
  it('scheitert die Anlage, bleibt der Lead trotzdem erhalten (200, Kontakt gespeichert)', async () => {
    db.campaigns = [{ userId: 'chef@firma.de', campaignId: 'c1', formId: 'f1', autoQuote: AQ }]
    failCreate = true
    expect(await code(submit(ev('f1', { Email: 'a@b.de' }) as any))).toBe(200)
    expect(db.writes).toContain('plexora-contacts:PutCommand')
  })
})
