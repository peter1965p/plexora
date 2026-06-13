import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const formId = getRouterParam(event, 'id')
  const body   = await readBody(event)
  const client = getDynamoClient()

  const { Item: form } = await client.send(new GetCommand({
    TableName: 'plexora-forms', Key: { formId }
  }))
  if (!form) throw createError({ statusCode: 404, message: 'Form not found' })

  await client.send(new PutCommand({
    TableName: 'plexora-submissions',
    Item: {
      submissionId: randomUUID(),
      formId,
      formTitle:    form.title,
      data:         body.data || {},
      created:      new Date().toISOString(),
    }
  }))

  return { success: true, message: form.successMsg }
})
