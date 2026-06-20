import { DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
export default defineEventHandler(async (event) => {
  const supplierId = getRouterParam(event, 'id')
  const dynamo = getDynamoClient()
  await dynamo.send(new DeleteCommand({ TableName: 'plexora-suppliers', Key: { supplierId, userId: 'global' } }))
  return { success: true }
})
