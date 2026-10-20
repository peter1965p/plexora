import { XMLParser } from 'fast-xml-parser'
import { r2, type EInvoice, type EParty, type ELine } from '../../shared/einvoice'

// Eingehende E-Rechnungen lesen: XRechnung/ZUGFeRD-XML in der Syntax CII (UN/CEFACT) und UBL (Invoice, CreditNote).
export const MAX_EINVOICE_XML = 2_000_000
export class EInvoiceParseError extends Error { constructor(message: string) { super(message) } }
export interface ParsedEInvoice { format: 'cii' | 'ubl'; invoice: EInvoice; totals: { net: number; tax: number; gross: number; payable: number }; credit: boolean }

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', removeNSPrefix: true, parseTagValue: false, parseAttributeValue: false, trimValues: true, processEntities: true, isArray: n => ['IncludedSupplyChainTradeLineItem', 'InvoiceLine', 'CreditNoteLine', 'ApplicableTradeTax', 'SpecifiedTaxRegistration', 'PartyTaxScheme', 'SpecifiedTradeSettlementPaymentMeans', 'PaymentMeans', 'TaxSubtotal'].includes(n) })
const arr = <T>(v: T | T[] | undefined): T[] => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v])
const txt = (v: any): string => (v === undefined || v === null ? '' : typeof v === 'object' ? String(v['#text'] ?? '') : String(v)).trim()
const n = (v: any) => { const x = Number(txt(v)); return Number.isFinite(x) ? x : 0 }
const isoFrom102 = (v: any) => { const s = txt(v?.DateTimeString ?? v); return /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : '' }

function ciiParty(p: any): EParty {
  const reg = arr<any>(p?.SpecifiedTaxRegistration)
  const id = (scheme: string) => txt(reg.find(r => r?.ID?.['@_schemeID'] === scheme)?.ID)
  const a = p?.PostalTradeAddress || {}, c = p?.DefinedTradeContact || {}
  return { name: txt(p?.Name), street: txt(a.LineOne), zip: txt(a.PostcodeCode), city: txt(a.CityName), country: txt(a.CountryID), vatId: id('VA'), taxNumber: id('FC'),
    email: txt(p?.URIUniversalCommunication?.URIID) || txt(c?.EmailURIUniversalCommunication?.URIID), phone: txt(c?.TelephoneUniversalCommunication?.CompleteNumber), contact: txt(c?.PersonName) }
}
function parseCii(root: any): ParsedEInvoice {
  const doc = root.ExchangedDocument || {}, tr = root.SupplyChainTradeTransaction || {}
  const ag = tr.ApplicableHeaderTradeAgreement || {}, st = tr.ApplicableHeaderTradeSettlement || {}, sum = st.SpecifiedTradeSettlementHeaderMonetarySummation || {}
  const lines: ELine[] = arr<any>(tr.IncludedSupplyChainTradeLineItem).map(l => {
    const tax = arr<any>(l?.SpecifiedLineTradeSettlement?.ApplicableTradeTax)[0] || {}
    return { name: txt(l?.SpecifiedTradeProduct?.Name), qty: n(l?.SpecifiedLineTradeDelivery?.BilledQuantity) || 1, unit: l?.SpecifiedLineTradeDelivery?.BilledQuantity?.['@_unitCode'], netPrice: n(l?.SpecifiedLineTradeAgreement?.NetPriceProductTradePrice?.ChargeAmount), taxRate: n(tax.RateApplicablePercent), taxCategory: (txt(tax.CategoryCode) || 'S') as any }
  })
  const means = arr<any>(st.SpecifiedTradeSettlementPaymentMeans)[0] || {}
  const terms = st.SpecifiedTradePaymentTerms || {}
  const note = arr<any>(doc.IncludedNote).map(x => txt(x?.Content)).filter(Boolean).join(' ')
  const typeCode = txt(doc.TypeCode) || '380'
  return { format: 'cii', credit: typeCode === '381',
    invoice: { number: txt(doc.ID), issueDate: isoFrom102(doc.IssueDateTime), dueDate: isoFrom102(terms.DueDateDateTime) || undefined, currency: txt(st.InvoiceCurrencyCode) || 'EUR', typeCode,
      seller: ciiParty(ag.SellerTradeParty), buyer: ciiParty(ag.BuyerTradeParty), buyerReference: txt(ag.BuyerReference), lines,
      payment: { iban: txt(means?.PayeePartyCreditorFinancialAccount?.IBANID).replace(/\s+/g, ''), bic: txt(means?.PayeeSpecifiedCreditorFinancialInstitution?.BICID), reference: txt(st.PaymentReference), terms: txt(terms.Description) }, note: note || undefined },
    totals: { net: n(sum.TaxBasisTotalAmount ?? sum.LineTotalAmount), tax: n(sum.TaxTotalAmount), gross: n(sum.GrandTotalAmount), payable: n(sum.DuePayableAmount ?? sum.GrandTotalAmount) } }
}

