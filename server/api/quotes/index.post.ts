import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'node:crypto'
import { getDynamoClient } from '../../utils/dynamodb'
import { assertNotDemo } from '../../utils/demoPolicy'
import { ownerContext, ownerView, nextQuoteSeq, loadTenantSettings, QUOTES_TABLE } from '../../utils/quoteStore'
import { parseQuoteInput, QuoteError, totals, quoteNumber } from '../../../shared/quotes'

// Neues Angebot (Entwurf). Summen und Steuersatz werden beim Anlegen festgehalten (spätere Änderungen der Einstellungen ändern ein Angebot nicht).
const REF = /^[A-Za-z0-9._-]{1,64}$/
export default defineEventHandler(async (event) => {
  const { auth, tenantId } = await ownerContext(event)
  assertNotDemo(auth, 'Im Demo-Zugang können keine Angebote angelegt werden.')
  const body: any = await readBody(event).catch(() => ({}))
  let input
  try { input = parseQuoteInput(body) } catch (e) { if (e instanceof QuoteError) throw createError({ statusCode: 400, message: e.message }); throw e }
  const { invoiceSettings } = await loadTenantSettings(tenantId)
  const t = totals(input.items, invoiceSettings.vatRate, invoiceSettings.smallBusiness)
  const now = new Date()
  const quote = {
    userId: tenantId, quoteId: randomUUID(), number: quoteNumber(now.getFullYear(), await nextQuoteSeq(tenantId, now.getFullYear())),
    ...input, ...t, vatRate: invoiceSettings.vatRate, smallBusiness: !!invoiceSettings.smallBusiness, status: 'draft',
    source: ['manual', 'deal', 'contact', 'campaign'].includes(body?.source) ? body.source : 'manual',
    ...(typeof body?.dealId === 'string' && REF.test(body.dealId) ? { dealId: body.dealId } : {}), ...(typeof body?.contactId === 'string' && REF.test(body.contactId) ? { contactId: body.contactId } : {}),
    created: now.toISOString(), updated: now.toISOString(),
  }
  await getDynamoClient().send(new PutCommand({ TableName: QUOTES_TABLE, Item: quote, ConditionExpression: 'attribute_not_exists(quoteId)' }))
  return { success: true, quote: ownerView(quote) }
})
