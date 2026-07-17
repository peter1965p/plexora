import { requireAuth } from '../../../../utils/verifyAuth'
import { resolveUserId } from '../../../../utils/tenant'
import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'

// Anders als die alte, ungeschützte marketing/stats.get.ts: Kampagne wird zuerst
// geladen und die Tenant-Zugehörigkeit geprüft, bevor irgendwelche Zahlen
// rausgehen — verhindert, dass fremde campaignIds erratbar Stats leaken.
export default defineEventHandler(async (event) => {
  const auth       = requireAuth(event)
  const tenantId   = await resolveUserId(auth.email)
  const campaignId = getRouterParam(event, 'id') || ''
  const dynamo     = getDynamoClient()

  const res = await dynamo.send(new GetCommand({
    TableName: 'plexora-newsletter-campaigns',
    Key: { tenantId, campaignId },
  }))
  if (!res.Item) throw createError({ statusCode: 404, message: 'Kampagne nicht gefunden' })

  return { stats: res.Item.stats || {}, status: res.Item.status, sentAt: res.Item.sentAt }
})
