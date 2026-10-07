import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { installGlobals, authEv, code } from '../botprotection/helpers'

const sent: any[] = []
vi.mock('@aws-sdk/client-s3', () => {
  const mk = (name: string) => class { input: any; constructor(i: any) { this.input = i } static cmd = name }
  return {
    S3Client: class { async send(c: any) { sent.push({ type: c.constructor.cmd, ...c.input }); return { CommonPrefixes: [], Contents: [] } } },
    PutObjectCommand: mk('Put'), DeleteObjectCommand: mk('Delete'), ListObjectsV2Command: mk('List'),
  }
})
vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => ({ async send() { return { Items: [], Attributes: { count: 1 } } } }) }))   // Tarif-/Zähler-Abfragen des Uploads: kein echter Datenbankzugriff im Test
installGlobals()
const { PUBLIC_S3_PREFIXES, isAllowedKey, normalizePrefix, safeFileName } = await import('../../server/utils/s3Policy')
const { default: upload } = await import('../../server/api/aws/s3-upload.post')
const { default: del } = await import('../../server/api/aws/s3-delete.post')
const { default: list } = await import('../../server/api/aws/s3.get')
beforeEach(() => { sent.length = 0 })

const PNG = 'data:image/png;base64,' + Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('x'.repeat(100))]).toString('base64')
const up = (email: string, body: any, groups?: string[]) => (upload as any)(authEv(email, { body }, groups))

describe('Eine Liste für Skript und Server', () => {
  it('PUBLIC_S3_PREFIXES stimmt mit secure-bucket.sh überein; lambda/ und lambda-deploy/ sind nicht dabei', () => {
    const sh = readFileSync('scripts/aws/secure-bucket.sh', 'utf8')
    const m = sh.match(/PUBLIC_PREFIXES=\(([^)]*)\)/)!
    expect(m[1].trim().split(/\s+/).sort()).toEqual([...PUBLIC_S3_PREFIXES].sort())
    expect(PUBLIC_S3_PREFIXES).not.toContain('lambda' as any); expect(PUBLIC_S3_PREFIXES).not.toContain('lambda-deploy' as any)
  })
})

describe('Schlüsselprüfung', () => {
  it('erlaubt nur Objekte unter öffentlichen Präfixen ohne Pfadtricks', () => {
    for (const k of ['marketing/a.png', 'products/1700-bild.webp', 'avatars/x.jpg']) expect(isAllowedKey(k), k).toBe(true)
    for (const k of ['lambda/lambda-new.zip', 'lambda-deploy/lambda-new.zip', 'backups/x', '/marketing/a.png', 'marketing/../lambda/x.zip', 'marketing\\..\\x', 'marketing', '', 'MARKETING/x.png', 'marketing/x\u0000.png', 'x'.repeat(400)]) expect(isAllowedKey(k), k).toBe(false)
    expect(isAllowedKey(undefined)).toBe(false); expect(isAllowedKey(42)).toBe(false)
  })
  it('Präfix und Dateiname', () => {
    expect(normalizePrefix('marketing/')).toBe('marketing/'); expect(normalizePrefix('nexora/clients/')).toBe('nexora/clients/')
    for (const p of ['lambda/', 'lambda/marketing/', 'marketing', '../', '', undefined, 'marketing/../lambda/', 'marketing//', 'a b/', 'marketing/.hidden/']) expect(normalizePrefix(p), String(p)).toBeNull()
    expect(safeFileName('../../etc/Bild 1.PNG')).toBe('Bild_1.PNG')
    for (const n of ['shell.html', 'x.zip', 'noext', '.png', 'a.php.txt', 123, undefined]) expect(safeFileName(n), String(n)).toBeNull()
  })
})

