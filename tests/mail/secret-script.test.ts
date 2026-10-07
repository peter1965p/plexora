import { describe, it, expect, beforeEach } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, existsSync, chmodSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Das echte Skript läuft gegen ein Ersatzprogramm "aws", das alle Aufrufe mitschreibt. So lässt sich belegen, was mit dem Secret passiert.
const SECRET = 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw'
const OTHER = { NUXT_STRIPE_SECRET_KEY: ['sk', 'live', 'GEHEIM_ABCDEF'].join('_'), NUXT_ENCRYPTION_KEY: 'KEY_GEHEIM_123456', NUXT_ADMIN_EMAIL: 'admin@plexora.test' }
let dir: string
const aws = (env: any) => {
  writeFileSync(join(dir, 'env.json'), JSON.stringify(env)); writeFileSync(join(dir, 'argv.log'), '')
  writeFileSync(join(dir, 'aws'), `#!/usr/bin/env bash
echo "$@" >> "${dir}/argv.log"
if [[ "$*" == *get-function-configuration* ]]; then cat "${dir}/env.json"; exit 0; fi
if [[ "$*" == *update-function-configuration* ]]; then for a in "$@"; do [[ "$a" == file://* ]] && cp "\${a#file://}" "${dir}/captured.json"; done; echo "Successful"; exit 0; fi
exit 0
`); chmodSync(join(dir, 'aws'), 0o755)
}
const run = (args: string[], input: string) => spawnSync('bash', ['scripts/aws/set-resend-webhook-secret.sh', ...args], { input, encoding: 'utf8', env: { ...process.env, PATH: `${dir}:${process.env.PATH}` } })
const calls = () => readFileSync(join(dir, 'argv.log'), 'utf8')
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'secret-script-')); aws(OTHER) })

describe('Skript zum Eintragen des Resend-Webhook-Secrets', () => {
  it('setzt die Variable, lässt alle anderen unverändert und gibt weder das Secret noch andere Werte aus', () => {
    const r = run([], SECRET + '\n'); expect(r.status).toBe(0)
    const out = r.stdout + r.stderr
    expect(out).not.toContain(SECRET); expect(out).not.toContain(SECRET.slice(6)); expect(out).toContain('whse…'); expect(out).toContain(`Länge ${SECRET.length}`)
    for (const v of Object.values(OTHER)) expect(out).not.toContain(v)
    expect(out).toContain('NUXT_ENCRYPTION_KEY'); expect(out).toContain('3 weitere Variablen bleiben unverändert')
    const sent = JSON.parse(readFileSync(join(dir, 'captured.json'), 'utf8')).Variables
    expect(sent).toEqual({ ...OTHER, NUXT_RESEND_WEBHOOK_SECRET: SECRET })
  })
  it('das Secret steht in keinem Argument eines aws-Aufrufs (also nicht in der Prozessliste)', () => {
    run([], SECRET + '\n'); expect(calls()).not.toContain(SECRET); expect(calls()).not.toContain(SECRET.slice(6)); expect(calls()).toContain('update-function-configuration'); expect(calls()).toMatch(/--environment file:\/\//)
  })
  it('Probelauf ändert nichts; ungültige Eingaben werden abgelehnt, ohne zu ändern', () => {
    expect(run(['--dry-run'], SECRET + '\n').status).toBe(0); expect(calls()).not.toContain('update-function-configuration')
    for (const bad of ['', 'quatsch', 'whsec_zu_kurz', ['sk', 'live', 'abcdefghijklmnopqrstuvwx'].join('_'), 'whsec_' + 'a'.repeat(10), 'whsec_' + '!'.repeat(30)]) {
      const r = run([], bad + '\n'); expect(r.status, JSON.stringify(bad)).not.toBe(0); expect(r.stdout + r.stderr).not.toContain(bad || '###'); expect(calls(), bad).not.toContain('update-function-configuration')
    }
  })
  it('Leerzeichen und Wagenrücklauf um das Secret werden entfernt (Einfügen aus dem Browser)', () => {
    expect(run([], `  ${SECRET}\r\n`).status).toBe(0); expect(JSON.parse(readFileSync(join(dir, 'captured.json'), 'utf8')).Variables.NUXT_RESEND_WEBHOOK_SECRET).toBe(SECRET)
  })
  it('status zeigt nur ja/nein; remove entfernt nur diese Variable', () => {
    let r = run(['status'], ''); expect(r.stdout.trim()).toBe('NUXT_RESEND_WEBHOOK_SECRET gesetzt: nein')
    aws({ ...OTHER, NUXT_RESEND_WEBHOOK_SECRET: SECRET }); r = run(['status'], ''); expect(r.stdout.trim()).toBe('NUXT_RESEND_WEBHOOK_SECRET gesetzt: ja'); expect(r.stdout + r.stderr).not.toContain(SECRET)
    r = run(['remove'], ''); expect(r.status).toBe(0); expect(JSON.parse(readFileSync(join(dir, 'captured.json'), 'utf8')).Variables).toEqual(OTHER)
  })
  it('die Datei mit dem Secret ist nur für den Besitzer lesbar und das Skript räumt auf (shred); die Anwendung kennt die Variable', () => {
    const src = readFileSync('scripts/aws/set-resend-webhook-secret.sh', 'utf8')
    expect(src).toContain('umask 077'); expect(src).toContain('shred -u'); expect(src).toContain('read -r -s'); expect(src).not.toMatch(/set -x|echo "?\$SECRET|printf[^\n]*\$SECRET|--environment "Variables/)
    expect(readFileSync('nuxt.config.ts', 'utf8')).toContain('resendWebhookSecret'); expect(existsSync(join(dir, 'captured.json'))).toBe(false)
  })
})
