import type { BucketDecl, BlockPublicAccess, StorageDeclaration } from './storage-policy.ts'
import { resolveBucketName } from './storage-policy.ts'

// Prüflogik der Speicher-Regel. Reine Funktionen: Der Offline-Test (tests/storage) füttert sie mit Skript-Policies und künstlichen Zuständen,
// das Deploy-Gate (scripts/aws/check-storage.mjs) mit dem echten Zustand aus AWS (nur lesend) und mit HTTP-Antworten.

// ───────────────────────── Policy-Analyse ─────────────────────────
export interface PolicyAnalysis { violations: string[]; publicPrefixes: string[]; wholePublic: boolean; secureTransportDeny: boolean }

const asArray = (v: unknown): unknown[] => (v === undefined ? [] : Array.isArray(v) ? v : [v])
const isPublicPrincipal = (p: unknown): boolean => p === '*' || (typeof p === 'object' && p !== null && asArray((p as any).AWS).some(x => x === '*'))
const isOwnAccountPrincipal = (p: unknown, account: string): boolean => typeof p === 'object' && p !== null && !('Service' in (p as any)) && asArray((p as any).AWS).length > 0
  && asArray((p as any).AWS).every(x => typeof x === 'string' && (x === account || new RegExp(`^arn:aws:iam::${account}:`).test(x)))

/**
 * Prüft eine Bucket-Policy gegen die Deklaration. Öffentlich (Principal "*") ist nur erlaubt:
 *  - Effect Allow, Action genau s3:GetObject (kein Auflisten, kein "s3:*", kein "s3:Get*"), ohne Bedingung,
 *  - auf "<Bucket>/<deklariertes Präfix>/*" (nie auf den ganzen Bucket, außer bei fremden Projekten mit kind "public-whole").
 * Deny-Anweisungen schränken nur ein und sind erlaubt.
 */
