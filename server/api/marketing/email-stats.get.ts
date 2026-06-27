import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const { campaignId } = getQuery(event)
  if (!campaignId) return { stats: null, items: [] }

  const dynamo = getDynamoClient()
  const result = await dynamo.send(new QueryCommand({
    TableName: 'plexora-email-sends',
    KeyConditionExpression: 'campaignId = :cid',
    ExpressionAttributeValues: { ':cid': campaignId as string },
  }))

  const items = result.Items || []
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
