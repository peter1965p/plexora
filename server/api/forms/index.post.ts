import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { resolveUserId } from '../../utils/tenant'
import { requireAuth } from '../../utils/verifyAuth'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const { email } = requireAuth(event)
  const body = await readBody(event)
  const client = getDynamoClient()
  const form = {
    formId:      randomUUID(),
    userId:      await resolveUserId(email),
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
