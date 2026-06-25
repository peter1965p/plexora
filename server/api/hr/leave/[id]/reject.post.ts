import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const leaveId = getRouterParam(event, 'id')
  const client  = getDynamoClient()
  const scan    = await client.send(new ScanCommand({
    TableName: 'plexora-leave',
    FilterExpression: 'leaveId = :id',
    ExpressionAttributeValues: { ':id': leaveId },
  }))
  const item = scan.Items?.[0]
  if (!item) throw createError({ statusCode: 404 })
  await client.send(new UpdateCommand({
    TableName: 'plexora-leave', Key: { userId: item.userId, leaveId },
    UpdateExpression: 'SET #s = :s', ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':s': 'rejected' },
  }))
  return { success: true }
})
