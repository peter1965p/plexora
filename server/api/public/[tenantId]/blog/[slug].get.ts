import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  })

  const tenantId = getRouterParam(event, 'tenantId') || ''
  const slug     = getRouterParam(event, 'slug')     || ''
  const dynamo   = getDynamoClient()

  const res = await dynamo.send(new QueryCommand({
    TableName: 'plexora-blog',
    KeyConditionExpression: 'tenantId = :t',
    FilterExpression: 'slug = :sl AND #st = :s',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':t': tenantId, ':sl': slug, ':s': 'published' },
  }))

  const post = res.Items?.[0]
  if (!post) throw createError({ statusCode: 404, message: 'Post nicht gefunden' })

  return { post }
})
