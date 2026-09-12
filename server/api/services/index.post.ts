import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireAuth } from '../../utils/verifyAuth'
import { resolveUserId } from '../../utils/tenant'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const { email } = requireAuth(event)
  const userId  = await resolveUserId(email)
  const body    = await readBody(event)
  const client  = getDynamoClient()
  const service = {
    userId,
    serviceId:   randomUUID(),
    name:        body.name,
    description: body.description || '',
    price:       Number(body.price) || 0,
    unit:        body.unit || 'Stk',
    vatRate:     body.vatRate ?? 19,
    created:     new Date().toISOString(),
  }
  await client.send(new PutCommand({ TableName: 'plexora-services', Item: service }))
  return { success: true, service }
})
