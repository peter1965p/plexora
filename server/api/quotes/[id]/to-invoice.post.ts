import { PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'node:crypto'
import { getDynamoClient } from '../../../utils/dynamodb'
import { assertNotDemo } from '../../../utils/demoPolicy'
import { requireAuth } from '../../../utils/verifyAuth'
import { loadOwnedQuote, QUOTES_TABLE } from '../../../utils/quoteStore'
import { addDays, todayIso, effectiveStatus } from '../../../../shared/quotes'

// Rechnung aus einem angenommenen Angebot (ein Klick): Kunde und Positionen werden übernommen, die Rechnung ist ein normaler Entwurf-Eintrag in plexora-finance
// (Status offen, 14 Tage Zahlungsziel). Nur einmal je Angebot; Entwürfe/offene/abgelehnte Angebote werden nicht umgewandelt.
export default defineEventHandler(async (event) => {
  assertNotDemo(requireAuth(event), 'Im Demo-Zugang nicht möglich.')      // Demo zuerst: 403, nie ein 404 über fremde Daten
  const { tenantId, quote } = await loadOwnedQuote(event)
  if (quote.invoiceId) throw createError({ statusCode: 409, message: 'Aus diesem Angebot wurde schon eine Rechnung erstellt.', data: { invoiceId: quote.invoiceId } })
  if (effectiveStatus(quote) !== 'accepted') throw createError({ statusCode: 409, message: 'Eine Rechnung entsteht erst aus einem angenommenen Angebot. Markiere es zuerst als angenommen.' })
  const db = getDynamoClient()
  const invoice = {
    userId: tenantId, invoiceId: randomUUID(), number: 'INV-' + Date.now(), client: quote.client, clientEmail: quote.clientEmail || '', clientAddress: quote.clientAddress || '',
    description: quote.title || quote.items?.[0]?.description || '', amount: quote.net, items: quote.items, status: 'pending', dueDate: addDays(todayIso(), 14), mailSent: false,
    quoteId: quote.quoteId, quoteNumber: quote.number, created: new Date().toISOString(),
  }
  // zuerst das Angebot sperren (bedingt: noch keine Rechnung), dann die Rechnung anlegen: so entstehen bei zwei gleichzeitigen Klicks nie zwei Rechnungen
  await db.send(new UpdateCommand({ TableName: QUOTES_TABLE, Key: { userId: tenantId, quoteId: quote.quoteId }, ConditionExpression: 'attribute_not_exists(invoiceId)', UpdateExpression: 'SET invoiceId = :i, updated = :u', ExpressionAttributeValues: { ':i': invoice.invoiceId, ':u': invoice.created } }))
    .catch((e: any) => { if (e?.name === 'ConditionalCheckFailedException') throw createError({ statusCode: 409, message: 'Aus diesem Angebot wurde schon eine Rechnung erstellt.' }); throw e })
  await db.send(new PutCommand({ TableName: 'plexora-finance', Item: invoice }))
  return { success: true, invoiceId: invoice.invoiceId, number: invoice.number }
})
