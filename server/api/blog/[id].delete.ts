import { ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const email  = getHeader(event, 'x-user-email') || ''
  if (!email) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const postId = getRouterParam(event, 'id') || ''
  const dynamo = getDynamoClient()

  const tenantRes = await dynamo.send(new ScanCommand({
    TableName: 'plexora-nexora',
    FilterExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
  }))
  const tenantId = tenantRes.Items?.[0]?.tenantId
  if (!tenantId) throw createError({ statusCode: 404, message: 'Tenant nicht gefunden' })

  await dynamo.send(new DeleteCommand({ TableName: 'plexora-blog', Key: { tenantId, postId } }))
  return { ok: true }
})
