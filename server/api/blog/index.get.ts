import { QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const email = event.context.auth?.email || ''
  if (!email) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const dynamo = getDynamoClient()

  const tenantRes = await dynamo.send(new ScanCommand({
    TableName: 'plexora-nexora',
    FilterExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
  }))
  const tenantId = tenantRes.Items?.[0]?.tenantId
  if (!tenantId) throw createError({ statusCode: 404, message: 'Tenant nicht gefunden' })

  const res = await dynamo.send(new QueryCommand({
    TableName: 'plexora-blog',
    KeyConditionExpression: 'tenantId = :t',
    ExpressionAttributeValues: { ':t': tenantId },
  }))

  const posts = (res.Items || []).sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return { posts, tenantId }
})
