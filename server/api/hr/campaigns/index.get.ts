import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { requireAuth } from '../../../utils/verifyAuth'
import { resolveUserId } from '../../../utils/tenant'

export default defineEventHandler(async (event) => {
  const { email } = requireAuth(event)
  const userId = await resolveUserId(email)
  const client = getDynamoClient()
  const result = await client.send(new QueryCommand({
    TableName: 'plexora-campaigns',
    KeyConditionExpression: 'userId = :u',
    ExpressionAttributeValues: { ':u': userId },
  }))
  return { campaigns: result.Items || [] }
})
