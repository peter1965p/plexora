import { QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { checkRateLimit } from '../../../../utils/rateLimit'
import { renderNewsletterStatusPage } from '../../../../utils/newsletterPage'
import { sendAutomationEmail } from '../../../../utils/newsletterAutomation'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Content-Type', 'text/html; charset=utf-8')

  const token = getRouterParam(event, 'token') || ''
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const ok = await checkRateLimit('confirm-ip', ip, 30, 3600)
  if (!ok) {
    return renderNewsletterStatusPage('Zu viele Versuche', 'Bitte versuche es später erneut.', false)
  }

  const dynamo = getDynamoClient()
  const res = await dynamo.send(new QueryCommand({
    TableName: 'plexora-newsletter-subscribers',
    IndexName: 'confirmToken-index',
    KeyConditionExpression: 'confirmToken = :t',
    ExpressionAttributeValues: { ':t': token },
  }))
  const subscriber = res.Items?.[0]

  if (!subscriber) {
    return renderNewsletterStatusPage(
      'Link ungültig oder abgelaufen',
      'Dieser Bestätigungslink wurde bereits verwendet oder ist nicht mehr gültig. Bitte melde dich erneut an, falls du weiterhin Newsletter erhalten möchtest.',
      false,
    )
  }

  await dynamo.send(new UpdateCommand({
    TableName: 'plexora-newsletter-subscribers',
    Key: { tenantId: subscriber.tenantId, email: subscriber.email },
    UpdateExpression: 'SET #s = :confirmed, confirmedAt = :now REMOVE confirmToken',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':confirmed': 'confirmed', ':now': new Date().toISOString() },
  }))

  // Willkommens-Mail(s): sofort ausgelöst, kein Cron nötig — anders als die
  // verzögerten Automations-Trigger (days-after-signup, campaign-reminder),
  // die im täglichen Sweep laufen (server/api/newsletter/cron/run-automations.post.ts).
  try {
    const rulesRes = await dynamo.send(new QueryCommand({
      TableName: 'plexora-newsletter-automation-rules',
      KeyConditionExpression: 'tenantId = :t',
      FilterExpression: '#trig = :trig AND #a = :active',
      ExpressionAttributeNames: { '#trig': 'trigger', '#a': 'active' },
      ExpressionAttributeValues: { ':t': subscriber.tenantId, ':trig': 'on-signup', ':active': true },
    }))
    for (const rule of rulesRes.Items || []) {
      if (rule.templateId) await sendAutomationEmail(subscriber.tenantId, subscriber as any, rule.templateId)
    }
  } catch (err) {
    console.error('Willkommens-Mail-Trigger fehlgeschlagen:', err)
  }

  return renderNewsletterStatusPage(
    'Anmeldung bestätigt!',
    'Deine Newsletter-Anmeldung wurde erfolgreich bestätigt. Du kannst dieses Fenster jetzt schließen.',
  )
})
