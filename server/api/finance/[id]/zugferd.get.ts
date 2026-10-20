import { loadIssuerInvoice, assertValidFor } from '../../../utils/einvoiceContext'
import { toCii } from '../../../../shared/einvoice'
import { renderInvoiceTemplateToPdf } from '../../../utils/invoiceTemplate'
import { embedZugferd } from '../../../utils/zugferd'

// ZUGFeRD/Factur-X (Profil EN 16931): die normale Rechnungs-PDF mit eingebetteter XML-Rechnung. Nur der Aussteller.
export default defineEventHandler(async (event) => {
  const b = await loadIssuerInvoice(event)
  assertValidFor(b.model, 'zugferd')
  const pdf = await renderInvoiceTemplateToPdf(b.templateHtml, b.invoice, b.branding, b.company, b.invoiceSettings, b.paymentPrefs)
  const out = await embedZugferd(pdf, toCii(b.model, 'zugferd'), `Rechnung ${b.model.number}`)
  setResponseHeader(event, 'Content-Type', 'application/pdf')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${String(b.invoice.number || b.invoice.invoiceId).replace(/[^\w.-]/g, '_')}_ZUGFeRD.pdf"`)
  return Buffer.from(out)
})
