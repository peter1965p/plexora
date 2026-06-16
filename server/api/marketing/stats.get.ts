import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async () => {
  const client = getDynamoClient()

  const contacts = await client.send(new ScanCommand({
    TableName: 'plexora-contacts',
    FilterExpression: 'leadSource = :ls',
    ExpressionAttributeValues: { ':ls': 'landingpage' }
  }))

  const stats: Record<string, number> = {}
  for (const c of contacts.Items || []) {
    const key = c.utmCampaign || 'unbekannt'
    stats[key] = (stats[key] || 0) + 1
  }

  return { stats }
})
