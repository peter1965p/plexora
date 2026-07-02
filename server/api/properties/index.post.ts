import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireTenantId } from '../../utils/auth'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const body = await readBody(event)
  const dynamo = getDynamoClient()
  const propertyId = randomUUID()
  const now = new Date().toISOString()
  const item = {
    tenantId,
    propertyId,
    ...body,
    createdAt: now,
    updatedAt: now,
  }
  await dynamo.send(new PutCommand({ TableName: 'plexora-properties', Item: item }))
  return { property: item }
})
