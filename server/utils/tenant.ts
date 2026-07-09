import { ScanCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'

const cache = new Map<string, { id: string; ts: number }>()
const TTL = 60_000

export async function resolveUserId(email: string): Promise<string> {
  if (!email || email === 'demo-user') return email

  const cached = cache.get(email)
  if (cached && Date.now() - cached.ts < TTL) return cached.id

  try {
    const dynamo = getDynamoClient()
    const res = await dynamo.send(new ScanCommand({
      TableName: 'plexora-team-members',
      FilterExpression: 'memberEmail = :e AND #s = :active',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':e': email, ':active': 'active' },
    }))
    const tenantId = res.Items?.[0]?.tenantId as string | undefined
    const effective = tenantId || email
    cache.set(email, { id: effective, ts: Date.now() })
    return effective
  } catch {
    return email
  }
}

export function invalidateTenantCache(email: string) {
  cache.delete(email)
}

// Übersetzt einen Nexora-tenantId (Lizenzschlüssel-basiert, aus plexora-nexora) in die
// E-Mail-Identität, mit der plexora-products/-finance/-... intern arbeiten (resolveUserId-Konvention).
export async function resolveTenantEmail(tenantId: string): Promise<string | null> {
  try {
    const dynamo = getDynamoClient()
    const res = await dynamo.send(new GetCommand({ TableName: 'plexora-nexora', Key: { tenantId } }))
    return (res.Item?.email as string) || null
  } catch {
    return null
  }
}
