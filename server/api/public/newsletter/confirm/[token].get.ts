import { QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { checkRateLimit } from '../../../../utils/rateLimit'
import { renderNewsletterStatusPage } from '../../../../utils/newsletterPage'

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

  return renderNewsletterStatusPage(
    'Anmeldung bestätigt!',
    'Deine Newsletter-Anmeldung wurde erfolgreich bestätigt. Du kannst dieses Fenster jetzt schließen.',
  )
})
