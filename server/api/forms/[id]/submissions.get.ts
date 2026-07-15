import { QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { requireAuth } from '../../../utils/verifyAuth'
import { assertOwner } from '../../../utils/ownership'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const formId = getRouterParam(event, 'id')
  const client = getDynamoClient()

  const { Item: form } = await client.send(new GetCommand({
    TableName: 'plexora-forms',
    Key: { formId }
  }))
  if (!form) throw createError({ statusCode: 404, message: 'Form not found' })
  await assertOwner(event, form as any)

  const { Items } = await client.send(new QueryCommand({
    TableName: 'plexora-submissions',
    IndexName: 'form-index',
    KeyConditionExpression: 'formId = :fid',
    ExpressionAttributeValues: { ':fid': formId },
  }))
  return { submissions: Items || [] }
})
