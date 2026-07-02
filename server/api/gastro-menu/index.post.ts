import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireTenantId } from '../../utils/auth'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const body = await readBody(event)
  const dynamo = getDynamoClient()
  const itemId = randomUUID()
  const now = new Date().toISOString()
  const item = {
    tenantId,
    itemId,
    category:    body.category    || 'Sonstiges',
    name:        body.name        || '',
    description: body.description || '',
    price:       body.price       || '',
    available:   body.available   ?? true,
    createdAt: now,
    updatedAt: now,
  }
  await dynamo.send(new PutCommand({ TableName: 'plexora-menu', Item: item }))
  return { item }
})
