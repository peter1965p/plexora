import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireAuth } from '../../utils/verifyAuth'

export default defineEventHandler(async (event) => {
  const { email } = requireAuth(event)
  const client = getDynamoClient()
  try {
    const result = await client.send(new ScanCommand({
      TableName: 'plexora-documents',
      FilterExpression: 'clientEmail = :e',
      ExpressionAttributeValues: { ':e': email },
    }))
    return { documents: result.Items || [] }
  } catch {
    return { documents: [] }
  }
})
