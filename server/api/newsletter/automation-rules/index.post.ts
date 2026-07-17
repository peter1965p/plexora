import { requireAuth } from '../../../utils/verifyAuth'
import { resolveUserId } from '../../../utils/tenant'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { randomUUID } from 'crypto'

const ALLOWED_TRIGGERS = ['on-signup', 'days-after-signup', 'campaign-reminder']

export default defineEventHandler(async (event) => {
  const auth     = requireAuth(event)
  const tenantId = await resolveUserId(auth.email)
  const body     = await readBody(event)
  const dynamo   = getDynamoClient()

  if (!ALLOWED_TRIGGERS.includes(body.trigger)) {
    throw createError({ statusCode: 400, message: 'Ungültiger Trigger-Typ' })
  }

  const rule = {
    tenantId,
    ruleId:   randomUUID(),
    name:     body.name || 'Neue Regel',
    trigger:  body.trigger,
    delayDays: Number(body.delayDays) || 0,
    templateId: body.templateId || '',
    campaignId: body.campaignId || '',
    active:   body.active ?? true,
    createdAt: new Date().toISOString(),
  }

  await dynamo.send(new PutCommand({ TableName: 'plexora-newsletter-automation-rules', Item: rule }))
  return { rule }
})
