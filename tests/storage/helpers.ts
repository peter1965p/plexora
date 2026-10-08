import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Quelltexte, in denen Bucket-Namen vorkommen dürfen (nicht: Tests, Dokumentation, node_modules, Build-Ausgaben)
const ROOTS = ['server', 'app', 'shared', 'scripts', 'lambdas', 'infra', 'functions']
const FILES = ['nuxt.config.ts', 'package.json']
const EXT = /\.(ts|mjs|js|vue|sh|py|json)$/

export function sourceFiles(): string[] {
  const out: string[] = []
  const walk = (d: string) => { let names: string[] = []; try { names = readdirSync(d) } catch { return } for (const n of names) { if (n === 'node_modules' || n === '.nuxt' || n === '.output') continue; const f = join(d, n); statSync(f).isDirectory() ? walk(f) : EXT.test(n) && out.push(f) } }
  ROOTS.forEach(walk)
  for (const f of FILES) { try { statSync(f); out.push(f) } catch { /* fehlt */ } }
  return out
}

// Muster, an denen ein S3-Bucket-Name im Quelltext erkennbar ist. "$ACCOUNT" steht für die Konto-ID und wird zu "{account}".
const NAME = String.raw`([a-z0-9][a-z0-9.\-]*(?:\$\{?ACCOUNT\}?)?[a-z0-9.\-]*)`
const PATTERNS: RegExp[] = [
  new RegExp(String.raw`\b[A-Z_]*BUCKET[A-Z_]*\s*=\s*["']${NAME}["']`, 'g'),            // BUCKET="…", SRC_BUCKET = '…'
  new RegExp(String.raw`\bBucket\s*:\s*["']${NAME}["']`, 'g'),                            // Bucket: 'name'
  new RegExp(String.raw`--bucket[ =]["']?${NAME}["']?`, 'g'),                              // --bucket name
  new RegExp(String.raw`arn:aws:s3:::${NAME}`, 'g'),                                       // ARN
  new RegExp(String.raw`s3://${NAME}`, 'g'),                                               // s3://name
  new RegExp(String.raw`https?://${NAME}\.s3[.-][a-z0-9.-]*amazonaws\.com`, 'g'),           // https://name.s3.region.amazonaws.com
]
export interface BucketRef { name: string; file: string; line: number }

export function findBucketRefs(files: string[]): BucketRef[] {
  const refs: BucketRef[] = []
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n')
    lines.forEach((text, i) => {
      for (const re of PATTERNS) {
        re.lastIndex = 0
        for (const m of text.matchAll(re)) {
          let n = m[1].replace(/\$\{?ACCOUNT\}?/g, '{account}').replace(/[.-]+$/, '')
          if (!n || n.startsWith('$') || n.includes('$') || n.length < 3) continue       // Variablen ($BUCKET) sind keine Namen
          refs.push({ name: n, file, line: i + 1 })
        }
      }
    })
  }
  return refs
}
