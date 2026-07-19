import { requireTenantId } from '../../../utils/auth'
import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const dynamo   = getDynamoClient()

  const res = await dynamo.send(new QueryCommand({
    TableName: 'plexora-pricetag-templates',
    KeyConditionExpression: 'tenantId = :t',
    ExpressionAttributeValues: { ':t': tenantId },
  }))

  const templates = (res.Items || []).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
  return { templates }
})
