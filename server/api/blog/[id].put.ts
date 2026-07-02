import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const email = getHeader(event, 'x-user-email') || ''
  if (!email) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const postId = getRouterParam(event, 'id') || ''
  const body   = await readBody(event)
  const dynamo = getDynamoClient()

  const tenantRes = await dynamo.send(new ScanCommand({
    TableName: 'plexora-nexora',
    FilterExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
  }))
  const tenantId = tenantRes.Items?.[0]?.tenantId
  if (!tenantId) throw createError({ statusCode: 404, message: 'Tenant nicht gefunden' })

  const now = new Date().toISOString()

  await dynamo.send(new UpdateCommand({
    TableName: 'plexora-blog',
    Key: { tenantId, postId },
    UpdateExpression: 'SET title = :ti, slug = :sl, excerpt = :ex, content = :co, contentType = :ct, #st = :s, coverImageUrl = :ci, category = :ca, tags = :tg, publishedAt = :pa, updatedAt = :u',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: {
      ':ti': body.title        || '',
      ':sl': body.slug         || '',
      ':ex': body.excerpt       || '',
      ':co': body.content       || '',
      ':ct': body.contentType   || 'markdown',
      ':s':  body.status        || 'draft',
      ':ci': body.coverImageUrl || '',
      ':ca': body.category       || '',
      ':tg': body.tags          || [],
      ':pa': body.status === 'published' && !body.publishedAt ? now : (body.publishedAt || ''),
      ':u':  now,
    },
  }))

  return { ok: true }
})