function ublParty(wrap: any): EParty {
  const p = wrap?.Party || {}, a = p.PostalAddress || {}, c = p.Contact || {}
  const tax = arr<any>(p.PartyTaxScheme).map(t => txt(t?.CompanyID)).filter(Boolean)
  return { name: txt(p.PartyLegalEntity?.RegistrationName) || txt(p.PartyName?.Name), street: txt(a.StreetName), zip: txt(a.PostalZone), city: txt(a.CityName), country: txt(a.Country?.IdentificationCode),
    vatId: tax.find(t => /^[A-Z]{2}/.test(t)) || '', taxNumber: tax.find(t => !/^[A-Z]{2}/.test(t)) || '', email: txt(p.EndpointID) || txt(c.ElectronicMail), phone: txt(c.Telephone), contact: txt(c.Name) }
}
function parseUbl(root: any, credit: boolean): ParsedEInvoice {
  const lines: ELine[] = arr<any>(credit ? root.CreditNoteLine : root.InvoiceLine).map(l => ({
    name: txt(l?.Item?.Name) || txt(l?.Item?.Description), qty: n(l?.InvoicedQuantity ?? l?.CreditedQuantity) || 1, unit: (l?.InvoicedQuantity ?? l?.CreditedQuantity)?.['@_unitCode'],
    netPrice: n(l?.Price?.PriceAmount), taxRate: n(l?.Item?.ClassifiedTaxCategory?.Percent), taxCategory: (txt(l?.Item?.ClassifiedTaxCategory?.ID) || 'S') as any }))
  const pm = arr<any>(root.PaymentMeans)[0] || {}, tot = root.LegalMonetaryTotal || {}
  const taxTotal = arr<any>(root.TaxTotal)[0] || {}
  return { format: 'ubl', credit,
    invoice: { number: txt(root.ID), issueDate: txt(root.IssueDate).slice(0, 10), dueDate: txt(root.DueDate).slice(0, 10) || undefined, currency: txt(root.DocumentCurrencyCode) || 'EUR', typeCode: txt(root.InvoiceTypeCode ?? root.CreditNoteTypeCode) || (credit ? '381' : '380'),
      seller: ublParty(root.AccountingSupplierParty), buyer: ublParty(root.AccountingCustomerParty), buyerReference: txt(root.BuyerReference), lines,
      payment: { iban: txt(pm?.PayeeFinancialAccount?.ID).replace(/\s+/g, ''), bic: txt(pm?.PayeeFinancialAccount?.FinancialInstitutionBranch?.ID), reference: txt(pm?.PaymentID), terms: txt(root.PaymentTerms?.Note) },
      note: arr<any>(root.Note).map(txt).filter(Boolean).join(' ') || undefined },
    totals: { net: n(tot.TaxExclusiveAmount ?? tot.LineExtensionAmount), tax: n(taxTotal.TaxAmount), gross: n(tot.TaxInclusiveAmount), payable: n(tot.PayableAmount ?? tot.TaxInclusiveAmount) } }
}

/** Liest eine E-Rechnung (XML) und gibt das neutrale Modell samt angegebener Summen zurück. Wirft EInvoiceParseError mit verständlicher Meldung. */
export function parseEInvoiceXml(xml: string): ParsedEInvoice {
  if (typeof xml !== 'string' || !xml.trim()) throw new EInvoiceParseError('Die Datei ist leer.')
  if (xml.length > MAX_EINVOICE_XML) throw new EInvoiceParseError('Die Datei ist zu groß (höchstens 2 MB).')
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new EInvoiceParseError('Das XML enthält eine Dokumenttyp-Deklaration und wird aus Sicherheitsgründen nicht gelesen.')
  let doc: any
  try { doc = parser.parse(xml) } catch { throw new EInvoiceParseError('Das ist kein gültiges XML.') }
  if (doc.CrossIndustryInvoice) return round(parseCii(doc.CrossIndustryInvoice))
  if (doc.Invoice) return round(parseUbl(doc.Invoice, false))
  if (doc.CreditNote) return round(parseUbl(doc.CreditNote, true))
  throw new EInvoiceParseError('Das ist keine E-Rechnung (erwartet: XRechnung oder ZUGFeRD in CII- oder UBL-Syntax).')
}
const round = (p: ParsedEInvoice): ParsedEInvoice => ({ ...p, totals: { net: r2(p.totals.net), tax: r2(p.totals.tax), gross: r2(p.totals.gross), payable: r2(p.totals.payable) } })
