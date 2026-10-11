import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { findQuoteByRef, QUOTES_TABLE } from '../../../../utils/quoteStore'
import { enforcePublicRateLimit } from '../../../../utils/rateLimit'
import { notifySystem } from '../../../../utils/notifications'
import { canRespond } from '../../../../../shared/quotes'

// Der Kunde nimmt das Angebot an oder lehnt es ab (einmalig, nur solange es gesendet und gültig ist). Atomar: zwei gleichzeitige Antworten, nur eine zählt.
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Cache-Control': 'no-store' })
  await enforcePublicRateLimit(event, 'quote-respond', { perMinute: 5, perDay: 30 })
  const action = (await readBody(event).catch(() => ({})))?.action
  if (action !== 'accept' && action !== 'decline') throw createError({ statusCode: 400, message: 'Bitte „annehmen“ oder „ablehnen“ wählen.' })
  const q = await findQuoteByRef(getRouterParam(event, 'ref'))
  if (!q) throw createError({ statusCode: 404, message: 'Dieses Angebot gibt es nicht (mehr) oder der Link ist nicht korrekt.' })
  if (!canRespond({ status: q.status, validUntil: q.validUntil })) throw createError({ statusCode: 409, message: q.status === 'sent' ? 'Dieses Angebot ist nicht mehr gültig.' : 'Zu diesem Angebot wurde schon geantwortet.' })
  const to = action === 'accept' ? 'accepted' : 'declined'
  try {
    await getDynamoClient().send(new UpdateCommand({
      TableName: QUOTES_TABLE, Key: { userId: q.userId, quoteId: q.quoteId }, ConditionExpression: '#s = :sent', UpdateExpression: 'SET #s = :to, respondedAt = :at, respondedBy = :by, updated = :at',
      ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':sent': 'sent', ':to': to, ':at': new Date().toISOString(), ':by': 'customer' },
    }))
  } catch (e: any) { if (e?.name === 'ConditionalCheckFailedException') throw createError({ statusCode: 409, message: 'Zu diesem Angebot wurde schon geantwortet.' }); throw e }
  try { await notifySystem({ userId: String(q.userId), type: 'quote_response', title: to === 'accepted' ? `Angebot ${q.number} angenommen` : `Angebot ${q.number} abgelehnt`, message: `${q.client} hat das Angebot ${to === 'accepted' ? 'angenommen' : 'abgelehnt'}.`, level: to === 'accepted' ? 'success' : 'info', link: '/finance?tab=quotes' } as any) } catch { /* die Antwort des Kunden zählt, auch wenn die Benachrichtigung scheitert */ }
  return { success: true, status: to }
})
