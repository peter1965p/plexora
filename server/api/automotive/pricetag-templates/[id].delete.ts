import { requireTenantId } from '../../../utils/auth'
import { DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const tenantId   = await requireTenantId(event)
  const templateId = getRouterParam(event, 'id') || ''
  const dynamo     = getDynamoClient()

  await dynamo.send(new DeleteCommand({
    TableName: 'plexora-pricetag-templates',
    Key: { tenantId, templateId },
  }))

  return { success: true }
})
