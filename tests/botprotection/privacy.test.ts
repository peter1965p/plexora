import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { TURNSTILE_PRIVACY_TEXT, TURNSTILE_PRIVACY_HEADING, hasTurnstilePrivacy, withTurnstilePrivacy } from '../../shared/turnstilePrivacy'

describe('Datenschutz-Absatz zu Turnstile', () => {
  it('wird angehängt und nur einmal (idempotent), vorhandener Text bleibt unverändert', () => {
    const base = '## 7. Kontaktaufnahme\n\nText.'
    const once = withTurnstilePrivacy(base)
    expect(once.startsWith(base)).toBe(true)
    expect(hasTurnstilePrivacy(once)).toBe(true)
    expect(withTurnstilePrivacy(once)).toBe(once)
    expect(once.split(TURNSTILE_PRIVACY_HEADING)).toHaveLength(2)
  })
  it('nennt Anbieter, Zweck, Rechtsgrundlage und Übermittlung in die USA', () => {
    for (const w of ['Cloudflare', 'Spam', 'Art. 6 Abs. 1 lit. f DSGVO', 'USA', 'IP-Adresse'])
      expect(TURNSTILE_PRIVACY_TEXT).toContain(w)
  })
  it('der Standardtext der Datenschutzerklärung enthält den Absatz vor dem Abschnitt Cookies', () => {
    const src = readFileSync('server/api/settings/datenschutz.get.ts', 'utf8')
    expect(src).toContain("DEFAULT_CONTENT.replace('## 8. Cookies'")
    expect(src).toContain('TURNSTILE_PRIVACY_TEXT')
  })
})
