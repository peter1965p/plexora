import { describe, it, expect, beforeAll } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, chmodSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Die Konsistenzprüfung aus scripts/aws/check-public-flows.sh (Widget ⇔ Token-Pflicht bei der Buchung) mit gefälschtem curl:
// Die Funktionen werden aus dem Skript ausgeschnitten und mit allen Kombinationen aus Serverstatus und Widget gefüttert.
const dir = mkdtempSync(join(tmpdir(), 'flows-'))
const fakeCurl = `#!/usr/bin/env bash
echo "$*" >> "$FAKE_LOG"
if [[ "$*" == *"-X POST"* ]]; then printf '%s' "$FAKE_STATUS"; else if [[ "$FAKE_WIDGET" == "ja" ]]; then echo '{"botProtection":{"siteKey":"0x4AAAx","mode":"managed"},"types":[]}'; else echo '{"botProtection":null,"types":[]}'; fi; fi
`
beforeAll(() => { const p = join(dir, 'curl'); writeFileSync(p, fakeCurl); chmodSync(p, 0o755) })
const src = readFileSync('scripts/aws/check-public-flows.sh', 'utf8')
const fn = (name: string) => src.match(new RegExp(`^${name}\\(\\) \\{[\\s\\S]*?^\\}`, 'm'))![0]
const run = (status: string, widget: string) => {
  const log = join(dir, `l-${Math.random()}`); writeFileSync(log, '')
  const script = `API=https://api.example; TENANT=T1; FAIL=0; ok() { echo "OK $1"; }; bad() { echo "FEHLER $1"; FAIL=1; }\n${src.match(/^book_probe\(\).*$/m)![0]}\n${src.match(/^widget_for\(\).*$/m)![0]}\n${fn('consistent')}\nconsistent "Test" ty1; exit $FAIL`
  const r = spawnSync('bash', ['-c', script], { encoding: 'utf8', env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, FAKE_STATUS: status, FAKE_WIDGET: widget, FAKE_LOG: log } })
  return { code: r.status, out: r.stdout, calls: readFileSync(log, 'utf8') }
}

describe('check-public-flows.sh: Konsistenz Widget ⇔ Token-Pflicht der Buchung', () => {
  it('konsistent: Widget + 403 und kein Widget + 409 sind OK; Drossel (429) wird übersprungen', () => {
    expect(run('403', 'ja')).toMatchObject({ code: 0 }); expect(run('409', 'nein')).toMatchObject({ code: 0 }); expect(run('429', 'ja')).toMatchObject({ code: 0 }); expect(run('429', 'nein').out).toMatch(/übersprungen/)
  })
  it('GEGENPROBE Server verlangt Token, Seite zeigt kein Widget (jede Buchung scheitert): FEHLER', () => {
    for (const st of ['403', '503']) { const r = run(st, 'nein'); expect(r.code, st).toBe(1); expect(r.out).toMatch(/FEHLER.*KEIN Widget.*jede Buchung würde scheitern/) }
  })
  it('GEGENPROBE Widget wird gezeigt, der Server prüft nichts (Schutz wirkungslos): FEHLER', () => {
    const r = run('409', 'ja'); expect(r.code).toBe(1); expect(r.out).toMatch(/FEHLER.*Schutz wirkungslos/)
  })
  it('unerwartete Antworten (500, 200 = es wäre gebucht worden!) sind FEHLER', () => {
    for (const st of ['500', '200', '404', '400']) expect(run(st, 'nein').code, st).toBe(1)
  })
  it('die Probe bucht nie: ungültiger Zeitpunkt (2020, 03:33), ungültige Adresse, ohne Token; Kopfzeile sagt es', () => {
    const r = run('409', 'nein'); expect(r.calls).toContain('"date":"2020-01-01"'); expect(r.calls).toContain('"startTime":"03:33"'); expect(r.calls).toContain('invalid.example'); expect(r.calls).not.toContain('turnstileToken')
    expect(src).toContain('es wird nie ein Termin gebucht')
  })
  it('ist in den Ablauf eingebaut: allgemeine Terminart immer, Kampagnen-Terminarten aus den bekannten Kampagnen', () => {
    expect(src).toMatch(/consistent "allgemeine Terminart" "\$FIRST_TYPE"/); expect(src).toMatch(/consistent "Kampagnen-Terminart \$t" "\$t"/)
  })
})
