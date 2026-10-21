import { DeleteCommand, GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { DescribeTableCommand } from '@aws-sdk/client-dynamodb'
import { marshall } from '@aws-sdk/util-dynamodb'
import { getDynamoClient } from './dynamodb'
import { isDemoAccount, DEMO_ACCOUNT_EMAIL } from './mailGuard'
import { BACKUP_TABLES } from './backup/config'

// Demo-Konto als Sandkasten: Besucher dürfen im Demo-Konto ausprobieren (Daten anlegen, ändern, löschen), alles wird beim Abmelden, beim nächsten Demo-Start und nach Leerlauf auf den
// gespeicherten Standard zurückgesetzt. Was Außenwirkung hat oder sicherheitsrelevant ist (E-Mail-Versand, Dateien, KI, Zahlung, Anmeldung, Team, Sicherung, Blog, Lead-Seiten, Website), bleibt gesperrt.
export const DEMO_TENANT_ID = 'PLXR-DEMO-0000-0000-DEMO'
export const DEMO_WRITE_LIMIT = 1500                         // Schreibzugriffe zwischen zwei Zurücksetzungen (Missbrauchsbremse)
export const DEMO_IDLE_MINUTES = 30                           // so lange ohne Schreibzugriff, dann setzt der Zeitplan zurück
const SETTINGS = 'plexora-settings'

// ── Was darf das Demo-Konto schreiben? ──
const seg = (name: string) => new RegExp(`^/api/${name}(/|$)`)
export const DEMO_WRITE_ALLOW: RegExp[] = [
  ...['contacts', 'companies', 'deals', 'support', 'projects', 'articles', 'services', 'hr', 'contracts', 'returns', 'forms', 'shop', 'termine', 'finance', 'quotes', 'branchen',
    'automotive', 'workshop', 'properties', 'viewings', 'renters', 'retail', 'fewo', 'handwerk', 'notifications', 'drafts'].map(seg),
  /^\/api\/gastro-[a-z]+(\/|$)/,
  /^\/api\/settings\/(company|invoice)$/,            // Firmen- und Rechnungsangaben (E-Rechnung ausprobieren)
]
// Verbote gehen vor: alles mit E-Mail, externen Aufrufen oder Außenwirkung innerhalb der erlaubten Bereiche
export const DEMO_WRITE_DENY: Array<{ re: RegExp; methods?: string[] }> = [
  { re: /^\/api\/finance\/(batch-dunning|[^/]+\/(send|dunning))$/ },
  { re: /^\/api\/quotes\/[^/]+\/send$/ },
  { re: /^\/api\/shop\/(purchase-orders|webhook)(\/|$)/ },
  { re: /^\/api\/termine\/bookings\/[^/]+$/, methods: ['PUT'] },       // Statuswechsel verschickt Mails
  { re: /^\/api\/fewo\/units\/[^/]+\/(feeds|sync|export-token)(\/|$)/ },   // ruft fremde Adressen ab bzw. erzeugt Links
  { re: /^\/api\/termine\/(ical-token|cron)(\/|$)/ },
]
export const isSafeMethod = (m: string) => ['GET', 'HEAD', 'OPTIONS'].includes(m.toUpperCase())
export function isDemoWriteAllowed(method: string, path: string): boolean {
  const p = path.split('?')[0], m = method.toUpperCase()
  if (isSafeMethod(m)) return true
  if (p === '/api/demo/reset' && m === 'POST') return true
  if (DEMO_WRITE_DENY.some(d => d.re.test(p) && (!d.methods || d.methods.includes(m)))) return false
  return DEMO_WRITE_ALLOW.some(r => r.test(p))
}
/** Wird von der Middleware für erlaubte Schreibzugriffe des Demo-Kontos gesetzt: dann gelten die einzelnen assertNotDemo-Prüfungen nicht (die Sperre entscheidet die Erlaubnisliste) */
export const isSandboxed = (auth: any): boolean => !!auth?.demoSandbox

// ── Stand: wurde etwas verändert? ──
const stateKey = { settingId: 'demo-state', scope: 'global' }
export interface DemoState { dirty?: boolean; writes?: number; lastWriteAt?: string; lastResetAt?: string; resettingAt?: string }
export async function getDemoState(): Promise<DemoState> {
  return ((await getDynamoClient().send(new GetCommand({ TableName: SETTINGS, Key: stateKey }))).Item as DemoState) || {}
}
/** Vermerkt einen Schreibzugriff des Demo-Kontos; wirft 429, wenn das Limit seit dem letzten Zurücksetzen erreicht ist */
export async function markDemoWrite(): Promise<void> {
  const r: any = await getDynamoClient().send(new UpdateCommand({ TableName: SETTINGS, Key: stateKey, UpdateExpression: 'SET dirty = :t, lastWriteAt = :n ADD writes :one', ExpressionAttributeValues: { ':t': true, ':n': new Date().toISOString(), ':one': 1 }, ReturnValues: 'UPDATED_NEW' }))
  if (Number(r?.Attributes?.writes) > DEMO_WRITE_LIMIT) throw createError({ statusCode: 429, message: 'Im Demo-Zugang sind sehr viele Änderungen passiert. Bitte melde dich ab und starte die Demo neu.' })
}

// ── Welche Tabellen setzt das Zurücksetzen zurück, und mit welchem Schlüssel? ──
// Alles aus der Sicherungs-Konfiguration (Besitzer-Tabellen), außer dem, was das Demo-Konto nie schreibt (gesperrt) oder was nicht ihm gehört.
export const RESET_EXCLUDE = new Set([
  'plexora-nexora', 'plexora-team-members', 'plexora-licenses', 'plexora-tenants', 'plexora-user-profiles', 'plexora-users', 'plexora-mail-log', 'plexora-ai-usage', 'plexora-site-analytics', 'plexora-plugin-data',
  'plexora-blog', 'plexora-blog-comments', 'plexora-pages', 'plexora-campaigns', 'plexora-marketing', 'plexora-sequences', 'plexora-sequence-runs', 'plexora-automations', 'plexora-shortlinks',
  'plexora-newsletter-automation-rules', 'plexora-newsletter-campaigns', 'plexora-newsletter-subscribers', 'plexora-newsletter-templates',
  'plexora-praxis-patienten', 'plexora-praxis-rezepte', 'plexora-praxis-termine',
])
export interface ResetTable { table: string; attr: string; value: string }
export function resetTables(): ResetTable[] {
  const out: ResetTable[] = []
  for (const [table, rule] of Object.entries(BACKUP_TABLES)) {
    if (RESET_EXCLUDE.has(table)) continue
    if (rule.mode === 'ownerTenant') out.push({ table, attr: rule.attr, value: DEMO_TENANT_ID })
    else if (rule.mode === 'owner') out.push({ table, attr: rule.attr, value: rule.attr === 'tenantId' ? DEMO_TENANT_ID : DEMO_ACCOUNT_EMAIL })
  }
  return out
}

const db = () => getDynamoClient()
async function keySchema(table: string): Promise<string[]> {
  const r: any = await db().send(new DescribeTableCommand({ TableName: table }))
  return (r?.Table?.KeySchema || []).map((k: any) => k.AttributeName)
}
/** Alle Zeilen des Demo-Kontos in einer Tabelle (Abfrage über den Schlüssel, wenn möglich, sonst Scan mit Filter) */
async function demoRows(t: ResetTable, keys: string[]): Promise<Record<string, any>[]> {
  const rows: Record<string, any>[] = []
  let start: any
  do {
    const cmd = keys[0] === t.attr
      ? new QueryCommand({ TableName: t.table, KeyConditionExpression: '#a = :v', ExpressionAttributeNames: { '#a': t.attr }, ExpressionAttributeValues: { ':v': t.value }, ExclusiveStartKey: start })
      : new ScanCommand({ TableName: t.table, FilterExpression: '#a = :v', ExpressionAttributeNames: { '#a': t.attr }, ExpressionAttributeValues: { ':v': t.value }, ExclusiveStartKey: start })
    const r: any = await db().send(cmd)
    rows.push(...(r.Items || [])); start = r.LastEvaluatedKey
  } while (start)
  return rows
}
const keyOf = (row: any, keys: string[]) => keys.map(k => String(row[k])).join('\u0001')
const ser = (row: any) => JSON.stringify(marshall(row, { removeUndefinedValues: true, convertClassInstanceToMap: true }))
const CHUNK = 300_000
const snapId = (table: string, n: number) => ({ settingId: `demo-snapshot:${table}:${n}`, scope: 'global' })

/** Speichert den aktuellen Demo-Stand als "Standard" (Betreiber-Aktion, siehe scripts/demo/snapshot.mjs) */
export async function saveDemoSnapshot(): Promise<{ tables: number; rows: number }> {
  let total = 0; const names: string[] = []
  for (const t of resetTables()) {
    const keys = await keySchema(t.table), rows = await demoRows(t, keys)
    const json = rows.map(ser)
    // in Stücke von höchstens ~300 KB teilen (DynamoDB: 400 KB je Eintrag)
    const parts: string[][] = [[]]; let size = 0
    for (const j of json) { if (size + j.length > CHUNK && parts[parts.length - 1].length) { parts.push([]); size = 0 } parts[parts.length - 1].push(j); size += j.length }
    for (let n = 0; n < parts.length; n++) await db().send(new PutCommand({ TableName: SETTINGS, Item: { ...snapId(t.table, n), rows: JSON.stringify(parts[n]), part: n, parts: parts.length, updated: new Date().toISOString() } }))
    // übrig gebliebene alte Stücke dieser Tabelle entfernen
    for (let n = parts.length; n < parts.length + 20; n++) { const old = await db().send(new GetCommand({ TableName: SETTINGS, Key: snapId(t.table, n) })); if (!old.Item) break; await db().send(new DeleteCommand({ TableName: SETTINGS, Key: snapId(t.table, n) })) }
    names.push(t.table); total += rows.length
  }
  await db().send(new PutCommand({ TableName: SETTINGS, Item: { settingId: 'demo-snapshot', scope: 'global', tables: names, rows: total, updated: new Date().toISOString() } }))
  return { tables: names.length, rows: total }
}
async function loadSnapshotRows(table: string): Promise<string[]> {
  const out: string[] = []
  for (let n = 0; ; n++) {
    const r: any = (await db().send(new GetCommand({ TableName: SETTINGS, Key: snapId(table, n) }))).Item
    if (!r) break
    out.push(...(JSON.parse(r.rows) as string[])); if (n + 1 >= Number(r.parts || 1)) break
  }
  return out
}

export interface ResetResult { reset: boolean; reason?: string; deleted?: number; restored?: number; tables?: number }
/** Setzt das Demo-Konto auf den gespeicherten Standard zurück: Zeilen, die nicht im Standard stehen, werden gelöscht, fehlende oder veränderte wiederhergestellt. Ohne gespeicherten Standard geschieht nichts. */
export async function resetDemo(opts: { force?: boolean; onlyIfIdleMinutes?: number } = {}): Promise<ResetResult> {
  const now = Date.now(), state = await getDemoState()
  if (!opts.force && !state.dirty) return { reset: false, reason: 'unverändert' }
  if (opts.onlyIfIdleMinutes && state.lastWriteAt && now - Date.parse(state.lastWriteAt) < opts.onlyIfIdleMinutes * 60_000) return { reset: false, reason: 'noch in Benutzung' }
  if (state.resettingAt && now - Date.parse(state.resettingAt) < 90_000) return { reset: false, reason: 'läuft schon' }
  if (!opts.force && state.lastResetAt && now - Date.parse(state.lastResetAt) < 8_000) return { reset: false, reason: 'gerade erst zurückgesetzt' }
  const manifest: any = (await db().send(new GetCommand({ TableName: SETTINGS, Key: { settingId: 'demo-snapshot', scope: 'global' } }))).Item
  if (!manifest?.tables?.length) return { reset: false, reason: 'kein Standard gespeichert' }
  await db().send(new UpdateCommand({ TableName: SETTINGS, Key: stateKey, UpdateExpression: 'SET resettingAt = :n', ExpressionAttributeValues: { ':n': new Date(now).toISOString() } }))
  let deleted = 0, restored = 0
  try {
    const known = new Set<string>(manifest.tables)
    for (const t of resetTables()) {
      if (!known.has(t.table)) continue                       // Tabelle war beim Speichern des Standards nicht dabei: nicht anfassen
      const keys = await keySchema(t.table)
      const current = await demoRows(t, keys)
      const std = (await loadSnapshotRows(t.table)).map(j => ({ json: j, row: unmarshallRow(j) }))
      const stdByKey = new Map(std.map(s => [keyOf(s.row, keys), s]))
      const curByKey = new Map(current.map(r => [keyOf(r, keys), r]))
      for (const [k, r] of curByKey) if (!stdByKey.has(k)) { await db().send(new DeleteCommand({ TableName: t.table, Key: Object.fromEntries(keys.map(x => [x, r[x]])) })); deleted++ }
      for (const [k, s] of stdByKey) { const c = curByKey.get(k); if (!c || ser(c) !== s.json) { await db().send(new PutCommand({ TableName: t.table, Item: s.row })); restored++ } }
    }
  } finally {
    await db().send(new UpdateCommand({ TableName: SETTINGS, Key: stateKey, UpdateExpression: 'SET dirty = :f, writes = :z, lastResetAt = :n REMOVE resettingAt', ExpressionAttributeValues: { ':f': false, ':z': 0, ':n': new Date().toISOString() } }))
  }
  return { reset: true, deleted, restored, tables: manifest.tables.length }
}
import { unmarshall } from '@aws-sdk/util-dynamodb'
const unmarshallRow = (json: string): Record<string, any> => unmarshall(JSON.parse(json))

/** Für den Zeitplan (alle 5 Minuten): setzt zurück, wenn verändert und lange nichts mehr geschrieben wurde */
export const demoResetIfIdle = () => resetDemo({ onlyIfIdleMinutes: DEMO_IDLE_MINUTES })
export { isDemoAccount }
