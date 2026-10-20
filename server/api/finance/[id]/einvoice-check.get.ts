import { loadIssuerInvoice } from '../../../utils/einvoiceContext'
import { validateEInvoice, computeTotals } from '../../../../shared/einvoice'

// Welche Pflichtangaben fehlen für XRechnung und ZUGFeRD? (Anzeige in Finanzen vor dem Herunterladen)
export default defineEventHandler(async (event) => {
  const { model } = await loadIssuerInvoice(event)
  const t = computeTotals(model.lines)
  return { xrechnung: validateEInvoice(model, 'xrechnung'), zugferd: validateEInvoice(model, 'zugferd'), totals: { net: t.net, tax: t.tax, gross: t.gross } }
})
