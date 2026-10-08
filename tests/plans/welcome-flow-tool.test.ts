import { describe, it, expect } from 'vitest'
import Stripe from 'stripe'
import { readFileSync } from 'node:fs'
// @ts-expect-error .mjs ohne Typen
import { buildEvent, extractToken, checkWelcomeMail } from '../../scripts/security/welcome-flow-test.mjs'
import { renderWelcomeMail, setPasswordUrl } from '../../server/utils/welcomeMail'

describe('welcome-flow-test.mjs (Werkzeug für den Live-Test)', () => {
  it('das Kaufereignis ist von Stripes Bibliothek mit dem richtigen Secret prüfbar, mit falschem nicht, und ist ein Lizenzkauf', () => {
    const s = new Stripe('sk_test_x'); const payload = buildEvent('test@x.de'); const secret = 'whsec_' + 'a'.repeat(32)
    const header = s.webhooks.generateTestHeaderString({ payload, secret })
    const ev = s.webhooks.constructEvent(payload, header, secret) as any
    expect(ev.type).toBe('checkout.session.completed'); expect(ev.data.object.metadata).toEqual({ type: 'license_purchase', tier: 'starter' }); expect(ev.data.object.customer_details.email).toBe('test@x.de'); expect(ev.livemode).toBe(false)
    expect(() => s.webhooks.constructEvent(payload, header, 'whsec_' + 'b'.repeat(32))).toThrow()
  })
  it('erkennt Link und Token in der echten Willkommensmail; die Mail besteht die Prüfungen', () => {
    const tok = 'A'.repeat(43); const m = renderWelcomeMail({ name: 'Plexora Testkauf', tierLabel: 'Starter', url: setPasswordUrl(tok), minutes: 60 })
    expect(extractToken(m.text)).toBe(tok); expect(extractToken(m.html)).toBe(tok)
    for (const [name, pass] of checkWelcomeMail(m)) expect(pass, name).toBe(true)
  })
  it('GEGENPROBEN: eine Mail mit Start-Passwort, mit Lizenzschlüssel oder ohne Link fällt durch', () => {
    const tok = 'A'.repeat(43); const m = renderWelcomeMail({ name: 'T', tierLabel: 'Starter', url: setPasswordUrl(tok), minutes: 60 })
    const failed = (x: any) => checkWelcomeMail(x).filter(([, p]: any) => !p).map(([n]: any) => n)
    expect(failed({ html: m.html + 'Temp. Passwort: PlxABCD1234!1', text: m.text })).toContain('kein Passwort in der Mail')
    expect(failed({ html: m.html, text: m.text + ' PLXR-1A2B-3C4D-5E6F-7A8B' })).toContain('kein Lizenzschlüssel in der Mail')
    expect(failed({ html: m.html, text: 'kein Link' })).toContain('Link zum Festlegen des Passworts enthalten (Klartext und HTML)')
    expect(extractToken('https://app.plexora.eu/set-password?t=' + tok)).toBe('')       // nur das Fragment (#t=) zählt
  })
  it('gibt weder Token, Passwort noch Schlüssel aus', () => {
    const src = readFileSync('scripts/security/welcome-flow-test.mjs', 'utf8')
    for (const v of ['token', 'password', 'whsec', 'resendKey']) expect(src, v).not.toMatch(new RegExp(`console\\.log\\([^)]*\\$\\{${v}\\}`))
    expect(src).toContain("Werte (Token, Passwort, Schlüssel) werden NIE ausgegeben")
  })
})
