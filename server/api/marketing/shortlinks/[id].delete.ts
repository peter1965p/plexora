import { requireAuth } from '../../../utils/verifyAuth'
import { resolveUserId } from '../../../utils/tenant'
import { DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const userId = await resolveUserId(auth.email)
  const shortCode = getRouterParam(event, 'id')
  const dynamo = getDynamoClient()

  const existing = await dynamo.send(new GetCommand({ TableName: 'plexora-shortlinks', Key: { shortCode } }))
  if (!existing.Item || existing.Item.userId !== userId) {
    throw createError({ statusCode: 404, message: 'Link nicht gefunden' })
  }
  await dynamo.send(new DeleteCommand({ TableName: 'plexora-shortlinks', Key: { shortCode } }))
  return { success: true }
})
