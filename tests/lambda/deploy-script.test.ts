import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const sh = readFileSync('scripts/aws/deploy-pre-signup.sh', 'utf8')
const cfg = JSON.parse(readFileSync('lambdas/pre-signup/lambda.json', 'utf8'))
const code = readFileSync('lambdas/pre-signup/index.mjs', 'utf8')

describe('Deploy-Skript plexora-pre-signup', () => {
  it('Standard ist der Probelauf; nur --apply und --rollback ändern etwas', () => {
    expect(sh).toContain('MODE="--dry-run"'); const body = sh.slice(sh.indexOf('case "$MODE" in')); const dry = body.slice(body.indexOf('--dry-run)'), body.indexOf('--apply)'))
    expect(dry).not.toMatch(/update-function-code|update-function-configuration|publish-version|create-alias|update-alias|invoke/); expect(dry).toContain('(Probelauf: nichts geändert)')
  })
  it('--apply: erst Tests, Ausgangsstand als Version sichern, dann ausliefern, Smoke-Test, erst danach die Aliase; bei Fehlschlag automatischer Rückweg', () => {
    const body = sh.slice(sh.indexOf('case "$MODE" in')); const a = body.slice(body.indexOf('--apply)'), body.indexOf('--rollback)'))
    const order = ['npx vitest run tests/lambda', 'publish-version', 'update-function-code', 'smoke "$NEW"', 'update-alias']
    let last = -1; for (const t of order) { const i = a.indexOf(t); expect(i, t).toBeGreaterThan(last); last = i }
    expect(a).toContain('exec "$0" --rollback')
  })
  it('--rollback spielt den Code der Version "previous" ein und tauscht die Aliase', () => {
    const r = sh.slice(sh.indexOf('case "$MODE" in')); const rb = r.slice(r.indexOf('--rollback)')); for (const t of ['alias_ver $PREV', 'update-function-code', '--publish', 'update-alias']) expect(rb, t).toContain(t)
  })
  it('Smoke-Test nutzt nur Ereignisse ohne Nebenwirkung und erwartet: native Registrierung unverändert, Google ohne bestätigte Adresse abgelehnt', () => {
    expect(sh).toContain('"triggerSource":"PreSignUp_SignUp"'); expect(sh).toContain('"email_verified":"false"'); expect(sh).toContain('"$r1" == "None" && "$r2" == "Unhandled"')
  })
  it('--policy erlaubt nur die drei Werte; es gibt keine Geheimnisse im Skript, kein Löschen von Funktion oder Aliasen', () => {
    expect(sh).toContain('^(separate|reject|delete)$'); expect(sh).not.toMatch(/delete-function|delete-alias|SECRET|PASSWORD|aws iam|put-role-policy/i)
  })
})
describe('Konfiguration und Code im Repo', () => {
  it('lambda.json passt zum Code: Standard der Regel und erlaubte Werte', () => {
    expect(cfg.unconfirmedNativePolicy.standard).toBe('separate'); expect(new Set(cfg.unconfirmedNativePolicy.erlaubt)).toEqual(new Set(['separate', 'reject', 'delete']))
    expect(code).toContain("const POLICIES = new Set(['separate', 'reject', 'delete'])"); expect(code).toContain(": 'separate'")
    expect(cfg.handler).toBe('index.handler'); expect(code).toContain('export const handler')
  })
  it('der Code liest keine Geheimnisse und ruft nur Cognito', () => {
    expect(code).not.toMatch(/fetch\(|process\.env\.(?!UNCONFIRMED_NATIVE_POLICY)|eval\(|child_process/)
  })
})
