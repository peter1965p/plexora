import { requireAuth } from '../../../utils/verifyAuth'
import { resolveUserId } from '../../../utils/tenant'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const auth     = requireAuth(event)
  const tenantId = await resolveUserId(auth.email)
  const body     = await readBody(event)
  const now      = new Date().toISOString()

  const template = {
    tenantId,
    templateId: randomUUID(),
    name:       body.name || 'Neue Vorlage',
    bodyHtml:   body.bodyHtml || '',
    createdAt:  now,
    updatedAt:  now,
  }

  const dynamo = getDynamoClient()
  await dynamo.send(new PutCommand({ TableName: 'plexora-newsletter-templates', Item: template }))
  return { template }
})
