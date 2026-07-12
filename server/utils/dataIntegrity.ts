// Scan + Migration für das "alte ID"-Problem: historische Datensätze, deren userId (oder bei
// plexora-settings: scope) noch eine rohe Cognito-sub statt der heutigen E-Mail-Identität ist —
// ein Artefakt aus der Zeit vor der aktuellen resolveUserId()-Konvention. Diese Datensätze sind
// für ihren echten Besitzer unsichtbar, aber keine Testdaten, sondern echte historische
// Geschäftsdaten. Admin-Tool: scanForLegacyIds() liefert eine Vorschau inkl. vermuteter
// Zuordnung, migrateLegacyId() führt eine einzelne bestätigte Migration aus.
import { DescribeTableCommand } from '@aws-sdk/client-dynamodb'
import { ScanCommand, PutCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider'
import { getDynamoClient } from './dynamodb'
import { resolveUserId } from './tenant'

// tenantId-gescopte Vertikale (Automotive/Gastro/Immobilien/Handwerk/Praxis/Retail/Termine) sind
// bewusst ausgeschlossen — requireTenantId() leitet tenantId immer frisch aus der verifizierten
// E-Mail ab, speichert nie eine rohe sub, daher strukturell nicht betroffen.
export const USERID_TABLES: Array<{ table: string; field: string }> = [
  { table: 'plexora-hr', field: 'userId' },
  { table: 'plexora-contacts', field: 'userId' },
  { table: 'plexora-deals', field: 'userId' },
  { table: 'plexora-projects', field: 'userId' },
  { table: 'plexora-support', field: 'userId' },
  { table: 'plexora-campaigns', field: 'userId' },
  { table: 'plexora-marketing', field: 'userId' },
  { table: 'plexora-companies', field: 'userId' },
  { table: 'plexora-contracts', field: 'userId' },
  { table: 'plexora-finance', field: 'userId' },
  { table: 'plexora-bank-txn', field: 'userId' },
  { table: 'plexora-cashbook', field: 'userId' },
  { table: 'plexora-hr-timelog', field: 'userId' },
  { table: 'plexora-leave', field: 'userId' },
  { table: 'plexora-notifications', field: 'userId' },
  { table: 'plexora-invoice-templates', field: 'userId' },
  { table: 'plexora-orders', field: 'userId' },
  { table: 'plexora-products', field: 'userId' },
  { table: 'plexora-purchase-orders', field: 'userId' },
  { table: 'plexora-retail-closings', field: 'userId' },
  { table: 'plexora-retail-sales', field: 'userId' },
  { table: 'plexora-returns', field: 'userId' },
  { table: 'plexora-suppliers', field: 'userId' },
  { table: 'plexora-forms', field: 'userId' },
  { table: 'plexora-pages', field: 'userId' },
  { table: 'plexora-email-sends', field: 'userId' },
  { table: 'plexora-settings', field: 'scope' },
]

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function looksLikeLegacyId(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

function getCognitoClient() {
  const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME
  return isLambda
    ? new CognitoIdentityProviderClient({ region: 'eu-central-1' })
    : new CognitoIdentityProviderClient({
        region: 'eu-central-1',
        credentials: {
          accessKeyId:     (process.env.NUXT_AWS_ACCESS_KEY_ID || '').replace(/^"|"$/g, ''),
          secretAccessKey: (process.env.NUXT_AWS_SECRET_ACCESS_KEY || '').replace(/^"|"$/g, ''),
        },
      })
}
const USER_POOL_ID = 'eu-central-1_lM7sN6LvC'

// sub → E-Mail über ListUsers (AdminGetUser scheidet aus: der Cognito-Username in diesem Pool
// ist weder die rohe E-Mail noch die sub).
async function resolveSubToEmail(sub: string): Promise<string | null> {
  const cognito = getCognitoClient()
  try {
    const res = await cognito.send(new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Filter: `sub = "${sub}"`,
      Limit: 1,
    }))
    const user = res.Users?.[0]
    const emailAttr = user?.Attributes?.find(a => a.Name === 'email')
    return emailAttr?.Value || null
  } catch {
    return null
  }
}

const keySchemaCache: Record<string, { hash: string; range?: string }> = {}
async function getKeySchema(table: string) {
  if (keySchemaCache[table]) return keySchemaCache[table]
  const client = getDynamoClient()
  const desc = await client.send(new DescribeTableCommand({ TableName: table }))
  const keys = desc.Table?.KeySchema || []
  const hash  = keys.find(k => k.KeyType === 'HASH')?.AttributeName as string
  const range = keys.find(k => k.KeyType === 'RANGE')?.AttributeName as string | undefined
  keySchemaCache[table] = { hash, range }
  return keySchemaCache[table]
}

