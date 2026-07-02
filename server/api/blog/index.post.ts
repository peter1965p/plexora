import { ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const email = getHeader(event, 'x-user-email') || ''
  if (!email) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = await readBody(event)
  const dynamo = getDynamoClient()

  const tenantRes = await dynamo.send(new ScanCommand({
    TableName: 'plexora-nexora',
    FilterExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
  }))
  const tenantId = tenantRes.Items?.[0]?.tenantId
  if (!tenantId) throw createError({ statusCode: 404, message: 'Tenant nicht gefunden' })

  const now = new Date().toISOString()
  const post = {
    tenantId,
    postId:       randomUUID(),
    title:        body.title        || 'Neuer Beitrag',
    slug:         body.slug         || `post-${Date.now()}`,
    excerpt:      body.excerpt       || '',
    content:      body.content       || '',
    contentType:  body.contentType   || 'markdown',
    status:       body.status        || 'draft',
    coverImageUrl: body.coverImageUrl || '',
    category:      body.category       || '',
    tags:         body.tags          || [],
    publishedAt:  body.status === 'published' ? now : (body.publishedAt || ''),
    createdAt:    now,
    updatedAt:    now,
  }

  await dynamo.send(new PutCommand({ TableName: 'plexora-blog', Item: post }))
  return { post }
})
