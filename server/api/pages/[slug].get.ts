import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { resolveUserId } from '../../utils/tenant'

// Öffentlich abrufbar sind nur veröffentlichte Seiten. Entwürfe sieht nur ihr Besitzer (angemeldet).
// Die Besitzer-Kennung (userId) wird nie ausgeliefert.
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const client = getDynamoClient()
  const { Items } = await client.send(new QueryCommand({
    TableName: 'plexora-pages',
    IndexName: 'slug-index',
    KeyConditionExpression: 'slug = :slug',
    ExpressionAttributeValues: { ':slug': slug },
  }))
  const items = Items || []

  let page = items.find((p: any) => p.status === 'published')
  if (!page) {
    const email = event.context.auth?.email
    if (email) {
      const owner = await resolveUserId(email)
      page = items.find((p: any) => p.userId === owner)
    }
  }
  if (!page) throw createError({ statusCode: 404, message: 'Page not found' })

  const { userId: _owner, ...publicPage } = page
  return { page: publicPage }
})
