import { DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { incomingContext, INCOMING_TABLE } from '../../../../utils/einvoiceIncoming'

export default defineEventHandler(async (event) => {
  const { userId } = await incomingContext(event, true)
  await getDynamoClient().send(new DeleteCommand({ TableName: INCOMING_TABLE, Key: { userId, incomingId: getRouterParam(event, 'id') } }))
  return { success: true }
})
