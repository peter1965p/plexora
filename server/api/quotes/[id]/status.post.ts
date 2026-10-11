import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { assertNotDemo } from '../../../utils/demoPolicy'
import { requireAuth } from '../../../utils/verifyAuth'
import { loadOwnedQuote, ownerView, QUOTES_TABLE } from '../../../utils/quoteStore'
import { canTransition, effectiveStatus } from '../../../../shared/quotes'

// Der Inhaber setzt ein gesendetes Angebot von Hand auf angenommen oder abgelehnt (z. B. nach einem Telefonat). Nur aus "gesendet".
export default defineEventHandler(async (event) => {
  assertNotDemo(requireAuth(event), 'Im Demo-Zugang nicht möglich.')      // Demo zuerst: 403, nie ein 404 über fremde Daten
  const { tenantId, quote } = await loadOwnedQuote(event)
  const to = (await readBody(event).catch(() => ({})))?.status
  if (to !== 'accepted' && to !== 'declined') throw createError({ statusCode: 400, message: 'Status muss „accepted“ oder „declined“ sein.' })
  if (!canTransition(effectiveStatus(quote), to)) throw createError({ statusCode: 409, message: 'Nur gesendete, noch gültige Angebote lassen sich so abschließen.' })
  const res = await getDynamoClient().send(new UpdateCommand({
    TableName: QUOTES_TABLE, Key: { userId: tenantId, quoteId: quote.quoteId }, ConditionExpression: '#s = :sent', UpdateExpression: 'SET #s = :to, respondedAt = :at, respondedBy = :by, updated = :at',
    ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':sent': 'sent', ':to': to, ':at': new Date().toISOString(), ':by': 'owner' }, ReturnValues: 'ALL_NEW',
  })).catch((e: any) => { if (e?.name === 'ConditionalCheckFailedException') throw createError({ statusCode: 409, message: 'Der Status hat sich inzwischen geändert.' }); throw e })
  return { success: true, quote: ownerView(res.Attributes!) }
})
