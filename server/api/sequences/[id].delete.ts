import { requireAuth } from '../../utils/verifyAuth'
import { resolveUserId } from '../../utils/tenant'
import { DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const { email } = requireAuth(event)
  const userId = await resolveUserId(email)
  const sequenceId = getRouterParam(event, 'id')
  await getDynamoClient().send(new DeleteCommand({ TableName: 'plexora-sequences', Key: { userId, sequenceId } }))
  return { success: true }
})
