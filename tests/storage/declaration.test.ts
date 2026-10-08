import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { STORAGE, resolveBucketName, type StorageDeclaration, type BucketDecl } from '../../infra/storage-policy'
import { validateDeclaration } from '../../infra/storage-check'
import { PUBLIC_S3_PREFIXES, UPLOAD_BLOCKED_PREFIXES } from '../../server/utils/s3Policy'
import { sourceFiles, findBucketRefs } from './helpers'

const ACCOUNT = '123456789012'
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))
const bucket = (name: string) => STORAGE.buckets.find(b => b.name === name)!

describe('Deklaration (infra/storage-policy.ts)', () => {
  it('ist in sich stimmig', () => expect(validateDeclaration(STORAGE)).toEqual([]))
  it('jeder Bucket hat Zweck, Verschlüsselung, Versionierung, Lifecycle-Angabe und Block Public Access', () => {
    for (const b of STORAGE.buckets) { expect(b.purpose.length, b.name).toBeGreaterThan(15); expect(['AES256', 'aws:kms']).toContain(b.encryption); expect(['Enabled', 'None']).toContain(b.versioning); expect(Array.isArray(b.lifecycle)).toBe(true); expect(Object.keys(b.blockPublicAccess).sort()).toEqual(['BlockPublicAcls', 'BlockPublicPolicy', 'IgnorePublicAcls', 'RestrictPublicBuckets']) }
  })
  it('die öffentlichen Präfixe von plexora-files sind genau die Liste des Servers (server/utils/s3Policy.ts) – beides in einem Zug pflegen', () => {
    const a = bucket('plexora-files').access
    expect(a.kind).toBe('public-prefixes'); if (a.kind !== 'public-prefixes') return
    expect(a.prefixes.map(p => p.prefix).sort()).toEqual([...PUBLIC_S3_PREFIXES].sort())
    for (const p of UPLOAD_BLOCKED_PREFIXES) expect(a.prefixes.some(x => x.prefix === p), `${p} ist gesperrt für den allgemeinen Upload, aber lesbar: bewusst`).toBe(true)
  })
  it('Sicherungs-Bucket ist privat mit Block Public Access komplett an, 7 Tage Lifecycle und Deny für unverschlüsselte Verbindungen', () => {
    const b = bucket('plexora-backups-{account}')
    expect(b.access.kind).toBe('private'); expect(Object.values(b.blockPublicAccess).every(Boolean)).toBe(true); expect(b.denyInsecureTransport).toBe(true); expect(b.lifecycle).toEqual([{ id: 'sicherungen-nach-7-tagen-loeschen', expirationDays: 7 }])
  })
  it('Namen mit Konto-ID werden erst zur Laufzeit aufgelöst (keine Konto-ID im Repo)', () => {
    expect(resolveBucketName('plexora-backups-{account}', ACCOUNT)).toBe('plexora-backups-123456789012')
    for (const b of STORAGE.buckets) expect(JSON.stringify(b)).not.toMatch(/\b\d{12}\b/)
  })

  describe('Gegenproben: eine fehlerhafte Deklaration wird abgelehnt', () => {
    const withBucket = (name: string, patch: (b: BucketDecl) => void): StorageDeclaration => { const d = clone(STORAGE); patch(d.buckets.find(b => b.name === name)!); return d }
    it('Plexora-Bucket "ganzer Bucket öffentlich"', () => expect(validateDeclaration(withBucket('plexora-backups-{account}', b => { b.access = { kind: 'public-whole', reason: 'weil es schneller geht und alle es lesen dürfen sollen' } }))).toEqual(expect.arrayContaining([expect.stringMatching(/nur für fremde Projekte/)])))
    it('privater Bucket ohne Block Public Access', () => expect(validateDeclaration(withBucket('plexora-backups-{account}', b => { b.blockPublicAccess.BlockPublicPolicy = false }))).toEqual(expect.arrayContaining([expect.stringMatching(/Block Public Access komplett an/)])))
    it('öffentlicher Bucket mit BlockPublicPolicy (würde nicht funktionieren)', () => expect(validateDeclaration(withBucket('plexora-files', b => { b.blockPublicAccess.BlockPublicPolicy = true }))).toEqual(expect.arrayContaining([expect.stringMatching(/nicht funktionieren/)])))
    it('Präfix mit Platzhalter, Schrägstrich oder ohne Begründung', () => {
      for (const prefix of ['*', 'a/b', '', 'Gross', '../x']) expect(validateDeclaration(withBucket('plexora-files', b => { if (b.access.kind === 'public-prefixes') b.access.prefixes.push({ prefix, reason: 'eine ausreichend lange Begründung' }) })).length, prefix).toBeGreaterThan(0)
      expect(validateDeclaration(withBucket('plexora-files', b => { if (b.access.kind === 'public-prefixes') b.access.prefixes.push({ prefix: 'neu', reason: 'kurz' }) }))).toEqual(expect.arrayContaining([expect.stringMatching(/keine ausreichende Begründung/)]))
    })
    it('doppelte Namen und doppelte Präfixe', () => {
      const d = clone(STORAGE); d.buckets.push(clone(d.buckets[0])); expect(validateDeclaration(d)).toEqual(expect.arrayContaining(['Bucket-Namen sind nicht eindeutig']))
      expect(validateDeclaration(withBucket('plexora-files', b => { if (b.access.kind === 'public-prefixes') b.access.prefixes.push(clone(b.access.prefixes[0])) }))).toEqual(expect.arrayContaining([expect.stringMatching(/doppelte Präfixe/)]))
    })
  })
})

