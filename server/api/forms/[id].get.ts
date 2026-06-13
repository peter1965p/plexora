import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const formId = getRouterParam(event, 'id')
  const client = getDynamoClient()
  const { Item } = await client.send(new GetCommand({
    TableName: 'plexora-forms',
    Key: { formId }
  }))
  if (!Item) throw createError({ statusCode: 404, message: 'Form not found' })
  return { form: Item }
})
