import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const page = readFileSync('app/pages/set-password.vue', 'utf8')
describe('Seite /set-password', () => {
  it('liest das Token aus dem Fragment (nicht aus der Query), erwartet genau 43 Zeichen und entfernt es sofort aus der Adresszeile', () => {
    expect(page).toContain('window.location.hash'); expect(page).not.toMatch(/route\.query|useRoute/)
    expect(page).toContain('[A-Za-z0-9_-]{43}'); expect(page).toContain('history.replaceState')
  })
  it('sendet Token und Passwort per POST im Body, nie in der Adresse', () => {
    expect(page).toMatch(/\/api\/auth\/set-password'\), \{ method: 'POST', body: \{ token: token\.value, password: password\.value \} \}\)/)
    expect(page).not.toMatch(/set-password\?|\?token=/)
  })
  it('prüft mit denselben Regeln wie der Server und verlangt die Wiederholung', () => {
    expect(page).toContain("~~/shared/passwordRules"); expect(page).toContain('Die beiden Passwörter stimmen nicht überein')
  })
  it('bei abgelaufenem/verbrauchtem Link gibt es "Neuen Link anfordern"; die Antwort wird nicht ausgewertet (kein Konto-Orakel)', () => {
    expect(page).toContain('Neuen Link anfordern'); expect(page).toContain("/api/auth/request-set-password")
    expect(page).toMatch(/LINK_INVALID' \|\| code === 'ALREADY_SET'/)
  })
  it('das Passwort wird nach dem Erfolg aus dem Speicher der Seite entfernt', () => { expect(page).toMatch(/password\.value = ''; confirm\.value = ''; token\.value = ''; done\.value = true/) })
})
