import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireAuth } from '../../utils/verifyAuth'
import { resolveUserId } from '../../utils/tenant'

export default defineEventHandler(async (event) => {
  const { email } = requireAuth(event)
  const userId = await resolveUserId(email)
  const client = getDynamoClient()

  const contacts = await client.send(new QueryCommand({
    TableName: 'plexora-contacts',
    KeyConditionExpression: 'userId = :u',
    FilterExpression: 'leadSource = :ls',
    ExpressionAttributeValues: { ':u': userId, ':ls': 'landingpage' },
  }))

  const stats: Record<string, number> = {}
  for (const c of contacts.Items || []) {
    const key = c.utmCampaign || 'unbekannt'
    stats[key] = (stats[key] || 0) + 1
  }

  return { stats }
})
