import { describe, it, expect, beforeAll, vi } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, chmodSync, readFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { STORAGE } from '../../infra/storage-policy'

// Das Deploy-Gate als Ganzes: scripts/aws/check-storage.sh mit einem gefälschten "aws" (nur lesende Aufrufe, Zustand aus einer Datei).
vi.setConfig({ testTimeout: 60_000 })
const ACCOUNT = '123456789012'
const dir = mkdtempSync(join(tmpdir(), 'gate-'))
// Der gefälschte "aws" ist ein kleines Bash-Skript (schnell): je Aufruf liegt die Antwort als Datei im Zustandsordner (<Bucket>/<Befehl>.out bzw. .err)
const fakeAws = `#!/usr/bin/env bash
echo "$*" >> "$FAKE_LOG"
svc="$1"; cmd="$2"; bucket="_"
for ((i=1; i<=$#; i++)); do if [[ "\${!i}" == "--bucket" ]]; then j=$((i+1)); bucket="\${!j}"; fi; done
[[ "$svc" == "s3control" ]] && cmd="get-account-public-access-block"
f="$FAKE_DIR/$bucket/$cmd"
if [[ -f "$f.out" ]]; then cat "$f.out"; exit 0; fi
if [[ -f "$f.err" ]]; then echo "An error occurred ($(cat "$f.err")) when calling the operation" >&2; exit 254; fi
echo "unbekannter Aufruf im Test: $*" >&2; exit 1
`
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))
const baseState = () => {
  const buckets: Record<string, any> = {}
  for (const d of STORAGE.buckets) {
    const name = d.name.replace('{account}', ACCOUNT)
    const prefixes = d.access.kind === 'public-prefixes' ? d.access.prefixes.map(p => p.prefix) : []
    let policy: any = null
    if (d.access.kind === 'public-prefixes') policy = { Statement: [{ Sid: 'o', Effect: 'Allow', Principal: '*', Action: 's3:GetObject', Resource: prefixes.map(p => `arn:aws:s3:::${name}/${p}/*`) }] }
    if (d.access.kind === 'public-whole') policy = { Statement: [{ Sid: 'p', Effect: 'Allow', Principal: '*', Action: 's3:GetObject', Resource: `arn:aws:s3:::${name}/*` }] }
    if (d.denyInsecureTransport) policy = { Statement: [{ Sid: 'NurHTTPS', Effect: 'Deny', Principal: '*', Action: 's3:*', Resource: [`arn:aws:s3:::${name}`, `arn:aws:s3:::${name}/*`], Condition: { Bool: { 'aws:SecureTransport': 'false' } } }] }
    buckets[name] = { region: d.region, bpa: d.blockPublicAccess, enc: d.encryption, versioning: d.versioning, ownership: d.ownership, policy,
      lifecycle: d.lifecycle.map(l => ({ ID: l.id, Status: 'Enabled', ...(l.expirationDays ? { Expiration: { Days: l.expirationDays } } : {}), ...(l.noncurrentDays ? { NoncurrentVersionExpiration: { NoncurrentDays: l.noncurrentDays } } : {}) })) }
  }
  return { account: ACCOUNT, accountBpa: null as any, buckets }
}
let n = 0
const writeState = (st: any, base: string) => {
  const w = (b: string, cmd: string, out?: any, err?: string) => { mkdirSync(join(base, b), { recursive: true }); if (err) writeFileSync(join(base, b, `${cmd}.err`), err); else writeFileSync(join(base, b, `${cmd}.out`), typeof out === 'string' ? out : JSON.stringify(out)) }
  w('_', 'get-caller-identity', st.account); w('_', 'list-buckets', Object.keys(st.buckets))
  st.accountBpa ? w('_', 'get-account-public-access-block', { PublicAccessBlockConfiguration: st.accountBpa }) : w('_', 'get-account-public-access-block', undefined, 'NoSuchPublicAccessBlockConfiguration')
  for (const [name, b] of Object.entries<any>(st.buckets)) {
    w(name, 'head-bucket', ''); w(name, 'get-bucket-location', { LocationConstraint: b.region })
    b.bpa ? w(name, 'get-public-access-block', { PublicAccessBlockConfiguration: b.bpa }) : w(name, 'get-public-access-block', undefined, 'NoSuchPublicAccessBlockConfiguration')
    b.enc ? w(name, 'get-bucket-encryption', { ServerSideEncryptionConfiguration: { Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: b.enc } }] } }) : w(name, 'get-bucket-encryption', undefined, 'ServerSideEncryptionConfigurationNotFoundError')
    w(name, 'get-bucket-versioning', b.versioning === 'Enabled' ? { Status: 'Enabled' } : {})
    b.lifecycle?.length ? w(name, 'get-bucket-lifecycle-configuration', { Rules: b.lifecycle }) : w(name, 'get-bucket-lifecycle-configuration', undefined, 'NoSuchLifecycleConfiguration')
    b.policy ? w(name, 'get-bucket-policy', { Policy: JSON.stringify(b.policy) }) : w(name, 'get-bucket-policy', undefined, 'NoSuchBucketPolicy')
    w(name, 'get-bucket-acl', { Grants: b.acl || [] }); w(name, 'get-bucket-ownership-controls', { OwnershipControls: { Rules: [{ ObjectOwnership: b.ownership }] } }); w(name, 'get-bucket-website', undefined, 'NoSuchWebsiteConfiguration')
  }
}
const gate = (state: any) => {
  const base = join(dir, `state-${++n}`), log = join(dir, `log-${n}.txt`); writeState(state, base); writeFileSync(log, '')
  const r = spawnSync('bash', ['scripts/aws/check-storage.sh', '--no-http'], { encoding: 'utf8', env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, FAKE_DIR: base, FAKE_LOG: log } })
  return { code: r.status, out: (r.stdout || '') + (r.stderr || ''), calls: readFileSync(log, 'utf8').split('\n').filter(Boolean) }
}
beforeAll(() => { const p = join(dir, 'aws'); writeFileSync(p, fakeAws); chmodSync(p, 0o755) })

