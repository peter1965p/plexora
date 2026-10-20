// E-Rechnung: XRechnung 3.0 und ZUGFeRD/Factur-X (Profil EN 16931) nach EN 16931 (CII-Syntax). Reine Logik ohne Netz und Datenbank.
// Aus einer Plexora-Rechnung entsteht ein neutrales Modell (EInvoice); daraus erzeugt toCii() das XML, validateEInvoice() nennt fehlende Pflichtangaben.
// Gelesen werden Rechnungen (CII und UBL) in server/utils/einvoiceParse.ts.
export type EProfile = 'xrechnung' | 'zugferd'
export interface EParty {
  name: string; street?: string; zip?: string; city?: string; country?: string
  vatId?: string; taxNumber?: string; email?: string; phone?: string; contact?: string
  /** Leitweg-ID (nur Käufer, Behörden) */
  leitwegId?: string
}
export interface ELine { name: string; qty: number; unit?: string; netPrice: number; taxRate: number; taxCategory?: 'S' | 'Z' | 'E' }
export interface EInvoice {
  number: string; issueDate: string; dueDate?: string; serviceDate?: string; currency: string; typeCode?: string
  seller: EParty; buyer: EParty; buyerReference?: string
  lines: ELine[]
  payment: { iban?: string; bic?: string; bankName?: string; reference?: string; terms?: string }
  /** Begründung, wenn keine Umsatzsteuer berechnet wird (z. B. Kleinunternehmer) */
  exemptionReason?: string
  note?: string
}
export interface EProblem { field: string; message: string; level: 'error' | 'warn' }

export const SMALL_BUSINESS_TEXT = 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.'
export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
const num = (n: unknown) => { const v = Number(n); return Number.isFinite(v) ? v : 0 }
const GUIDELINE: Record<EProfile, string> = {
  xrechnung: 'urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0',
  zugferd: 'urn:cen.eu:en16931:2017',
}
export const ZUGFERD_FILENAME = 'factur-x.xml'

const COUNTRIES: Record<string, string> = { deutschland: 'DE', germany: 'DE', österreich: 'AT', oesterreich: 'AT', austria: 'AT', schweiz: 'CH', switzerland: 'CH', niederlande: 'NL', frankreich: 'FR', italien: 'IT', spanien: 'ES', belgien: 'BE', luxemburg: 'LU', polen: 'PL', dänemark: 'DK', tschechien: 'CZ' }
export function countryCode(v: unknown): string {
  const s = String(v ?? '').trim()
  if (/^[A-Za-z]{2}$/.test(s)) return s.toUpperCase()
  return COUNTRIES[s.toLowerCase()] || 'DE'
}

/** "12345 Berlin" → PLZ und Ort */
export function splitZipCity(s: unknown): { zip: string; city: string } {
  const m = String(s ?? '').trim().match(/^(?:[A-Za-z]{1,2}[- ])?(\d{4,5})\s+(.+)$/)
  return m ? { zip: m[1], city: m[2].trim() } : { zip: '', city: String(s ?? '').trim() }
}
/** Mehrzeilige Anschrift ("Straße 1\n12345 Ort") in Straße, PLZ, Ort zerlegen */
export function splitAddress(s: unknown): { street: string; zip: string; city: string } {
  const lines = String(s ?? '').split(/\r?\n|,/).map(x => x.trim()).filter(Boolean)
  if (!lines.length) return { street: '', zip: '', city: '' }
  if (lines.length === 1) return { street: lines[0], zip: '', city: '' }
  const zc = splitZipCity(lines[lines.length - 1])
  return { street: lines.slice(0, -1).join(', '), ...zc }
}

/** IBAN-Prüfziffer (ISO 7064 Mod 97-10) */
export function isValidIban(raw: unknown): boolean {
  const s = String(raw ?? '').replace(/\s+/g, '').toUpperCase()
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false
  const t = s.slice(4) + s.slice(0, 4)
  let rem = 0
  for (const ch of t) { const v = ch >= 'A' ? ch.charCodeAt(0) - 55 : Number(ch); rem = Number(String(rem) + String(v)) % 97 }
  return rem === 1
}
export const cleanIban = (v: unknown) => String(v ?? '').replace(/\s+/g, '').toUpperCase()

