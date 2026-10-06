import cfg from '../../../shared/backupConfig.json'

// Einzige Quelle für Tabellen, Ausschlüsse und Datei-Präfixe der Sicherung (shared/backupConfig.json).
// Dieselbe Datei liest scripts/aws/backup-plexora.py.
export type TableRule =
  | { mode: 'owner'; attr: string; note?: string }                 // item[attr] === Besitzer (E-Mail)
  | { mode: 'ownerTenant'; attr: string }                          // item[attr] === Nexora-Mandanten-ID des Besitzers
  | { mode: 'via'; parent: string; parentField: string; childField: string }   // Zeilen, die zu Zeilen einer Elterntabelle des Besitzers gehören
  | { mode: 'platform'; reason: string }                           // nur Gesamtsicherung
  | { mode: 'skip'; reason: string }                               // nie gesichert

export const BACKUP_TABLES = cfg.tables as Record<string, TableRule>
export const ALWAYS_DROP_FIELDS: string[] = cfg.alwaysDropFields
export const TENANT_EXPORT_DROP_FIELDS: string[] = cfg.tenantExportDropFields
export const S3_EXCLUDED_PREFIXES: string[] = cfg.s3.excludedPrefixes
export const SOURCE_BUCKET: string = cfg.s3.bucket
export const FILE_URL_PREFIX: string = cfg.tenantExport.fileUrlPrefix

export type BackupKind = 'full' | 'tenant'
export const BACKUP_TTL_DAYS = 7
export const MAX_RUNNING_PER_OWNER = 1
export const MAX_STARTS_PER_HOUR = 3

/** Tabellen, die eine Sicherung dieser Art liest (Reihenfolge: Elterntabellen vor den abhängigen). */
export function tablesFor(kind: BackupKind): string[] {
  const names = Object.keys(BACKUP_TABLES).filter(t => {
    const m = BACKUP_TABLES[t].mode
    return kind === 'full' ? m !== 'skip' : (m === 'owner' || m === 'ownerTenant' || m === 'via')
  })
  const parentsFirst = (t: string) => (BACKUP_TABLES[t].mode === 'via' ? 1 : 0)
  return names.sort((a, b) => parentsFirst(a) - parentsFirst(b) || a.localeCompare(b))
}