describe('Deploy-Gate scripts/aws/check-storage.sh (Konfiguration, gefälschtes aws)', () => {
  it('Soll-Zustand: Exit 0 und "bestanden"', () => { const r = gate(baseState()); expect(r.out).toMatch(/Speicher-Prüfung bestanden/); expect(r.code).toBe(0) })
  it('es werden NUR lesende AWS-Aufrufe gemacht', () => {
    const r = gate(baseState()); expect(r.calls.length).toBeGreaterThan(10)
    for (const c of r.calls) expect(c, c).toMatch(/^(sts get-caller-identity|s3api (list-buckets|head-bucket|get-[a-z-]+|list-objects-v2)|s3control get-public-access-block)\b/)
    expect(r.calls.join('\n')).not.toMatch(/\b(put|delete|create|update|attach|set)-/)
  })
  it('GEGENPROBE neuer, nicht deklarierter Bucket im Konto: Exit 1 mit Namen', () => {
    const s = baseState(); s.buckets['plexora-heimlich'] = clone(s.buckets['plexora-files']); const r = gate(s)
    expect(r.code).toBe(1); expect(r.out).toMatch(/"plexora-heimlich" ist im Konto vorhanden, aber nicht deklariert/)
  })
  it('GEGENPROBE Policy mit Principal "*" auf den ganzen Bucket', () => {
    const s = baseState(); s.buckets['plexora-files'].policy.Statement[0].Resource = ['arn:aws:s3:::plexora-files/*']; const r = gate(s)
    expect(r.code).toBe(1); expect(r.out).toMatch(/GANZEN Bucket/)
  })
  it('GEGENPROBE öffentliches Auflisten', () => {
    const s = baseState(); s.buckets['plexora-files'].policy.Statement.push({ Sid: 'l', Effect: 'Allow', Principal: '*', Action: ['s3:GetObject', 's3:ListBucket'], Resource: ['arn:aws:s3:::plexora-files', 'arn:aws:s3:::plexora-files/blog/*'] }); const r = gate(s)
    expect(r.code).toBe(1); expect(r.out).toMatch(/nur s3:GetObject, gefunden: s3:ListBucket/)
  })
  it('GEGENPROBE Sicherungs-Bucket ohne Block Public Access', () => {
    const s = baseState(); delete s.buckets[`plexora-backups-${ACCOUNT}`].bpa; const r = gate(s)
    expect(r.code).toBe(1); expect(r.out).toMatch(/plexora-backups-123456789012: Block Public Access ist nicht gesetzt/)
  })
  it('GEGENPROBE Konto-Block-Public-Access wurde eingeschaltet', () => {
    const s = baseState(); s.accountBpa = { BlockPublicAcls: true, IgnorePublicAcls: true, BlockPublicPolicy: true, RestrictPublicBuckets: true }; expect(gate(s).code).toBe(1)
  })
  it('GEGENPROBE: Versionierung/Verschlüsselung/Lifecycle verändert', () => {
    for (const mut of [(s: any) => { s.buckets['plexora-files'].versioning = 'None' }, (s: any) => { s.buckets['plexora-files'].enc = null }, (s: any) => { s.buckets['plexora-files'].lifecycle = [] }, (s: any) => { s.buckets[`plexora-backups-${ACCOUNT}`].lifecycle[0].Expiration.Days = 3650 }]) { const s = baseState(); mut(s); expect(gate(s).code).toBe(1) }
  }, 90_000)
  it('Fehler beim Lesen (Konto unbekannt) bricht ab statt zu raten', () => {
    const s = baseState(); s.account = 'kein-konto'; const r = gate(s); expect(r.code).toBe(1); expect(r.out).toMatch(/Konto nicht ermittelbar/)
  })
})

