import { requireAuth } from '../../utils/verifyAuth'
import { resolveUserId } from '../../utils/tenant'
import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const { email } = requireAuth(event)
  const userId = await resolveUserId(email)
  const dynamo = getDynamoClient()
  try {
    const res = await dynamo.send(new QueryCommand({
      TableName: 'plexora-automations',
      KeyConditionExpression: 'userId = :u',
      ExpressionAttributeValues: { ':u': userId },
    }))
    return { automations: res.Items || [] }
  } catch {
    return { automations: [] }
  }
})
