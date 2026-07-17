import { requireAuth } from '../../../utils/verifyAuth'
import { resolveUserId } from '../../../utils/tenant'
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const auth     = requireAuth(event)
  const tenantId = await resolveUserId(auth.email)
  const body     = await readBody(event)
  const dynamo   = getDynamoClient()
  const now      = new Date().toISOString()

  // Bei Erstellung aus einer Vorlage wird der Inhalt als Snapshot kopiert — spätere
  // Änderungen an der Vorlage dürfen diese Kampagne nicht rückwirkend verändern.
  let bodyHtml = body.bodyHtml || ''
  if (body.templateId && !bodyHtml) {
    const tpl = await dynamo.send(new GetCommand({
      TableName: 'plexora-newsletter-templates',
      Key: { tenantId, templateId: body.templateId },
    }))
    bodyHtml = tpl.Item?.bodyHtml || ''
  }

  const campaign = {
    tenantId,
    campaignId: randomUUID(),
    name:       body.name    || 'Neue Kampagne',
    subject:    body.subject || '',
    bodyHtml,
    status:     'draft',
    segmentFilter: body.segmentFilter || { tag: '' },
    lastBatchCursor: null,
    stats: { recipientCount: 0, sentCount: 0, deliveredCount: 0, openCount: 0, clickCount: 0, bounceCount: 0, complaintCount: 0, unsubscribeCount: 0 },
    sentAt:    '',
    createdAt: now,
    updatedAt: now,
  }

  await dynamo.send(new PutCommand({ TableName: 'plexora-newsletter-campaigns', Item: campaign }))
  return { campaign }
})
