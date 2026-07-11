import { resolveUserId } from '../../../utils/tenant'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const body   = await readBody(event)
  const client = getDynamoClient()
  const campaign = {
    userId: await resolveUserId(event.context.auth?.email || 'demo-user'),
    campaignId:    randomUUID(),
    title:         body.title,
    department:    body.department,
    location:      body.location,
    type:          body.type || 'fulltime',
    description:   body.description,
    requirements:  body.requirements,
    status:        'active',
    companyName:   body.companyName || '',
    accentColor:   body.accentColor || '',
    logoUrl:       body.logoUrl || '',
    headerImageUrl: body.headerImageUrl || '',
    bgImageUrl:    body.bgImageUrl || '',
    bgColor:       body.bgColor || '',
    contentTitle:  body.contentTitle || '',
    contentItems:  Array.isArray(body.contentItems) ? body.contentItems.filter(Boolean) : [],
    customTemplateHtml: '',
    templatePresetKey:  '',
    created:       new Date().toISOString(),
  }
  await client.send(new PutCommand({ TableName: 'plexora-campaigns', Item: campaign }))
  return { success: true, campaign }
})
