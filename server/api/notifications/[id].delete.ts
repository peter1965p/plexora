import { DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { getUserId } from '../../utils/queryByUser'

// Löscht eine Benachrichtigung des angemeldeten Nutzers.
export default defineEventHandler(async (event) => {
  const notificationId = getRouterParam(event, 'id')
  await getDynamoClient().send(new DeleteCommand({
    TableName: 'plexora-notifications',
    Key: { notificationId, userId: getUserId(event) },
  }))
  return { success: true }
})
