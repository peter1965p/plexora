import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { PDFDocument, PDFName } from 'pdf-lib'
import { XMLParser } from 'fast-xml-parser'
import { fromRecord, toCii, validateEInvoice, computeTotals, isValidIban, splitZipCity, splitAddress, countryCode, r2, SMALL_BUSINESS_TEXT, type EInvoice } from '../../shared/einvoice'
import { parseEInvoiceXml, EInvoiceParseError } from '../../server/utils/einvoiceParse'
import { embedZugferd, extractEmbeddedXml } from '../../server/utils/zugferd'
import { buildSrgbIcc } from '../../server/utils/srgbIcc'

const company = { legalName: 'Muster IT GmbH', street: 'Hauptstraße 12', zipCity: '50667 Köln', country: 'Deutschland', email: 'rechnung@muster-it.de', phone: '+49 221 1234567', vatId: 'DE 123456789', iban: 'DE89 3704 0044 0532 0130 00', bic: 'COBADEFFXXX', contactName: 'Erika Mustermann' }
const record = { invoiceId: 'i-1', userId: 'chef@a.de', number: 'RE-2026-0001', created: '2026-10-20T10:00:00Z', dueDate: '2026-11-03', client: 'Beispiel AG', clientStreet: 'Marktplatz 1', clientZip: '80331', clientCity: 'München', clientEmail: 'einkauf@beispiel.de', buyerReference: '04011000-12345-34', items: [{ description: 'Beratung', qty: 10.5, price: 95.5 }, { description: 'Reisekosten', qty: 1, price: 33.33, vatRate: 7 }], amount: 1036.08 }
const settings = { vatRate: 19, smallBusiness: false, dueText: 'Zahlbar innerhalb von 14 Tagen netto' }
const model = () => fromRecord(record, company, settings)
const errs = (m: EInvoice, p: 'xrechnung' | 'zugferd') => validateEInvoice(m, p).filter(x => x.level === 'error')

describe('Rechnen', () => {
  it('Zeilen auf Cent runden, Steuer je Satz aus der Summe, Gesamtbetrag stimmt', () => {
    const t = computeTotals(model().lines)
    expect(t.lineNets).toEqual([1002.75, 33.33])
    expect(t.groups.map(g => [g.rate, g.basis, g.tax])).toEqual([[19, 1002.75, 190.52], [7, 33.33, 2.33]])
    expect(t.net).toBe(1036.08); expect(t.tax).toBe(192.85); expect(t.gross).toBe(1228.93)
  })
  it('Rundung: 3 x 0,335 und viele kleine Posten', () => {
    expect(computeTotals([{ name: 'a', qty: 3, netPrice: 0.335, taxRate: 19 }]).lineNets).toEqual([1.01])
    expect(r2(1.005)).toBe(1.01)
    const many = Array.from({ length: 50 }, (_, i) => ({ name: 'p' + i, qty: 1, netPrice: 0.1 * (i + 1), taxRate: 19 }))
    const t = computeTotals(many); expect(t.gross).toBe(r2(t.net + t.tax))
  })
  it('Kleinunternehmer: Kategorie E, 0 %, Begründung, keine Steuer', () => {
    const m = fromRecord(record, company, { ...settings, smallBusiness: true })
    expect(m.lines.every(l => l.taxCategory === 'E' && l.taxRate === 0)).toBe(true)
    expect(m.exemptionReason).toBe(SMALL_BUSINESS_TEXT)
    expect(computeTotals(m.lines).tax).toBe(0)
    expect(toCii(m, 'xrechnung')).toContain('<ram:ExemptionReason>Gemäß § 19 UStG')
  })
  it('0 % ohne Kleinunternehmer ist Kategorie Z', () => { expect(fromRecord(record, company, { ...settings, vatRate: 0 }).lines[0].taxCategory).toBe('Z') })
})

