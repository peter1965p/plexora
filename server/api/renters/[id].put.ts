import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireTenantId } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const renterId = getRouterParam(event, 'id') || ''
  const body = await readBody(event)
  const dynamo = getDynamoClient()
  const existing = await dynamo.send(new GetCommand({
    TableName: 'plexora-renters',
    Key: { tenantId, renterId },
  }))
  if (!existing.Item) throw createError({ statusCode: 404 })
  const item = { ...existing.Item, ...body, tenantId, renterId, updatedAt: new Date().toISOString() }
  await dynamo.send(new PutCommand({ TableName: 'plexora-renters', Item: item }))
  return { renter: item }
})
