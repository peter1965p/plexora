import { QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../../utils/dynamodb'

// 1x1 transparentes GIF, Standard-Tracking-Pixel-Payload
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7', 'base64')

export default defineEventHandler(async (event) => {
  setHeader(event, 'Content-Type', 'image/gif')
  setHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate')

  const token = getRouterParam(event, 'token') || ''
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
      const updated = await dynamo.send(new UpdateCommand({
        TableName: 'plexora-newsletter-sends',
        Key: { campaignId: send.campaignId, subscriberId: send.subscriberId },
        ConditionExpression: 'attribute_not_exists(openedAt)',
        UpdateExpression: 'SET openedAt = :now',
        ExpressionAttributeValues: { ':now': new Date().toISOString() },
      })).catch(() => null)
      // Nur zählen, wenn die Conditional-Update wirklich gegriffen hat — verhindert
      // Doppelzählung durch mehrfaches Laden desselben Pixels (z.B. Apple Mail
      // Privacy Protection, das Pixel serverseitig vorlädt, teils mehrfach).
      if (updated) {
        await dynamo.send(new UpdateCommand({
          TableName: 'plexora-newsletter-campaigns',
          Key: { tenantId: send.tenantId, campaignId: send.campaignId },
          UpdateExpression: 'ADD stats.openCount :one',
          ExpressionAttributeValues: { ':one': 1 },
        })).catch(() => {})
      }
    }
  } catch {
    // Tracking darf die Pixel-Auslieferung nie verhindern
  }

  return PIXEL
})
