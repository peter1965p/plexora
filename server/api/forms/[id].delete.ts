import { DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const formId = getRouterParam(event, 'id')
  const client = getDynamoClient()
  await client.send(new DeleteCommand({ TableName: 'plexora-forms', Key: { formId } }))
  return { success: true }
})
