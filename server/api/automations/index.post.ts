import { requireAuth } from '../../utils/verifyAuth'
import { resolveUserId } from '../../utils/tenant'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { randomUUID } from 'crypto'

const TRIGGERS = ['new_lead', 'form_submitted']
const ACTIONS = ['send_email_template', 'set_lead_status', 'webhook', 'email']
const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'unqualified']

export default defineEventHandler(async (event) => {
  const { email } = requireAuth(event)
  if (email === 'demo@plexora.eu') throw createError({ statusCode: 403, message: 'Demo-Account kann keine Automatisierungen anlegen' })
  const userId = await resolveUserId(email)
  const body = await readBody(event)

  if (!TRIGGERS.includes(body?.trigger)) throw createError({ statusCode: 400, message: 'Ungültiger Trigger' })
  if (!ACTIONS.includes(body?.action)) throw createError({ statusCode: 400, message: 'Ungültige Aktion' })
  if (body.action === 'webhook' && !/^https?:\/\//i.test(body?.webhookUrl || '')) {
    throw createError({ statusCode: 400, message: 'Gültige Webhook-URL erforderlich' })
  }
  if (body.action === 'email' && !String(body?.emailTo || '').includes('@')) {
    throw createError({ statusCode: 400, message: 'Gültige E-Mail-Adresse erforderlich' })
  }
  if (body.action === 'send_email_template' && !body?.templateId) {
    throw createError({ statusCode: 400, message: 'Vorlage erforderlich' })
  }
  if (body.action === 'set_lead_status' && !LEAD_STATUSES.includes(body?.leadStatus)) {
    throw createError({ statusCode: 400, message: 'Gültiger Lead-Status erforderlich' })
  }

  const dynamo = getDynamoClient()
  const automation = {
    userId,
    automationId: randomUUID(),
    name:         String(body.name || '').trim() || 'Neue Automatisierung',
    trigger:      body.trigger,
    action:       body.action,
    webhookUrl:   body.webhookUrl || '',
    emailTo:      body.emailTo || '',
    emailSubject: body.emailSubject || '',
    templateId:   body.templateId || '',
    templateName: body.templateName || '',
    leadStatus:   body.leadStatus || '',
    enabled:      true,
    created:      new Date().toISOString(),
  }
  await dynamo.send(new PutCommand({ TableName: 'plexora-automations', Item: automation }))
  return { automation }
})
