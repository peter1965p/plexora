// Macht das Demo-Konto (demo@plexora.eu) bereit für die E-Rechnung: Firmenangaben, Rechnungseinstellungen, Kundenanschriften an den Demo-Rechnungen
// und zwei Eingangsrechnungen. Alles fiktive Beispieldaten. Aufruf: npx vite-node scripts/demo/seed-einvoice.mjs [--apply]
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { fromRecord, toCii } from '../../shared/einvoice'
import { parseEInvoiceXml } from '../../server/utils/einvoiceParse'
import { checkIncoming, summary } from '../../server/utils/einvoiceIncoming'
import { SAMPLE_COMPANY } from '../../shared/einvoiceSample'

const apply = process.argv.includes('--apply')
const U = 'demo@plexora.eu'
const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'eu-central-1' }))
const send = async (cmd, label) => { console.log(apply ? 'schreibe' : 'würde schreiben', label); if (apply) await db.send(cmd) }
const now = new Date().toISOString()

await send(new PutCommand({ TableName: 'plexora-settings', Item: { settingId: 'company', scope: U, ...SAMPLE_COMPANY, taxNumber: '', representedBy: 'Erika Mustermann', register: 'HRB 12345', registerCourt: 'Amtsgericht Köln', updated: now } }), 'Firma')
await send(new PutCommand({ TableName: 'plexora-settings', Item: { settingId: 'invoice', scope: U, dueDays: 14, dueText: 'Zahlbar innerhalb von 14 Tagen netto', vatRate: 19, priceDisplay: 'netto', smallBusiness: false, einvoiceFormat: 'pdf', updated: now } }), 'Rechnungseinstellungen')

const customers = {
  'Musterfirma GmbH': { clientStreet: 'Industrieweg 7', clientZip: '40210', clientCity: 'Düsseldorf', clientVatId: 'DE111222333', buyerReference: 'EINKAUF-1001' },
  'Beispiel AG': { clientStreet: 'Marktplatz 1', clientZip: '80331', clientCity: 'München', clientVatId: 'DE444555666', buyerReference: 'BESTELLUNG-4711' },
  'Demo Handels KG': { clientStreet: 'Handelsstraße 22', clientZip: '20095', clientCity: 'Hamburg', clientVatId: 'DE777888999', buyerReference: 'PO-2026-33' },
}
const ids = { 'DEMO-INV-001': 'Musterfirma GmbH', 'DEMO-INV-002': 'Beispiel AG', 'DEMO-INV-003': 'Demo Handels KG', 'DEMO-INV-004': 'Musterfirma GmbH', 'DEMO-INV-005': 'Beispiel AG', 'DEMO-INV-006': 'Demo Handels KG', 'DEMO-INV-007': 'Musterfirma GmbH', 'DEMO-INV-008': 'Beispiel AG' }
for (const [id, name] of Object.entries(ids)) {
  const c = { ...customers[name], clientCountry: 'DE' }
  await send(new UpdateCommand({ TableName: 'plexora-finance', Key: { userId: U, invoiceId: id }, UpdateExpression: 'SET ' + Object.keys(c).map((k, i) => `#k${i} = :v${i}`).join(', '), ExpressionAttributeNames: Object.fromEntries(Object.keys(c).map((k, i) => [`#k${i}`, k])), ExpressionAttributeValues: Object.fromEntries(Object.values(c).map((v, i) => [`:v${i}`, v])) }), `Anschrift ${id}`)
}

// Zwei Eingangsrechnungen (fiktive Lieferanten), als ZUGFeRD-XML erzeugt und wie beim Hochladen gelesen
const suppliers = [
  { id: 'demo-incoming-1', status: 'offen', co: { legalName: 'Büroland Handels GmbH', street: 'Papierstraße 3', zipCity: '50823 Köln', country: 'Deutschland', email: 'rechnung@bueroland.example', phone: '+49 221 555000', vatId: 'DE300400500', iban: 'DE02 1203 0000 0000 2020 51', contactName: 'Service' }, rec: { number: 'BL-88231', created: '2026-10-12T09:00:00Z', dueDate: '2026-10-26', items: [{ description: 'Druckerpapier A4 (Karton)', qty: 4, price: 39.9 }, { description: 'Toner schwarz', qty: 2, price: 79 }] } },
  { id: 'demo-incoming-2', status: 'bezahlt', co: { legalName: 'Cloud Hosting Nord AG', street: 'Serverallee 9', zipCity: '20457 Hamburg', country: 'Deutschland', email: 'billing@hosting-nord.example', phone: '+49 40 777000', vatId: 'DE500600700', iban: 'DE89 3704 0044 0532 0130 00', contactName: 'Buchhaltung' }, rec: { number: 'CH-2026-1004', created: '2026-10-01T08:00:00Z', dueDate: '2026-10-15', items: [{ description: 'Hosting Oktober 2026', qty: 1, price: 89 }] } },
]
for (const s of suppliers) {
  const model = fromRecord({ ...s.rec, client: 'Beispiel Software GmbH', clientStreet: 'Musterstraße 1', clientZip: '50667', clientCity: 'Köln', clientEmail: 'rechnung@beispiel-software.example' }, s.co, { vatRate: 19 })
  const xml = toCii(model, 'zugferd'), p = parseEInvoiceXml(xml), sm = summary(p)
  await send(new PutCommand({ TableName: 'plexora-finance-incoming', Item: { userId: U, incomingId: s.id, number: sm.number, issueDate: sm.issueDate, dueDate: sm.dueDate, sellerName: sm.seller.name, sellerVatId: sm.seller.vatId, iban: sm.iban, reference: sm.reference,
    net: sm.totals.net, tax: sm.totals.tax, gross: sm.totals.gross, payable: sm.totals.payable, currency: sm.currency, credit: false, format: 'cii', source: 'xml', hints: checkIncoming(p), status: s.status, ...(s.status === 'bezahlt' ? { paidAt: '2026-10-14T10:00:00Z' } : {}), xml, created: s.rec.created, updated: now } }), `Eingangsrechnung ${sm.number} (${sm.totals.payable} €)`)
}
