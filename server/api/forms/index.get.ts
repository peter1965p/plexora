import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireAuth } from '../../utils/verifyAuth'
import { resolveUserId } from '../../utils/tenant'

export default defineEventHandler(async (event) => {
  const { email } = requireAuth(event)
  const userId = await resolveUserId(email)
  const client = getDynamoClient()
  const { Items } = await client.send(new ScanCommand({
    TableName: 'plexora-forms',
    FilterExpression: 'userId = :u',
    ExpressionAttributeValues: { ':u': userId },
  }))
  return { forms: Items || [] }
})
