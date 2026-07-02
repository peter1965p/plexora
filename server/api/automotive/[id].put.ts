import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireTenantId } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const vehicleId = getRouterParam(event, 'id') || ''
  const body = await readBody(event)
  const dynamo = getDynamoClient()
  const existing = await dynamo.send(new GetCommand({
    TableName: 'plexora-vehicles',
    Key: { tenantId, vehicleId },
  }))
  if (!existing.Item) throw createError({ statusCode: 404 })
  const item = { ...existing.Item, ...body, tenantId, vehicleId, updatedAt: new Date().toISOString() }
  await dynamo.send(new PutCommand({ TableName: 'plexora-vehicles', Item: item }))
  return { vehicle: item }
})
