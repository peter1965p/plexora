import { describe, it, expect } from 'vitest'
import { STORAGE, type BucketDecl } from '../../infra/storage-policy'
import { compareBucket, compareAccount, collectBucket, runProbes, analyzePolicy, type BucketActual, type Runner } from '../../infra/storage-check'

const ACCOUNT = '123456789012'
const D = (n: string) => STORAGE.buckets.find(b => b.name === n)!
const files = D('plexora-files'), backups = D('plexora-backups-{account}'), aetherA = D('aether-os-assets-{account}-eu-central-1-an'), aetherD = D('aether-os-data-peter-{account}-eu-central-1-an')
const prefixes = files.access.kind === 'public-prefixes' ? files.access.prefixes.map(p => p.prefix) : []
const goodFilesPolicy = { Statement: [{ Sid: 'o', Effect: 'Allow', Principal: '*', Action: 's3:GetObject', Resource: prefixes.map(p => `arn:aws:s3:::plexora-files/${p}/*`) }] }
const backupName = `plexora-backups-${ACCOUNT}`
const goodBackupPolicy = { Statement: [{ Sid: 'NurHTTPS', Effect: 'Deny', Principal: '*', Action: 's3:*', Resource: [`arn:aws:s3:::${backupName}`, `arn:aws:s3:::${backupName}/*`], Condition: { Bool: { 'aws:SecureTransport': 'false' } } }] }
const good = (d: BucketDecl, policy: any): BucketActual => ({
  exists: true, region: d.region, bpa: { ...d.blockPublicAccess }, encryption: d.encryption, versioning: d.versioning,
  lifecycle: d.lifecycle.map(l => ({ ID: l.id, Status: 'Enabled', Expiration: l.expirationDays ? { Days: l.expirationDays } : undefined, NoncurrentVersionExpiration: l.noncurrentDays ? { NoncurrentDays: l.noncurrentDays } : undefined })),
  policy, aclPublicGrants: [], ownership: d.ownership, website: false,
})
const aetherPolicy = { Statement: [{ Sid: 'PublicReadGetObject', Effect: 'Allow', Principal: '*', Action: 's3:GetObject', Resource: `arn:aws:s3:::aether-os-assets-${ACCOUNT}-eu-central-1-an/*` }] }
const filesOk = () => good(files, goodFilesPolicy), backupsOk = () => good(backups, goodBackupPolicy)
const cmp = (d: BucketDecl, a: BucketActual) => compareBucket(d, a, ACCOUNT)

describe('Ausgangslage: der erwartete Zustand ist in Ordnung', () => {
  it('alle vier Buckets', () => {
    expect(cmp(files, filesOk())).toEqual([]); expect(cmp(backups, backupsOk())).toEqual([])
    expect(cmp(aetherA, good(aetherA, aetherPolicy))).toEqual([]); expect(cmp(aetherD, good(aetherD, null))).toEqual([])
    expect(compareAccount(STORAGE, STORAGE.buckets.map(b => b.name.replace('{account}', ACCOUNT)), null, ACCOUNT)).toEqual([])
  })
})

