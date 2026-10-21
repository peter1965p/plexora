import { DeleteCommand, GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { DescribeTableCommand } from '@aws-sdk/client-dynamodb'
import { marshall } from '@aws-sdk/util-dynamodb'
import { getDynamoClient } from './dynamodb'
import { isDemoAccount, DEMO_ACCOUNT_EMAIL } from './mailGuard'
import { DEMO_BASE_TENANT, DEMO_BASE_EMAIL, DEMO_POOL, demoTenantId, demoSlot, isDemoEmail, isPoolEmail } from '../../shared/demo'
import { BACKUP_TABLES } from './backup/config'

// Demo-Konto als Sandkasten: Besucher dürfen im Demo-Konto ausprobieren (Daten anlegen, ändern, löschen), alles wird beim Abmelden, beim nächsten Demo-Start und nach Leerlauf auf den
// gespeicherten Standard zurückgesetzt. Was Außenwirkung hat oder sicherheitsrelevant ist (E-Mail-Versand, Dateien, KI, Zahlung, Anmeldung, Team, Sicherung, Blog, Lead-Seiten, Website), bleibt gesperrt.
export const DEMO_TENANT_ID = DEMO_BASE_TENANT
export const LEASE_MINUTES = 45                             // so lange gehört ein Poolkonto einem Besucher, falls er sich nicht abmeldet
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
  if ((p === '/api/demo/reset' || p === '/api/demo/lease') && m === 'POST') return true
  if (DEMO_WRITE_DENY.some(d => d.re.test(p) && (!d.methods || d.methods.includes(m)))) return false
  return DEMO_WRITE_ALLOW.some(r => r.test(p))
}
/** Wird von der Middleware für erlaubte Schreibzugriffe des Demo-Kontos gesetzt: dann gelten die einzelnen assertNotDemo-Prüfungen nicht (die Sperre entscheidet die Erlaubnisliste) */
export const isSandboxed = (auth: any): boolean => !!auth?.demoSandbox

// ── Stand je Konto: wurde etwas verändert? Wem gehört es gerade? ──
// Das Ausgangskonto behält den alten Schlüssel "demo-state", die Poolkonten haben "demo-state:<E-Mail>".
export const stateKey = (email: string) => ({ settingId: email === DEMO_BASE_EMAIL ? 'demo-state' : `demo-state:${email}`, scope: 'global' })
export interface DemoState { dirty?: boolean; writes?: number; lastWriteAt?: string; lastResetAt?: string; resettingAt?: string; leasedAt?: string }
export async function getDemoState(email: string = DEMO_BASE_EMAIL): Promise<DemoState> {
  return ((await getDynamoClient().send(new GetCommand({ TableName: SETTINGS, Key: stateKey(email) }))).Item as DemoState) || {}
}
/** Vermerkt einen Schreibzugriff des Demo-Kontos; wirft 429, wenn das Limit seit dem letzten Zurücksetzen erreicht ist */
export async function markDemoWrite(email: string = DEMO_BASE_EMAIL): Promise<void> {
  const r: any = await getDynamoClient().send(new UpdateCommand({ TableName: SETTINGS, Key: stateKey(email), UpdateExpression: 'SET dirty = :t, lastWriteAt = :n ADD writes :one', ExpressionAttributeValues: { ':t': true, ':n': new Date().toISOString(), ':one': 1 }, ReturnValues: 'UPDATED_NEW' }))
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
export function resetTables(email: string = DEMO_BASE_EMAIL): ResetTable[] {
  const tenant = demoTenantId(email)
  const out: ResetTable[] = []
  for (const [table, rule] of Object.entries(BACKUP_TABLES)) {
    if (RESET_EXCLUDE.has(table)) continue
    if (rule.mode === 'ownerTenant') out.push({ table, attr: rule.attr, value: tenant })
    else if (rule.mode === 'owner') out.push({ table, attr: rule.attr, value: rule.attr === 'tenantId' ? tenant : email })
  }
  return out
}

const db = () => getDynamoClient()
const KS = new Map<string, string[]>()
async function keySchema(table: string): Promise<string[]> {
  const hit = KS.get(table); if (hit) return hit
  const r: any = await db().send(new DescribeTableCommand({ TableName: table }))
  const k = (r?.Table?.KeySchema || []).map((x: any) => x.AttributeName); KS.set(table, k); return k
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
// Kanonische Form für den Vergleich: DynamoDB liefert Attribute in anderer Reihenfolge und Mengen (SS/NS) unsortiert zurück
const canon = (v: any): any => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, ((k === 'SS' || k === 'NS' || k === 'BS') && Array.isArray(v[k])) ? [...v[k]].sort() : canon(v[k])])) : v
const ser = (row: any) => JSON.stringify(marshall(row, { removeUndefinedValues: true, convertClassInstanceToMap: true }))
const same = (a: string, b: string) => JSON.stringify(canon(JSON.parse(a))) === JSON.stringify(canon(JSON.parse(b)))
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
import { unmarshall } from '@aws-sdk/util-dynamodb'
const unmarshallRow = (json: string): Record<string, any> => unmarshall(JSON.parse(json))
const esc = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Wandelt eine Zeile der Vorlage (Ausgangskonto) in die Zeile eines Poolkontos um: E-Mail und Mandanten-ID ersetzen, und jede Kennung (Rechnungs-, Kontakt-, Eintrags-ID …) bekommt ein eindeutiges Ende "-dNN".
 *  Nötig, weil manche Abfragen nur nach der Kennung suchen: gleiche Kennungen in zehn Konten würden sich verwechseln. Verweise zwischen Zeilen (z. B. Mitglied → Beitrag) werden dabei mit umgestellt. */
