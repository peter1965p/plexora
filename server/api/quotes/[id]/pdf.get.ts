import { loadOwnedQuote, loadTenantSettings } from '../../../utils/quoteStore'
import { renderQuotePdf } from '../../../utils/quotePdf'

export default defineEventHandler(async (event) => {
  const { tenantId, quote } = await loadOwnedQuote(event)
  const pdf = await renderQuotePdf(quote, await loadTenantSettings(tenantId))
  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `attachment; filename="Angebot-${String(quote.number).replace(/[^A-Za-z0-9._-]/g, '_')}.pdf"`)
  return pdf
})
