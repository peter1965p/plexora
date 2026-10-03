import { requireAuth } from '../../utils/verifyAuth'
import { resolveUserId } from '../../utils/tenant'
import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const { email } = requireAuth(event)
  const userId = await resolveUserId(email)
  const sequenceId = String(getQuery(event).sequenceId || '')

  const res = await getDynamoClient().send(new QueryCommand({
    TableName: 'plexora-sequence-runs',
    KeyConditionExpression: 'userId = :u',
    FilterExpression: 'sequenceId = :s',
    ExpressionAttributeValues: { ':u': userId, ':s': sequenceId },
  }))

  const counts: Record<string, number> = { active: 0, waiting: 0, done: 0, failed: 0, cancelled: 0 }
  for (const run of res.Items || []) counts[run.status] = (counts[run.status] || 0) + 1
  return { counts }
})
