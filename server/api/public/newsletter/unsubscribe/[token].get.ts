import { QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { checkRateLimit } from '../../../../utils/rateLimit'
import { renderNewsletterStatusPage } from '../../../../utils/newsletterPage'

// One-Click-Unsubscribe (RFC 8058 / DSGVO) — bewusst ein einfacher GET ohne Login,
// ohne Zwischenbestätigung. unsubscribeToken ist dauerhaft (anders als confirmToken),
// ein erneuter Aufruf ist idempotent.
export default defineEventHandler(async (event) => {
  setHeader(event, 'Content-Type', 'text/html; charset=utf-8')

  const token = getRouterParam(event, 'token') || ''
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const ok = await checkRateLimit('unsubscribe-ip', ip, 30, 3600)
  if (!ok) {
    return renderNewsletterStatusPage('Zu viele Versuche', 'Bitte versuche es später erneut.', false)
  }

  const dynamo = getDynamoClient()
  const res = await dynamo.send(new QueryCommand({
    TableName: 'plexora-newsletter-subscribers',
    IndexName: 'unsubscribeToken-index',
    KeyConditionExpression: 'unsubscribeToken = :t',
    ExpressionAttributeValues: { ':t': token },
  }))
  const subscriber = res.Items?.[0]

  if (!subscriber) {
    return renderNewsletterStatusPage('Link ungültig', 'Dieser Abmeldelink ist nicht gültig.', false)
  }

  await dynamo.send(new UpdateCommand({
    TableName: 'plexora-newsletter-subscribers',
    Key: { tenantId: subscriber.tenantId, email: subscriber.email },
    UpdateExpression: 'SET #s = :unsub, unsubscribedAt = :now',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':unsub': 'unsubscribed', ':now': new Date().toISOString() },
  }))

  return renderNewsletterStatusPage(
    'Erfolgreich abgemeldet',
    'Du erhältst ab sofort keine weiteren Newsletter-E-Mails mehr. Du kannst dieses Fenster jetzt schließen.',
  )
})