describe('Gegenproben (jede muss ohne den Schutz rot werden)', () => {
  it('Policy mit Principal "*" auf den GANZEN Bucket', () => {
    const a = filesOk(); a.policy = { Statement: [{ Sid: 'x', Effect: 'Allow', Principal: '*', Action: 's3:GetObject', Resource: 'arn:aws:s3:::plexora-files/*' }] }
    expect(cmp(files, a).join('\n')).toMatch(/GANZEN Bucket/)
  })
  it('öffentliches Auflisten (s3:ListBucket, s3:*, Bucket-ARN)', () => {
    for (const [action, res] of [['s3:ListBucket', 'arn:aws:s3:::plexora-files'], ['s3:*', 'arn:aws:s3:::plexora-files/blog/*'], [['s3:GetObject', 's3:ListBucket'], ['arn:aws:s3:::plexora-files/blog/*', 'arn:aws:s3:::plexora-files']]] as const) {
      const a = filesOk(); a.policy = { Statement: [...goodFilesPolicy.Statement, { Sid: 'liste', Effect: 'Allow', Principal: '*', Action: action, Resource: res }] }
      expect(cmp(files, a).length, JSON.stringify(action)).toBeGreaterThan(0)
    }
  })
  it('ein neuer, nicht deklarierter Bucket im Konto', () => {
    const names = [...STORAGE.buckets.map(b => b.name.replace('{account}', ACCOUNT)), 'irgendein-neuer-bucket']
    expect(compareAccount(STORAGE, names, null, ACCOUNT).join('\n')).toMatch(/"irgendein-neuer-bucket" ist im Konto vorhanden, aber nicht deklariert/)
  })
  it('ein deklarierter Bucket fehlt im Konto', () => {
    expect(compareAccount(STORAGE, ['plexora-files'], null, ACCOUNT).join('\n')).toMatch(/ist deklariert, aber nicht im Konto/)
    expect(cmp(backups, { ...backupsOk(), exists: false }).join('\n')).toMatch(/existiert nicht/)
  })
  it('Sicherungs-Bucket ohne Block Public Access (nicht gesetzt oder teilweise aus)', () => {
    const a = backupsOk(); a.bpa = null; expect(cmp(backups, a).join('\n')).toMatch(/Block Public Access ist nicht gesetzt/)
    for (const k of ['BlockPublicAcls', 'IgnorePublicAcls', 'BlockPublicPolicy', 'RestrictPublicBuckets'] as const) { const b = backupsOk(); (b.bpa as any)[k] = false; expect(cmp(backups, b).join('\n'), k).toMatch(/Block Public Access weicht ab/) }
  })
  it('Sicherungs-Bucket mit öffentlicher Policy', () => {
    const a = backupsOk(); a.policy = { Statement: [...goodBackupPolicy.Statement, { Sid: 'oops', Effect: 'Allow', Principal: '*', Action: 's3:GetObject', Resource: `arn:aws:s3:::${backupName}/*` }] }
    expect(cmp(backups, a).join('\n')).toMatch(/GANZEN Bucket|nicht deklariert/)
  })
  it('Sicherungs-Bucket ohne Deny für unverschlüsselte Verbindungen', () => { const a = backupsOk(); a.policy = null; expect(cmp(backups, a).join('\n')).toMatch(/SecureTransport/) })
  it('Sicherungs-Bucket mit ACL für alle Benutzer', () => { const a = backupsOk(); a.aclPublicGrants = ['AllUsers:READ']; expect(cmp(backups, a).join('\n')).toMatch(/ACL gibt Gruppen Zugriff/) })
  it('öffentliches Präfix kommt dazu, eines fehlt', () => {
    const more = filesOk(); more.policy = { Statement: [{ ...goodFilesPolicy.Statement[0], Resource: [...goodFilesPolicy.Statement[0].Resource, 'arn:aws:s3:::plexora-files/lambda/*'] }] }
    expect(cmp(files, more).join('\n')).toMatch(/öffentliches Präfix "lambda" ist nicht deklariert/)
    const fewer = filesOk(); fewer.policy = { Statement: [{ ...goodFilesPolicy.Statement[0], Resource: goodFilesPolicy.Statement[0].Resource.slice(1) }] }
    expect(cmp(files, fewer).join('\n')).toMatch(/deklarierte öffentliche Präfixe fehlen: automotive/)
  })
  it('Abweichungen bei Verschlüsselung, Versionierung, Lifecycle, Ownership, Region, Website', () => {
    const e = filesOk(); e.encryption = null; expect(cmp(files, e).join('\n')).toMatch(/Verschlüsselung ist nicht gesetzt/)
    const v = filesOk(); v.versioning = 'Suspended'; expect(cmp(files, v).join('\n')).toMatch(/Versionierung/)
    const l1 = filesOk(); l1.lifecycle = []; expect(cmp(files, l1).join('\n')).toMatch(/Lifecycle-Regel "lambda-zips-alte-versionen" fehlt/)
    const l2 = filesOk(); l2.lifecycle[0].NoncurrentVersionExpiration = { NoncurrentDays: 3650 }; expect(cmp(files, l2).join('\n')).toMatch(/alte Versionen 3650 Tage statt 60/)
    const l3 = filesOk(); l3.lifecycle.push({ ID: 'fremd', Status: 'Enabled', Expiration: { Days: 1 } }); expect(cmp(files, l3).join('\n')).toMatch(/"fremd" ist nicht deklariert/)
    const l4 = backupsOk(); l4.lifecycle[0].Status = 'Disabled'; expect(cmp(backups, l4).join('\n')).toMatch(/nicht aktiv/)
    const o = filesOk(); o.ownership = 'ObjectWriter'; expect(cmp(files, o).join('\n')).toMatch(/Object Ownership/)
    const r = filesOk(); r.region = 'us-east-1'; expect(cmp(files, r).join('\n')).toMatch(/Region/)
    const w = filesOk(); w.website = true; expect(cmp(files, w).join('\n')).toMatch(/Website-Hosting/)
  })
  it('fremder Bucket (Aether): jede Abweichung vom festgeschriebenen Zustand fällt auf', () => {
    const closed = good(aetherA, null); expect(cmp(aetherA, closed).join('\n')).toMatch(/Abweichung vom festgeschriebenen Zustand/)
    const p = good(aetherD, { Statement: [{ Sid: 'x', Effect: 'Allow', Principal: '*', Action: 's3:GetObject', Resource: `arn:aws:s3:::aether-os-data-peter-${ACCOUNT}-eu-central-1-an/*` }] }); expect(cmp(aetherD, p).join('\n')).toMatch(/GANZEN Bucket/)
    const open = good(aetherA, aetherPolicy); open.bpa = { BlockPublicAcls: true, IgnorePublicAcls: true, BlockPublicPolicy: true, RestrictPublicBuckets: true }; expect(cmp(aetherA, open).join('\n')).toMatch(/Block Public Access weicht ab/)
  })
  it('Block Public Access auf Kontoebene taucht auf (öffentliche Bilder könnten brechen)', () => {
    const all = { BlockPublicAcls: true, IgnorePublicAcls: true, BlockPublicPolicy: true, RestrictPublicBuckets: true }
    expect(compareAccount(STORAGE, STORAGE.buckets.map(b => b.name.replace('{account}', ACCOUNT)), all, ACCOUNT).join('\n')).toMatch(/Konto-Ebene ist jetzt gesetzt/)
  })
  it('sonstige Policy-Tricks: Allow mit NotPrincipal/NotAction, fremdes Konto, öffentlich mit Bedingung', () => {
    for (const st of [{ NotPrincipal: { AWS: 'x' }, Principal: '*', Action: 's3:GetObject', Resource: 'arn:aws:s3:::plexora-files/blog/*' }, { Principal: '*', NotAction: 's3:Put*', Resource: 'arn:aws:s3:::plexora-files/blog/*' }, { Principal: { AWS: 'arn:aws:iam::999999999999:root' }, Action: 's3:*', Resource: 'arn:aws:s3:::plexora-files/*' }, { Principal: '*', Action: 's3:GetObject', Resource: 'arn:aws:s3:::plexora-files/blog/*', Condition: { StringLike: { 'aws:Referer': 'x' } } }, { Principal: { AWS: '*' }, Action: 's3:GetObject', Resource: 'arn:aws:s3:::plexora-files/*' }]) {
      expect(analyzePolicy({ Statement: [{ Sid: 't', Effect: 'Allow', ...st }] }, files, ACCOUNT).violations.length, JSON.stringify(st)).toBeGreaterThan(0)
    }
    expect(analyzePolicy({ Statement: [{ Sid: 'own', Effect: 'Allow', Principal: { AWS: `arn:aws:iam::${ACCOUNT}:role/x` }, Action: 's3:GetObject', Resource: 'arn:aws:s3:::plexora-files/*' }] }, files, ACCOUNT).violations).toEqual([])   // eigenes Konto ist kein öffentlicher Zugriff
  })
})

