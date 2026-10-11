import { assertNotDemo } from '../../utils/demoPolicy'
import { ownerContext, ownerView, createDraftQuote } from '../../utils/quoteStore'
import { parseQuoteInput, QuoteError } from '../../../shared/quotes'

// Neues Angebot (Entwurf). Summen und Steuersatz werden beim Anlegen festgehalten (spätere Änderungen der Einstellungen ändern ein Angebot nicht).
const REF = /^[A-Za-z0-9._-]{1,64}$/
export default defineEventHandler(async (event) => {
  const { auth, tenantId } = await ownerContext(event)
  assertNotDemo(auth, 'Im Demo-Zugang können keine Angebote angelegt werden.')
  const body: any = await readBody(event).catch(() => ({}))
  let input
  try { input = parseQuoteInput(body) } catch (e) { if (e instanceof QuoteError) throw createError({ statusCode: 400, message: e.message }); throw e }
  const quote = await createDraftQuote(tenantId, input, {
    source: ['manual', 'deal', 'contact', 'campaign'].includes(body?.source) ? body.source : 'manual',
    ...(typeof body?.dealId === 'string' && REF.test(body.dealId) ? { dealId: body.dealId } : {}), ...(typeof body?.contactId === 'string' && REF.test(body.contactId) ? { contactId: body.contactId } : {}),
  })
  return { success: true, quote: ownerView(quote) }
})
