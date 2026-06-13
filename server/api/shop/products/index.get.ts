import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async () => {
  const client = getDynamoClient()
  try {
    const result = await client.send(new ScanCommand({
      TableName: 'plexora-products',
      FilterExpression: '#st = :active',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':active': 'active' }
    }))
    return { products: result.Items || [] }
  } catch {
    return { products: [] }
  }
})