describe('Jeder im Code oder in den Skripten genannte Bucket ist deklariert', () => {
  const declared = new Set(STORAGE.buckets.map(b => b.name))
  const refs = findBucketRefs(sourceFiles())
  it('der Scanner findet die bekannten Buckets (Plausibilität, sonst prüft der Test nichts)', () => {
    const names = new Set(refs.map(r => r.name)); expect(names.has('plexora-files')).toBe(true); expect(names.has('plexora-backups-{account}')).toBe(true); expect(refs.length).toBeGreaterThan(10)
  })
  it('keine Bucket-Erwähnung ohne Deklaration', () => {
    const missing = refs.filter(r => !declared.has(r.name)).map(r => `${r.name}  (${r.file}:${r.line})`)
    expect(missing, `Bucket ohne Eintrag in infra/storage-policy.ts – Zweck und Zugriff bewusst festlegen:\n${missing.join('\n')}`).toEqual([])
  })
  it('Gegenprobe: ein neuer Bucket im Code wird gefunden', () => {
    const f = 'tests/storage/__fixture.tmp.ts'
    require('node:fs').writeFileSync(f, "const BUCKET = 'plexora-neuer-bucket'\nawait s3.send(new PutObjectCommand({ Bucket: 'plexora-noch-einer', Key: 'x' }))\nconst u = 'https://plexora-dritter.s3.eu-central-1.amazonaws.com/x'\nconst arn = 'arn:aws:s3:::plexora-vierter/*'\n# aws s3 cp x s3://plexora-fuenfter/y\n")
    try { const names = findBucketRefs([f]).map(r => r.name).sort(); expect(names).toEqual(['plexora-dritter', 'plexora-fuenfter', 'plexora-neuer-bucket', 'plexora-noch-einer', 'plexora-vierter']); expect(names.every(n => !declared.has(n))).toBe(true) } finally { require('node:fs').unlinkSync(f) }
  })
  it('Gegenprobe: Variablen ($BUCKET) und die Konto-ID-Schreibweise werden richtig behandelt', () => {
    const f = 'tests/storage/__fixture2.tmp.ts'
    require('node:fs').writeFileSync(f, 'aws s3api put-object --bucket "$BUCKET" --key x\nBUCKET="plexora-backups-$ACCOUNT"\narn:aws:s3:::$SRC_BUCKET/*\n')
    try { expect(findBucketRefs([f]).map(r => r.name)).toEqual(['plexora-backups-{account}']) } finally { require('node:fs').unlinkSync(f) }
  })
})