async function scanFullTable(table: string) {
  const client = getDynamoClient()
  const items: any[] = []
  let ExclusiveStartKey: any = undefined
  do {
    const res = await client.send(new ScanCommand({ TableName: table, ExclusiveStartKey }))
    items.push(...(res.Items || []))
    ExclusiveStartKey = res.LastEvaluatedKey
  } while (ExclusiveStartKey)
  return items
}

export interface ScanGroup {
  table: string
  field: string
  legacyId: string
  count: number
  resolvedEmail: string | null
  suggestedTarget: string | null
}

export interface ScanResult {
  resolvable: ScanGroup[]
  unresolvable: ScanGroup[]
}

export async function scanForLegacyIds(): Promise<ScanResult> {
  const perTableGroups = await Promise.all(USERID_TABLES.map(async ({ table, field }) => {
    const items = await scanFullTable(table)
    const counts = new Map<string, number>()
    for (const item of items) {
      const v = item[field]
      if (looksLikeLegacyId(v)) counts.set(v, (counts.get(v) || 0) + 1)
    }
    return Array.from(counts.entries()).map(([legacyId, count]) => ({ table, field, legacyId, count }))
  }))
  const flat = perTableGroups.flat()

  const uniqueIds = Array.from(new Set(flat.map(g => g.legacyId)))
  const emailById = new Map<string, string | null>()
  for (const id of uniqueIds) {
    emailById.set(id, await resolveSubToEmail(id))
  }

  const resolvable: ScanGroup[] = []
  const unresolvable: ScanGroup[] = []
  for (const g of flat) {
    const email = emailById.get(g.legacyId) || null
    if (!email) {
      unresolvable.push({ ...g, resolvedEmail: null, suggestedTarget: null })
      continue
    }
    const suggestedTarget = await resolveUserId(email)
    resolvable.push({ ...g, resolvedEmail: email, suggestedTarget })
  }

  return { resolvable, unresolvable }
}

export interface MigrateOutcome {
  table: string
  field: string
  legacyId: string
  target: string | null
  migrated: number
  skipped: number
  error?: string
}

// Migriert alle Datensätze einer Tabelle mit einer bestimmten alten ID. Ziel wird frisch neu
// berechnet (nicht aus dem Scan übernommen) — Team-Mitgliedschaften könnten sich zwischenzeitlich
// geändert haben. Kein Bulk-Auto-Fix: wird nur für vom Admin einzeln bestätigte Einträge aufgerufen.
export async function migrateLegacyId(table: string, field: string, legacyId: string): Promise<MigrateOutcome> {
  const cfg = USERID_TABLES.find(t => t.table === table && t.field === field)
  if (!cfg) return { table, field, legacyId, target: null, migrated: 0, skipped: 0, error: 'Unbekannte Tabelle/Feld-Kombination' }

  const email = await resolveSubToEmail(legacyId)
  if (!email) return { table, field, legacyId, target: null, migrated: 0, skipped: 0, error: 'Cognito-Nutzer nicht mehr auffindbar' }
  const target = await resolveUserId(email)

  const { hash, range } = await getKeySchema(table)
  const client = getDynamoClient()
  const items = await scanFullTable(table)
  const affected = items.filter(item => item[field] === legacyId)

  let migrated = 0
  let skipped = 0
  for (const item of affected) {
    try {
      if (field === hash) {
        const oldKey: any = { [hash]: legacyId }
        if (range) oldKey[range] = item[range]
        await client.send(new PutCommand({ TableName: table, Item: { ...item, [field]: target } }))
        await client.send(new DeleteCommand({ TableName: table, Key: oldKey }))
      } else if (range && field === range) {
        const oldKey: any = { [hash]: item[hash], [range]: legacyId }
        await client.send(new PutCommand({ TableName: table, Item: { ...item, [field]: target } }))
        await client.send(new DeleteCommand({ TableName: table, Key: oldKey }))
      } else {
        // Feld ist nicht Teil des Primärschlüssels (z.B. plexora-pages) — einfaches Update reicht.
        const key: any = { [hash]: item[hash] }
        if (range) key[range] = item[range]
        await client.send(new UpdateCommand({
          TableName: table, Key: key,
          UpdateExpression: 'SET #f = :t',
          ExpressionAttributeNames: { '#f': field },
          ExpressionAttributeValues: { ':t': target },
        }))
      }
      migrated++
    } catch {
      skipped++
    }
  }

  return { table, field, legacyId, target, migrated, skipped }
}