export function makeTransform(templates: Array<{ table: string; keys: string[]; owner: string; rows: string[] }>, email: string): (json: string) => string {
  if (!isPoolEmail(email)) return j => j
  const ids = new Set<string>()
  for (const t of templates) {
    if (t.table === SETTINGS) continue                       // Einstellungs-Schlüssel (Namen wie "company") sind keine Kennungen
    for (const j of t.rows) {
      const r = JSON.parse(j)
      for (const k of t.keys) if (k !== t.owner) { const v = r[k]?.S; if (typeof v === 'string') { const id = v.includes('#') ? v.split('#').pop()! : v; if (id.length >= 4) ids.add(id) } }     // zusammengesetzte Schlüssel (paket#liste#id): die Kennung am Ende
      if (typeof r.id?.S === 'string' && r.id.S.length >= 4) ids.add(r.id.S)
    }
  }
  const slot = demoSlot(email), tenant = demoTenantId(email)
  const re = ids.size ? new RegExp(`(?<![A-Za-z0-9-])(${[...ids].sort((a, b) => b.length - a.length).map(esc).join('|')})(?![A-Za-z0-9-])`, 'g') : null
  return (json: string) => {
    let out = json.split(DEMO_BASE_EMAIL).join(email).split(DEMO_BASE_TENANT).join(tenant)
    if (re) out = out.replace(re, `$1-d${slot}`)
    return out
  }
}

/** Setzt ein Demo-Konto auf den gespeicherten Standard zurück: Zeilen, die nicht im Standard stehen, werden gelöscht, fehlende oder veränderte wiederhergestellt. Poolkonten bekommen dafür ihre eigene Kopie der Vorlage.
 *  Ohne gespeicherten Standard geschieht nichts. release = das Konto danach wieder für den nächsten Besucher freigeben. */
