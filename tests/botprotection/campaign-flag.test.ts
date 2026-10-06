import { describe, it, expect, vi, beforeEach } from 'vitest'
import { db, fakeDynamo, installGlobals, resetDb, resolveUserIdFake, authEv, code } from './helpers'

vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => fakeDynamo() }))
vi.mock('../../server/utils/tenant', () => ({ resolveUserId: (e: string) => resolveUserIdFake(e) }))
vi.mock('../../server/utils/campaignAppointments', () => ({
  createCampaignAppointmentType: async () => null, defaultCampaignEnd: () => '2027-01-01T00:00:00.000Z', findCampaignAppointmentTypeId: async () => '',
}))
vi.mock('../../server/utils/drafts/context', () => ({ deleteOwnDraftQuietly: async () => {} }))
installGlobals()

const { default: createCampaign } = await import('../../server/api/marketing/index.post')
const { default: patchCampaign } = await import('../../server/api/marketing/[id].patch')
const { default: landing } = await import('../../server/api/marketing/public/[slug].get')
const { default: termine } = await import('../../server/api/public/[tenantId]/termine.get')
const { default: contactInfo } = await import('../../server/api/public/[tenantId]/contact.get')
const { encryptSecret } = await import('../../server/utils/crypto')

const OWNER = 'chef@firma.de'
const SITEKEY = '0x4AAAAAAAtestKeyForPlexora'
const withKeys = (over: any = {}) => db.settings.set('bot-protection|chef@firma.de', {
  settingId: 'bot-protection', scope: OWNER, enabled: true, siteKey: SITEKEY, secretEncrypted: encryptSecret('good-secret-123'), secretMasked: '••••••••-123',
  mode: 'invisible', contactProtection: true, hostnames: [], ...over,
})
beforeEach(() => {
  resetDb()
  db.forms = [{ formId: 'f1', userId: OWNER, title: 'Beratung', fields: [] }]
  db.campaigns = [{ userId: OWNER, campaignId: 'c1', slug: 'beratung', formId: 'f1', name: 'K1', turnstileEnabled: false }]
  db.nexora = [{ tenantId: 'T1', email: OWNER, status: 'active', termineEnabled: true }]
  db.types = [{ tenantId: 'T1', typeId: 'ty1', name: 'Beratung', active: true, campaignId: 'c1' }, { tenantId: 'T1', typeId: 'ty2', name: 'Allgemein', active: true }]
})
const create = (email: string, body: any) => createCampaign(authEv(email, { body: { name: 'Neu', formId: 'f1', appointmentEnabled: false, ...body } }) as any) as Promise<any>
const patch = (email: string, body: any) => patchCampaign(authEv(email, { params: { id: 'c1' }, body: { name: 'K1', formId: 'f1', ...body } }) as any) as Promise<any>

describe('Schalter „Bot-Schutz aktiv“ an der Kampagne', () => {
  it('ohne hinterlegte Schlüssel lässt er sich nicht aktivieren (Anlegen und Ändern): 400 mit Hinweis', async () => {
    const err: any = await create(OWNER, { turnstileEnabled: true }).catch(e => e)
    expect(err.statusCode).toBe(400); expect(err.message).toMatch(/Bot-Schutz/)
    expect(await code(patch(OWNER, { turnstileEnabled: true }))).toBe(400)
    expect(db.campaigns.every(c => !c.turnstileEnabled)).toBe(true)
  })
  it('mit Schlüsseln: aktivieren beim Anlegen und Ändern funktioniert', async () => {
    withKeys()
    expect((await create(OWNER, { turnstileEnabled: true })).campaign.turnstileEnabled).toBe(true)
    await patch(OWNER, { turnstileEnabled: true }); expect(db.campaigns[0].turnstileEnabled).toBe(true)
  })
  it('Anlegen ohne Angabe: aus. Ändern ohne Angabe (z. B. Design-Editor): gespeicherter Wert bleibt', async () => {
    withKeys()
    expect((await create(OWNER, {})).campaign.turnstileEnabled).toBe(false)
    db.campaigns[0].turnstileEnabled = true
    await patch(OWNER, {})
    expect(db.campaigns[0].turnstileEnabled).toBe(true)
    await patch(OWNER, { turnstileEnabled: false })
    expect(db.campaigns[0].turnstileEnabled).toBe(false)
  })
  it('nur der Wert true schaltet ein (kein "true"-String, keine 1)', async () => {
    withKeys()
    for (const v of ['true', 1, {}, [] ]) { await patch(OWNER, { turnstileEnabled: v }); expect(db.campaigns[0].turnstileEnabled).toBe(false) }
  })
  it('Fremdmandant kann die Kampagne nicht ändern; Schlüssel eines anderen Inhabers zählen nicht', async () => {
    withKeys()
    expect(await code(patch('fremd@andere.de', { turnstileEnabled: true }))).toBe(403)
    const err: any = await create('fremd@andere.de', { turnstileEnabled: true }).catch(e => e)
    expect(err.statusCode).toBe(400)
  })
})

describe('Öffentliche Ausgabe: Widget-Daten ohne Secret', () => {
  const widget = async () => ((await landing({ params: { slug: 'beratung' } } as any)) as any)
  it('Kampagne geschützt + Schlüssel: nur Sitekey und Modus, nie das Secret', async () => {
    withKeys(); db.campaigns[0].turnstileEnabled = true
    const res = await widget()
    expect(res.botProtection).toEqual({ siteKey: SITEKEY, mode: 'invisible' })
    const json = JSON.stringify(res)
    expect(json).not.toContain('good-secret-123'); expect(json).not.toContain('secretEncrypted'); expect(json).not.toContain('secretMasked')
  })
  it('Schalter aus oder Hauptschalter aus: kein Widget', async () => {
    withKeys(); expect((await widget()).botProtection).toBeNull()
    db.campaigns[0].turnstileEnabled = true; withKeys({ enabled: false })
    expect((await widget()).botProtection).toBeNull()
  })
  it('Widget erscheint, wenn irgendeine Kampagne dieses Formulars geschützt ist (wie die Prüfung im Server)', async () => {
    withKeys(); db.campaigns.push({ userId: OWNER, campaignId: 'c2', slug: 'zweit', formId: 'f1', turnstileEnabled: true })
    expect((await widget()).botProtection).toMatchObject({ siteKey: SITEKEY })
  })
  it('Terminliste: Widget nur für die angefragte geschützte Kampagnen-Terminart', async () => {
    withKeys(); db.campaigns[0].turnstileEnabled = true
    const q = (type?: string) => termine({ params: { tenantId: 'T1' }, query: type ? { type } : {} } as any) as Promise<any>
    expect((await q('ty1')).botProtection).toEqual({ siteKey: SITEKEY, mode: 'invisible' })
    expect((await q()).botProtection).toBeNull()
    expect((await q('ty2')).botProtection).toBeNull()
    expect(JSON.stringify(await q('ty1'))).not.toContain('good-secret-123')
  })
  it('Kontaktseite: Widget nur bei Kontakt-Schalter und Hauptschalter', async () => {
    const q = () => contactInfo({ params: { tenantId: 'T1' } } as any) as Promise<any>
    withKeys(); expect((await q()).botProtection).toEqual({ siteKey: SITEKEY, mode: 'invisible' })
    withKeys({ contactProtection: false }); expect((await q()).botProtection).toBeNull()
    withKeys({ enabled: false }); expect((await q()).botProtection).toBeNull()
    expect(JSON.stringify(await q())).not.toContain('good-secret-123')
  })
})
