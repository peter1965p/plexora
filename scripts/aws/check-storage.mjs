// Speicher-Gate (nur lesend): vergleicht den ECHTEN Zustand aller S3-Buckets im Konto mit der Deklaration in infra/storage-policy.ts
// (Policy, Block Public Access, Verschlüsselung, Versionierung, Lifecycle, ACL, Ownership, Website) und prüft per HTTP:
// private Objekte liefern 403, das Auflisten liefert 403, deklarierte öffentliche Präfixe liefern 200.
// Aufruf über scripts/aws/check-storage.sh. Es wird nichts verändert und keine Objektinhalte werden gelesen (nur Statuscodes).
import { spawnSync } from 'node:child_process'
import { STORAGE, resolveBucketName } from '../../infra/storage-policy.ts'
import { collectBucket, compareBucket, compareAccount, runProbes, validateDeclaration } from '../../infra/storage-check.ts'

const args = new Set(process.argv.slice(2))
const HTTP_ONLY = args.has('--http-only')      // nur HTTP-Prüfungen (für check-public-flows.sh), keine Konfigurations-Abfragen
const NO_HTTP = args.has('--no-http')
const green = (s) => `\x1b[32m${s}\x1b[0m`, red = (s) => `\x1b[31m${s}\x1b[0m`
let failed = false
const ok = (m) => console.log(`  ${green('OK')}   ${m}`)
const bad = (m) => { failed = true; console.log(`  ${red('FEHLER')} ${m}`) }
const note = (m) => console.log(`  --   ${m}`)

const run = (a) => { const r = spawnSync('aws', a, { encoding: 'utf8', timeout: 60000 }); return { code: r.status ?? 1, stdout: r.stdout || '', stderr: r.stderr || '' } }
const httpStatus = async (url, kind) => { const r = await fetch(url, { method: kind === 'get' ? 'GET' : 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(20000) }); try { await r.body?.cancel() } catch {} ; return r.status }

console.log('== Speicher-Regel (infra/storage-policy.ts)')
const decl = validateDeclaration(STORAGE)
decl.length ? decl.forEach(bad) : ok(`Deklaration in sich stimmig (${STORAGE.buckets.length} Buckets)`)

const who = run(['sts', 'get-caller-identity', '--query', 'Account', '--output', 'text'])
const account = who.stdout.trim()
if (!/^\d{12}$/.test(account)) { bad(`Konto nicht ermittelbar: ${who.stderr.split('\n')[0]}`); process.exit(1) }

if (!HTTP_ONLY) {
  // ── Konto: nicht deklarierte Buckets, Block Public Access auf Kontoebene ──
  const lb = run(['s3api', 'list-buckets', '--query', 'Buckets[].Name', '--output', 'json'])
  let names = []
  try { names = JSON.parse(lb.stdout) } catch { bad(`list-buckets nicht lesbar: ${lb.stderr.split('\n')[0]}`) }
  const ab = run(['s3control', 'get-public-access-block', '--account-id', account, '--output', 'json'])
  let accountBpa = null
  if (ab.code === 0) { try { accountBpa = JSON.parse(ab.stdout).PublicAccessBlockConfiguration } catch {} }
  else if (!ab.stderr.includes('NoSuchPublicAccessBlockConfiguration')) bad(`Block Public Access auf Kontoebene nicht lesbar: ${ab.stderr.split('\n')[0].slice(0, 160)}`)
  const acc = compareAccount(STORAGE, names, accountBpa, account)
  acc.length ? acc.forEach(bad) : ok(`Konto: ${names.length} Buckets, alle deklariert; Block Public Access auf Kontoebene wie deklariert`)

  console.log('== Zustand je Bucket (Policy, Block Public Access, Verschlüsselung, Versionierung, Lifecycle)')
  for (const b of STORAGE.buckets) {
    const name = resolveBucketName(b.name, account)
    const { actual, errors } = collectBucket(name, run)
    errors.forEach(bad)
    const problems = compareBucket(b, actual, account)
    problems.length ? problems.forEach(bad) : ok(`${name} entspricht der Deklaration (${b.access.kind === 'private' ? 'privat' : b.access.kind === 'public-whole' ? 'ganzer Bucket öffentlich, fremdes Projekt' : b.access.prefixes.length + ' öffentliche Präfixe'})`)
  }
}

if (!NO_HTTP) {
  console.log('== HTTP: privat bleibt privat, Auflisten verboten, öffentliche Präfixe erreichbar')
  const firstKey = (name, prefix) => {
    // JSON statt Text: bei --max-items hängt die Text-Ausgabe eine Zeile "None" (Seitenmarke) an
    const r = run(['s3api', 'list-objects-v2', '--bucket', name, ...(prefix ? ['--prefix', prefix] : []), '--max-items', '1', '--query', 'Contents[].Key', '--output', 'json'])
    if (r.code !== 0) return undefined          // nicht lesbar (z. B. kein Listen-Recht)
    try { const k = (JSON.parse(r.stdout) || [])[0]; return typeof k === 'string' ? k : null } catch { return null }
  }
  for (const b of STORAGE.buckets) {
    const name = resolveBucketName(b.name, account)
    const input = { publicKeys: {}, privateKey: null }
    let listable = true
    if (b.access.kind === 'public-prefixes') {
      for (const x of b.access.prefixes) { const k = firstKey(name, `${x.prefix}/`); if (k === undefined) { listable = false; break } input.publicKeys[x.prefix] = k }
      // ein Schlüssel außerhalb der öffentlichen Präfixe: aus den ersten Einträgen den ersten mit anderem Ordner
      const r = run(['s3api', 'list-objects-v2', '--bucket', name, '--max-items', '300', '--query', 'Contents[].Key', '--output', 'json'])
      try { const keys = JSON.parse(r.stdout) || []; input.privateKey = keys.find(k => !b.access.prefixes.some(x => k.startsWith(`${x.prefix}/`))) ?? null } catch {}
    } else if (b.access.kind === 'public-whole') { const k = firstKey(name, ''); if (k === undefined) listable = false; else input.publicKeys['*'] = k }
    else { const k = firstKey(name, ''); if (k === undefined) listable = false; else input.privateKey = k }
    if (!listable) note(`${name}: Objekte nicht ermittelbar (kein Recht zum Auflisten) – nur Auflisten und feste Beispielschlüssel werden geprüft`)
    for (const r of await runProbes(b, account, input, httpStatus)) r.ok ? ok(r.label) : bad(r.label)
  }
}

console.log()
if (failed) { console.log(red('Speicher-Prüfung FEHLGESCHLAGEN.') + ' Ursache beheben oder (bei gewollter Änderung) infra/storage-policy.ts anpassen und begründen.'); process.exit(1) }
console.log('Speicher-Prüfung bestanden.')
