import { requireAuth } from '../../../utils/verifyAuth'
import { resolveUserId } from '../../../utils/tenant'
import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

// Echte Cursor-Pagination (LastEvaluatedKey) statt der Scan-alles-Konvention, die
// die bestehenden Marketing-Routen nutzen — bei großen Listen würde ein 1MB-Query-
// Limit sonst still Ergebnisse abschneiden.
export default defineEventHandler(async (event) => {
  const auth     = requireAuth(event)
  const tenantId = await resolveUserId(auth.email)
  const query    = getQuery(event)

  const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 500)
  let exclusiveStartKey: Record<string, any> | undefined
  if (typeof query.cursor === 'string' && query.cursor) {
    try { exclusiveStartKey = JSON.parse(Buffer.from(query.cursor, 'base64').toString('utf-8')) } catch {}
  }

  const dynamo = getDynamoClient()
  const res = await dynamo.send(new QueryCommand({
    TableName: 'plexora-newsletter-subscribers',
    KeyConditionExpression: 'tenantId = :t',
    ExpressionAttributeValues: { ':t': tenantId },
    Limit: limit,
    ExclusiveStartKey: exclusiveStartKey,
  }))

  const nextCursor = res.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(res.LastEvaluatedKey)).toString('base64')
    : null

  return {
    subscribers: (res.Items || []).map(s => ({
      subscriberId: s.subscriberId,
      email:        s.email,
      status:       s.status,
      tags:         s.tags || [],
      createdAt:    s.createdAt,
      confirmedAt:  s.confirmedAt,
    })),
    nextCursor,
  }
})
