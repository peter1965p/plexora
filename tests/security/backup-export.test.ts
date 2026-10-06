import { describe, it, expect, vi } from 'vitest'
import JSZip from 'jszip'
import { runExport, type ExportDeps } from '../../server/utils/backup/export'
import { selectRows, scrub, referencedFileKeys } from '../../server/utils/backup/select'
import { tablesFor, BACKUP_TABLES, S3_EXCLUDED_PREFIXES } from '../../server/utils/backup/config'
import { deriveBackupKey, decryptBackup } from '../../server/utils/backup/crypto'

const S = (s: string) => ({ S: s })
const A = 'chef@firma.de'; const B = 'fremd@andere.de'
const URL_A = 'https://plexora-files.s3.eu-central-1.amazonaws.com/marketing/a-bild.jpg'
const URL_B = 'https://plexora-files.s3.eu-central-1.amazonaws.com/marketing/b-bild.jpg'
const PASS = 'Correct-Horse-Battery-Staple-42'

function data(): Record<string, any[]> {
  return {
    'plexora-contacts': [{ userId: S(A), contactId: S('a1'), firstName: S('Anna-A') }, { userId: S(B), contactId: S('b1'), firstName: S('Bernd-B') }],
    'plexora-deals': [{ userId: S(A), dealId: S('da'), name: S('Deal-A') }, { userId: S(B), dealId: S('db'), name: S('Deal-B') }],
    'plexora-nexora': [{ tenantId: S('T-A'), email: S(A), githubPatEncrypted: S('aa:bb:cc'), aiProviders: { M: { x: { M: { encrypted: S('enc') } } } }, apiKey: S('plx_pub_a') }, { tenantId: S('T-B'), email: S(B), apiKey: S('plx_pub_b') }],
    'plexora-termine-bookings': [{ tenantId: S('T-A'), bookingId: S('ba') }, { tenantId: S('T-B'), bookingId: S('bb') }],
    'plexora-forms': [{ userId: S(A), formId: S('fa'), title: S('Formular-A') }, { userId: S(B), formId: S('fb'), title: S('Formular-B') }],
    'plexora-submissions': [{ submissionId: S('sa'), formId: S('fa'), data: S('Einsendung-A') }, { submissionId: S('sb'), formId: S('fb'), data: S('Einsendung-B') }],
    'plexora-marketing': [{ userId: S(A), campaignId: S('camp-A'), headerImageUrl: S(URL_A) }, { userId: S(B), campaignId: S('camp-B'), headerImageUrl: S(URL_B) }],
    'plexora-email-sends': [{ campaignId: S('camp-A'), contactId: S('a1') }, { campaignId: S('camp-B'), contactId: S('b1') }],
    'plexora-team-members': [{ tenantId: S(A), memberEmail: S('m@firma.de'), inviteToken: S('TOKEN-GEHEIM') }, { tenantId: S(B), memberEmail: S('x@andere.de'), inviteToken: S('TOKEN-B') }],
    'plexora-settings': [
      { settingId: S('bot-protection'), scope: S(A), siteKey: S('0x4AAA'), secretEncrypted: S('11:22:33'), secretMasked: S('••••') },
      { settingId: S('theme'), scope: S(A), theme: S('dark') },
      { settingId: S('theme'), scope: S(B), theme: S('light') },
      { settingId: S('payment'), scope: S('global'), stripeSecretKey: S('sk_test_KLARTEXT'), stripeWebhookSecret: S('aabbccddeeff00112233aabb:aabbccddeeff00112233445566778899:00ff'), activeGateway: S('stripe') },
    ],
    'plexora-meta': [{ pk: S('stats'), count: S('5') }],
    'plexora-plugin-registry': [{ key: S('gastro') }],
    'plexora-newsletter-ratelimit': [{ throttleKey: S('x') }],
  }
}
function deps(db = data(), put: Buffer[] = [], patches: any[] = [], opt: { failScan?: string; changeAfter?: string } = {}): ExportDeps {
  const scans: Record<string, number> = {}
  return {
    async scan(t) {
      scans[t] = (scans[t] || 0) + 1
      if (opt.failScan === t) throw new Error('DynamoDB nicht erreichbar')
      const rows = db[t] || []
      return opt.changeAfter === t && scans[t] > 1 ? [...rows, { userId: S(A), contactId: S('neu') }] : rows
    },
    async describe(t) { return { TableName: t, KeySchema: [{ AttributeName: 'x', KeyType: 'HASH' }] } },
    async tenantIdFor(o) { return o === A ? 'T-A' : o === B ? 'T-B' : null },
    async listFiles() { return [{ key: 'marketing/a-bild.jpg', size: 1 }, { key: 'marketing/b-bild.jpg', size: 1 }, { key: 'lambda/lambda-new.zip', size: 9 }, { key: 'lambda-deploy/x.zip', size: 9 }, { key: 'backups/y.plxbak', size: 9 }] },
    async getFile(k) { return Buffer.from(`BILD:${k}`) },
    async putArchive(b) { put.push(b) },
    async updateJob(p) { patches.push(p) },
  }
}
async function exportAndOpen(kind: 'full' | 'tenant', owner: string, d = deps()) {
  const put: Buffer[] = []; const patches: any[] = []
  const dd = deps(data(), put, patches)
  const { key, params } = deriveBackupKey(PASS)
  const res = await runExport(d === undefined ? dd : { ...dd, ...d, putArchive: dd.putArchive, updateJob: dd.updateJob }, { kind, owner, key, params })
  const zip = await JSZip.loadAsync(decryptBackup(put[0], PASS))
  const text = async () => { let t = ''; for (const n of Object.keys(zip.files)) if (!zip.files[n].dir) t += `\n#${n}\n` + (await zip.files[n].async('string')); return t }
  return { res, zip, text, patches, put }
}