/** Aus einer Plexora-Rechnung samt Firmen- und Rechnungseinstellungen das neutrale Modell bauen. Preise sind Nettopreise (wie im Rechnungsformular). */
export function fromRecord(invoice: any, company: any = {}, settings: any = {}): EInvoice {
  const small = invoice.smallBusiness ?? settings.smallBusiness
  const defaultRate = num(invoice.vatRate ?? settings.vatRate ?? 19)
  const items: any[] = Array.isArray(invoice.items) && invoice.items.length ? invoice.items : [{ description: invoice.description || 'Dienstleistung', qty: 1, price: invoice.amount }]
  const lines: ELine[] = items.map(i => {
    const rate = small ? 0 : num(i.vatRate ?? defaultRate)
    return { name: String(i.description || 'Dienstleistung'), qty: num(i.qty) || 1, unit: i.unit, netPrice: num(i.price), taxRate: rate, taxCategory: small ? 'E' : rate === 0 ? 'Z' : 'S' }
  })
  const zc = splitZipCity(company.zipCity)
  const addr = invoice.clientStreet || invoice.clientZip || invoice.clientCity ? { street: invoice.clientStreet || '', zip: invoice.clientZip || '', city: invoice.clientCity || '' } : splitAddress(invoice.clientAddress)
  const created = String(invoice.created || new Date().toISOString()).slice(0, 10)
  return {
    number: String(invoice.number || invoice.invoiceId || ''), issueDate: created, serviceDate: invoice.serviceDate ? String(invoice.serviceDate).slice(0, 10) : created, dueDate: invoice.dueDate ? String(invoice.dueDate).slice(0, 10) : undefined, currency: 'EUR', typeCode: '380',
    seller: { name: company.legalName || '', street: company.street || '', zip: zc.zip, city: zc.city, country: countryCode(company.country), vatId: String(company.vatId || '').replace(/\s+/g, ''), taxNumber: company.taxNumber || '', email: company.email || '', phone: company.phone || '', contact: company.contactName || company.representedBy || '' },
    buyer: { name: invoice.client || '', ...addr, country: countryCode(invoice.clientCountry), vatId: String(invoice.clientVatId || '').replace(/\s+/g, ''), email: invoice.clientEmail || '', leitwegId: invoice.buyerReference || '' },
    buyerReference: invoice.buyerReference || '',
    lines,
    payment: { iban: cleanIban(company.iban), bic: String(company.bic || '').replace(/\s+/g, '').toUpperCase(), bankName: company.bankName || '', reference: String(invoice.number || ''), terms: settings.dueText || '' },
    exemptionReason: small ? SMALL_BUSINESS_TEXT : undefined,
    note: invoice.notes || undefined,
  }
}

