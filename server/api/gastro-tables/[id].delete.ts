import { DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireTenantId } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const tableId = getRouterParam(event, 'id') || ''
  const dynamo = getDynamoClient()
  await dynamo.send(new DeleteCommand({ TableName: 'plexora-tables', Key: { tenantId, tableId } }))
  return { ok: true }
})
