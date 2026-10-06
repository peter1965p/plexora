import { resolveUserId } from '../../utils/tenant'
import { DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireAuth } from '../../utils/verifyAuth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const userId = await resolveUserId(requireAuth(event).email)
  await getDynamoClient().send(new DeleteCommand({
    TableName: 'plexora-cashbook',
    Key: { userId, cashId: body.cashId },
  }))
  return { success: true }
})
