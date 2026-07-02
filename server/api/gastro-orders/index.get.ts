import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireTenantId } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const dynamo = getDynamoClient()
  const res = await dynamo.send(new QueryCommand({
    TableName: 'plexora-gastro-orders',
    KeyConditionExpression: 'tenantId = :t',
    ExpressionAttributeValues: { ':t': tenantId },
  }))
  const orders = (res.Items || []).sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  return { orders }
})