describe('Hilfsfunktionen', () => {
  it('IBAN-Prüfziffer', () => { expect(isValidIban('DE89 3704 0044 0532 0130 00')).toBe(true); expect(isValidIban('DE89 3704 0044 0532 0130 01')).toBe(false); expect(isValidIban('x')).toBe(false); expect(isValidIban('')).toBe(false) })
  it('PLZ/Ort und Anschrift zerlegen, Länder', () => {
    expect(splitZipCity('50667 Köln')).toEqual({ zip: '50667', city: 'Köln' }); expect(splitZipCity('Köln')).toEqual({ zip: '', city: 'Köln' })
    expect(splitAddress('Marktplatz 1\n80331 München')).toEqual({ street: 'Marktplatz 1', zip: '80331', city: 'München' })
    expect(countryCode('Deutschland')).toBe('DE'); expect(countryCode('at')).toBe('AT'); expect(countryCode(undefined)).toBe('DE')
  })
})

describe('Pflichtangaben', () => {
  it('vollständige Rechnung: keine Fehler in beiden Formaten', () => { expect(errs(model(), 'xrechnung')).toEqual([]); expect(errs(model(), 'zugferd')).toEqual([]) })
  it('fehlende Angaben werden einzeln genannt', () => {
    const m = fromRecord({ ...record, clientStreet: '', clientZip: '', clientCity: '', clientEmail: '' }, { legalName: 'X', iban: '' }, settings)
    const msgs = errs(m, 'xrechnung').map(e => e.message).join(' | ')
    for (const part of ['Straße der Firma', 'PLZ und Ort der Firma', 'USt-IdNr. oder Steuernummer', 'Ansprechpartner', 'Telefonnummer', 'E-Mail-Adresse der Firma', 'IBAN der Firma fehlt', 'Straße des Kunden', 'PLZ und Ort des Kunden', 'E-Mail-Adresse des Kunden']) expect(msgs, part).toContain(part)
  })
  it('ZUGFeRD verlangt weniger als XRechnung (Ansprechpartner, Telefon, Kunden-E-Mail)', () => {
    const m = fromRecord({ ...record, clientEmail: '' }, { ...company, contactName: '', representedBy: '', phone: '' }, settings)
    expect(errs(m, 'zugferd')).toEqual([]); expect(errs(m, 'xrechnung').length).toBeGreaterThanOrEqual(3)
  })
  it('falsche IBAN, Steuernummer statt USt-IdNr. ist erlaubt, keine Positionen', () => {
    expect(errs(fromRecord(record, { ...company, iban: 'DE00 0000 0000 0000 0000 00' }, settings), 'zugferd').map(e => e.message).join()).toContain('Prüfziffer')
    expect(errs(fromRecord(record, { ...company, vatId: '', taxNumber: '12/345/67890' }, settings), 'xrechnung')).toEqual([])
    expect(errs({ ...model(), lines: [] }, 'zugferd').map(e => e.field)).toContain('Positionen')
  })
  it('ohne Leitweg-ID dient die Rechnungsnummer als Käuferreferenz', () => {
    const m = fromRecord({ ...record, buyerReference: '' }, company, settings)
    expect(errs(m, 'xrechnung')).toEqual([]); expect(toCii(m, 'xrechnung')).toContain('<ram:BuyerReference>RE-2026-0001</ram:BuyerReference>')
  })
})