describe('Mandanten-Export: nur die eigenen Zeilen', () => {
  it('enthält keine einzige Zeile eines anderen Mandanten – in keiner Datei', async () => {
    const { text, zip } = await exportAndOpen('tenant', A)
    const all = await text()
    for (const fremd of ['Bernd-B', 'Deal-B', 'T-B', 'plx_pub_b', 'Formular-B', 'Einsendung-B', 'camp-B', 'b-bild', 'x@andere.de', 'TOKEN-B', 'light', B]) expect(all, fremd).not.toContain(fremd)
    for (const eigen of ['Anna-A', 'Deal-A', 'T-A', 'Formular-A', 'Einsendung-A', 'a-bild.jpg']) expect(all, eigen).toContain(eigen)
    expect(Object.keys(zip.files).some(n => n.includes('b-bild'))).toBe(false)
  })
  it('ohne Geheimnisse: Einstellungen ohne verschlüsselte Schlüssel, keine Einladungs-Token, keine globalen Zahlungsdaten', async () => {
    const all = await (await exportAndOpen('tenant', A)).text()
    for (const geheim of ['secretEncrypted', '11:22:33', 'githubPatEncrypted', 'aiProviders', 'inviteToken', 'TOKEN-GEHEIM', 'sk_test_KLARTEXT', 'stripeSecretKey', 'stripeWebhookSecret']) expect(all, geheim).not.toContain(geheim)
    expect(all).toContain('dark')                       // normale Einstellung ist dabei
  })
  it('Plattform-Tabellen und flüchtige Tabellen gehören nicht in den Mandanten-Export; Dateien nur über Verweise', async () => {
    const { zip } = await exportAndOpen('tenant', A)
    const names = Object.keys(zip.files)
    expect(names.some(n => n.includes('plexora-meta') || n.includes('plugin-registry') || n.includes('ratelimit'))).toBe(false)
    expect(names.filter(n => n.startsWith('files/') && !zip.files[n].dir)).toEqual(['files/marketing/a-bild.jpg'])
  })
  it('Mandant ohne Nexora-Eintrag: nur Daten über die E-Mail, keine Mandanten-Tabellen fremder Mandanten', async () => {
    const put: Buffer[] = []; const { key, params } = deriveBackupKey(PASS)
    await runExport(deps(data(), put), { kind: 'tenant', owner: 'neu@kunde.de', key, params })
    const z = await JSZip.loadAsync(decryptBackup(put[0], PASS)); let all = ''
    for (const n of Object.keys(z.files)) if (!z.files[n].dir) all += await z.files[n].async('string')
    expect(all).not.toMatch(/Anna-A|Bernd-B|T-A|T-B/)
  })
})

describe('Gesamtsicherung', () => {
  it('enthält alle Mandanten und Plattform-Tabellen, aber nie flüchtige Tabellen; Klartext-Zahlungsschlüssel ersetzt, Verschlüsseltes bleibt', async () => {
    const { text, zip } = await exportAndOpen('full', A)
    const all = await text()
    for (const x of ['Anna-A', 'Bernd-B', 'T-B', 'plexora-meta', 'plugin-registry']) expect(all).toContain(x)
    expect(zip.file('dynamodb/plexora-newsletter-ratelimit.json')).toBeNull()
    expect(all).not.toContain('sk_test_KLARTEXT'); expect(all).toContain('***nicht gesichert***')
    expect(all).toContain('aabbccddeeff00112233aabb:aabbccddeeff00112233445566778899:00ff')   // AES-GCM-Wert bleibt
    expect(all).toContain('11:22:33')
  })
  it('Dateien: ohne lambda/, lambda-deploy/ und backups/', async () => {
    const { zip } = await exportAndOpen('full', A)
    const files = Object.keys(zip.files).filter(n => n.startsWith('files/') && !zip.files[n].dir)
    expect(files.sort()).toEqual(['files/marketing/a-bild.jpg', 'files/marketing/b-bild.jpg'])
    for (const p of S3_EXCLUDED_PREFIXES) expect(files.some(f => f.startsWith('files/' + p))).toBe(false)
  })
})

