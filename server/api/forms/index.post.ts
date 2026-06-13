import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const client = getDynamoClient()
  const form = {
    formId:      randomUUID(),
    title:       body.title,
    description: body.description || '',
    fields:      body.fields || [],
    submitLabel: body.submitLabel || 'Absenden',
    successMsg:  body.successMsg || 'Vielen Dank!',
    notifyEmail: body.notifyEmail || '',
    created:     new Date().toISOString(),
  }
  await client.send(new PutCommand({ TableName: 'plexora-forms', Item: form }))
  return { success: true, form }
})
