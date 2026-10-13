import { PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'node:crypto'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { assertNotDemo } from '../../../../utils/demoPolicy'
import { requireAuth } from '../../../../utils/verifyAuth'
import { fewoContext, loadBooking, loadUnit, BOOKINGS_TABLE } from '../../../../utils/fewoStore'
import { addDays, todayIsoDate } from '../../../../../shared/fewo'

// Rechnung aus einer bestätigten Buchung (ein Klick): Positionen Übernachtung, Endreinigung, Kurtaxe; Rechnung ist ein normaler offener Eintrag in plexora-finance.
export default defineEventHandler(async (event) => {
  assertNotDemo(requireAuth(event), 'Im Demo-Zugang nicht möglich.')
  const { tenantId } = await fewoContext(event)
  const b = await loadBooking(tenantId, String(getRouterParam(event, 'id') || ''))
  if (b.invoiceId) throw createError({ statusCode: 409, message: 'Aus dieser Buchung wurde schon eine Rechnung erstellt.', data: { invoiceId: b.invoiceId } })
  if (b.status !== 'confirmed') throw createError({ statusCode: 409, message: 'Eine Rechnung entsteht erst aus einer bestätigten Buchung.' })
  const unit = await loadUnit(tenantId, b.unitId)
  const items = [
    { description: `Übernachtung ${unit.name}, ${b.checkIn} bis ${b.checkOut} (${b.nights} Nächte)`, qty: 1, price: b.accommodation ?? b.total },
    ...(b.cleaning ? [{ description: 'Endreinigung', qty: 1, price: b.cleaning }] : []),
    ...(b.tax ? [{ description: 'Kurtaxe', qty: 1, price: b.tax }] : []),
  ]
  // Wurde der Gesamtpreis von Hand festgelegt, steht er als eine Position
  const sum = Math.round(items.reduce((s, i) => s + i.qty * i.price, 0) * 100) / 100
  const lines = sum === b.total ? items : [{ description: `Aufenthalt ${unit.name}, ${b.checkIn} bis ${b.checkOut}`, qty: 1, price: b.total }]
  const now = new Date().toISOString()
  const invoice = { userId: tenantId, invoiceId: randomUUID(), number: 'INV-' + Date.now(), client: b.guestName, clientEmail: b.guestEmail || '', clientAddress: '', description: `Ferienwohnung ${unit.name} ${b.checkIn}–${b.checkOut}`, amount: b.total, items: lines, status: 'pending', dueDate: addDays(todayIsoDate(), 14), mailSent: false, fewoBookingId: b.bookingId, created: now }
  // zuerst die Buchung sperren (bedingt: noch keine Rechnung), dann die Rechnung anlegen: zwei gleichzeitige Klicks ergeben nie zwei Rechnungen
  await getDynamoClient().send(new UpdateCommand({ TableName: BOOKINGS_TABLE, Key: { tenantId, bookingId: b.bookingId }, ConditionExpression: 'attribute_not_exists(invoiceId)', UpdateExpression: 'SET invoiceId = :i, updated = :u', ExpressionAttributeValues: { ':i': invoice.invoiceId, ':u': now } }))
    .catch((e: any) => { if (e?.name === 'ConditionalCheckFailedException') throw createError({ statusCode: 409, message: 'Aus dieser Buchung wurde schon eine Rechnung erstellt.' }); throw e })
  await getDynamoClient().send(new PutCommand({ TableName: 'plexora-finance', Item: invoice }))
  return { success: true, invoiceId: invoice.invoiceId, number: invoice.number }
})
