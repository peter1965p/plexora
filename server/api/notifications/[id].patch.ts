import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const notificationId = getRouterParam(event, 'id')
  const body   = await readBody(event)
  const dynamo = getDynamoClient()
  await dynamo.send(new UpdateCommand({
    TableName: 'plexora-notifications',
    Key: { notificationId, userId: event.context.auth?.email || 'demo-user' },
    UpdateExpression: 'SET #r = :r',
    ExpressionAttributeNames: { '#r': 'read' },
    ExpressionAttributeValues: { ':r': true }
  }))
  return { success: true }
})
