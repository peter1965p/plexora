import { resolveUserId } from '../../utils/tenant'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const body   = await readBody(event)
  const client = getDynamoClient()

  const campaign = {
    userId: await resolveUserId(body.userId || 'demo-user'),
    campaignId:   randomUUID(),
    name:         body.name || '',
    slug:         body.slug || '',
    formId:       body.formId || '',
    headline:     body.headline || '',
    subtext:      body.subtext || '',
    headerImageUrl: body.headerImageUrl || '',
    accentColor:  body.accentColor || '#6C3FE8',
    utmSource:    body.utmSource || '',
    utmMedium:    body.utmMedium || '',
    utmCampaign:  body.utmCampaign || '',
    active:       true,
    created:      new Date().toISOString(),
  }

  await client.send(new PutCommand({ TableName: 'plexora-marketing', Item: campaign }))
  return { success: true, campaign }
})
