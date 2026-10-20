import { DeleteCommand, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'crypto'
import { getDynamoClient } from './dynamodb'
import { requireTenantId } from './auth'
import { requireAuth } from './verifyAuth'
import { assertNotDemo } from './demoPolicy'
import { KIT_MAX_RECORDS, KitError, isKitId, kitEntity, kitPackage, kitPrefix, kitSortKey, sanitizeRecord, type KitEntity, type KitPackage } from '../../shared/branchKit'

// Gemeinsame Logik der Branchen-Baukasten-Routen (/api/branchen/<paket>/<liste>): alles in einer Tabelle, Mandantentrennung über den Schlüssel.
export const KIT_TABLE = 'plexora-branch-records'
const notFound = () => createError({ statusCode: 404, message: 'Nicht gefunden.' })

export async function kitContext(event: any, write: boolean): Promise<{ tenantId: string; pkg: KitPackage; entity: KitEntity }> {
  const auth = requireAuth(event)                               // zuerst anmelden, dann erst Paket/Liste prüfen (kein Hinweis auf vorhandene Pakete ohne Anmeldung)
  if (write) assertNotDemo(auth, 'Im Demo-Zugang nicht möglich.')
  const pkg = kitPackage(getRouterParam(event, 'pkg')), entity = kitEntity(pkg, getRouterParam(event, 'entity'))
  if (!pkg || !entity) throw notFound()
  return { tenantId: await requireTenantId(event), pkg, entity }
}

export const flat = (it: any) => ({ id: it.id, ...(it.data || {}), created: it.created, updated: it.updated })

export async function kitList(tenantId: string, pkg: string, entity: string) {
  const out: any[] = []
  let key: any
  do {
    const r: any = await getDynamoClient().send(new QueryCommand({ TableName: KIT_TABLE, KeyConditionExpression: 'tenantId = :t AND begins_with(sk, :p)', ExpressionAttributeValues: { ':t': tenantId, ':p': kitPrefix(pkg, entity) }, ExclusiveStartKey: key }))
    out.push(...(r.Items || [])); key = r.LastEvaluatedKey
  } while (key && out.length <= KIT_MAX_RECORDS)
  return out
}

/** Verweise (ref-Felder) müssen auf einen vorhandenen Eintrag desselben Pakets und Mandanten zeigen */
async function checkRefs(tenantId: string, pkg: KitPackage, entity: KitEntity, data: Record<string, any>) {
  for (const f of entity.fields) {
    if (f.type !== 'ref' || data[f.key] === undefined) continue
    const r: any = await getDynamoClient().send(new GetCommand({ TableName: KIT_TABLE, Key: { tenantId, sk: kitSortKey(pkg.key, f.ref!, data[f.key]) } }))
    if (!r.Item) throw new KitError(`„${f.label}“: Eintrag nicht gefunden.`)
  }
}
const bad = (e: unknown) => { if (e instanceof KitError) throw createError({ statusCode: 400, message: e.message }); throw e }

export async function kitCreate(event: any) {
  const { tenantId, pkg, entity } = await kitContext(event, true)
  try {
    const data = sanitizeRecord(entity, await readBody(event).catch(() => ({})))
    await checkRefs(tenantId, pkg, entity, data)
    if ((await kitList(tenantId, pkg.key, entity.key)).length >= KIT_MAX_RECORDS) throw createError({ statusCode: 409, message: `Höchstens ${KIT_MAX_RECORDS} Einträge in dieser Liste.` })
    const id = randomUUID(), now = new Date().toISOString()
    const item = { tenantId, sk: kitSortKey(pkg.key, entity.key, id), id, pkg: pkg.key, entity: entity.key, data, created: now, updated: now }
    await getDynamoClient().send(new PutCommand({ TableName: KIT_TABLE, Item: item }))
    return { record: flat(item) }
  } catch (e) { return bad(e) }
}

export async function kitUpdate(event: any) {
  const { tenantId, pkg, entity } = await kitContext(event, true)
  const id = getRouterParam(event, 'id')
  if (!isKitId(id)) throw notFound()
  try {
    const sk = kitSortKey(pkg.key, entity.key, id)
    const cur: any = (await getDynamoClient().send(new GetCommand({ TableName: KIT_TABLE, Key: { tenantId, sk } }))).Item
    if (!cur) throw notFound()
    const data = sanitizeRecord(entity, await readBody(event).catch(() => ({})))
    await checkRefs(tenantId, pkg, entity, data)
    const item = { ...cur, data, updated: new Date().toISOString() }
    await getDynamoClient().send(new PutCommand({ TableName: KIT_TABLE, Item: item }))
    return { record: flat(item) }
  } catch (e) { return bad(e) }
}

export async function kitDelete(event: any) {
  const { tenantId, pkg, entity } = await kitContext(event, true)
  const id = getRouterParam(event, 'id')
  if (!isKitId(id)) throw notFound()
  await getDynamoClient().send(new DeleteCommand({ TableName: KIT_TABLE, Key: { tenantId, sk: kitSortKey(pkg.key, entity.key, id) } }))
  return { success: true }
}
