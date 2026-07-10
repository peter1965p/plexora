import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireAuth } from '../../utils/verifyAuth'

export default defineEventHandler(async (event) => {
  const { email } = requireAuth(event)
  const client = getDynamoClient()
  try {
    const result = await client.send(new QueryCommand({
      TableName: 'plexora-orders',
      KeyConditionExpression: 'userId = :u',
      ExpressionAttributeValues: { ':u': email },
    }))
    const orders = (result.Items || []).sort((a: any, b: any) => (b.created || '').localeCompare(a.created || ''))
    return { orders }
  } catch {
    return { orders: [] }
  }
})
