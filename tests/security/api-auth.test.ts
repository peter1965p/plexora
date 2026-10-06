import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { shouldAttachAuth, shouldRedirectToLogin } from '../../app/utils/apiAuth'

const API = 'https://7hrkm580pb.execute-api.eu-central-1.amazonaws.com'
describe('Zentrale Token-Regel im Frontend', () => {
  it('eigene API ohne Header: Token wird angehängt', () => {
    expect(shouldAttachAuth(`${API}/api/contacts`, API, undefined)).toBe(true)
    expect(shouldAttachAuth(`${API}/api/contacts`, API, {})).toBe(true)
    expect(shouldAttachAuth(`${API}/api/contacts`, API, new Headers({ 'x-foo': '1' }))).toBe(true)
  })
  it('vorhandener Authorization-Header (jede Schreibweise) bleibt unangetastet', () => {
    expect(shouldAttachAuth(`${API}/api/x`, API, { Authorization: 'Bearer a' })).toBe(false)
    expect(shouldAttachAuth(`${API}/api/x`, API, { authorization: 'Bearer a' })).toBe(false)
    expect(shouldAttachAuth(`${API}/api/x`, API, new Headers({ Authorization: 'Bearer a' }))).toBe(false)
    expect(shouldAttachAuth(`${API}/api/x`, API, [['AUTHORIZATION', 'Bearer a']])).toBe(false)
  })
  it('fremde Hosts bekommen nie ein Token', () => {
    for (const u of ['https://api.stripe.com/v1/x', 'https://challenges.cloudflare.com/turnstile/v0/siteverify', 'https://evil.example/api/x', `${API}.evil.example/api/x`.replace(API, 'https://x'), '']) expect(shouldAttachAuth(u, API, undefined), u).toBe(false)
  })
  it('das Plugin ist eingebunden und nutzt die Regel', () => {
    const src = readFileSync('app/plugins/api-auth.client.ts', 'utf8')
    expect(src).toContain('shouldAttachAuth')
    expect(src).toContain("headers.set('Authorization'")
  })
  it('abgelaufene Sitzung (401 "Anmeldung erforderlich" trotz gesendetem Token) führt zum Login, andere Fälle nicht', () => {
    expect(shouldRedirectToLogin(401, 'Anmeldung erforderlich', true, '/dashboard')).toBe(true)
    expect(shouldRedirectToLogin(401, 'Anmeldung erforderlich', false, '/dashboard')).toBe(false)   // kein Token gesendet (öffentliche Seite)
    expect(shouldRedirectToLogin(401, 'Falsches Passwort', true, '/dashboard')).toBe(false)
    expect(shouldRedirectToLogin(403, 'Anmeldung erforderlich', true, '/dashboard')).toBe(false)
    expect(shouldRedirectToLogin(401, 'Anmeldung erforderlich', true, '/login')).toBe(false)        // keine Schleife
    expect(shouldRedirectToLogin(401, 'Anmeldung erforderlich', true, '/auth/callback')).toBe(false)
  })
})
