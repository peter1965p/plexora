import { BACKUP_TABLES, ALWAYS_DROP_FIELDS, TENANT_EXPORT_DROP_FIELDS, type BackupKind } from './config'

export type DdbItem = Record<string, any>   // DynamoDB-JSON ({ S: '…' })
export interface Ctx { owner: string; tenantId: string | null }

export const val = (it: DdbItem, f: string): string => { const x = it?.[f]; return x == null ? '' : String(x.S ?? x.N ?? '') }
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
export const ENCRYPTED_RE = /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/
const SECRET_NAME = /(secret|password|passwort|apikey|api_key|privatekey)$/i

/** Welche Zeilen einer Tabelle gehören zu diesem Besitzer (Mandanten-Export)? Zeilen anderer Mandanten sind nie dabei. */
export function selectRows(table: string, items: DdbItem[], ctx: Ctx, parents: Record<string, Set<string>> = {}): DdbItem[] {
  const rule = BACKUP_TABLES[table]
  if (!rule || !ctx.owner) return []
  switch (rule.mode) {
    case 'owner': return items.filter(i => same(val(i, rule.attr), ctx.owner))
    case 'ownerTenant': return ctx.tenantId ? items.filter(i => val(i, rule.attr) === ctx.tenantId) : []
    case 'via': { const set = parents[rule.parent]; return set ? items.filter(i => set.has(val(i, rule.childField))) : [] }
    default: return []     // platform/skip gehören nie in einen Mandanten-Export
  }
}

/** Entfernt Geheimnisse. Mandanten-Export: alle Geheimnis- und Token-Felder weg. Gesamtsicherung: Klartext-Geheimnisse werden ersetzt, verschlüsselte (AES-GCM) bleiben. */
export function scrub(item: DdbItem, kind: BackupKind): DdbItem {
  const out: DdbItem = {}
  const dropAlways = new Set(ALWAYS_DROP_FIELDS); const dropTenant = new Set(TENANT_EXPORT_DROP_FIELDS)
  for (const [k, v] of Object.entries(item)) {
    if (kind === 'tenant' && (dropAlways.has(k) || dropTenant.has(k) || SECRET_NAME.test(k))) continue
    if (kind === 'full' && (dropAlways.has(k) || SECRET_NAME.test(k))) {
      const s = typeof v?.S === 'string' ? v.S : ''
      out[k] = s && !ENCRYPTED_RE.test(s) ? { S: '***nicht gesichert***' } : v
      continue
    }
    out[k] = v
  }
  return out
}

/** Dateien eines Mandanten: nur über Verweise (Bild-URLs) in seinen Datenzeilen. */
export function referencedFileKeys(rows: DdbItem[], urlPrefix: string): string[] {
  const keys = new Set<string>()
  const re = new RegExp(urlPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^"\\s\'<>)]+)', 'g')
  const text = JSON.stringify(rows)
  for (const m of text.matchAll(re)) { try { keys.add(decodeURIComponent(m[1].split('?')[0])) } catch { keys.add(m[1].split('?')[0]) } }
  return [...keys]
}
