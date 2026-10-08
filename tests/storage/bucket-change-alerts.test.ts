import { describe, it, expect, beforeAll } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, chmodSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// setup-bucket-change-alerts.sh mit gefälschtem aws. test-event-pattern wird mit einer kleinen eigenen Umsetzung der EventBridge-Musterregeln (Gleichheit, prefix) nachgebildet,
// damit auch die Gegenproben "Muster zu weit/zu eng" im Test rot werden. (Gegen das echte EventBridge wurde das Muster zusätzlich live mit events:TestEventPattern geprüft.)
const dir = mkdtempSync(join(tmpdir(), 'bca-'))
const fake = `#!/usr/bin/env bash
echo "$*" >> "$FAKE_LOG"
case "$1 $2" in
  "sts get-caller-identity") echo 123456789012;;
  "events test-event-pattern") node "$FAKE_MATCH" "$@";;
  "events describe-rule") echo "An error occurred (ResourceNotFoundException)" >&2; exit 254;;
  "sns get-topic-attributes") cat "$FAKE_POLICY";;
  "sns set-topic-attributes") for a in "$@"; do case "$a" in file://*) cp "\${a#file://}" "$FAKE_OUT";; esac; done;;
  "events put-targets") for a in "$@"; do case "$a" in file://*) cp "\${a#file://}" "$FAKE_TARGETS";; esac; done;;
  "events put-rule") for a in "$@"; do case "$a" in file://*) cp "\${a#file://}" "$FAKE_RULE";; esac; done; echo arn:aws:events:x;;
  *) :;;
esac
exit 0
`
const matcher = `
const fs = require('fs'); const a = process.argv.slice(2)
const arg = (n) => { const i = a.indexOf(n); return a[i + 1] }
const pat = JSON.parse(fs.readFileSync(arg('--event-pattern').replace('file://', ''), 'utf8')); const ev = JSON.parse(arg('--event'))
const m = (p, v) => Array.isArray(p) ? p.some(x => typeof x === 'object' && x !== null ? (x.prefix !== undefined ? typeof v === 'string' && v.startsWith(x.prefix) : false) : x === v) : (p && typeof p === 'object' ? Object.entries(p).every(([k, q]) => m(q, v ? v[k] : undefined)) : false)
process.stdout.write(m(pat, ev) ? 'True' : 'False')
`
beforeAll(() => { const p = join(dir, 'aws'); writeFileSync(p, fake); chmodSync(p, 0o755); writeFileSync(join(dir, 'match.js'), matcher) })
let n = 0
const run = (mode: string, policy = '', patternOverride?: string) => {
  const o = (s: string) => join(dir, `${s}${++n}`); const log = o('log'), pol = o('pol'), out = o('out'), tg = o('tg'), rule = o('rule'); for (const f of [log, out, tg, rule]) writeFileSync(f, ''); writeFileSync(pol, policy)
  let script = 'scripts/aws/setup-bucket-change-alerts.sh'
  if (patternOverride) { script = join(dir, `mut${n}.sh`); writeFileSync(script, readFileSync('scripts/aws/setup-bucket-change-alerts.sh', 'utf8').replace(/"eventName":\[[^\]]*\]/, patternOverride)) }
  const r = spawnSync('bash', [script, mode], { encoding: 'utf8', env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, FAKE_LOG: log, FAKE_POLICY: pol, FAKE_OUT: out, FAKE_TARGETS: tg, FAKE_RULE: rule, FAKE_MATCH: join(dir, 'match.js') } })
  return { code: r.status, out: (r.stdout || '') + (r.stderr || ''), calls: readFileSync(log, 'utf8').split('\n').filter(Boolean), policy: readFileSync(out, 'utf8'), targets: readFileSync(tg, 'utf8'), rule: readFileSync(rule, 'utf8') }
}
const WRITE = /\b(create|put|set|delete|remove|subscribe|update)-(?!event-pattern)/

