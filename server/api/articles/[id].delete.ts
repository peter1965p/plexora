import { DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireAuth } from '../../utils/verifyAuth'
import { resolveUserId } from '../../utils/tenant'

export default defineEventHandler(async (event) => {
  const { email } = requireAuth(event)
  const userId    = await resolveUserId(email)
  const articleId = getRouterParam(event, 'id')
  const dynamo    = getDynamoClient()
  await dynamo.send(new DeleteCommand({ TableName: 'plexora-articles', Key: { userId, articleId } }))
  return { success: true }
})
