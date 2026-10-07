import { describe, it, expect, vi, beforeEach } from 'vitest'
import { pool, resetPool, addUser, handleSend, googleEvent, nativeEvent } from './fakePool.mjs'

vi.mock('@aws-sdk/client-cognito-identity-provider', () => {
  const cmd = (name: string) => ({ [name]: class { input: any; constructor(i: any) { this.input = i } } })
  return { CognitoIdentityProviderClient: class { send = (c: any) => handleSend(c) }, ...cmd('ListUsersCommand'), ...cmd('AdminLinkProviderForUserCommand'), ...cmd('AdminUpdateUserAttributesCommand'), ...cmd('AdminDeleteUserCommand') }
})
const { createHandler } = await import('../../lambdas/pre-signup/index.mjs')
const legacy: any = await import('./presignup-legacy.mjs')
const quiet = { log() {}, warn() {}, error() {} }
const mk = (policy?: string) => createHandler({ send: handleSend } as any, { policy, log: quiet })
beforeEach(() => resetPool())
const victim = 'opfer@firma.de'

describe('Angriff "Vorab-Registrierung": der Test, der gegen den alten Trigger rot ist und gegen den neuen grün', () => {
  const setup = () => addUser({ Username: 'angreifer-konto', UserStatus: 'UNCONFIRMED', attrs: { email: victim, email_verified: 'false' } })
  it('ALT: verknüpft das Opfer mit dem Konto des Angreifers', async () => { setup(); await legacy.handler(googleEvent(victim)); expect(pool.links.map(l => l.DestinationUser.ProviderAttributeValue)).toEqual(['angreifer-konto']) })
  it('NEU (alle drei Regeln): keine Verknüpfung mit dem unbestätigten Konto', async () => {
    for (const policy of ['separate', 'reject', 'delete']) { resetPool(); setup(); await mk(policy)(googleEvent(victim)).catch(() => {}); expect(pool.links, policy).toEqual([]) }
  })
  it('separate (Standard): Google-Konto läuft separat weiter, das unbestätigte Konto bleibt unberührt und unbenutzbar', async () => {
    setup(); const r: any = await mk('separate')(googleEvent(victim)); expect(r.response).toMatchObject({ autoConfirmUser: true, autoVerifyEmail: true }); expect(pool.deleted).toEqual([]); expect(pool.users).toHaveLength(1)
  })
  it('reject: Anmeldung wird mit Hinweis abgelehnt, nichts verändert', async () => {
    setup(); await expect(mk('reject')(googleEvent(victim))).rejects.toThrow(/unbestätigte Registrierung/); expect(pool.deleted).toEqual([]); expect(pool.links).toEqual([])
  })
  it('delete: das unbestätigte Konto wird entfernt, es wird NICHT verknüpft, das Google-Konto entsteht neu', async () => {
    setup(); const r: any = await mk('delete')(googleEvent(victim)); expect(pool.deleted).toEqual(['angreifer-konto']); expect(pool.links).toEqual([]); expect(r.response.autoConfirmUser).toBe(true)
  })
  it('delete löscht nie ein bestätigtes Konto und nie ein föderiertes', async () => {
    addUser({ Username: 'echtes-konto', UserStatus: 'CONFIRMED', attrs: { email: victim, email_verified: 'true' } }); addUser({ Username: 'Google_999', UserStatus: 'EXTERNAL_PROVIDER', attrs: { email: victim, email_verified: 'true' } })
    await mk('delete')(googleEvent(victim)); expect(pool.deleted).toEqual([])
  })
  it('delete bei gemischtem Bestand: nur das UNBESTÄTIGTE Konto verschwindet, das bestätigte bleibt und wird verknüpft', async () => {
    addUser({ Username: 'angreifer-konto', UserStatus: 'UNCONFIRMED', attrs: { email: victim, email_verified: 'false' } }); addUser({ Username: 'echtes-konto', UserStatus: 'CONFIRMED', attrs: { email: victim, email_verified: 'true' } })
    await mk('delete')(googleEvent(victim)); expect(pool.deleted).toEqual(['angreifer-konto']); expect(pool.users.map(u => u.Username)).toEqual(['echtes-konto']); expect(pool.links.map(l => l.DestinationUser.ProviderAttributeValue)).toEqual(['echtes-konto'])
  })
  it('gemischter Bestand mit "separate": das bestätigte Konto wird verknüpft, das unbestätigte nie berührt', async () => {
    addUser({ Username: 'angreifer-konto', UserStatus: 'UNCONFIRMED', attrs: { email: victim, email_verified: 'false' } }); addUser({ Username: 'echtes-konto', UserStatus: 'CONFIRMED', attrs: { email: victim, email_verified: 'true' } })
    await mk('separate')(googleEvent(victim)); expect(pool.deleted).toEqual([]); expect(pool.links.map(l => l.DestinationUser.ProviderAttributeValue)).toEqual(['echtes-konto'])
  })
  it('eine unbekannte Einstellung fällt auf den sicheren Standard zurück', async () => { setup(); await mk('irgendwas')(googleEvent(victim)); expect(pool.links).toEqual([]); expect(pool.deleted).toEqual([]) })
})

