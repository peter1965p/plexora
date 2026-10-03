import { requireAuth } from '../../utils/verifyAuth'
import { resolveUserId } from '../../utils/tenant'
import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const { email } = requireAuth(event)
  const userId = await resolveUserId(email)
  const res = await getDynamoClient().send(new QueryCommand({
    TableName: 'plexora-mail-log',
    KeyConditionExpression: 'userId = :u',
    ExpressionAttributeValues: { ':u': userId },
  }))
  const mails = (res.Items || []).sort((a, b) => String(b.created).localeCompare(String(a.created))).slice(0, 50)
  return { mails }
})
