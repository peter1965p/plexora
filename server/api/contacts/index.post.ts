import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const client = getDynamoClient()
  const contact = {
    userId:    body.userId || 'demo-user',
    contactId: randomUUID(),
    firstName: body.firstName,
    lastName:  body.lastName,
    email:     body.email,
    company:   body.company,
    phone:     body.phone || '',
    status:    body.status || 'lead',
    created:   new Date().toISOString(),
  }
  await client.send(new PutCommand({ TableName: 'plexora-contacts', Item: contact }))
  return { success: true, contact }
})
