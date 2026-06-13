import { UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const body = await readBody(event)
  const client = getDynamoClient()

  const { Items } = await client.send(new QueryCommand({
    TableName: 'plexora-pages',
    IndexName: 'slug-index',
    KeyConditionExpression: 'slug = :slug',
    ExpressionAttributeValues: { ':slug': slug },
  }))
  if (!Items?.length) throw createError({ statusCode: 404, message: 'Page not found' })

  await client.send(new UpdateCommand({
    TableName: 'plexora-pages',
    Key: { pageId: Items[0].pageId },
    UpdateExpression: 'SET blocks = :b, title = :t, inNav = :n, navLabel = :l, #s = :s, updated = :u',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':b': body.blocks || [],
      ':t': body.title,
      ':n': body.inNav ?? false,
      ':l': body.navLabel || body.title,
      ':s': body.status || 'draft',
      ':u': new Date().toISOString(),
    },
  }))
  return { success: true }
})
