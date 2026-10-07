import { describe, it, expect, vi, beforeEach } from 'vitest'
import { pool, resetPool, addUser, handleSend, googleEvent } from './fakePool.mjs'

vi.mock('@aws-sdk/client-cognito-identity-provider', () => {
  const cmd = (name: string) => ({ [name]: class { input: any; constructor(i: any) { this.input = i } } })
  return { CognitoIdentityProviderClient: class { send = (c: any) => handleSend(c) }, ...cmd('ListUsersCommand'), ...cmd('AdminLinkProviderForUserCommand'), ...cmd('AdminUpdateUserAttributesCommand'), ...cmd('AdminDeleteUserCommand') }
})
const legacy: any = await import('./presignup-legacy.mjs')
beforeEach(() => resetPool())

describe('Beleg für den Angriff "Vorab-Registrierung" gegen den BISHERIGEN Trigger (Stand live vor der Korrektur)', () => {
  it('der Angreifer legt nativ ein UNBESTÄTIGTES Konto mit der Adresse des Opfers an (mit eigenem Passwort); meldet sich das Opfer erstmals mit Google an, wird seine Identität damit verknüpft', async () => {
    addUser({ Username: 'angreifer-konto', UserStatus: 'UNCONFIRMED', attrs: { email: 'opfer@firma.de', email_verified: 'false' } })
    const res = await legacy.handler(googleEvent('opfer@firma.de'))
    expect(pool.links).toHaveLength(1)                                        // verknüpft mit dem Konto des Angreifers
    expect(pool.links[0].DestinationUser.ProviderAttributeValue).toBe('angreifer-konto')
    expect(res.response.autoConfirmUser).toBe(true)
  })
  it('und Google-Anmeldungen mit NICHT bestätigter Adresse werden nicht abgelehnt, sondern laufen durch (der bisherige Trigger wirft nie)', async () => {
    await expect(legacy.handler(googleEvent('irgendwer@firma.de', { email_verified: 'false' }))).resolves.toBeTruthy()
    await expect(legacy.handler(googleEvent('irgendwer@firma.de', { email_verified: 'false' }))).resolves.not.toHaveProperty('response.autoConfirmUser', false)
  })
})
