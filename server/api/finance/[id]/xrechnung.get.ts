import { loadIssuerInvoice, assertValidFor } from '../../../utils/einvoiceContext'
import { toCii } from '../../../../shared/einvoice'

// XRechnung 3.0 (XML, Syntax CII). Nur der Aussteller; fehlen Pflichtangaben, antwortet die Route mit 422 und nennt sie.
export default defineEventHandler(async (event) => {
  const { invoice, model } = await loadIssuerInvoice(event)
  assertValidFor(model, 'xrechnung')
  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${String(invoice.number || invoice.invoiceId).replace(/[^\w.-]/g, '_')}_XRechnung.xml"`)
  return toCii(model, 'xrechnung')
})
