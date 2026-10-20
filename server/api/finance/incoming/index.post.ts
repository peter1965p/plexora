import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { incomingContext, readIncoming, checkIncoming, summary, newIncomingId, INCOMING_TABLE, MAX_STORED_XML } from '../../../utils/einvoiceIncoming'

// Eingegangene E-Rechnung speichern (Eingangsrechnungen). Gleiche Nummer vom gleichen Rechnungssteller wird nicht doppelt gespeichert.
export default defineEventHandler(async (event) => {
  const { userId } = await incomingContext(event, true)
  const { parsed, xml, source } = await readIncoming(await readBody(event).catch(() => ({})))
  if (Buffer.byteLength(xml) > MAX_STORED_XML) throw createError({ statusCode: 413, message: 'Die Rechnung ist zu groß zum Speichern (höchstens 300 KB XML).' })
  const s = summary(parsed)
  const db = getDynamoClient()
  const existing = (await db.send(new QueryCommand({ TableName: INCOMING_TABLE, KeyConditionExpression: 'userId = :u', ExpressionAttributeValues: { ':u': userId } }))).Items || []
  if (existing.some((r: any) => r.number === s.number && r.sellerName === s.seller.name)) throw createError({ statusCode: 409, message: 'Diese Rechnung ist schon gespeichert.' })
  const now = new Date().toISOString()
  const item = { userId, incomingId: newIncomingId(), number: s.number, issueDate: s.issueDate, dueDate: s.dueDate, sellerName: s.seller.name, sellerVatId: s.seller.vatId, iban: s.iban, reference: s.reference,
    net: s.totals.net, tax: s.totals.tax, gross: s.totals.gross, payable: s.totals.payable, currency: s.currency, credit: s.credit, format: s.format, source, hints: checkIncoming(parsed), status: 'offen', xml, created: now, updated: now }
  await db.send(new PutCommand({ TableName: INCOMING_TABLE, Item: item }))
  const { xml: _x, ...pub } = item
  return { success: true, record: pub }
})
