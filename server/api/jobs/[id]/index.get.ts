import { ScanCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { resolveUserId } from '../../../utils/tenant'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')
  const client = getDynamoClient()
  const result = await client.send(new ScanCommand({
    TableName: 'plexora-campaigns',
    FilterExpression: 'campaignId = :id',
    ExpressionAttributeValues: { ':id': campaignId }
  }))
  const campaign = result.Items?.[0]
  if (!campaign) throw createError({ statusCode: 404, message: 'Stelle nicht gefunden' })

  let branding: any = { brandName: 'Plexora', brandTagline: 'Business Platform', primaryColor: '#ea580c' }
  if (campaign.userId) {
    try {
      const tenantUserId = await resolveUserId(campaign.userId)
      const bs = await client.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'branding', scope: tenantUserId } }))
      if (bs.Item) branding = { ...branding, ...bs.Item }
    } catch {}
  }

  return { campaign, branding }
})
