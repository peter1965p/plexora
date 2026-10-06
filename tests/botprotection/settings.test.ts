import { describe, it, expect, vi, beforeEach } from 'vitest'
import { db, cloudflare, fakeDynamo, installGlobals, resetDb, resolveUserIdFake, authEv, code } from './helpers'

vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => fakeDynamo() }))
vi.mock('../../server/utils/tenant', () => ({ resolveUserId: (e: string) => resolveUserIdFake(e) }))
installGlobals()

const { default: getSettings } = await import('../../server/api/settings/bot-protection.get')
const { default: postSettings } = await import('../../server/api/settings/bot-protection.post')

const SITEKEY = '0x4AAAAAAAtestKeyForPlexora'
const OWNER = 'chef@firma.de'
const save = (email: string, body: any, groups?: string[]) => postSettings(authEv(email, { body }, groups) as any) as Promise<any>
beforeEach(() => resetDb())

describe('Bot-Schutz-Einstellungen: Speichern', () => {
  it('speichert Sitekey + Secret verschlüsselt, antwortet nur maskiert', async () => {
    const res = await save(OWNER, { siteKey: SITEKEY, secret: 'good-secret-123', mode: 'invisible', enabled: true })
    expect(res).toMatchObject({ ok: true, enabled: true, siteKey: SITEKEY, secretConfigured: true, secretMasked: '••••••••-123', mode: 'invisible' })
    const stored = db.settings.get('bot-protection|chef@firma.de')
    expect(stored.secretEncrypted).toBeTruthy()
    expect(JSON.stringify(stored)).not.toContain('good-secret-123')
    expect(JSON.stringify(res)).not.toContain('good-secret-123')
    expect(JSON.stringify(res)).not.toContain(stored.secretEncrypted)
  })
  it('GET liefert nie das Secret – weder Klartext noch verschlüsselt', async () => {
    await save(OWNER, { siteKey: SITEKEY, secret: 'good-secret-123' })
    const res: any = await getSettings(authEv(OWNER) as any)
    expect(res).toMatchObject({ siteKey: SITEKEY, secretConfigured: true, secretMasked: '••••••••-123' })
    const json = JSON.stringify(res)
    expect(json).not.toContain('good-secret-123'); expect(json).not.toContain('secretEncrypted')
    expect(json).not.toContain(db.settings.get('bot-protection|chef@firma.de').secretEncrypted)
  })
  it('falsches Secret wird von Cloudflare abgelehnt und nicht gespeichert', async () => {
    expect(await code(save(OWNER, { siteKey: SITEKEY, secret: 'wrong-secret-xyz' }))).toBe(400)
    expect(db.settings.size).toBe(0)
  })
  it('Cloudflare nicht erreichbar: 503 mit Hinweis, nichts gespeichert', async () => {
    cloudflare.down = true
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const err: any = await save(OWNER, { siteKey: SITEKEY, secret: 'good-secret-123' }).catch(e => e)
    expect(err.statusCode).toBe(503); expect(err.message).toMatch(/später/)
    expect(log).toHaveBeenCalled(); log.mockRestore()
    expect(db.settings.size).toBe(0)
  })
  it('ungültiger Sitekey / Modus / Domain: 400', async () => {
    expect(await code(save(OWNER, { siteKey: 'abc' }))).toBe(400)
    expect(await code(save(OWNER, { mode: 'evil' }))).toBe(400)
    expect(await code(save(OWNER, { hostnames: ['not a host'] }))).toBe(400)
  })
  it('Einschalten (Hauptschalter oder Kontaktseite) geht nur mit Schlüsseln', async () => {
    expect(await code(save(OWNER, { enabled: true }))).toBe(400)
    expect(await code(save(OWNER, { contactProtection: true }))).toBe(400)
    await save(OWNER, { siteKey: SITEKEY, secret: 'good-secret-123' })
    expect(await code(save(OWNER, { enabled: true, contactProtection: true }))).toBe(200)
  })
  it('leeres Secret im Formular lässt das gespeicherte Secret unverändert (Maske wird nicht zurückgeschickt)', async () => {
    await save(OWNER, { siteKey: SITEKEY, secret: 'good-secret-123' })
    const before = db.settings.get('bot-protection|chef@firma.de').secretEncrypted
    await save(OWNER, { siteKey: SITEKEY, secret: '', mode: 'invisible' })
    expect(db.settings.get('bot-protection|chef@firma.de').secretEncrypted).toBe(before)
  })
  it('Entfernen der Schlüssel wird gesperrt, solange Kampagne oder Kontaktseite den Schutz nutzt', async () => {
    await save(OWNER, { siteKey: SITEKEY, secret: 'good-secret-123', enabled: true, contactProtection: true })
    expect(await code(save(OWNER, { remove: true }))).toBe(409)
    await save(OWNER, { contactProtection: false })
    db.campaigns.push({ userId: OWNER, campaignId: 'c1', turnstileEnabled: true })
    expect(await code(save(OWNER, { remove: true }))).toBe(409)
    db.campaigns = []
    expect(await code(save(OWNER, { remove: true }))).toBe(200)
    expect(db.settings.get('bot-protection|chef@firma.de').secretEncrypted).toBe('')
  })
})

describe('Bot-Schutz-Einstellungen: Zugriff', () => {
  it('ohne Anmeldung 401', async () => {
    expect(await code(postSettings({ headers: {}, context: {}, body: {} } as any))).toBe(401)
    expect(await code(getSettings({ headers: {}, context: {} } as any))).toBe(401)
  })
  it('Demo-Konto: 403 und es wird nichts gespeichert', async () => {
    expect(await code(save('demo@plexora.eu', { siteKey: SITEKEY, secret: 'good-secret-123' }))).toBe(403)
    expect(await code(save('x@y.de', { siteKey: SITEKEY }, ['demo']))).toBe(403)
    expect(db.settings.size).toBe(0); expect(cloudflare.calls).toHaveLength(0)
  })
  it('Team-Mitglied darf lesen, aber nicht ändern', async () => {
    await save(OWNER, { siteKey: SITEKEY, secret: 'good-secret-123' })
    expect(((await getSettings(authEv('maria@firma.de') as any)) as any).siteKey).toBe(SITEKEY)
    expect(await code(save('maria@firma.de', { enabled: true }))).toBe(403)
  })
  it('Fremdmandant sieht die Einstellungen nicht und ändert sie nicht', async () => {
    await save(OWNER, { siteKey: SITEKEY, secret: 'good-secret-123', enabled: true })
    const other: any = await getSettings(authEv('fremd@andere.de') as any)
    expect(other).toMatchObject({ siteKey: '', secretConfigured: false, enabled: false })
    await save('fremd@andere.de', { siteKey: '1x00000000000000000000AA', secret: 'good-secret-123' })
    expect(db.settings.get('bot-protection|chef@firma.de').siteKey).toBe(SITEKEY)       // unverändert
    expect(db.settings.get('bot-protection|fremd@andere.de').siteKey).toBe('1x00000000000000000000AA')
  })
  it('Mandanten-Kennung im Request-Body wird ignoriert (Besitzer kommt nur aus dem Token)', async () => {
    await save('fremd@andere.de', { scope: OWNER, userId: OWNER, siteKey: SITEKEY, secret: 'good-secret-123' })
    expect(db.settings.has('bot-protection|chef@firma.de')).toBe(false)
  })
})
