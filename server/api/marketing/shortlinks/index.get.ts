import { requireAuth } from '../../../utils/verifyAuth'
import { resolveUserId } from '../../../utils/tenant'
import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const userId = await resolveUserId(auth.email)
  const dynamo = getDynamoClient()
  try {
    const res = await dynamo.send(new QueryCommand({
      TableName: 'plexora-shortlinks',
      IndexName: 'userId-index',
      KeyConditionExpression: 'userId = :u',
      ExpressionAttributeValues: { ':u': userId },
    }))
    return { links: res.Items || [] }
  } catch {
    return { links: [] }
  }
})
