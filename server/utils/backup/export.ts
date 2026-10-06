import JSZip from 'jszip'
import { BACKUP_TABLES, tablesFor, S3_EXCLUDED_PREFIXES, FILE_URL_PREFIX, type BackupKind } from './config'
import { selectRows, scrub, referencedFileKeys, val, type DdbItem, type Ctx } from './select'
import { encryptBackup, sha256, type KeyParams } from './crypto'
import { isAllowedKey } from '../s3Policy'

export interface ExportDeps {
  scan(table: string): Promise<DdbItem[]>
  describe(table: string): Promise<any>
  tenantIdFor(owner: string): Promise<string | null>
  listFiles(): Promise<{ key: string; size: number }[]>
  getFile(key: string): Promise<Buffer | null>
  putArchive(buf: Buffer): Promise<void>
  updateJob(patch: Record<string, any>): Promise<void>
  now?: () => string
}
export interface ExportResult { sizeBytes: number; sha256: string; tables: Record<string, { rows: number; bytes: number; verified: number }>; files: { count: number; bytes: number }; warnings: string[] }

const isExcludedKey = (k: string) => S3_EXCLUDED_PREFIXES.some(p => k.startsWith(p))

export async function runExport(deps: ExportDeps, args: { kind: BackupKind; owner: string; key: Buffer; params: KeyParams }): Promise<ExportResult> {
  const { kind, owner } = args
  const now = deps.now ?? (() => new Date().toISOString())
  const warnings: string[] = []
  const zip = new JSZip()
  const tenantId = kind === 'tenant' ? await deps.tenantIdFor(owner) : null
  const ctx: Ctx = { owner, tenantId }
  const names = tablesFor(kind)
  const tables: ExportResult['tables'] = {}
  const parents: Record<string, Set<string>> = {}
  const exportedRows: DdbItem[] = []
  const entries: { path: string; data: Buffer }[] = []
  const add = (path: string, data: Buffer | string) => { const b = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8'); zip.file(path, b); entries.push({ path, data: b }) }

  await deps.updateJob({ status: 'running', step: 'Tabellen', progress: { done: 0, total: names.length }, startedAt: now() })
  const selectFor = (t: string, items: DdbItem[]) => kind === 'full' ? items : selectRows(t, items, ctx, parents)
  let done = 0
  for (const t of names) {
    const raw = await deps.scan(t)
    const rows = selectFor(t, raw)
    const rule = BACKUP_TABLES[t]
    for (const other of Object.values(BACKUP_TABLES)) if (other.mode === 'via' && other.parent === t) parents[t] = new Set(rows.map(r => val(r, other.parentField)))
    const clean = rows.map(r => scrub(r, kind))
    const body = JSON.stringify({ TableName: t, Count: clean.length, Items: clean }, null, 1)
    add(`dynamodb/${t}.json`, body)
    try { add(`dynamodb/${t}.table.json`, JSON.stringify({ Table: await deps.describe(t) }, null, 1)) } catch { warnings.push(`${t}: Tabellendefinition nicht lesbar`) }
    tables[t] = { rows: clean.length, bytes: Buffer.byteLength(body), verified: -1 }
    if (kind === 'tenant') exportedRows.push(...clean)
    done++
    await deps.updateJob({ progress: { done, total: names.length }, step: `Tabelle ${t.replace('plexora-', '')}`, tables })
    void rule
  }

  // Dateien
  await deps.updateJob({ step: 'Dateien' })
  let fileKeys: string[]
  if (kind === 'full') fileKeys = (await deps.listFiles()).map(f => f.key).filter(k => !isExcludedKey(k) && !k.endsWith('/'))
  else fileKeys = referencedFileKeys(exportedRows, FILE_URL_PREFIX).filter(k => isAllowedKey(k) && !isExcludedKey(k))
  const files = { count: 0, bytes: 0 }
  for (const k of fileKeys) {
    const buf = await deps.getFile(k)
    if (!buf) { warnings.push(`Datei nicht lesbar: ${k}`); continue }
    add(`files/${k}`, buf); files.count++; files.bytes += buf.length
  }

  // Zählvergleich: jede Tabelle noch einmal lesen und mit dem Export vergleichen (bei Abweichung einmal wiederholen)
  await deps.updateJob({ step: 'Zählvergleich' })
  parents['__verify'] = new Set()
  const vparents: Record<string, Set<string>> = {}
  for (const t of names) {
    const count = async () => {
      const rows = kind === 'full' ? await deps.scan(t) : selectRows(t, await deps.scan(t), ctx, vparents)
      for (const other of Object.values(BACKUP_TABLES)) if (other.mode === 'via' && other.parent === t) vparents[t] = new Set(rows.map(r => val(r, other.parentField)))
      return rows.length
    }
    let n = await count()
    if (n !== tables[t].rows) n = await count()
    tables[t].verified = n
    if (n !== tables[t].rows) warnings.push(`${t}: Export ${tables[t].rows} Zeilen, danach gezählt ${n} (Tabelle wurde während der Sicherung geändert)`)
  }

  // Manifest
  const lines = [`Plexora-Sicherung (${kind === 'full' ? 'Gesamtsicherung' : 'Export der eigenen Daten'})`, `Erstellt: ${now()}`, `Besitzer: ${owner}`, '',
    `Tabellen: ${names.length}, Einträge: ${Object.values(tables).reduce((s, t) => s + t.rows, 0)}`, '']
  for (const t of names) lines.push(`  ${t.padEnd(34)} ${String(tables[t].rows).padStart(6)} Einträge  ${String(tables[t].bytes).padStart(9)} Bytes  Zählvergleich ${tables[t].verified === tables[t].rows ? 'gleich' : 'ABWEICHUNG'}`)
  lines.push('', `Dateien: ${files.count} (${files.bytes} Bytes)`)
  if (warnings.length) lines.push('', 'Hinweise:', ...warnings.map(w => `  - ${w}`))
  lines.push('', 'Keine Secrets, keine Umgebungsvariablen-Werte, keine Lambda-/Cognito-Konfiguration.',
    kind === 'full' ? 'Verschlüsselte Felder (AES-GCM) bleiben ohne NUXT_ENCRYPTION_KEY unlesbar – Schlüssel separat aufbewahren. Klartext-Zahlungsschlüssel sind durch Platzhalter ersetzt.' : 'Einstellungen, Tokens und Schlüssel sind nicht enthalten. Dateien sind nur enthalten, wenn Datenzeilen auf sie verweisen.',
    'Wiederherstellen: scripts/aws/restore-table.py <entpackter Ordner> <Tabelle> --dry-run', '', 'Dateien (SHA-256, Größe, Pfad):')
  for (const e of entries) lines.push(`  ${sha256(e.data)}  ${String(e.data.length).padStart(10)}  ${e.path}`)
  zip.file('MANIFEST.txt', lines.join('\n') + '\n')

  const plain = Buffer.from(await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } }))
  await deps.updateJob({ step: 'Verschlüsseln' })
  const encrypted = encryptBackup(plain, args.key, args.params)
  await deps.putArchive(encrypted)
  return { sizeBytes: encrypted.length, sha256: sha256(encrypted), tables, files, warnings }
}
