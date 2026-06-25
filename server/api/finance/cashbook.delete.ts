import { resolveUserId } from '../../utils/tenant'
import { DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const userId = await resolveUserId(body.userId || 'demo-user')
  await getDynamoClient().send(new DeleteCommand({
    TableName: 'plexora-cashbook',
    Key: { userId, cashId: body.cashId },
  }))
  return { success: true }
})
