import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
export default defineEventHandler(async (event) => {
  const orderId = getRouterParam(event, 'id')
  const body    = await readBody(event)
  const dynamo  = getDynamoClient()
  await dynamo.send(new UpdateCommand({
    TableName: 'plexora-purchase-orders',
    Key: { orderId, userId: 'global' },
    UpdateExpression: 'SET #st = :st, updatedAt = :u',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':st': body.status, ':u': new Date().toISOString() }
  }))
  return { success: true }
})