describe('HTTP-Prüfungen (Gegenproben mit künstlichen Antworten)', () => {
  const status = (table: Record<string, number>) => async (url: string) => { for (const [k, v] of Object.entries(table)) if (url.includes(k)) return v; return 403 }
  const input = { publicKeys: { blog: 'blog/a.jpg', branding: 'branding/logo.jpg' } as Record<string, string | null>, privateKey: 'lambda/lambda-new.zip' }
  it('alles wie erwartet', async () => {
    const r = await runProbes(files, ACCOUNT, input, status({ 'blog/a.jpg': 200, 'branding/logo.jpg': 200 }))
    expect(r.filter(x => !x.ok)).toEqual([]); expect(r.some(x => /Auflisten/.test(x.label))).toBe(true); expect(r.filter(x => /privater Schlüssel/.test(x.label)).length).toBe(2)
  })
  it('ein privates Objekt liefert 200', async () => {
    for (const leaked of ['lambda/lambda-new.zip', 'lambda-deploy/lambda-new.zip']) {
      const r = await runProbes(files, ACCOUNT, input, status({ [leaked]: 200, 'blog/a.jpg': 200, 'branding/logo.jpg': 200 })); expect(r.filter(x => !x.ok).map(x => x.label).join()).toMatch(/privater Schlüssel|nicht öffentlicher/)
    }
  })
  it('das Auflisten liefert 200', async () => {
    const r = await runProbes(files, ACCOUNT, input, status({ 'list-type=2': 200, 'blog/a.jpg': 200, 'branding/logo.jpg': 200 })); expect(r.filter(x => !x.ok).map(x => x.label).join()).toMatch(/Auflisten des Buckets: 200/)
  })
  it('ein deklariertes öffentliches Präfix liefert 403 (Bilder würden nicht laden)', async () => {
    const r = await runProbes(files, ACCOUNT, input, status({ 'branding/logo.jpg': 403, 'blog/a.jpg': 200 })); expect(r.filter(x => !x.ok).map(x => x.label).join()).toMatch(/branding\/: 403 \(erwartet 200\)/)
  })
  it('Sicherungs-Bucket: jeder Schlüssel und das Auflisten müssen 403 liefern', async () => {
    const r = await runProbes(backups, ACCOUNT, { publicKeys: {}, privateKey: 'jobs/x/export.enc' }, status({ 'export.enc': 200, 'list-type=2': 200 })); expect(r.filter(x => !x.ok)).toHaveLength(2)
  })
  it('Netzwerkfehler zählt als Fehler, nicht als Erfolg', async () => {
    const r = await runProbes(backups, ACCOUNT, { publicKeys: {}, privateKey: 'k' }, async () => { throw new Error('offline') }); expect(r.every(x => !x.ok)).toBe(true)
  })
  it('Schlüssel mit Sonderzeichen werden pro Segment kodiert', async () => {
    const urls: string[] = []; await runProbes(backups, ACCOUNT, { publicKeys: {}, privateKey: 'jobs/Müller Bericht #1.enc' }, async (u) => { urls.push(u); return 403 })
    expect(urls.some(u => u.endsWith('/jobs/M%C3%BCller%20Bericht%20%231.enc'))).toBe(true)
  })
})