describe('Manifest, Zählvergleich, Fortschritt, Fehler', () => {
  it('Manifest nennt Tabellen, Anzahlen, Größen und SHA-256; Zählvergleich gleich', async () => {
    const { res, zip } = await exportAndOpen('tenant', A)
    const manifest = await zip.file('MANIFEST.txt')!.async('string')
    expect(manifest).toMatch(/Tabellen: \d+, Einträge: \d+/); expect(manifest).toMatch(/[0-9a-f]{64}\s+\d+\s+dynamodb\/plexora-contacts\.json/); expect(manifest).toContain('Zählvergleich gleich')
    expect(manifest).not.toContain('ABWEICHUNG'); expect(res.warnings).toEqual([])
    for (const t of Object.values(res.tables)) expect(t.verified).toBe(t.rows)
  })
  it('ändert sich eine Tabelle während der Sicherung, steht das als Hinweis im Ergebnis (kein stiller Fehler)', async () => {
    const put: Buffer[] = []; const { key, params } = deriveBackupKey(PASS)
    const res = await runExport(deps(data(), put, [], { changeAfter: 'plexora-contacts' }), { kind: 'tenant', owner: A, key, params })
    expect(res.warnings.join(' ')).toMatch(/plexora-contacts: Export 1 Zeilen, danach gezählt 2/)
  })
  it('Fortschritt wird gemeldet (läuft, Schritt, Anzahl je Tabelle); Fehler beim Lesen bricht ab und schreibt keine Datei', async () => {
    const patches: any[] = []; const put: Buffer[] = []; const { key, params } = deriveBackupKey(PASS)
    await runExport(deps(data(), put, patches), { kind: 'tenant', owner: A, key, params })
    expect(patches[0]).toMatchObject({ status: 'running' }); expect(patches.some(p => p.progress?.done === p.progress?.total && p.progress?.total > 0)).toBe(true)
    expect(patches.some(p => p.tables?.['plexora-contacts']?.rows === 1)).toBe(true)
    const put2: Buffer[] = []
    await expect(runExport(deps(data(), put2, [], { failScan: 'plexora-deals' }), { kind: 'tenant', owner: A, key, params })).rejects.toThrow()
    expect(put2).toHaveLength(0)
  })
  it('die Passphrase steht nirgends: weder im Archiv noch in den Fortschrittsmeldungen noch in der Konsole', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {}); const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { text, patches } = await exportAndOpen('tenant', A)
    expect(await text()).not.toContain(PASS); expect(JSON.stringify(patches)).not.toContain(PASS)
    expect(JSON.stringify([...log.mock.calls, ...err.mock.calls])).not.toContain(PASS); log.mockRestore(); err.mockRestore()
  })
})

describe('Zuordnung der Tabellen', () => {
  it('Mandanten-Export liest nur Tabellen mit Besitzerbezug; Gesamtsicherung alle außer flüchtigen', () => {
    for (const t of tablesFor('tenant')) expect(['owner', 'ownerTenant', 'via']).toContain(BACKUP_TABLES[t].mode)
    expect(tablesFor('full')).not.toContain('plexora-newsletter-ratelimit')
    expect(tablesFor('full')).toContain('plexora-meta')
    const t = tablesFor('tenant'); expect(t.indexOf('plexora-forms')).toBeLessThan(t.indexOf('plexora-submissions'))
  })
  it('selectRows, scrub und Datei-Verweise einzeln', () => {
    expect(selectRows('plexora-contacts', data()['plexora-contacts'], { owner: 'CHEF@firma.de', tenantId: null }).length).toBe(1)
    expect(selectRows('plexora-meta', data()['plexora-meta'], { owner: A, tenantId: null })).toEqual([])
    expect(selectRows('plexora-nexora', data()['plexora-nexora'], { owner: A, tenantId: null })).toEqual([])
    expect(scrub({ a: S('1'), inviteToken: S('t'), foo_secret: S('x') }, 'tenant')).toEqual({ a: S('1') })
    expect(referencedFileKeys([{ u: S(URL_A + '?v=1') }], 'https://plexora-files.s3.eu-central-1.amazonaws.com/')).toEqual(['marketing/a-bild.jpg'])
  })
})
