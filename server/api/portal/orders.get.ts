import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async () => {
  const client = getDynamoClient()
  try {
    const result = await client.send(new ScanCommand({ TableName: 'plexora-orders' }))
    return { orders: result.Items || [] }
  } catch {
    return { orders: [] }
  }
})
