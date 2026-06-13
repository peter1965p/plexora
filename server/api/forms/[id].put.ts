import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const formId = getRouterParam(event, 'id')
  const body   = await readBody(event)
  const client = getDynamoClient()
  await client.send(new PutCommand({
    TableName: 'plexora-forms',
    Item: { ...body, formId, updated: new Date().toISOString() }
  }))
  return { success: true }
})
