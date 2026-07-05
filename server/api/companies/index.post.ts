import { resolveUserId } from '../../utils/tenant'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const body   = await readBody(event)
  const client = getDynamoClient()

  const company = {
    userId: await resolveUserId(event.context.auth?.email || 'demo-user'),
    companyId: randomUUID(),
    name:      body.name,
    website:   body.website || '',
    branche:   body.branche || '',
    email:     body.email || '',
    phone:     body.phone || '',
    street:    body.street || '',
    zip:       body.zip || '',
    city:      body.city || '',
    country:   body.country || '',
    notes:     body.notes || '',
    created:   new Date().toISOString(),
  }

  await client.send(new PutCommand({ TableName: 'plexora-companies', Item: company }))
  return { success: true, company }
})
