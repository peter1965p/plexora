import { DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireTenantId } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const renterId = getRouterParam(event, 'id') || ''
  const dynamo = getDynamoClient()
  await dynamo.send(new DeleteCommand({ TableName: 'plexora-renters', Key: { tenantId, renterId } }))
  return { ok: true }
})