export function analyzePolicy(policy: any, decl: BucketDecl, account: string): PolicyAnalysis {
  const name = resolveBucketName(decl.name, account)
  const out: PolicyAnalysis = { violations: [], publicPrefixes: [], wholePublic: false, secureTransportDeny: false }
  if (!policy) return out
  const declared = decl.access.kind === 'public-prefixes' ? decl.access.prefixes.map(p => p.prefix) : []
  for (const s of asArray(policy.Statement) as any[]) {
    const sid = s?.Sid || '(ohne Sid)'
    if (s?.Effect === 'Deny') {
      const acts = asArray(s.Action).map(a => String(a).toLowerCase()), res = asArray(s.Resource).map(String)
      const cond = JSON.stringify(s.Condition || {}).toLowerCase()
      if (acts.includes('s3:*') && cond.includes('securetransport') && cond.includes('false') && res.includes(`arn:aws:s3:::${name}`) && res.includes(`arn:aws:s3:::${name}/*`)) out.secureTransportDeny = true
      continue
    }
    if (s?.Effect !== 'Allow') { out.violations.push(`${sid}: unbekannter Effect "${s?.Effect}"`); continue }
    if (s.NotPrincipal !== undefined || s.NotAction !== undefined || s.NotResource !== undefined) { out.violations.push(`${sid}: Allow mit NotPrincipal/NotAction/NotResource ist nicht erlaubt`); continue }
    if (!isPublicPrincipal(s.Principal)) {
      if (!isOwnAccountPrincipal(s.Principal, account)) out.violations.push(`${sid}: Principal ${JSON.stringify(s.Principal)} ist weder öffentlich deklariert noch das eigene Konto`)
      continue
    }
    // ── öffentlich ──
    const actions = asArray(s.Action).map(a => String(a))
    const bad = actions.filter(a => a.toLowerCase() !== 's3:getobject')
    if (actions.length === 0 || bad.length) out.violations.push(`${sid}: öffentlich erlaubt ist nur s3:GetObject, gefunden: ${bad.join(', ') || '(keine Aktion)'}`)
    if (s.Condition) out.violations.push(`${sid}: öffentliche Anweisung mit Bedingung – nicht deklariert`)
    for (const r of asArray(s.Resource).map(String)) {
      const m = r.match(new RegExp(`^arn:aws:s3:::${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/.*)?$`))
      if (!m) { out.violations.push(`${sid}: öffentliche Ressource gehört nicht zu diesem Bucket: ${r}`); continue }
      if (m[1] === undefined) { out.violations.push(`${sid}: öffentlich auf den Bucket selbst (Auflisten) ist verboten`); continue }
      if (m[1] === '/*') {
        if (decl.access.kind === 'public-whole') out.wholePublic = true
        else out.violations.push(`${sid}: öffentlich auf den GANZEN Bucket (${r}) ist nicht deklariert`)
        continue
      }
      const pm = m[1].match(/^\/([A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*)\/\*$/)
      if (!pm) { out.violations.push(`${sid}: öffentliche Ressource mit Platzhalter oder ungewöhnlichem Muster: ${r}`); continue }
      if (!declared.includes(pm[1])) out.violations.push(`${sid}: öffentliches Präfix "${pm[1]}" ist nicht deklariert`)
      else out.publicPrefixes.push(pm[1])
    }
  }
  return out
}

// ───────────────────────── Zustand eines Buckets ─────────────────────────
export interface LifecycleActual { ID?: string; Status?: string; Expiration?: { Days?: number }; NoncurrentVersionExpiration?: { NoncurrentDays?: number } }
export interface BucketActual {
  exists: boolean
  region: string | null
  bpa: BlockPublicAccess | null
  encryption: string | null
  versioning: string
  lifecycle: LifecycleActual[]
  policy: any | null
  aclPublicGrants: string[]
  ownership: string | null
  website: boolean
}

const same = (a: BlockPublicAccess, b: BlockPublicAccess) => (Object.keys(a) as (keyof BlockPublicAccess)[]).every(k => a[k] === b[k])
const fmtBpa = (b: BlockPublicAccess | null) => (b ? Object.entries(b).map(([k, v]) => `${k}=${v}`).join(', ') : '(nicht gesetzt)')

/** Vergleicht den echten Zustand eines Buckets mit der Deklaration. Liefert Abweichungen (leer = in Ordnung). */
export function compareBucket(decl: BucketDecl, a: BucketActual, account: string): string[] {
  const p: string[] = []
  const name = resolveBucketName(decl.name, account)
  if (!a.exists) return [`${name}: Bucket existiert nicht (deklariert, aber nicht im Konto)`]
  if (a.region !== decl.region) p.push(`${name}: Region ${a.region} statt ${decl.region}`)
  if (!a.bpa) p.push(`${name}: Block Public Access ist nicht gesetzt (erwartet: ${fmtBpa(decl.blockPublicAccess)})`)
  else if (!same(a.bpa, decl.blockPublicAccess)) p.push(`${name}: Block Public Access weicht ab (ist: ${fmtBpa(a.bpa)}; erwartet: ${fmtBpa(decl.blockPublicAccess)})`)
  if (a.encryption !== decl.encryption) p.push(`${name}: Verschlüsselung ist ${a.encryption ?? 'nicht gesetzt'}, erwartet ${decl.encryption}`)
  if (a.versioning !== decl.versioning) p.push(`${name}: Versionierung ist ${a.versioning}, erwartet ${decl.versioning}`)
  if (a.ownership !== decl.ownership) p.push(`${name}: Object Ownership ist ${a.ownership ?? 'nicht gesetzt'}, erwartet ${decl.ownership} (ACLs sollen nie wirken)`)
  if (a.website) p.push(`${name}: Website-Hosting ist aktiv (nicht deklariert)`)
  if (a.aclPublicGrants.length) p.push(`${name}: ACL gibt Gruppen Zugriff (${a.aclPublicGrants.join(', ')})`)

  // Lifecycle: genau die deklarierten Regeln
  const want = new Map(decl.lifecycle.map(r => [r.id, r]))
  for (const r of a.lifecycle) {
    const w = r.ID ? want.get(r.ID) : undefined
    if (!w) { p.push(`${name}: Lifecycle-Regel "${r.ID}" ist nicht deklariert`); continue }
    if (r.Status !== 'Enabled') p.push(`${name}: Lifecycle-Regel "${r.ID}" ist nicht aktiv (${r.Status})`)
    if (r.Expiration?.Days !== w.expirationDays) p.push(`${name}: Lifecycle "${r.ID}": Ablauf ${r.Expiration?.Days ?? '–'} Tage statt ${w.expirationDays ?? '–'}`)
    if (r.NoncurrentVersionExpiration?.NoncurrentDays !== w.noncurrentDays) p.push(`${name}: Lifecycle "${r.ID}": alte Versionen ${r.NoncurrentVersionExpiration?.NoncurrentDays ?? '–'} Tage statt ${w.noncurrentDays ?? '–'}`)
  }
  for (const id of want.keys()) if (!a.lifecycle.some(r => r.ID === id)) p.push(`${name}: Lifecycle-Regel "${id}" fehlt`)

  // Policy
  const an = analyzePolicy(a.policy, decl, account)
  p.push(...an.violations.map(v => `${name}: Policy: ${v}`))
  if (decl.access.kind === 'private') { /* jede öffentliche Anweisung wäre oben schon als Verstoß (Präfix/Ganzer Bucket nicht deklariert) gemeldet */ }
  if (decl.access.kind === 'public-prefixes') {
    const have = [...new Set(an.publicPrefixes)].sort(), want2 = decl.access.prefixes.map(x => x.prefix).sort()
    const missing = want2.filter(x => !have.includes(x)), extra = have.filter(x => !want2.includes(x))
    if (missing.length) p.push(`${name}: Policy: deklarierte öffentliche Präfixe fehlen: ${missing.join(', ')} (Bilder würden nicht laden)`)
    if (extra.length) p.push(`${name}: Policy: nicht deklarierte öffentliche Präfixe: ${extra.join(', ')}`)
  }
  if (decl.access.kind === 'public-whole' && !an.wholePublic) p.push(`${name}: deklariert als öffentlich, die Policy erlaubt das aber nicht mehr (Abweichung vom festgeschriebenen Zustand)`)
  if (decl.access.kind !== 'public-whole' && an.wholePublic) p.push(`${name}: Policy macht den ganzen Bucket öffentlich`)
  if (decl.denyInsecureTransport && !an.secureTransportDeny) p.push(`${name}: Policy ohne Deny für unverschlüsselte Verbindungen (aws:SecureTransport)`)
  return p
}

/** Konto-Ebene: kein nicht deklarierter Bucket, kein deklarierter fehlt, Block Public Access auf Kontoebene wie deklariert. */
export function compareAccount(decl: StorageDeclaration, accountBuckets: string[], accountBpa: BlockPublicAccess | null, account: string): string[] {
  const p: string[] = []
  const declared = new Set(decl.buckets.map(b => resolveBucketName(b.name, account)))
  for (const n of accountBuckets) if (!declared.has(n)) p.push(`Bucket "${n}" ist im Konto vorhanden, aber nicht deklariert (infra/storage-policy.ts): Zweck und Zugriff bewusst festlegen`)
  // Fehlt ein FREMDER Bucket (owner extern), meldet das compareBucket als Warnung; fehlt ein Plexora-Bucket, ist es ein Abbruch
  for (const b of decl.buckets) { const n = resolveBucketName(b.name, account); if (b.owner === 'plexora' && !accountBuckets.includes(n)) p.push(`Bucket "${n}" ist deklariert, aber nicht im Konto`) }
  if (decl.accountBlockPublicAccess === null && accountBpa !== null) p.push(`Block Public Access auf Konto-Ebene ist jetzt gesetzt (${fmtBpa(accountBpa)}), deklariert ist "nicht gesetzt": prüfen, ob öffentliche Bilder noch laden, dann deklarieren`)
  if (decl.accountBlockPublicAccess !== null && (accountBpa === null || !same(accountBpa, decl.accountBlockPublicAccess))) p.push(`Block Public Access auf Konto-Ebene weicht ab (ist: ${fmtBpa(accountBpa)}; erwartet: ${fmtBpa(decl.accountBlockPublicAccess)})`)
  return p
}

// ───────────────────────── Deklaration prüfen ─────────────────────────
export function validateDeclaration(decl: StorageDeclaration): string[] {
  const p: string[] = []
  const names = decl.buckets.map(b => b.name)
  if (new Set(names).size !== names.length) p.push('Bucket-Namen sind nicht eindeutig')
  for (const b of decl.buckets) {
    if (!b.purpose || b.purpose.length < 15) p.push(`${b.name}: Zweck fehlt oder ist zu kurz`)
    if (b.access.kind === 'private' && !same(b.blockPublicAccess, { BlockPublicAcls: true, IgnorePublicAcls: true, BlockPublicPolicy: true, RestrictPublicBuckets: true })) p.push(`${b.name}: privater Bucket braucht Block Public Access komplett an`)
    if (b.access.kind !== 'private' && (b.blockPublicAccess.BlockPublicPolicy || b.blockPublicAccess.RestrictPublicBuckets)) p.push(`${b.name}: öffentlicher Bucket kann mit BlockPublicPolicy/RestrictPublicBuckets nicht funktionieren`)
    if (b.access.kind === 'public-whole' && b.owner !== 'extern') p.push(`${b.name}: "ganzer Bucket öffentlich" ist nur für fremde Projekte (owner extern) zulässig`)
    if (b.access.kind === 'public-whole' && b.access.reason.length < 30) p.push(`${b.name}: Begründung für "ganzer Bucket öffentlich" fehlt`)
    if (b.access.kind === 'public-prefixes') {
      if (!b.access.prefixes.length) p.push(`${b.name}: public-prefixes ohne Präfix`)
      for (const x of b.access.prefixes) {
        if (!/^[a-z0-9][a-z0-9-]*$/.test(x.prefix)) p.push(`${b.name}: Präfix "${x.prefix}" ist ungültig (nur ein Ordnername, keine Platzhalter)`)
        if (x.reason.length < 15) p.push(`${b.name}: Präfix "${x.prefix}" hat keine ausreichende Begründung`)
      }
      if (new Set(b.access.prefixes.map(x => x.prefix)).size !== b.access.prefixes.length) p.push(`${b.name}: doppelte Präfixe`)
    }
    if (!b.encryption) p.push(`${b.name}: Verschlüsselung fehlt`)
  }
  return p
}

// ───────────────────────── Zustand aus AWS lesen (nur lesend, Runner wird übergeben) ─────────────────────────
export interface RunResult { code: number; stdout: string; stderr: string }
export type Runner = (args: string[]) => RunResult

const NOT_FOUND = ['NoSuchBucketPolicy', 'NoSuchPublicAccessBlockConfiguration', 'ServerSideEncryptionConfigurationNotFoundError', 'NoSuchLifecycleConfiguration', 'OwnershipControlsNotFoundError', 'NoSuchWebsiteConfiguration']

function read(run: Runner, args: string[]): { json: any | null; notFound: boolean; error: string | null } {
  const r = run(args)
  if (r.code === 0) { try { return { json: r.stdout.trim() ? JSON.parse(r.stdout) : {}, notFound: false, error: null } } catch { return { json: null, notFound: false, error: 'Antwort nicht lesbar' } } }
  if (NOT_FOUND.some(n => r.stderr.includes(n))) return { json: null, notFound: true, error: null }
  if (/NoSuchBucket\b|\(404\)|Not Found/.test(r.stderr)) return { json: null, notFound: true, error: 'NoSuchBucket' }
  return { json: null, notFound: false, error: (r.stderr.split('\n').find(l => l.trim()) || 'Fehler').slice(0, 200) }
}

/** Liest den Zustand eines Buckets. Kann etwas nicht gelesen werden (z. B. fehlendes Recht), steht es in errors: das Gate behandelt das als Fehler (nichts wird geraten). */
export function collectBucket(name: string, run: Runner): { actual: BucketActual; errors: string[] } {
  const errors: string[] = []
  const get = (label: string, args: string[]) => { const r = read(run, ['s3api', ...args, '--bucket', name, '--output', 'json']); if (r.error && r.error !== 'NoSuchBucket') errors.push(`${name}: ${label} nicht lesbar (${r.error})`); return r }
  const head = run(['s3api', 'head-bucket', '--bucket', name])
  if (head.code !== 0) {
    const gone = /404|Not Found|NoSuchBucket/.test(head.stderr)
    return { actual: { exists: false, region: null, bpa: null, encryption: null, versioning: 'None', lifecycle: [], policy: null, aclPublicGrants: [], ownership: null, website: false }, errors: gone ? [] : [`${name}: Zugriff auf den Bucket nicht möglich (${head.stderr.split('\n')[0].slice(0, 160)})`] }
  }
  const loc = get('Region', ['get-bucket-location'])
  const bpa = get('Block Public Access', ['get-public-access-block'])
  const enc = get('Verschlüsselung', ['get-bucket-encryption'])
  const ver = get('Versionierung', ['get-bucket-versioning'])
  const lc = get('Lifecycle', ['get-bucket-lifecycle-configuration'])
  const pol = get('Policy', ['get-bucket-policy'])
  const acl = get('ACL', ['get-bucket-acl'])
  const own = get('Object Ownership', ['get-bucket-ownership-controls'])
  const web = get('Website-Hosting', ['get-bucket-website'])
  let policy: any = null
  if (pol.json?.Policy) { try { policy = JSON.parse(pol.json.Policy) } catch { errors.push(`${name}: Policy nicht lesbar`) } }
  return {
    errors,
    actual: {
      exists: true,
      region: loc.json ? (loc.json.LocationConstraint || 'us-east-1') : null,
      bpa: bpa.json?.PublicAccessBlockConfiguration ?? null,
      encryption: enc.json?.ServerSideEncryptionConfiguration?.Rules?.[0]?.ApplyServerSideEncryptionByDefault?.SSEAlgorithm ?? null,
      versioning: ver.json?.Status || 'None',
      lifecycle: lc.json?.Rules ?? [],
      policy,
      aclPublicGrants: (acl.json?.Grants ?? []).filter((g: any) => /AllUsers|AuthenticatedUsers/.test(g?.Grantee?.URI || '')).map((g: any) => `${String(g.Grantee.URI).split('/').pop()}:${g.Permission}`),
      ownership: own.json?.OwnershipControls?.Rules?.[0]?.ObjectOwnership ?? null,
      website: !!web.json && !web.notFound,
    },
  }
}

// ───────────────────────── HTTP-Prüfungen ─────────────────────────
export interface ProbeResult { ok: boolean; label: string }
export type HttpStatus = (url: string, kind: 'head' | 'get') => Promise<number>

export interface ProbeInput {
  /** je öffentliches Präfix ein vorhandener Schlüssel (oder null, wenn leer/unbekannt) */
  publicKeys: Record<string, string | null>
  /** ein vorhandener Schlüssel außerhalb der öffentlichen Präfixe (oder null) */
  privateKey: string | null
}

/**
 * Private Schlüssel müssen 403 liefern, das Auflisten 403, deklarierte Präfixe 200 (nur wo ein Objekt vorhanden ist).
 * Ein privater Bucket: jeder Schlüssel und das Auflisten 403. Ganzer Bucket öffentlich (fremd): ein Schlüssel 200, Auflisten 403.
 */
export async function runProbes(decl: BucketDecl, account: string, input: ProbeInput, status: HttpStatus): Promise<ProbeResult[]> {
  const name = resolveBucketName(decl.name, account)
  const base = `https://${name}.s3.${decl.region}.amazonaws.com`
  const out: ProbeResult[] = []
  const want = async (label: string, url: string, expect: number, kind: 'head' | 'get' = 'head') => {
    let got = -1
    try { got = await status(url, kind) } catch { got = -1 }
    out.push({ ok: got === expect, label: `${label}: ${got === -1 ? 'keine Antwort' : got} (erwartet ${expect})` })
  }
  await want(`${name}: Auflisten des Buckets`, `${base}/?list-type=2&max-keys=1`, 403, 'get')
  for (const k of decl.privateExamples) await want(`${name}: privater Schlüssel ${k}`, `${base}/${k}`, 403)
  if (input.privateKey) await want(`${name}: nicht öffentlicher Schlüssel (Stichprobe)`, `${base}/${input.privateKey.split('/').map(encodeURIComponent).join('/')}`, 403)
  if (decl.access.kind === 'public-prefixes') {
    for (const x of decl.access.prefixes) {
      const k = input.publicKeys[x.prefix]
      if (!k) { out.push({ ok: true, label: `${name}: ${x.prefix}/ – kein Objekt zum Testen (übersprungen)` }); continue }
      await want(`${name}: öffentliches Präfix ${x.prefix}/`, `${base}/${k.split('/').map(encodeURIComponent).join('/')}`, 200)
    }
  }
  if (decl.access.kind === 'public-whole') {
    const k = input.publicKeys['*']
    if (k) await want(`${name}: öffentliches Objekt (ganzer Bucket)`, `${base}/${k.split('/').map(encodeURIComponent).join('/')}`, 200)
    else out.push({ ok: true, label: `${name}: kein Objekt zum Testen (übersprungen)` })
  }
  return out
}
