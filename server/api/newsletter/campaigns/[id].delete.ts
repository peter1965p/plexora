import { requireAuth } from '../../../utils/verifyAuth'
import { resolveUserId } from '../../../utils/tenant'
import { GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const auth       = requireAuth(event)
  const tenantId   = await resolveUserId(auth.email)
  const campaignId = getRouterParam(event, 'id') || ''
  const dynamo     = getDynamoClient()

  const existing = await dynamo.send(new GetCommand({
    TableName: 'plexora-newsletter-campaigns',
    Key: { tenantId, campaignId },
  }))
  if (existing.Item?.status === 'sending') {
    throw createError({ statusCode: 409, message: 'Kampagne wird gerade versendet und kann nicht gelöscht werden' })
  }

  await dynamo.send(new DeleteCommand({
    TableName: 'plexora-newsletter-campaigns',
    Key: { tenantId, campaignId },
  }))

  return { success: true }
})
