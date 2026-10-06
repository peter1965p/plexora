import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { resolveUserId } from '../../utils/tenant'
import { requireAuth } from '../../utils/verifyAuth'
import { assertNotDemo } from '../../utils/demoPolicy'

export default defineEventHandler(async (event) => {
  const userId = await resolveUserId(requireAuth(event).email)
  assertNotDemo(requireAuth(event))

  const body   = await readBody(event)
  const html   = String(body.html || '')
  if (!html.trim()) throw createError({ statusCode: 400, message: 'html erforderlich' })

  const dynamo = getDynamoClient()
  await dynamo.send(new PutCommand({
    TableName: 'plexora-invoice-templates',
    Item: {
      userId,
      html,
      presetKey: body.presetKey || 'custom',
      updatedAt: new Date().toISOString(),
    },
  }))

  return { success: true }
})
