import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { assertNotDemo } from '../../../utils/demoPolicy'
import { requireAuth } from '../../../utils/verifyAuth'
import { loadOwnedQuote, loadTenantSettings, ownerView, QUOTES_TABLE } from '../../../utils/quoteStore'
import { parseQuoteInput, QuoteError, totals, effectiveStatus } from '../../../../shared/quotes'

// Ändern: nur Entwürfe und abgelaufene Angebote (ein abgelaufenes wird dabei wieder zum Entwurf, z. B. mit neuer Gültigkeit). Gesendete/angenommene/abgelehnte nie:
// der Kunde hat sie so gesehen. Dafür ein neues Angebot anlegen.
export default defineEventHandler(async (event) => {
  assertNotDemo(requireAuth(event), 'Im Demo-Zugang können keine Angebote geändert werden.')      // Demo zuerst: 403, nie ein 404 über fremde Daten
  const { tenantId, quote } = await loadOwnedQuote(event)
  const eff = effectiveStatus(quote)
  if (eff !== 'draft' && eff !== 'expired') throw createError({ statusCode: 409, message: 'Dieses Angebot wurde schon gesendet und lässt sich nicht mehr ändern. Lege ein neues Angebot an.' })
  let input
  try { input = parseQuoteInput(await readBody(event).catch(() => ({}))) } catch (e) { if (e instanceof QuoteError) throw createError({ statusCode: 400, message: e.message }); throw e }
  const { invoiceSettings } = await loadTenantSettings(tenantId)
  const t = totals(input.items, invoiceSettings.vatRate, invoiceSettings.smallBusiness)
  const next = { ...input, ...t, vatRate: invoiceSettings.vatRate, smallBusiness: !!invoiceSettings.smallBusiness, status: 'draft', updated: new Date().toISOString() }
  const res = await getDynamoClient().send(new UpdateCommand({
    TableName: QUOTES_TABLE, Key: { userId: tenantId, quoteId: quote.quoteId }, ConditionExpression: '#s IN (:d, :sent)',
    UpdateExpression: 'SET client=:c, clientEmail=:ce, clientAddress=:ca, title=:ti, intro=:in, note=:no, #i=:it, validUntil=:vu, net=:n, vat=:v, gross=:g, vatRate=:vr, smallBusiness=:sb, #s=:d, updated=:u REMOVE acceptHash, sentAt',
    ExpressionAttributeNames: { '#s': 'status', '#i': 'items' },
    ExpressionAttributeValues: { ':d': 'draft', ':sent': 'sent', ':c': next.client, ':ce': next.clientEmail, ':ca': next.clientAddress, ':ti': next.title, ':in': next.intro, ':no': next.note, ':it': next.items, ':vu': next.validUntil, ':n': next.net, ':v': next.vat, ':g': next.gross, ':vr': next.vatRate, ':sb': next.smallBusiness, ':u': next.updated },
    ReturnValues: 'ALL_NEW',
  }))
  return { success: true, quote: ownerView(res.Attributes || { ...quote, ...next }) }
})
