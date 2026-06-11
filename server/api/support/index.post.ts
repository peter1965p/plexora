import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const client = getDynamoClient()
  const ticket = {
    userId:   body.userId || 'demo-user',
    ticketId: randomUUID(),
    title:    body.title,
    client:   body.client,
    priority: body.priority || 'medium',
    status:   body.status || 'open',
    created:  new Date().toISOString(),
    updated:  new Date().toISOString(),
  }
  await client.send(new PutCommand({ TableName: 'plexora-support', Item: ticket }))
  return { success: true, ticket }
})
