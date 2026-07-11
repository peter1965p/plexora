import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireAuth } from '../../utils/verifyAuth'

export default defineEventHandler(async (event) => {
  const { email } = requireAuth(event)
  const client = getDynamoClient()
  const result = await client.send(new ScanCommand({
    TableName: 'plexora-finance',
    FilterExpression: 'clientEmail = :e',
    ExpressionAttributeValues: { ':e': email },
  }))
  return { invoices: result.Items || [] }
})