describe('Upload', () => {
  it('ohne Token 401, Demo-Konto 403, nichts geht an S3', async () => {
    expect(await code((upload as any)({ headers: {}, context: {}, body: { fileBase64: PNG, fileName: 'a.png', prefix: 'marketing/' } }))).toBe(401)
    expect(await code(up('demo@plexora.eu', { fileBase64: PNG, fileName: 'a.png', prefix: 'marketing/' }))).toBe(403)
    expect(sent).toHaveLength(0)
  })
  it('Angriffe: fremdes Präfix (lambda/), Pfad im Dateinamen, Nicht-Bild, zu groß, leer: abgewiesen', async () => {
    const bad: any[] = [
      { fileBase64: PNG, fileName: 'lambda-new.zip', prefix: 'lambda/' },
      { fileBase64: PNG, fileName: 'a.png', prefix: 'lambda/' },
      { fileBase64: PNG, fileName: 'a.png', prefix: '' },
      { fileBase64: PNG, fileName: 'a.png' },
      { fileBase64: PNG, fileName: 'a.png', prefix: 'marketing/../lambda/' },
      { fileBase64: PNG, fileName: 'seite.html', prefix: 'marketing/' },
      { fileBase64: PNG, fileName: 'x.zip', prefix: 'products/' },
      { fileBase64: 'data:image/png;base64,' + Buffer.alloc(9 * 1024 * 1024).toString('base64'), fileName: 'gross.png', prefix: 'marketing/' },
      { fileBase64: 'data:image/png;base64,', fileName: 'leer.png', prefix: 'marketing/' },
    ]
    for (const b of bad) expect([400, 413]).toContain(await code(up('kunde@firma.de', b)))
    expect(sent).toHaveLength(0)
  })
  it('gültiger Upload: nur unter dem erlaubten Präfix, Dateiname bereinigt, Bildtyp gesetzt', async () => {
    const res: any = await up('kunde@firma.de', { fileBase64: PNG, fileName: '../Mein Bild.PNG', prefix: 'marketing/' })
    expect(res.key).toMatch(/^marketing\/[0-9a-f]{16}\/Mein_Bild\.PNG$/)
    expect(sent).toHaveLength(1); expect(sent[0]).toMatchObject({ type: 'Put', Bucket: 'plexora-files', Key: res.key, ContentType: 'image/png' })
  })
})

describe('Löschen und Auflisten (Dateiverwaltung: nur Plattform-Admins, nur öffentliche Präfixe)', () => {
  const adm = ['admins']
  it('Kunde und Demo: 403', async () => {
    for (const email of ['kunde@firma.de', 'demo@plexora.eu']) {
      expect(await code((del as any)(authEv(email, { body: { key: 'marketing/a.png' } })))).toBe(403)
      expect(await code((list as any)(authEv(email, { query: { prefix: 'marketing/' } })))).toBe(403)
    }
    expect(sent).toHaveLength(0)
  })
  it('Admin: Deploy-Zips und Pfadtricks sind nicht löschbar, Bilder schon', async () => {
    for (const key of ['lambda/lambda-new.zip', 'lambda-deploy/lambda-new.zip', 'marketing/../lambda/lambda-new.zip', 'backups/x.enc', '']) expect(await code((del as any)(authEv('chef@firma.de', { body: { key } }, adm))), key).toBeGreaterThanOrEqual(400)
    expect(sent).toHaveLength(0)
    expect(await code((del as any)(authEv('chef@firma.de', { body: { key: 'marketing/a.png' } }, adm)))).toBe(200)
    expect(sent[0]).toMatchObject({ type: 'Delete', Key: 'marketing/a.png' })
  })
  it('Admin: Wurzel zeigt nur öffentliche Präfixe, lambda/ oder unbekannte Präfixe sind gesperrt', async () => {
    const root: any = await (list as any)(authEv('chef@firma.de', { query: {} }, adm))
    expect(root.folders.map((f: any) => f.name).sort()).toEqual([...PUBLIC_S3_PREFIXES].sort())
    expect(sent).toHaveLength(0)
    for (const prefix of ['lambda/', 'lambda-deploy/', 'marketing/../lambda/', 'backups/', 'x']) expect(await code((list as any)(authEv('chef@firma.de', { query: { prefix } }, adm))), prefix).toBe(403)
    expect(await code((list as any)(authEv('chef@firma.de', { query: { prefix: 'marketing/' } }, adm)))).toBe(200)
  })
})

describe('Mail-Logos: öffentlich lesbar, aber nur über die eigene, geprüfte Route beschreibbar', () => {
  it('"mail-logos" ist ein öffentliches Lese-Präfix (Skript und Server gleich), der allgemeine Upload schreibt dort nie hinein', async () => {
    expect(PUBLIC_S3_PREFIXES).toContain('mail-logos' as any); expect(isAllowedKey('mail-logos/0123456789abcdef/0123456789abcdef0123456789abcdef.png')).toBe(true)
    for (const p of ['mail-logos/', 'mail-logos/0123456789abcdef/']) expect(normalizePrefix(p), p).toBeNull()
    expect(await code(up('chef@firma.de', { fileBase64: PNG, fileName: 'x.png', prefix: 'mail-logos/' }))).toBe(400); expect(sent).toEqual([])
    expect(await code(up('chef@firma.de', { fileBase64: PNG, fileName: 'x.png', prefix: 'marketing/' }))).toBe(200)
  })
})
