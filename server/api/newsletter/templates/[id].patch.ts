import { requireAuth } from '../../../utils/verifyAuth'
import { resolveUserId } from '../../../utils/tenant'
import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const auth       = requireAuth(event)
  const tenantId   = await resolveUserId(auth.email)
  const templateId = getRouterParam(event, 'id') || ''
  const body       = await readBody(event)
  const dynamo     = getDynamoClient()

  try {
    await dynamo.send(new UpdateCommand({
      TableName: 'plexora-newsletter-templates',
      Key: { tenantId, templateId },
      ConditionExpression: 'attribute_exists(tenantId)',
      UpdateExpression: 'SET #n = :n, bodyHtml = :b, updatedAt = :u',
      ExpressionAttributeNames: { '#n': 'name' },
      ExpressionAttributeValues: {
        ':n': body.name     || 'Vorlage',
        ':b': body.bodyHtml || '',
        ':u': new Date().toISOString(),
      },
    }))
  } catch (err: any) {
    if (err.name === 'ConditionalCheckFailedException') throw createError({ statusCode: 404, message: 'Vorlage nicht gefunden' })
    throw err
  }

  return { success: true }
})
