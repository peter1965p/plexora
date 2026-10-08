import { describe, it, expect, beforeAll } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, chmodSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// rollback-backend.sh mit gefälschtem aws und curl: Aliase im Zustandsordner, alle Aufrufe werden aufgezeichnet
const dir = mkdtempSync(join(tmpdir(), 'rb-'))
const fakeAws = `#!/usr/bin/env bash
echo "$*" >> "$FAKE_LOG"
if [[ "$1 $2" == "lambda get-alias" ]]; then n=""; for ((i=1;i<=$#;i++)); do [[ "\${!i}" == "--name" ]] && { j=$((i+1)); n="\${!j}"; }; done; cat "$FAKE_DIR/alias-$n"; echo; exit 0; fi
if [[ "$1 $2" == "lambda get-function" ]]; then q=""; for ((i=1;i<=$#;i++)); do [[ "\${!i}" == "--qualifier" ]] && { j=$((i+1)); q="\${!j}"; }; done; echo "Beschriftung-$q"; exit 0; fi
if [[ "$1 $2" == "lambda update-alias" ]]; then n=""; v=""; for ((i=1;i<=$#;i++)); do [[ "\${!i}" == "--name" ]] && { j=$((i+1)); n="\${!j}"; }; [[ "\${!i}" == "--function-version" ]] && { j=$((i+1)); v="\${!j}"; }; done; echo "$v" > "$FAKE_DIR/alias-$n"; echo "$v"; exit 0; fi
exit 0
`
beforeAll(() => { for (const [n, c] of [['aws', fakeAws], ['curl', '#!/usr/bin/env bash\nprintf 200\n'], ['sleep', '#!/usr/bin/env bash\nexit 0\n']]) { const p = join(dir, n); writeFileSync(p, c); chmodSync(p, 0o755) } })
let k = 0
const run = (live: string, previous: string, ...args: string[]) => {
  const d = join(dir, `s${++k}`); require('node:fs').mkdirSync(d); writeFileSync(join(d, 'alias-live'), live); writeFileSync(join(d, 'alias-previous'), previous); const log = join(d, 'log'); writeFileSync(log, '')
  const r = spawnSync('bash', ['scripts/aws/rollback-backend.sh', ...args], { encoding: 'utf8', env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, FAKE_DIR: d, FAKE_LOG: log } })
  return { code: r.status, out: (r.stdout || '') + (r.stderr || ''), calls: readFileSync(log, 'utf8').split('\n').filter(Boolean), live: readFileSync(join(d, 'alias-live'), 'utf8').trim(), previous: readFileSync(join(d, 'alias-previous'), 'utf8').trim() }
}

describe('rollback-backend.sh', () => {
  it('--dry-run: zeigt den Tausch mit Versionen und Beschriftung, ändert nichts (kein update-alias), Exit 0', () => {
    const r = run('20', '19', '--dry-run'); expect(r.code).toBe(0)
    expect(r.out).toContain('Probelauf: nichts wird geändert'); expect(r.out).toMatch(/jetzt:\s+live = Version 20 \(Beschriftung-20\), previous = Version 19/); expect(r.out).toMatch(/danach: live = Version 19 \(Beschriftung-19\), previous = Version 20/)
    expect(r.calls.filter(c => /update-alias/.test(c))).toEqual([]); expect([r.live, r.previous]).toEqual(['20', '19'])
  })
  it('ohne Schalter: tauscht wirklich (live <-> previous) und prüft danach die Anwendung', () => {
    const r = run('20', '19'); expect(r.code).toBe(0); expect([r.live, r.previous]).toEqual(['19', '20']); expect(r.out).toMatch(/settings\/agb -> 200/)
  })
  it('live == previous: Abbruch mit Meldung, mit und ohne --dry-run, nichts wird verändert', () => {
    for (const args of [[], ['--dry-run']]) { const r = run('20', '20', ...args); expect(r.code).toBe(1); expect(r.out).toMatch(/zeigen beide auf Version 20, es gibt nichts zurückzurollen/); expect(r.calls.filter(c => /update-alias/.test(c))).toEqual([]) }
  })
  it('Aliase nicht lesbar / keine Zahl: Abbruch ohne Änderung', () => {
    for (const [l, p] of [['None', '19'], ['20', ''], ['abc', 'def']]) { const r = run(l, p); expect(r.code, `${l}/${p}`).toBe(1); expect(r.out).toMatch(/Aliase nicht lesbar/); expect(r.calls.filter(c => /update-alias/.test(c))).toEqual([]) }
  })
  it('unbekannte Option: Abbruch (Exit 2) ohne jeden AWS-Aufruf', () => {
    const r = run('20', '19', '--tauschen'); expect(r.code).toBe(2); expect(r.calls).toEqual([])
  })
  it('der Probelauf macht nur lesende Aufrufe', () => {
    const r = run('20', '19', '--dry-run'); for (const c of r.calls) expect(c, c).toMatch(/^lambda (get-alias|get-function)\b/)
  })
})
