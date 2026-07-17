import { requireAuth } from '../../../utils/verifyAuth'
import { resolveUserId } from '../../../utils/tenant'
import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const auth     = requireAuth(event)
  const tenantId = await resolveUserId(auth.email)
  const dynamo   = getDynamoClient()

  const res = await dynamo.send(new QueryCommand({
    TableName: 'plexora-newsletter-automation-rules',
    KeyConditionExpression: 'tenantId = :t',
    ExpressionAttributeValues: { ':t': tenantId },
  }))

  return { rules: res.Items || [] }
})
