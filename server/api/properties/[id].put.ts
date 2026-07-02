import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireTenantId } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const propertyId = getRouterParam(event, 'id') || ''
  const body = await readBody(event)
  const dynamo = getDynamoClient()
  const existing = await dynamo.send(new GetCommand({
    TableName: 'plexora-properties',
    Key: { tenantId, propertyId },
  }))
  if (!existing.Item) throw createError({ statusCode: 404 })
  const item = { ...existing.Item, ...body, tenantId, propertyId, updatedAt: new Date().toISOString() }
  await dynamo.send(new PutCommand({ TableName: 'plexora-properties', Item: item }))
  return { property: item }
})