describe('Google-Login nur mit bestätigter Adresse', () => {
  it('nicht bestätigt (false, fehlt, Text), leer oder mit Sonderzeichen: abgelehnt, nichts passiert', async () => {
    for (const bad of [{ email_verified: 'false' }, { email_verified: false }, { email_verified: undefined }, { email_verified: 'yes' }, { email: '' }, { email: 'a"b@x.de' }, { email: 'a\\b@x.de' }, { email: 'a b@x.de' }, { email: 'x@y' }, { email: '"; email = "x' }]) {
      await expect(mk()(googleEvent('opfer@firma.de', bad as any)), JSON.stringify(bad)).rejects.toThrow()
    }
    expect(pool.links).toEqual([]); expect(pool.deleted).toEqual([])
  })
  it('bestätigt (String oder Boolean): wird angenommen', async () => { for (const v of ['true', true]) await expect(mk()(googleEvent('ok@firma.de', { email_verified: v as any }))).resolves.toBeTruthy() })
})

describe('Verknüpfung nur mit bestätigtem nativem Konto', () => {
  it('bestätigtes Konto (CONFIRMED, E-Mail bestätigt): wird verknüpft, Bild übernommen, Google-User-ID korrekt', async () => {
    addUser({ Username: 'echtes-konto', UserStatus: 'CONFIRMED', attrs: { email: victim, email_verified: 'true' } })
    const r: any = await mk()(googleEvent(victim)); expect(pool.links).toHaveLength(1)
    expect(pool.links[0]).toMatchObject({ DestinationUser: { ProviderName: 'Cognito', ProviderAttributeValue: 'echtes-konto' }, SourceUser: { ProviderName: 'Google', ProviderAttributeName: 'Cognito_Subject', ProviderAttributeValue: '1234567890' } })
    expect(pool.updated[0].UserAttributes).toEqual([{ Name: 'picture', Value: 'https://pic.example/p.png' }]); expect(r.response.autoConfirmUser).toBe(true)
  })
  it('von uns angelegtes Konto nach einem Kauf (FORCE_CHANGE_PASSWORD, E-Mail bestätigt) wird verknüpft – sonst bekäme der Kunde einen leeren Zweitmandanten ohne seine Lizenz', async () => {
    addUser({ Username: 'kunde_x', UserStatus: 'FORCE_CHANGE_PASSWORD', attrs: { email: victim, email_verified: 'true' } }); await mk()(googleEvent(victim)); expect(pool.links.map(l => l.DestinationUser.ProviderAttributeValue)).toEqual(['kunde_x'])
  })
  it('nicht verknüpft werden: unbestätigte Adresse trotz Status CONFIRMED, deaktivierte Konten, föderierte Konten, mehrdeutige Treffer', async () => {
    for (const setup of [() => addUser({ Username: 'a', UserStatus: 'CONFIRMED', attrs: { email: victim, email_verified: 'false' } }), () => addUser({ Username: 'a', UserStatus: 'CONFIRMED', Enabled: false, attrs: { email: victim, email_verified: 'true' } }),
      () => addUser({ Username: 'Google_5', UserStatus: 'EXTERNAL_PROVIDER', attrs: { email: victim, email_verified: 'true' } }), () => { addUser({ Username: 'a', UserStatus: 'CONFIRMED', attrs: { email: victim, email_verified: 'true' } }); addUser({ Username: 'b', UserStatus: 'CONFIRMED', attrs: { email: victim, email_verified: 'true' } }) }]) {
      resetPool(); setup(); await mk()(googleEvent(victim)); expect(pool.links).toEqual([])
    }
  })
  it('Fehler bei der Suche führt nie zu einer Verknüpfung; der Login läuft als eigenes Konto weiter', async () => {
    addUser({ Username: 'echtes-konto', UserStatus: 'CONFIRMED', attrs: { email: victim, email_verified: 'true' } }); pool.failList = true
    const r: any = await mk()(googleEvent(victim)); expect(pool.links).toEqual([]); expect(r.response.autoConfirmUser).toBe(true)
  })
  it('native Registrierung bleibt unverändert (keine Auto-Bestätigung), andere Auslöser ebenfalls', async () => {
    const e: any = await mk()(nativeEvent('x@firma.de')); expect(e.response).toEqual({}); expect(pool.links).toEqual([])
    const o: any = await mk()({ ...googleEvent(victim), triggerSource: 'PreSignUp_AdminCreateUser' }); expect(o.response).toEqual({})
  })
})
