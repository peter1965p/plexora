import { DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { assertOwner } from '../../utils/ownership'

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
  await assertOwner(event, Items[0] as any)

  await client.send(new DeleteCommand({
    TableName: 'plexora-pages',
    Key: { pageId: Items[0].pageId },
  }))
  return { success: true }
})
