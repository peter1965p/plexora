import { DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireTenantId } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const orderId = getRouterParam(event, 'id') || ''
  await getDynamoClient().send(new DeleteCommand({ TableName: 'plexora-workshop', Key: { tenantId, orderId } }))
  return { ok: true }
})