export interface Totals { net: number; tax: number; gross: number; groups: Array<{ category: string; rate: number; basis: number; tax: number }>; lineNets: number[] }
export function computeTotals(lines: ELine[]): Totals {
  const lineNets = lines.map(l => r2(l.qty * l.netPrice))
  const map = new Map<string, { category: string; rate: number; basis: number; tax: number }>()
  lines.forEach((l, i) => {
    const category = l.taxCategory || (l.taxRate === 0 ? 'Z' : 'S')
    const k = `${category}|${l.taxRate}`
    const g = map.get(k) || { category, rate: l.taxRate, basis: 0, tax: 0 }
    g.basis = r2(g.basis + lineNets[i]); map.set(k, g)
  })
  const groups = [...map.values()].map(g => ({ ...g, tax: r2(g.basis * g.rate / 100) }))
  const net = r2(lineNets.reduce((s, v) => s + v, 0)), tax = r2(groups.reduce((s, g) => s + g.tax, 0))
  return { net, tax, gross: r2(net + tax), groups, lineNets }
}

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/
const VATID_RE = /^[A-Z]{2}[A-Z0-9]{2,12}$/
/** Prüft die Pflichtangaben (EN 16931 und die deutschen Zusatzregeln BR-DE der XRechnung). Fehler verhindern ein gültiges Dokument. */
export function validateEInvoice(inv: EInvoice, profile: EProfile): EProblem[] {
  const out: EProblem[] = []
  const err = (field: string, message: string) => out.push({ field, message, level: 'error' })
  const warn = (field: string, message: string) => out.push({ field, message, level: 'warn' })
  const s = inv.seller, b = inv.buyer
  if (!inv.number) err('Rechnungsnummer', 'Die Rechnung hat keine Nummer.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inv.issueDate)) err('Rechnungsdatum', 'Das Rechnungsdatum fehlt oder ist ungültig.')
  if (!inv.lines.length) err('Positionen', 'Die Rechnung hat keine Position.')
  inv.lines.forEach((l, i) => { if (!l.name) err(`Position ${i + 1}`, 'Die Bezeichnung fehlt.'); if (!(l.qty > 0)) err(`Position ${i + 1}`, 'Die Menge muss größer als 0 sein.') })
  // Verkäufer
  if (!s.name) err('Firma', 'Der Firmenname fehlt (Einstellungen → Firma).')
  if (!s.street) err('Firma', 'Die Straße der Firma fehlt.')
  if (!s.zip || !s.city) err('Firma', 'PLZ und Ort der Firma fehlen (Schreibweise „12345 Stadt“).')
  if (!s.vatId && !s.taxNumber) err('Firma', 'USt-IdNr. oder Steuernummer der Firma fehlt.')
  else if (s.vatId && !VATID_RE.test(s.vatId)) warn('Firma', 'Die USt-IdNr. sieht ungewöhnlich aus (z. B. DE123456789).')
  if (profile === 'xrechnung') {
    if (!s.contact) err('Firma', 'Ansprechpartner der Firma fehlt (BR-DE-2).')
    if (!s.phone) err('Firma', 'Telefonnummer der Firma fehlt (BR-DE-2).')
    if (!s.email || !EMAIL_RE.test(s.email)) err('Firma', 'Gültige E-Mail-Adresse der Firma fehlt (BR-DE-2).')
    if (!b.email || !EMAIL_RE.test(b.email)) err('Kunde', 'Die E-Mail-Adresse des Kunden fehlt (elektronische Adresse des Empfängers).')
  } else if (s.email && !EMAIL_RE.test(s.email)) warn('Firma', 'Die E-Mail-Adresse der Firma ist ungültig.')
  // Zahlung
  if (!inv.payment.iban) err('Bank', 'Die IBAN der Firma fehlt (Einstellungen → Firma).')
  else if (!isValidIban(inv.payment.iban)) err('Bank', 'Die IBAN der Firma ist ungültig (Prüfziffer).')
  if (!inv.dueDate && !inv.payment.terms) warn('Zahlung', 'Weder Fälligkeitsdatum noch Zahlungsbedingung angegeben.')
  // Käufer
  if (!b.name) err('Kunde', 'Der Name des Kunden fehlt.')
  if (!b.street) err('Kunde', 'Die Straße des Kunden fehlt.')
  if (!b.zip || !b.city) err('Kunde', 'PLZ und Ort des Kunden fehlen.')
  if (profile === 'xrechnung' && !inv.buyerReference && !inv.number) err('Käuferreferenz', 'Eine Käuferreferenz (Leitweg-ID oder Kundenreferenz) fehlt.')
  if (inv.lines.some(l => l.taxCategory === 'E') && !inv.exemptionReason) err('Steuer', 'Für steuerfreie Positionen fehlt die Begründung.')
  return out
}

const x = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
const d8 = (iso: string) => iso.replace(/-/g, '')
const m = (n: number) => r2(n).toFixed(2)
const q = (n: number) => String(Math.round(n * 10000) / 10000)
const p4 = (n: number) => String(Math.round(n * 10000) / 10000)
const rate = (n: number) => String(Math.round(n * 100) / 100)
const el = (tag: string, v: unknown, attrs = '') => (v === undefined || v === null || v === '' ? '' : `<${tag}${attrs}>${x(v)}</${tag}>`)

function party(tag: string, p: EParty, withContact: boolean): string {
  const addr = `<ram:PostalTradeAddress>${el('ram:PostcodeCode', p.zip)}${el('ram:LineOne', p.street)}${el('ram:CityName', p.city)}<ram:CountryID>${x(p.country || 'DE')}</ram:CountryID></ram:PostalTradeAddress>`
  const contact = withContact && (p.contact || p.phone || p.email)
    ? `<ram:DefinedTradeContact>${el('ram:PersonName', p.contact)}${p.phone ? `<ram:TelephoneUniversalCommunication><ram:CompleteNumber>${x(p.phone)}</ram:CompleteNumber></ram:TelephoneUniversalCommunication>` : ''}${p.email ? `<ram:EmailURIUniversalCommunication><ram:URIID>${x(p.email)}</ram:URIID></ram:EmailURIUniversalCommunication>` : ''}</ram:DefinedTradeContact>` : ''
  const eaddr = p.email ? `<ram:URIUniversalCommunication><ram:URIID schemeID="EM">${x(p.email)}</ram:URIID></ram:URIUniversalCommunication>` : ''
  const tax = (p.vatId ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${x(p.vatId)}</ram:ID></ram:SpecifiedTaxRegistration>` : '')
    + (p.taxNumber ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="FC">${x(p.taxNumber)}</ram:ID></ram:SpecifiedTaxRegistration>` : '')
  return `<${tag}>${el('ram:Name', p.name)}${contact}${addr}${eaddr}${tax}</${tag}>`
}

/** Das XML der E-Rechnung (CII, UN/CEFACT D16B). profile bestimmt die Kennung: XRechnung 3.0 oder ZUGFeRD/Factur-X EN 16931. */
export function toCii(inv: EInvoice, profile: EProfile): string {
  const t = computeTotals(inv.lines)
  const lines = inv.lines.map((l, i) => {
    const cat = l.taxCategory || (l.taxRate === 0 ? 'Z' : 'S')
    return `<ram:IncludedSupplyChainTradeLineItem><ram:AssociatedDocumentLineDocument><ram:LineID>${i + 1}</ram:LineID></ram:AssociatedDocumentLineDocument>`
      + `<ram:SpecifiedTradeProduct><ram:Name>${x(l.name)}</ram:Name></ram:SpecifiedTradeProduct>`
      + `<ram:SpecifiedLineTradeAgreement><ram:NetPriceProductTradePrice><ram:ChargeAmount>${p4(l.netPrice)}</ram:ChargeAmount></ram:NetPriceProductTradePrice></ram:SpecifiedLineTradeAgreement>`
      + `<ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="${x(l.unit || 'C62')}">${q(l.qty)}</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>`
      + `<ram:SpecifiedLineTradeSettlement><ram:ApplicableTradeTax><ram:TypeCode>VAT</ram:TypeCode><ram:CategoryCode>${cat}</ram:CategoryCode><ram:RateApplicablePercent>${rate(l.taxRate)}</ram:RateApplicablePercent></ram:ApplicableTradeTax>`
      + `<ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>${m(t.lineNets[i])}</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation></ram:SpecifiedLineTradeSettlement></ram:IncludedSupplyChainTradeLineItem>`
  }).join('')
  const taxes = t.groups.map(g => `<ram:ApplicableTradeTax><ram:CalculatedAmount>${m(g.tax)}</ram:CalculatedAmount><ram:TypeCode>VAT</ram:TypeCode>${g.category === 'E' ? el('ram:ExemptionReason', inv.exemptionReason) : ''}<ram:BasisAmount>${m(g.basis)}</ram:BasisAmount><ram:CategoryCode>${g.category}</ram:CategoryCode><ram:RateApplicablePercent>${rate(g.rate)}</ram:RateApplicablePercent></ram:ApplicableTradeTax>`).join('')
  const pay = inv.payment
  const means = pay.iban ? `<ram:SpecifiedTradeSettlementPaymentMeans><ram:TypeCode>58</ram:TypeCode><ram:PayeePartyCreditorFinancialAccount><ram:IBANID>${x(pay.iban)}</ram:IBANID></ram:PayeePartyCreditorFinancialAccount>${pay.bic ? `<ram:PayeeSpecifiedCreditorFinancialInstitution><ram:BICID>${x(pay.bic)}</ram:BICID></ram:PayeeSpecifiedCreditorFinancialInstitution>` : ''}</ram:SpecifiedTradeSettlementPaymentMeans>` : ''
  const terms = inv.dueDate || pay.terms ? `<ram:SpecifiedTradePaymentTerms>${el('ram:Description', pay.terms)}${inv.dueDate ? `<ram:DueDateDateTime><udt:DateTimeString format="102">${d8(inv.dueDate)}</udt:DateTimeString></ram:DueDateDateTime>` : ''}</ram:SpecifiedTradePaymentTerms>` : ''
  const note = inv.note || inv.exemptionReason
  const buyerRef = inv.buyerReference || inv.buyer.leitwegId || inv.number
  const delivery = inv.serviceDate ? `<ram:ApplicableHeaderTradeDelivery><ram:ActualDeliverySupplyChainEvent><ram:OccurrenceDateTime><udt:DateTimeString format="102">${d8(inv.serviceDate)}</udt:DateTimeString></ram:OccurrenceDateTime></ram:ActualDeliverySupplyChainEvent></ram:ApplicableHeaderTradeDelivery>` : '<ram:ApplicableHeaderTradeDelivery/>'
  const ctx = (profile === 'xrechnung' ? '<ram:BusinessProcessSpecifiedDocumentContextParameter><ram:ID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</ram:ID></ram:BusinessProcessSpecifiedDocumentContextParameter>' : '')
    + `<ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>${GUIDELINE[profile]}</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter>`
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100" xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`
    + `<rsm:ExchangedDocumentContext>${ctx}</rsm:ExchangedDocumentContext>`
    + `<rsm:ExchangedDocument><ram:ID>${x(inv.number)}</ram:ID><ram:TypeCode>${x(inv.typeCode || '380')}</ram:TypeCode><ram:IssueDateTime><udt:DateTimeString format="102">${d8(inv.issueDate)}</udt:DateTimeString></ram:IssueDateTime>${note ? `<ram:IncludedNote><ram:Content>${x(note)}</ram:Content></ram:IncludedNote>` : ''}</rsm:ExchangedDocument>`
    + `<rsm:SupplyChainTradeTransaction>${lines}`
    + `<ram:ApplicableHeaderTradeAgreement>${el('ram:BuyerReference', buyerRef)}${party('ram:SellerTradeParty', inv.seller, true)}${party('ram:BuyerTradeParty', inv.buyer, false)}</ram:ApplicableHeaderTradeAgreement>`
    + delivery
    + `<ram:ApplicableHeaderTradeSettlement>${el('ram:PaymentReference', pay.reference || inv.number)}<ram:InvoiceCurrencyCode>${x(inv.currency || 'EUR')}</ram:InvoiceCurrencyCode>${means}${taxes}${terms}`
    + `<ram:SpecifiedTradeSettlementHeaderMonetarySummation><ram:LineTotalAmount>${m(t.net)}</ram:LineTotalAmount><ram:TaxBasisTotalAmount>${m(t.net)}</ram:TaxBasisTotalAmount><ram:TaxTotalAmount currencyID="${x(inv.currency || 'EUR')}">${m(t.tax)}</ram:TaxTotalAmount><ram:GrandTotalAmount>${m(t.gross)}</ram:GrandTotalAmount><ram:DuePayableAmount>${m(t.gross)}</ram:DuePayableAmount></ram:SpecifiedTradeSettlementHeaderMonetarySummation>`
    + `</ram:ApplicableHeaderTradeSettlement></rsm:SupplyChainTradeTransaction></rsm:CrossIndustryInvoice>`
}
