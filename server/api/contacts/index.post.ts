import { resolveUserId } from '../../utils/tenant'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const body   = await readBody(event)
  const client = getDynamoClient()

  const contact = {
    userId: await resolveUserId(body.userId || 'demo-user'),
    contactId:     randomUUID(),
    firstName:     body.firstName,
    lastName:      body.lastName,
    email:         body.email,
    company:       body.company || '',
    companyId:     body.companyId || '',
    phone:         body.phone || '',
    status:        body.status || 'lead',
    leadSource:    body.leadSource || 'manual',
    leadStatus:    body.leadStatus || 'new',
    utmSource:     body.utmSource || '',
    utmMedium:     body.utmMedium || '',
    utmCampaign:   body.utmCampaign || '',
    utmContent:    body.utmContent || '',
    utmTerm:       body.utmTerm || '',
    landingPageId: body.landingPageId || '',
    score:         body.score || 0,
    customerId:    '',
    convertedAt:   '',
    accessCount:   0,
    lastAccessedAt: '',
    created:       new Date().toISOString(),
  }

  await client.send(new PutCommand({ TableName: 'plexora-contacts', Item: contact }))
  return { success: true, contact }
})
