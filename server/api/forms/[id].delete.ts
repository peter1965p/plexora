import { DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireAuth } from '../../utils/verifyAuth'
import { assertOwner } from '../../utils/ownership'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const formId = getRouterParam(event, 'id')
  const client = getDynamoClient()

  const { Item: existing } = await client.send(new GetCommand({
    TableName: 'plexora-forms',
    Key: { formId }
  }))
  if (!existing) throw createError({ statusCode: 404, message: 'Form not found' })
  await assertOwner(event, existing as any)

  await client.send(new DeleteCommand({ TableName: 'plexora-forms', Key: { formId } }))
  return { success: true }
})
