import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireTenantId } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const viewingId = getRouterParam(event, 'id') || ''
  const body = await readBody(event)
  const dynamo = getDynamoClient()
  const existing = await dynamo.send(new GetCommand({
    TableName: 'plexora-viewings',
    Key: { tenantId, viewingId },
  }))
  if (!existing.Item) throw createError({ statusCode: 404 })
  const item = { ...existing.Item, ...body, tenantId, viewingId, updatedAt: new Date().toISOString() }
  await dynamo.send(new PutCommand({ TableName: 'plexora-viewings', Item: item }))
  return { viewing: item }
})
