import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { resolveUserId } from '../../utils/tenant'

export default defineEventHandler(async (event) => {
  const email = getQuery(event).userId as string
  if (!email) return { members: [] }

  const tenantId = await resolveUserId(email)
  const dynamo = getDynamoClient()

  const res = await dynamo.send(new QueryCommand({
    TableName: 'plexora-team-members',
    KeyConditionExpression: 'tenantId = :t',
    ExpressionAttributeValues: { ':t': tenantId },
  }))

  return { members: res.Items || [] }
})
