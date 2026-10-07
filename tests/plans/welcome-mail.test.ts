import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { renderWelcomeMail, renderNewLinkMail, renderPasswordSetMail, setPasswordUrl } from '../../server/utils/welcomeMail'
import { logPreview } from '../../shared/logMask'

describe('Mails rund um das erste Passwort', () => {
  const url = setPasswordUrl('A'.repeat(43))
  it('Link im Fragment auf app.plexora.eu, im HTML und im Klartext; nie ein Passwort', () => {
    expect(url).toBe('https://app.plexora.eu/set-password#t=' + 'A'.repeat(43))
    for (const m of [renderWelcomeMail({ name: 'Max Muster', tierLabel: 'Pro', url, minutes: 60 }), renderNewLinkMail({ url, minutes: 60 })]) {
      expect(m.html).toContain(url); expect(m.text).toContain(url); expect(m.html + m.text).not.toMatch(/passwort:|temp\./i); expect(m.text).toContain('Sicherheitshinweis')
    }
    const set = renderPasswordSetMail(); expect(set.html + set.text).not.toContain('set-password'); expect(set.subject).toMatch(/festgelegt/)
  })
  it('Willkommen: nur der Vorname, 60 Minuten, einmalig, Hinweis auf den Lizenzschlüssel in der App (nicht in der Mail)', () => {
    const m = renderWelcomeMail({ name: 'Max Muster', tierLabel: 'Pro', url, minutes: 60 })
    expect(m.text).toContain('Hallo Max, vielen Dank für deinen Kauf von Plexora Pro'); expect(m.text).not.toContain('Muster'); expect(m.text).toMatch(/60 Minuten.*nur einmal/); expect(m.text).toContain('Einstellungen → Lizenzen')
  })
  it('alles wird maskiert (Name, Tarif, Adressen); Anführungszeichen in der URL können kein Attribut verlassen', () => {
    const m = renderWelcomeMail({ name: '"><script>alert(1)</script>', tierLabel: '<i>Pro</i>', url: 'https://x"onmouseover="alert(1)', minutes: 60 })
    expect(m.html).not.toContain('<script'); expect(m.html).not.toContain('<i>'); expect(m.html).not.toContain('"onmouseover="')
  })
  it('Protokoll: Art "welcome" hat nie eine Vorschau (steht Link/Token drin), wie Einladungen', () => {
    expect(logPreview('welcome', url + ' Hallo')).toBe(''); expect(logPreview('booking_confirmation', 'Hallo Welt')).toBe('Hallo Welt')
  })
})

describe('Skript für das AWS-Recht', () => {
  const sh = readFileSync('scripts/aws/grant-set-password-right.sh', 'utf8')
  it('erlaubt genau eine Aktion auf genau den User Pool, nie "*"; Probelauf ist Standard und ändert nichts', () => {
    expect(sh).toContain('"Action":"cognito-idp:AdminSetUserPassword"'); expect(sh).toMatch(/"Resource":"arn:aws:cognito-idp:\$REGION:\$ACCOUNT:userpool\/\$POOL"/); expect(sh).not.toMatch(/"Resource":"\*"/); expect(sh).toContain('MODE="${1:---dry-run}"')
    expect(sh).toContain('role plexora-lambda-role'.replace('role ', '')); expect(sh).toContain('ABBRUCH: Du bist als plexora-app angemeldet')
  })
  it('--dry-run läuft ohne Administratorrechte und schreibt nichts (kein put-role-policy im Probelauf)', () => {
    const out = execFileSync('bash', ['scripts/aws/grant-set-password-right.sh', '--dry-run'], { encoding: 'utf8', env: { ...process.env, AWS_PAGER: '' } })
    expect(out).toContain('Probelauf: nichts geändert'); expect(out).toContain('cognito-idp:AdminSetUserPassword')
  }, 30_000)
})

describe('Umschalter', () => {
  it('set-enforce.sh kennt plan, roles und welcome mit den richtigen Variablen', () => {
    const sh = readFileSync('scripts/aws/set-enforce.sh', 'utf8')
    for (const [w, v] of [['plan', 'NUXT_PLAN_ENFORCE'], ['roles', 'NUXT_ROLES_ENFORCE'], ['welcome', 'NUXT_WELCOME_LINK']]) expect(sh).toContain(`${w}) VAR="${v}"`)
  })
})