export async function resetDemo(opts: { email?: string; force?: boolean; onlyIfIdleMinutes?: number; release?: boolean } = {}): Promise<ResetResult> {
  const email = opts.email || DEMO_BASE_EMAIL, sk = stateKey(email)
  const now = Date.now(), state = await getDemoState(email)
  if (!opts.force && !state.dirty) { if (opts.release && state.leasedAt) await db().send(new UpdateCommand({ TableName: SETTINGS, Key: sk, UpdateExpression: 'REMOVE leasedAt' })); return { reset: false, reason: 'unverändert' } }
  if (opts.onlyIfIdleMinutes && state.lastWriteAt && now - Date.parse(state.lastWriteAt) < opts.onlyIfIdleMinutes * 60_000) return { reset: false, reason: 'noch in Benutzung' }
  if (state.resettingAt && now - Date.parse(state.resettingAt) < 90_000) return { reset: false, reason: 'läuft schon' }
  const manifest: any = (await db().send(new GetCommand({ TableName: SETTINGS, Key: { settingId: 'demo-snapshot', scope: 'global' } }))).Item
  if (!manifest?.tables?.length) return { reset: false, reason: 'kein Standard gespeichert' }
  await db().send(new UpdateCommand({ TableName: SETTINGS, Key: sk, UpdateExpression: 'SET resettingAt = :n', ExpressionAttributeValues: { ':n': new Date(now).toISOString() } }))
  let deleted = 0, restored = 0
  try {
    const known = new Set<string>(manifest.tables)
    const tables = resetTables(email).filter(t => known.has(t.table))
    const templates: Array<{ table: string; keys: string[]; owner: string; rows: string[] }> = []
    for (const t of tables) templates.push({ table: t.table, keys: await keySchema(t.table), owner: t.attr, rows: await loadSnapshotRows(t.table) })
    const tr = makeTransform(templates, email)
    for (const t of tables) {
      const tpl = templates.find(x => x.table === t.table)!, keys = tpl.keys
      const current = await demoRows(t, keys)
      const std = tpl.rows.map(j => { const x = tr(j); return { json: x, row: unmarshallRow(x) } })
      const stdByKey = new Map(std.map(r => [keyOf(r.row, keys), r]))
      const curByKey = new Map(current.map(r => [keyOf(r, keys), r]))
      for (const [k, r] of curByKey) if (!stdByKey.has(k)) { await db().send(new DeleteCommand({ TableName: t.table, Key: Object.fromEntries(keys.map(x => [x, r[x]])) })); deleted++ }
      for (const [k, r] of stdByKey) { const c = curByKey.get(k); if (!c || !same(ser(c), r.json)) { await db().send(new PutCommand({ TableName: t.table, Item: r.row })); restored++ } }
    }
  } finally {
    await db().send(new UpdateCommand({ TableName: SETTINGS, Key: sk, UpdateExpression: opts.release ? 'SET dirty = :f, writes = :z, lastResetAt = :n REMOVE resettingAt, leasedAt' : 'SET dirty = :f, writes = :z, lastResetAt = :n REMOVE resettingAt', ExpressionAttributeValues: { ':f': false, ':z': 0, ':n': new Date().toISOString() } }))
  }
  return { reset: true, deleted, restored, tables: manifest.tables.length }
}

/** Vergibt ein freies Poolkonto an einen Besucher (Besitz für LEASE_MINUTES oder bis zum Abmelden), füllt es frisch und gibt seine E-Mail zurück. Ist alles belegt, gilt das gemeinsame Ausgangskonto. */
export async function leaseDemoAccount(): Promise<{ email: string; shared: boolean }> {
  const order = [...DEMO_POOL].sort(() => Math.random() - 0.5)
  for (const email of order) {
    const cutoff = new Date(Date.now() - LEASE_MINUTES * 60_000).toISOString()
    try {
      await db().send(new UpdateCommand({ TableName: SETTINGS, Key: stateKey(email), UpdateExpression: 'SET leasedAt = :n', ConditionExpression: 'attribute_not_exists(leasedAt) OR leasedAt < :c', ExpressionAttributeValues: { ':n': new Date().toISOString(), ':c': cutoff } }))
    } catch (e: any) { if (e?.name === 'ConditionalCheckFailedException') continue; throw e }
    const st = await getDemoState(email)
    const r = await resetDemo({ email, force: !st.lastResetAt || !!st.dirty })     // frisch befüllen (beim ersten Mal aus der Vorlage)
    if (r.reset || r.reason === 'unverändert' || r.reason === 'gerade erst zurückgesetzt') return { email, shared: false }
    await db().send(new UpdateCommand({ TableName: SETTINGS, Key: stateKey(email), UpdateExpression: 'REMOVE leasedAt' }))     // Konto nicht nutzbar (z. B. kein Standard gespeichert): freigeben und das nächste versuchen
  }
  return { email: DEMO_BASE_EMAIL, shared: true }
}

/** Für den Zeitplan (alle 5 Minuten): jedes Demo-Konto, das verändert wurde und lange nicht mehr benutzt wird, zurücksetzen und freigeben; abgelaufene Besitzvermerke aufheben */
export async function demoResetIfIdle(): Promise<{ reset: string[] }> {
  const done: string[] = []
  for (const email of DEMO_ACCOUNTS_ALL) {
    const st = await getDemoState(email)
    if (!st.dirty && !st.leasedAt) continue
    const leaseExpired = !!st.leasedAt && Date.now() - Date.parse(st.leasedAt) > LEASE_MINUTES * 60_000
    const r = await resetDemo({ email, onlyIfIdleMinutes: DEMO_IDLE_MINUTES, release: leaseExpired || !!st.dirty })
    if (r.reset) done.push(email)
    else if (leaseExpired && !st.dirty) await db().send(new UpdateCommand({ TableName: SETTINGS, Key: stateKey(email), UpdateExpression: 'REMOVE leasedAt' }))
  }
  return { reset: done }
}
const DEMO_ACCOUNTS_ALL = [DEMO_BASE_EMAIL, ...DEMO_POOL]
export { isDemoAccount, isDemoEmail }