describe('XML erzeugen und wieder lesen', () => {
  const xp = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true })
  it('wohlgeformt, richtige Kennung je Profil', () => {
    const x = toCii(model(), 'xrechnung'), z = toCii(model(), 'zugferd')
    expect(() => xp.parse(x)).not.toThrow(); expect(() => xp.parse(z)).not.toThrow()
    expect(x).toContain('urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0'); expect(x).toContain('urn:fdc:peppol.eu:2017:poacc:billing:01:1.0')
    expect(z).toContain('<ram:ID>urn:cen.eu:en16931:2017</ram:ID>'); expect(z).not.toContain('xrechnung')
  })
  it('Sonderzeichen werden maskiert, Steuerzeichen entfernt', () => {
    const m = model(); m.lines[0].name = 'A & B <C> "D"\u0001'; m.seller.name = 'Müller & Söhne <GmbH>'
    const x = toCii(m, 'zugferd')
    expect(x).toContain('A &amp; B &lt;C&gt; &quot;D&quot;'); expect(x).not.toContain('\u0001'); expect(() => xp.parse(x)).not.toThrow()
    expect(parseEInvoiceXml(x).invoice.seller.name).toBe('Müller & Söhne <GmbH>')
  })
  it('Rundlauf: gelesen ergibt dasselbe wie erzeugt (Nummer, Parteien, Positionen, IBAN, Summen)', () => {
    const p = parseEInvoiceXml(toCii(model(), 'xrechnung'))
    expect(p.format).toBe('cii'); expect(p.credit).toBe(false)
    expect(p.invoice).toMatchObject({ number: 'RE-2026-0001', issueDate: '2026-10-20', dueDate: '2026-11-03', currency: 'EUR', buyerReference: '04011000-12345-34' })
    expect(p.invoice.seller).toMatchObject({ name: 'Muster IT GmbH', street: 'Hauptstraße 12', zip: '50667', city: 'Köln', country: 'DE', vatId: 'DE123456789', email: 'rechnung@muster-it.de', phone: '+49 221 1234567', contact: 'Erika Mustermann' })
    expect(p.invoice.buyer).toMatchObject({ name: 'Beispiel AG', zip: '80331', city: 'München', email: 'einkauf@beispiel.de' })
    expect(p.invoice.lines.map(l => [l.name, l.qty, l.netPrice, l.taxRate])).toEqual([['Beratung', 10.5, 95.5, 19], ['Reisekosten', 1, 33.33, 7]])
    expect(p.invoice.payment.iban).toBe('DE89370400440532013000')
    expect(p.totals).toEqual({ net: 1036.08, tax: 192.85, gross: 1228.93, payable: 1228.93 })
  })
})

const UBL = `<?xml version="1.0"?><Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
<cbc:ID>U-77</cbc:ID><cbc:IssueDate>2026-09-30</cbc:IssueDate><cbc:DueDate>2026-10-30</cbc:DueDate><cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode><cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode><cbc:BuyerReference>991-01234-44</cbc:BuyerReference>
<cac:AccountingSupplierParty><cac:Party><cbc:EndpointID schemeID="EM">lieferant@x.de</cbc:EndpointID><cac:PostalAddress><cbc:StreetName>Weg 5</cbc:StreetName><cbc:CityName>Bonn</cbc:CityName><cbc:PostalZone>53111</cbc:PostalZone><cac:Country><cbc:IdentificationCode>DE</cbc:IdentificationCode></cac:Country></cac:PostalAddress><cac:PartyTaxScheme><cbc:CompanyID>DE999999999</cbc:CompanyID></cac:PartyTaxScheme><cac:PartyLegalEntity><cbc:RegistrationName>Lieferant GmbH</cbc:RegistrationName></cac:PartyLegalEntity></cac:Party></cac:AccountingSupplierParty>
<cac:AccountingCustomerParty><cac:Party><cac:PartyLegalEntity><cbc:RegistrationName>Wir GmbH</cbc:RegistrationName></cac:PartyLegalEntity></cac:Party></cac:AccountingCustomerParty>
<cac:PaymentMeans><cbc:PaymentMeansCode>58</cbc:PaymentMeansCode><cbc:PaymentID>U-77</cbc:PaymentID><cac:PayeeFinancialAccount><cbc:ID>DE89370400440532013000</cbc:ID></cac:PayeeFinancialAccount></cac:PaymentMeans>
<cac:TaxTotal><cbc:TaxAmount currencyID="EUR">19.00</cbc:TaxAmount></cac:TaxTotal>
<cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="EUR">100.00</cbc:LineExtensionAmount><cbc:TaxExclusiveAmount currencyID="EUR">100.00</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount currencyID="EUR">119.00</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID="EUR">119.00</cbc:PayableAmount></cac:LegalMonetaryTotal>
<cac:InvoiceLine><cbc:ID>1</cbc:ID><cbc:InvoicedQuantity unitCode="C62">2</cbc:InvoicedQuantity><cbc:LineExtensionAmount currencyID="EUR">100.00</cbc:LineExtensionAmount><cac:Item><cbc:Name>Ding</cbc:Name><cac:ClassifiedTaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>19</cbc:Percent></cac:ClassifiedTaxCategory></cac:Item><cac:Price><cbc:PriceAmount currencyID="EUR">50.00</cbc:PriceAmount></cac:Price></cac:InvoiceLine></Invoice>`

