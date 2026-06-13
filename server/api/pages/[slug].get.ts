import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const client = getDynamoClient()
  const { Items } = await client.send(new QueryCommand({
    TableName: 'plexora-pages',
    IndexName: 'slug-index',
    KeyConditionExpression: 'slug = :slug',
    ExpressionAttributeValues: { ':slug': slug },
  }))
  if (!Items?.length) throw createError({ statusCode: 404, message: 'Page not found' })
  return { page: Items[0] }
})
