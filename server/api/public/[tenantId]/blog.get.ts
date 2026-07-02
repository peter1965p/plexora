import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  })

  const tenantId = getRouterParam(event, 'tenantId') || ''
  const dynamo   = getDynamoClient()

  const res = await dynamo.send(new QueryCommand({
    TableName: 'plexora-blog',
    KeyConditionExpression: 'tenantId = :t',
    FilterExpression: '#st = :s',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':t': tenantId, ':s': 'published' },
  }))

  const posts = (res.Items || [])
    .sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime())
    .map(p => ({
      postId:       p.postId,
      title:        p.title,
      slug:         p.slug,
      excerpt:      p.excerpt,
      coverImageUrl: p.coverImageUrl,
      tags:         p.tags,
      publishedAt:  p.publishedAt,
      contentType:  p.contentType,
    }))

  return { posts }
})
