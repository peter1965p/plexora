import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireTenantId } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const dynamo = getDynamoClient()
  const res = await dynamo.send(new QueryCommand({
    TableName: 'plexora-viewings',
    KeyConditionExpression: 'tenantId = :t',
    ExpressionAttributeValues: { ':t': tenantId },
  }))
  return { viewings: res.Items || [] }
})
