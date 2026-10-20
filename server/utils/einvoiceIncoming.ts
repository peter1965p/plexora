import { randomUUID } from 'node:crypto'
import { requireAuth } from './verifyAuth'
import { assertNotDemo } from './demoPolicy'
import { resolveUserId } from './tenant'
import { parseEInvoiceXml, EInvoiceParseError, type ParsedEInvoice } from './einvoiceParse'
import { extractEmbeddedXml } from './zugferd'
import { computeTotals, r2 } from '../../shared/einvoice'

export const INCOMING_TABLE = 'plexora-finance-incoming'
export const MAX_PDF_BASE64 = 4_000_000
export const MAX_STORED_XML = 300_000                    // DynamoDB: 400 KB je Eintrag

/** Aus dem Request (xml oder pdfBase64) die E-Rechnung lesen. Wirft 400 mit verständlicher Meldung. */
export async function readIncoming(body: any): Promise<{ parsed: ParsedEInvoice; xml: string; source: 'xml' | 'pdf' }> {
  const bad = (m: string) => createError({ statusCode: 400, message: m })
  let xml = '', source: 'xml' | 'pdf' = 'xml'
  if (typeof body?.xml === 'string' && body.xml.trim()) xml = body.xml
  else if (typeof body?.pdfBase64 === 'string' && body.pdfBase64) {
    if (body.pdfBase64.length > MAX_PDF_BASE64) throw bad('Die Datei ist zu groß (höchstens 3 MB).')
    const found = await extractEmbeddedXml(Buffer.from(body.pdfBase64, 'base64'))
    if (!found) throw bad('In diesem PDF steckt keine E-Rechnung (ZUGFeRD/Factur-X). Es ist eine normale PDF-Rechnung.')
    xml = found; source = 'pdf'
  } else throw bad('Bitte eine XML- oder ZUGFeRD-PDF-Datei senden.')
  try { return { parsed: parseEInvoiceXml(xml), xml, source } } catch (e) { if (e instanceof EInvoiceParseError) throw bad(e.message); throw e }
}

/** Plausibilität: stimmen die angegebenen Summen mit den Positionen überein? Hinweise, keine Ablehnung (der Absender ist verantwortlich). */
export function checkIncoming(p: ParsedEInvoice): string[] {
  const out: string[] = []
  const inv = p.invoice
  if (!inv.number) out.push('Die Rechnungsnummer fehlt.')
  if (!inv.issueDate) out.push('Das Rechnungsdatum fehlt.')
  if (!inv.seller.name) out.push('Der Name des Rechnungsstellers fehlt.')
  if (inv.lines.length) {
    const t = computeTotals(inv.lines)
    if (Math.abs(t.net - p.totals.net) > 0.02) out.push(`Die Positionen ergeben ${t.net.toFixed(2)} € netto, angegeben sind ${p.totals.net.toFixed(2)} €.`)
    if (Math.abs(r2(p.totals.net + p.totals.tax) - p.totals.gross) > 0.02) out.push('Netto plus Steuer entspricht nicht dem Gesamtbetrag.')
  }
  if (inv.currency !== 'EUR') out.push(`Die Währung ist ${inv.currency}, nicht Euro.`)
  return out
}

export async function incomingContext(event: any, write: boolean) {
  const auth = requireAuth(event)
  if (write) assertNotDemo(auth, 'Im Demo-Zugang nicht möglich.')
  return { userId: await resolveUserId(auth.email) }
}
export const newIncomingId = () => randomUUID()
export const summary = (p: ParsedEInvoice) => ({ format: p.format, credit: p.credit, number: p.invoice.number, issueDate: p.invoice.issueDate, dueDate: p.invoice.dueDate || '', currency: p.invoice.currency,
  seller: { name: p.invoice.seller.name, street: p.invoice.seller.street, zip: p.invoice.seller.zip, city: p.invoice.seller.city, vatId: p.invoice.seller.vatId, email: p.invoice.seller.email },
  iban: p.invoice.payment.iban, reference: p.invoice.payment.reference, lines: p.invoice.lines.map(l => ({ name: l.name, qty: l.qty, netPrice: l.netPrice, taxRate: l.taxRate })), totals: p.totals })
