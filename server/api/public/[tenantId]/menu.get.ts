import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  })

  const tenantId = getRouterParam(event, 'tenantId') || ''
  const dynamo   = getDynamoClient()

  const res = await dynamo.send(new QueryCommand({
    TableName: 'plexora-menu',
    KeyConditionExpression: 'tenantId = :t',
    ExpressionAttributeValues: { ':t': tenantId },
  }))

  const items = (res.Items || [])
    .filter((i: any) => i.available)
    .map((i: any) => ({
      itemId:      i.itemId,
      category:    i.category    || 'Sonstiges',
      name:        i.name        || '',
      description: i.description || '',
      price:       i.price       || '',
    }))

  return { items }
})