describe('setup-bucket-change-alerts.sh', () => {
  it('--dry-run (Standard): prüft das Muster gegen Beispielereignisse, macht NUR lesende Aufrufe, ändert nichts', () => {
    for (const mode of ['--dry-run', '']) { const r = run(mode); expect(r.code).toBe(0); expect(r.out).toContain('Probelauf: nichts geändert'); expect(r.calls.filter(c => WRITE.test(c.replace('test-event-pattern', '')))).toEqual([]); expect(r.out).not.toMatch(/FEHLER/) }
    const r = run('--dry-run'); expect(r.out).toMatch(/OK +PutBucketPolicy an plexora-files -> meldet\b/); expect(r.out).toMatch(/OK +PutBucketPolicy an aether-os-assets-.* -> meldet nicht/); expect(r.out).toMatch(/OK +PutObject an plexora-files -> meldet nicht/)
  })
  it('das Muster erfasst genau Policy, ACL und Block Public Access der Buckets plexora-*, nichts anderes', () => {
    const r = run('--dry-run'); const pat = JSON.parse(r.out.match(/Muster: +(\{.*\})/)![1])
    expect(pat.detail.eventName.sort()).toEqual(['DeleteBucketPolicy', 'DeleteBucketPublicAccessBlock', 'PutBucketAcl', 'PutBucketPolicy', 'PutBucketPublicAccessBlock'])
    expect(pat.detail.requestParameters.bucketName).toEqual([{ prefix: 'plexora-' }]); expect(pat.detail.eventSource).toEqual(['s3.amazonaws.com']); expect(pat.source).toEqual(['aws.s3'])
  })
  it('GEGENPROBE: ein zu weites Muster (zusätzlich PutObject) bricht den Probelauf ab', () => {
    const r = run('--dry-run', '', '"eventName":["PutBucketPolicy","DeleteBucketPolicy","PutBucketAcl","PutBucketPublicAccessBlock","DeleteBucketPublicAccessBlock","PutObject"]'); expect(r.code).toBe(1); expect(r.out).toMatch(/FEHLER +PutObject an plexora-files/); expect(r.out).toMatch(/ABBRUCH/)
  })
  it('GEGENPROBE: ein zu enges Muster (ohne PutBucketAcl) bricht den Probelauf ab', () => {
    const r = run('--dry-run', '', '"eventName":["PutBucketPolicy","DeleteBucketPolicy","PutBucketPublicAccessBlock","DeleteBucketPublicAccessBlock"]'); expect(r.code).toBe(1); expect(r.out).toMatch(/FEHLER +PutBucketAcl an plexora-backups/)
  })
  it('--apply (hier mit gefälschtem aws): Regel mit Muster, Ziel mit lesbarer Nachricht, Themen-Berechtigung nur für diese Regel; bestehende Themen-Richtlinie bleibt erhalten', () => {
    const existing = JSON.stringify({ Version: '2012-10-17', Statement: [{ Sid: 'alt', Effect: 'Allow', Principal: { Service: 'cloudwatch.amazonaws.com' }, Action: 'sns:Publish', Resource: 'arn:aws:sns:eu-central-1:123456789012:plexora-alerts' }, { Sid: 'AccessAnalyzerRegel', Effect: 'Allow', Principal: { Service: 'events.amazonaws.com' }, Action: 'sns:Publish', Resource: 'x' }] })
    const r = run('--apply', existing); expect(r.code).toBe(0)
    expect(JSON.parse(r.policy).Statement.map((s: any) => s.Sid).sort()).toEqual(['AccessAnalyzerRegel', 'BucketAenderungenRegel', 'alt'])
    const st = JSON.parse(r.policy).Statement.find((s: any) => s.Sid === 'BucketAenderungenRegel'); expect(st.Condition.ArnEquals['aws:SourceArn']).toBe('arn:aws:events:eu-central-1:123456789012:rule/plexora-bucket-changes'); expect(st.Action).toBe('sns:Publish')
    const t = JSON.parse(r.targets)[0]; expect(t.Arn).toBe('arn:aws:sns:eu-central-1:123456789012:plexora-alerts'); expect(t.InputTransformer.InputTemplate).toMatch(/Speicher-Änderung: <what> an Bucket <bucket> durch <who> um <when>/); expect(Object.keys(t.InputTransformer.InputPathsMap).sort()).toEqual(['bucket', 'ip', 'what', 'when', 'who'])
    expect(JSON.parse(r.rule).detail.requestParameters.bucketName).toEqual([{ prefix: 'plexora-' }])
  })
  it('--apply zweimal: die Anweisung wird ersetzt, nicht verdoppelt', () => {
    const first = run('--apply', ''); const again = run('--apply', first.policy); expect(JSON.parse(again.policy).Statement.filter((s: any) => s.Sid === 'BucketAenderungenRegel')).toHaveLength(1)
  })
  it('unbekannter Modus: Abbruch ohne Änderung; --remove entfernt nur Regel und Ziel, nie das Thema', () => {
    const bad = run('--irgendwas'); expect(bad.code).toBe(2); expect(bad.calls.filter(c => WRITE.test(c.replace('test-event-pattern', '')))).toEqual([])
    const rm = run('--remove'); expect(rm.calls.join('\n')).toMatch(/events remove-targets/); expect(rm.calls.join('\n')).toMatch(/events delete-rule/); expect(rm.calls.join('\n')).not.toMatch(/sns delete-topic/)
  })
})
