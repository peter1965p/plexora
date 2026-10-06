import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireAuth } from '../../utils/verifyAuth'
import { resolveUserId } from '../../utils/tenant'

// Versandstatistik einer Kampagne. Nur der Besitzer der Kampagne bekommt Empfänger und Status zu sehen:
// die Kampagnen-ID steht in der öffentlichen Landingpage-Adresse und ist deshalb kein Geheimnis.
export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  if (!auth.email) throw createError({ statusCode: 401, message: 'Anmeldung erforderlich' })
  const tenantId = await resolveUserId(auth.email)

  const { campaignId } = getQuery(event)
  if (!campaignId) return { stats: null, items: [] }

  const dynamo = getDynamoClient()
  const owned = await dynamo.send(new QueryCommand({
    TableName: 'plexora-marketing',
    KeyConditionExpression: 'userId = :uid AND campaignId = :cid',
    ExpressionAttributeValues: { ':uid': tenantId, ':cid': String(campaignId) },
  }))
  if (!owned.Items?.length) throw createError({ statusCode: 404, message: 'Kampagne nicht gefunden' })

  const result = await dynamo.send(new QueryCommand({
    TableName: 'plexora-email-sends',
    KeyConditionExpression: 'campaignId = :cid',
    ExpressionAttributeValues: { ':cid': String(campaignId) },
  }))

  // zusätzlich nur Zeilen des eigenen Mandanten
  const items = (result.Items || []).filter(i => !i.userId || i.userId === tenantId)
  const sent      = items.length
  const opened    = items.filter(i => ['opened', 'clicked'].includes(i.status)).length
  const clicked   = items.filter(i => i.status === 'clicked').length
  const bounced   = items.filter(i => ['bounced', 'complained'].includes(i.status)).length

  return {
    stats: {
      sent,
      opened,
      clicked,
      bounced,
      openRate:  sent > 0 ? Math.round(opened  / sent * 100) : 0,
      clickRate: sent > 0 ? Math.round(clicked / sent * 100) : 0,
    },
    items: items.map(i => ({
      contactId:    i.contactId,
      contactName:  i.contactName,
      email:        i.email,
      status:       i.status,
      sentAt:       i.sentAt,
      openedAt:     i.openedAt || null,
      clickedAt:    i.clickedAt || null,
      followupLevel: i.followupLevel || 0,
    })),
  }
})
