import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireAuth } from '../../utils/verifyAuth'
import { assertOwner } from '../../utils/ownership'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const formId = getRouterParam(event, 'id')
  const client = getDynamoClient()
  const { Item } = await client.send(new GetCommand({
    TableName: 'plexora-forms',
    Key: { formId }
  }))
  if (!Item) throw createError({ statusCode: 404, message: 'Form not found' })
  await assertOwner(event, Item as any)
  return { form: Item }
})
