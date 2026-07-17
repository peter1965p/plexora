import { QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const token  = getRouterParam(event, 'token') || ''
  const target = String(getQuery(event).url || '')

  // Nie auf eine leere/verdächtige Ziel-URL umleiten — im Zweifel zur Plexora-Startseite
  const safeTarget = /^https?:\/\//i.test(target) ? target : 'https://www.plexora.eu'

  try {
    const dynamo = getDynamoClient()
    const res = await dynamo.send(new QueryCommand({
      TableName: 'plexora-newsletter-sends',
      IndexName: 'trackingToken-index',
      KeyConditionExpression: 'trackingToken = :t',
      ExpressionAttributeValues: { ':t': token },
    }))
    const send = res.Items?.[0]
    if (send) {
      const now = new Date().toISOString()
      const updated = await dynamo.send(new UpdateCommand({
        TableName: 'plexora-newsletter-sends',
        Key: { campaignId: send.campaignId, subscriberId: send.subscriberId },
        ConditionExpression: 'attribute_not_exists(clickedAt)',
        UpdateExpression: 'SET clickedAt = :now, openedAt = if_not_exists(openedAt, :now)',
        ExpressionAttributeValues: { ':now': now },
      })).catch(() => null)
      if (updated) {
        await dynamo.send(new UpdateCommand({
          TableName: 'plexora-newsletter-campaigns',
          Key: { tenantId: send.tenantId, campaignId: send.campaignId },
          UpdateExpression: 'ADD stats.clickCount :one',
          ExpressionAttributeValues: { ':one': 1 },
        })).catch(() => {})
      }
    }
  } catch {
    // Tracking darf die Weiterleitung nie verhindern
  }

  return sendRedirect(event, safeTarget, 302)
})
