import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { STORAGE } from '../../infra/storage-policy'
import { analyzePolicy, compareBucket, type BucketActual } from '../../infra/storage-check'

const ACCOUNT = '123456789012'
const decl = (n: string) => STORAGE.buckets.find(b => b.name === n)!
const bash = (script: string) => execFileSync('bash', ['-c', script], { encoding: 'utf8' })
const fn = (src: string, name: string) => { const m = src.match(new RegExp(`^${name}\\(\\) \\{[\\s\\S]*?^\\}$`, 'm')); if (!m) throw new Error(`Funktion ${name} nicht gefunden`); return m[0] }
const bpaObj = (s: string) => Object.fromEntries(s.split(',').map(kv => { const [k, v] = kv.split('='); return [k, v === 'true'] }))

describe('Policies, die die Skripte erzeugen, entsprechen der Deklaration', () => {
  describe('scripts/aws/secure-bucket.sh (plexora-files)', () => {
    const sh = readFileSync('scripts/aws/secure-bucket.sh', 'utf8')
    const bucket = sh.match(/^BUCKET="([^"]+)"/m)![1]
    const prefixes = sh.match(/^PUBLIC_PREFIXES=\(([^)]*)\)/m)![1].trim().split(/\s+/)
    const bpa = sh.match(/^BPA_NEW='([^']+)'/m)![1]
    const policy = JSON.parse(bash(`BUCKET=${bucket}; PUBLIC_PREFIXES=(${prefixes.join(' ')}); ${fn(sh, 'new_policy')}; new_policy`))
    const d = decl('plexora-files')
    it('Bucket und Präfix-Liste sind deklariert (beide Richtungen)', () => {
      expect(bucket).toBe(d.name); expect(d.access.kind === 'public-prefixes' && d.access.prefixes.map(p => p.prefix).sort()).toEqual([...prefixes].sort())
    })
    it('die erzeugte Policy: Principal "*" nur s3:GetObject auf deklarierte Präfixe, nie Auflisten, nie s3:*, nie der ganze Bucket', () => {
      const a = analyzePolicy(policy, d, ACCOUNT); expect(a.violations).toEqual([]); expect(a.wholePublic).toBe(false)
      expect([...a.publicPrefixes].sort()).toEqual([...prefixes].sort())
      for (const s of policy.Statement) { expect(s.Effect).toBe('Allow'); expect(s.Principal).toBe('*'); expect(s.Action).toBe('s3:GetObject'); for (const r of s.Resource) expect(r).toMatch(/^arn:aws:s3:::plexora-files\/[a-z0-9-]+\/\*$/) }
    })
    it('die Block-Public-Access-Einstellung des Skripts ist die deklarierte', () => expect(bpaObj(bpa)).toEqual({ BlockPublicAcls: true, IgnorePublicAcls: true, BlockPublicPolicy: false, RestrictPublicBuckets: false }) && expect(Object.fromEntries(Object.entries(bpaObj(bpa)))).toEqual(d.blockPublicAccess))
    it('ein Zustand, der genau so aussieht, besteht den Vergleich', () => {
      const actual: BucketActual = { exists: true, region: 'eu-central-1', bpa: d.blockPublicAccess, encryption: 'AES256', versioning: 'Enabled', lifecycle: [{ ID: 'lambda-zips-alte-versionen', Status: 'Enabled', NoncurrentVersionExpiration: { NoncurrentDays: 60 } }], policy, aclPublicGrants: [], ownership: 'BucketOwnerEnforced', website: false }
      expect(compareBucket(d, actual, ACCOUNT)).toEqual([])
    })
  })

  describe('scripts/aws/setup-backup.sh (Sicherungs-Bucket)', () => {
    const sh = readFileSync('scripts/aws/setup-backup.sh', 'utf8')
    const d = decl('plexora-backups-{account}')
    const env = `ACCOUNT=${ACCOUNT}; BUCKET="plexora-backups-$ACCOUNT"; REGION=eu-central-1; `
    it('der Bucket-Name im Skript ist der deklarierte', () => expect(sh).toMatch(/^BUCKET="plexora-backups-\$ACCOUNT"/m))
    const policy = JSON.parse(bash(env + fn(sh, 'bucket_policy_json') + '; bucket_policy_json'))
    const lifecycle = JSON.parse(bash(env + fn(sh, 'lifecycle_json') + '; lifecycle_json'))
    it('Bucket-Policy: nur ein Deny für unverschlüsselte Verbindungen, nichts öffentlich', () => {
      const a = analyzePolicy(policy, d, ACCOUNT); expect(a.violations).toEqual([]); expect(a.secureTransportDeny).toBe(true); expect(a.publicPrefixes).toEqual([])
      for (const s of policy.Statement) expect(s.Effect).toBe('Deny')
    })
    it('Block Public Access (alles an), Verschlüsselung und Lifecycle im Skript sind die deklarierten', () => {
      const cfg = sh.match(/put-public-access-block --bucket "\$BUCKET" --public-access-block-configuration (\S+)/)![1]
      expect(bpaObj(cfg)).toEqual(d.blockPublicAccess)
      expect(sh.match(/put-bucket-encryption[^\n]*"SSEAlgorithm":"([A-Za-z0-9:]+)"/)![1]).toBe(d.encryption)
      expect(lifecycle.Rules.map((r: any) => ({ id: r.ID, expirationDays: r.Expiration?.Days }))).toEqual(d.lifecycle.map(l => ({ id: l.id, expirationDays: l.expirationDays })))
      expect(lifecycle.Rules.every((r: any) => r.Status === 'Enabled')).toBe(true)
    })
    it('ein Zustand, der genau so aussieht, besteht den Vergleich', () => {
      const actual: BucketActual = { exists: true, region: 'eu-central-1', bpa: d.blockPublicAccess, encryption: 'AES256', versioning: 'None', lifecycle: lifecycle.Rules, policy, aclPublicGrants: [], ownership: 'BucketOwnerEnforced', website: false }
      expect(compareBucket(d, actual, ACCOUNT)).toEqual([])
    })
    it('IAM-Richtlinien im Skript: S3-Rechte nur auf deklarierte Buckets, nie "*", nie s3:*, Schreiben nur im Ordner jobs/', () => {
      const e = env + `SRC_BUCKET=plexora-files; TABLE=plexora-backup-jobs; FN=plexora-backup-worker; `
      const policies = [JSON.parse(bash(e + fn(sh, 'worker_policy_json') + '; worker_policy_json')), JSON.parse(bash(e + fn(sh, 'api_policy_json') + '; api_policy_json'))]
      const declared = new Set(STORAGE.buckets.map(b => b.name.replace('{account}', ACCOUNT)))
      let s3Statements = 0
      for (const pol of policies) for (const st of pol.Statement) {
        const acts: string[] = [].concat(st.Action), res: string[] = [].concat(st.Resource)
        if (!acts.some(a => a.startsWith('s3:'))) continue
        s3Statements++
        expect(st.Effect).toBe('Allow'); expect(acts.some(a => a === 's3:*' || a.endsWith('*')), st.Sid).toBe(false)
        for (const r of res) { const m = r.match(/^arn:aws:s3:::([a-z0-9.-]+)(\/.*)?$/); expect(m, `${st.Sid}: ${r}`).toBeTruthy(); expect(declared.has(m![1]), `${st.Sid}: Bucket ${m![1]} ist nicht deklariert`).toBe(true) }
        if (acts.some(a => /Put|Delete/.test(a))) for (const r of res) expect(r, `${st.Sid}: Schreiben nur in jobs/`).toMatch(/\/jobs\/\*$/)
      }
      expect(s3Statements).toBeGreaterThanOrEqual(4)
    })
  })

  describe('alle Skripte', () => {
    const scripts = readdirSync('scripts/aws').filter(f => /\.(sh|py|mjs)$/.test(f)).map(f => ({ f, src: readFileSync(`scripts/aws/${f}`, 'utf8') }))
    it('Bucket-Policies, ACLs und Block-Public-Access werden nur in den bekannten, geprüften Skripten geschrieben (neue Stelle = bewusst aufnehmen)', () => {
      const WRITERS = ['secure-bucket.sh', 'setup-backup.sh']
      const writers = scripts.filter(s => /put-bucket-policy|put-bucket-acl|put-object-acl|put-public-access-block|delete-public-access-block|delete-bucket-policy|--acl\s+(public|authenticated)|put-bucket-website/.test(s.src)).map(s => s.f).sort()
      expect(writers, 'Skript, das Bucket-Zugriffe ändert, ist nicht in tests/storage/scripts-policy.test.ts aufgenommen und mit der Deklaration verglichen').toEqual(WRITERS.sort())
    })
    it('kein Skript macht Objekte per ACL öffentlich oder setzt Principal "*" selbst zusammen (außer secure-bucket.sh und die Deny-Policy der Sicherung)', () => {
      for (const s of scripts) {
        expect(s.src, s.f).not.toMatch(/--acl\s+public/)
        if (!['secure-bucket.sh', 'setup-backup.sh'].includes(s.f)) expect(s.src, s.f).not.toMatch(/"Principal"\s*:\s*"\*"/)
      }
    })
    it('Gegenprobe: eine Policy mit Principal "*" auf den ganzen Bucket, mit Auflisten oder s3:* wird erkannt', () => {
      const d = decl('plexora-files')
      const mk = (action: any, resource: any) => ({ Statement: [{ Sid: 'X', Effect: 'Allow', Principal: '*', Action: action, Resource: resource }] })
      const bad = [
        mk('s3:GetObject', 'arn:aws:s3:::plexora-files/*'), mk('s3:*', 'arn:aws:s3:::plexora-files/blog/*'), mk(['s3:GetObject', 's3:ListBucket'], 'arn:aws:s3:::plexora-files/blog/*'),
        mk('s3:ListBucket', 'arn:aws:s3:::plexora-files'), mk('s3:GetObject', 'arn:aws:s3:::plexora-files/lambda/*'), mk('s3:GetObject', 'arn:aws:s3:::plexora-files/bl*/*'), mk('s3:Get*', 'arn:aws:s3:::plexora-files/blog/*'),
        mk('s3:PutObject', 'arn:aws:s3:::plexora-files/blog/*'), mk('s3:GetObject', 'arn:aws:s3:::anderer-bucket/blog/*'), mk('s3:GetObject', 'arn:aws:s3:::plexora-files'),
      ]
      for (const p of bad) expect(analyzePolicy(p, d, ACCOUNT).violations.length, JSON.stringify(p.Statement[0])).toBeGreaterThan(0)
      expect(analyzePolicy(mk('s3:GetObject', ['arn:aws:s3:::plexora-files/blog/*', 'arn:aws:s3:::plexora-files/branding/*']), d, ACCOUNT).violations).toEqual([])
    })
  })
})