describe('Verdrahtung', () => {
  const deploy = readFileSync('scripts/aws/deploy-backend.sh', 'utf8')
  it('deploy-backend.sh ruft das Gate VOR dem Alias-Wechsel auf und bricht bei Fehler ab, ohne den Alias zu verändern', () => {
    const gateAt = deploy.indexOf('if ! scripts/aws/check-storage.sh'), swapAt = deploy.indexOf('update-alias --region "$REGION" --function-name "$FN" --name "$PREV"')
    expect(gateAt).toBeGreaterThan(0); expect(swapAt).toBeGreaterThan(gateAt)
    expect(deploy.slice(gateAt, swapAt)).toMatch(/exit 1/); expect(deploy.slice(gateAt, swapAt)).toContain('Alias unverändert')
    expect(deploy).not.toMatch(/SKIP_STORAGE|--skip-storage/)      // kein Umgehen per Schalter
  })
  it('das Gate steht auch im --config-only-Pfad (die Prüfung liegt hinter dem if/fi des Builds)', () => {
    const ifAt = deploy.indexOf('if [[ $CONFIG_ONLY -eq 0 ]]; then'), fiAt = deploy.indexOf('\nfi\n', ifAt), gateAt = deploy.indexOf('if ! scripts/aws/check-storage.sh')
    expect(fiAt).toBeGreaterThan(0); expect(gateAt).toBeGreaterThan(fiAt)
  })
  it('check-public-flows.sh nutzt die HTTP-Prüfung des Gates und kennt keine eigene Bucket-Liste mehr', () => {
    const flows = readFileSync('scripts/aws/check-public-flows.sh', 'utf8')
    expect(flows).toContain('scripts/aws/check-storage.sh --http-only'); expect(flows).not.toContain('lambda/lambda-new.zip')
  })
  it('der Rückweg rollback-backend.sh braucht das Gate nicht (er muss immer gehen)', () => { expect(readFileSync('scripts/aws/rollback-backend.sh', 'utf8')).not.toContain('check-storage') })
  it('das Gate verändert nichts: kein schreibender AWS-Befehl in check-storage.*', () => {
    for (const f of ['scripts/aws/check-storage.sh', 'scripts/aws/check-storage.mjs']) expect(readFileSync(f, 'utf8'), f).not.toMatch(/\b(put|delete|create|update|attach)-[a-z-]+/)
  })
})