describe('Zustand lesen (collectBucket) mit gefälschtem aws', () => {
  const answers = (m: Record<string, { code?: number; out?: any; err?: string }>): Runner => (args) => { const key = args[1] === 'head-bucket' ? 'head-bucket' : args[1]; const r = m[key]; return r ? { code: r.code ?? 0, stdout: r.out === undefined ? '' : JSON.stringify(r.out), stderr: r.err || '' } : { code: 255, stdout: '', stderr: `An error occurred (AccessDenied) when calling ${key}` } }
  const ok = { 'head-bucket': {}, 'get-bucket-location': { out: { LocationConstraint: 'eu-central-1' } }, 'get-public-access-block': { out: { PublicAccessBlockConfiguration: { BlockPublicAcls: true, IgnorePublicAcls: true, BlockPublicPolicy: true, RestrictPublicBuckets: true } } },
    'get-bucket-encryption': { out: { ServerSideEncryptionConfiguration: { Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } }] } } }, 'get-bucket-versioning': { out: {} },
    'get-bucket-lifecycle-configuration': { code: 254, err: 'An error occurred (NoSuchLifecycleConfiguration)' }, 'get-bucket-policy': { code: 254, err: 'An error occurred (NoSuchBucketPolicy)' }, 'get-bucket-acl': { out: { Grants: [{ Grantee: { Type: 'CanonicalUser' }, Permission: 'FULL_CONTROL' }] } },
    'get-bucket-ownership-controls': { out: { OwnershipControls: { Rules: [{ ObjectOwnership: 'BucketOwnerEnforced' }] } } }, 'get-bucket-website': { code: 254, err: 'An error occurred (NoSuchWebsiteConfiguration)' } }
  it('liest einen privaten Bucket ohne Policy/Lifecycle als in Ordnung', () => {
    const { actual, errors } = collectBucket(`aether-os-data-peter-${ACCOUNT}-eu-central-1-an`, answers(ok)); expect(errors).toEqual([]); expect(compareBucket(aetherD, actual, ACCOUNT)).toEqual([])
  })
  it('ein Recht fehlt (AccessDenied): wird als Fehler gemeldet, nicht geraten', () => {
    const { errors } = collectBucket('x', answers({ ...ok, 'get-public-access-block': {} as any, 'get-bucket-policy': undefined as any }))
    expect(errors.join('\n')).toMatch(/Policy nicht lesbar \(.*AccessDenied/)
  })
  it('Bucket ohne Zugriff oder nicht vorhanden', () => {
    expect(collectBucket('x', answers({ 'head-bucket': { code: 254, err: 'An error occurred (404) when calling the HeadBucket operation: Not Found' } })).actual.exists).toBe(false)
    expect(collectBucket('x', answers({ 'head-bucket': { code: 254, err: 'An error occurred (403) Forbidden' } })).errors.join()).toMatch(/Zugriff auf den Bucket nicht möglich/)
  })
  it('öffentliche ACL-Gruppen werden erkannt', () => {
    const { actual } = collectBucket('x', answers({ ...ok, 'get-bucket-acl': { out: { Grants: [{ Grantee: { Type: 'Group', URI: 'http://acs.amazonaws.com/groups/global/AllUsers' }, Permission: 'READ' }] } } })); expect(actual.aclPublicGrants).toEqual(['AllUsers:READ'])
  })
  it('Website-Hosting wird erkannt', () => { expect(collectBucket('x', answers({ ...ok, 'get-bucket-website': { out: { IndexDocument: { Suffix: 'index.html' } } } })).actual.website).toBe(true) })
})