describe('Eingehende Rechnungen lesen', () => {
  it('UBL-Rechnung', () => {
    const p = parseEInvoiceXml(UBL)
    expect(p.format).toBe('ubl')
    expect(p.invoice).toMatchObject({ number: 'U-77', issueDate: '2026-09-30', dueDate: '2026-10-30', buyerReference: '991-01234-44' })
    expect(p.invoice.seller).toMatchObject({ name: 'Lieferant GmbH', street: 'Weg 5', zip: '53111', city: 'Bonn', vatId: 'DE999999999', email: 'lieferant@x.de' })
    expect(p.invoice.lines).toEqual([{ name: 'Ding', qty: 2, unit: 'C62', netPrice: 50, taxRate: 19, taxCategory: 'S' }])
    expect(p.totals).toEqual({ net: 100, tax: 19, gross: 119, payable: 119 }); expect(p.invoice.payment.iban).toBe('DE89370400440532013000')
  })
  it('Gutschrift (CII 381) wird als Gutschrift erkannt', () => { expect(parseEInvoiceXml(toCii({ ...model(), typeCode: '381' }, 'zugferd')).credit).toBe(true) })
  it('lehnt ab: leer, kein XML, falsches Dokument, Dokumenttyp-Deklaration, zu groß', () => {
    for (const bad of ['', '   ', 'kein xml', '<a><b></a>', '<html><body/></html>', '<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><Invoice><ID>&e;</ID></Invoice>', 'x'.repeat(2_000_001)])
      expect(() => parseEInvoiceXml(bad), bad.slice(0, 20)).toThrow(EInvoiceParseError)
  })
})

describe('ZUGFeRD-PDF', () => {
  const xml = () => toCii(model(), 'zugferd')
  it('XML wird eingebettet und wieder gefunden; Katalog, Farbprofil, Kennung und XMP sind gesetzt', async () => {
    const base = await PDFDocument.create(); base.addPage([595, 842]).drawText('Rechnung')
    const out = await embedZugferd(await base.save(), xml(), 'Rechnung RE-2026-0001')
    expect(await extractEmbeddedXml(out)).toBe(xml())
    const doc = await PDFDocument.load(out)
    expect(doc.catalog.has(PDFName.of('AF'))).toBe(true); expect(doc.catalog.has(PDFName.of('OutputIntents'))).toBe(true); expect(doc.catalog.has(PDFName.of('Metadata'))).toBe(true)
    expect(doc.context.trailerInfo.ID).toBeTruthy()
    const raw = Buffer.from(out).toString('latin1')
    expect(raw).toContain('/AFRelationship /Alternative'); expect(raw).toContain('factur-x.xml'); expect(raw).toContain('<fx:ConformanceLevel>EN 16931</fx:ConformanceLevel>'); expect(raw).toContain('<pdfaid:part>3</pdfaid:part>')
  })
  it('PDF ohne Anhang liefert null, kaputte Datei liefert null', async () => {
    const plain = await PDFDocument.create(); plain.addPage()
    expect(await extractEmbeddedXml(await plain.save())).toBeNull(); expect(await extractEmbeddedXml(Buffer.from('kein pdf'))).toBeNull()
  })
  it('selbst erzeugtes sRGB-Profil hat einen gültigen Kopf und stimmige Größe', () => {
    const icc = buildSrgbIcc()
    expect(icc.readUInt32BE(0)).toBe(icc.length); expect(icc.toString('latin1', 36, 40)).toBe('acsp'); expect(icc.toString('latin1', 12, 16)).toBe('mntr'); expect(icc.toString('latin1', 16, 20)).toBe('RGB '); expect(icc.length % 4).toBe(0)
  })
})
