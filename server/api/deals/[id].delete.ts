import { DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const client = getDynamoClient()
  await client.send(new DeleteCommand({
    TableName: 'plexora-deals',
    Key: { userId: body.userId, dealId: id }
  }))
  return { success: true }
})
