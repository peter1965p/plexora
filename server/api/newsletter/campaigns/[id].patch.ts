import { requireAuth } from '../../../utils/verifyAuth'
import { resolveUserId } from '../../../utils/tenant'
import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const auth       = requireAuth(event)
  const tenantId   = await resolveUserId(auth.email)
  const campaignId = getRouterParam(event, 'id') || ''
  const body       = await readBody(event)
  const dynamo     = getDynamoClient()

  try {
    await dynamo.send(new UpdateCommand({
      TableName: 'plexora-newsletter-campaigns',
      Key: { tenantId, campaignId },
      ConditionExpression: 'attribute_exists(tenantId) AND #st = :draft',
      UpdateExpression: 'SET #n = :n, subject = :s, bodyHtml = :b, segmentFilter = :sf, updatedAt = :u',
      ExpressionAttributeNames: { '#n': 'name', '#st': 'status' },
      ExpressionAttributeValues: {
        ':n':     body.name    || 'Kampagne',
        ':s':     body.subject || '',
        ':b':     body.bodyHtml || '',
        ':sf':    body.segmentFilter || { tag: '' },
        ':u':     new Date().toISOString(),
        ':draft': 'draft',
      },
    }))
  } catch (err: any) {
    if (err.name === 'ConditionalCheckFailedException') {
      throw createError({ statusCode: 409, message: 'Kampagne nicht gefunden oder bereits versendet — abgeschlossene Kampagnen sind nicht mehr bearbeitbar' })
    }
    throw err
  }

  return { success: true }
})
