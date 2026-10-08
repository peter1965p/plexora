import { describe, it, expect, beforeAll } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, chmodSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// scripts/aws/setup-access-analyzer.sh mit gefälschtem aws: alle Aufrufe werden aufgezeichnet
const dir = mkdtempSync(join(tmpdir(), 'aa-'))
const fake = `#!/usr/bin/env bash
echo "$*" >> "$FAKE_LOG"
case "$1 $2" in
  "sts get-caller-identity") echo 123456789012;;
  "accessanalyzer list-analyzers") echo "An error occurred (AccessDeniedException) when calling the ListAnalyzers operation: not authorized" >&2; exit 254;;
  "events describe-rule") echo "An error occurred (ResourceNotFoundException)" >&2; exit 254;;
  "sns get-topic-attributes") if [[ "$*" == *"Attributes.Policy"* ]]; then cat "$FAKE_POLICY"; else echo "arn:aws:sns:eu-central-1:123456789012:plexora-alerts"; fi;;
  "sns set-topic-attributes") for a in "$@"; do case "$a" in file://*) cp "\${a#file://}" "$FAKE_OUT";; esac; done;;
  *) :;;
esac
exit 0
`
beforeAll(() => { const p = join(dir, 'aws'); writeFileSync(p, fake); chmodSync(p, 0o755) })
let n = 0
const run = (mode: string, existingPolicy = '') => {
  const log = join(dir, `log${++n}`), pol = join(dir, `pol${n}`), out = join(dir, `out${n}`); writeFileSync(log, ''); writeFileSync(pol, existingPolicy); writeFileSync(out, '')
  const r = spawnSync('bash', ['scripts/aws/setup-access-analyzer.sh', mode], { encoding: 'utf8', env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, FAKE_LOG: log, FAKE_POLICY: pol, FAKE_OUT: out } })
  return { code: r.status, out: (r.stdout || '') + (r.stderr || ''), calls: readFileSync(log, 'utf8').split('\n').filter(Boolean), written: readFileSync(out, 'utf8') }
}
const WRITE = /\b(create|put|set|delete|remove|subscribe|update)-/

describe('setup-access-analyzer.sh', () => {
  it('--dry-run (Standard): zeigt Plan, macht NUR lesende Aufrufe, ändert nichts', () => {
    for (const mode of ['--dry-run', '']) { const r = run(mode); expect(r.code).toBe(0); expect(r.out).toContain('Probelauf: nichts geändert'); expect(r.out).toContain('plexora-external-access'); expect(r.out).toContain('plexora-alerts'); expect(r.calls.filter(c => WRITE.test(c))).toEqual([]) }
  })
  it('der Plan nennt die Themen-Berechtigung: nur diese eine Regel darf veröffentlichen (SourceArn), Muster nur aktive, nicht veraltete Findings', () => {
    const r = run('--dry-run'); expect(r.out).toMatch(/"Principal":\{"Service":"events\.amazonaws\.com"\}.*"Action":"sns:Publish".*"aws:SourceArn":"arn:aws:events:eu-central-1:123456789012:rule\/plexora-access-analyzer-findings"/)
    expect(r.out).toContain('"status":["ACTIVE"]'); expect(r.out).toContain('"isDeprecated":[false]')
  })
  it('fehlende Leserechte werden benannt, nicht geraten', () => { expect(run('--dry-run').out).toMatch(/Analyzer: nicht prüfbar \(plexora-app hat kein access-analyzer:ListAnalyzers\)/) })
  it('--apply (nur mit Freigabe, hier mit gefälschtem aws): Analyzer Typ ACCOUNT, Regel, Ziel; bestehende Themen-Richtlinie bleibt erhalten', () => {
    const existing = JSON.stringify({ Version: '2012-10-17', Statement: [{ Sid: 'alt', Effect: 'Allow', Principal: { Service: 'cloudwatch.amazonaws.com' }, Action: 'sns:Publish', Resource: 'arn:aws:sns:eu-central-1:123456789012:plexora-alerts' }] })
    const r = run('--apply', existing); expect(r.code).toBe(0)
    expect(r.calls.join('\n')).toMatch(/accessanalyzer create-analyzer .*--analyzer-name plexora-external-access --type ACCOUNT/); expect(r.calls.join('\n')).toMatch(/events put-rule --name plexora-access-analyzer-findings/); expect(r.calls.join('\n')).toMatch(/events put-targets --rule plexora-access-analyzer-findings .*Arn=arn:aws:sns:eu-central-1:123456789012:plexora-alerts/)
    const pol = JSON.parse(r.written); expect(pol.Statement.map((s: any) => s.Sid).sort()).toEqual(['AccessAnalyzerRegel', 'alt'])
  })
  it('--apply zweimal: die Anweisung wird ersetzt, nicht verdoppelt (wiederholbar)', () => {
    const first = run('--apply', ''); const again = run('--apply', first.written); expect(JSON.parse(again.written).Statement.filter((s: any) => s.Sid === 'AccessAnalyzerRegel')).toHaveLength(1)
  })
  it('unbekannter Modus: Abbruch ohne Änderung; --remove entfernt nur Regel und Analyzer, nie das Thema', () => {
    const bad = run('--irgendwas'); expect(bad.code).toBe(2); expect(bad.calls.filter(c => WRITE.test(c))).toEqual([])
    const rm = run('--remove'); expect(rm.calls.join('\n')).toMatch(/events remove-targets/); expect(rm.calls.join('\n')).toMatch(/accessanalyzer delete-analyzer/); expect(rm.calls.join('\n')).not.toMatch(/sns delete-topic/)
  })
  it('Konto nicht ermittelbar: Abbruch', () => { /* Skript prüft die 12-stellige Konto-ID vor allem anderen */ expect(readFileSync('scripts/aws/setup-access-analyzer.sh', 'utf8')).toMatch(/\^\[0-9\]\{12\}\$.*Konto nicht ermittelbar/s) })
})
