import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'node:crypto'
import { getDynamoClient } from '../../../utils/dynamodb'
import { assertNotDemo } from '../../../utils/demoPolicy'
import { fewoContext, loadUnit, listBookings, BOOKINGS_TABLE } from '../../../utils/fewoStore'
import { parseBookingInput, priceStay, findConflicts, isOccupying, FewoError } from '../../../../shared/fewo'

// Neue Buchung, Anfrage oder Sperrzeit. Preis kommt aus der Unterkunft (oder wird von Hand überschrieben). Überschneidungen werden abgelehnt.
export default defineEventHandler(async (event) => {
  const { auth, tenantId } = await fewoContext(event)
  assertNotDemo(auth, 'Im Demo-Zugang können keine Buchungen angelegt werden.')
  const body: any = await readBody(event).catch(() => ({}))
  const unit = await loadUnit(tenantId, String(body?.unitId || ''))
  let input
  try { input = parseBookingInput(body, unit) } catch (e) { if (e instanceof FewoError) throw createError({ statusCode: 400, message: e.message }); throw e }
  if (isOccupying(input)) {
    const clash = findConflicts(await listBookings(tenantId), unit.unitId, input.checkIn, input.checkOut)
    if (clash.length) throw createError({ statusCode: 409, message: `Der Zeitraum ist schon belegt (${clash[0].guestName || 'Sperrzeit'}, ${clash[0].checkIn} bis ${clash[0].checkOut}).` })
  }
  const price = input.status === 'blocked' ? null : priceStay(unit, input.checkIn, input.checkOut, input.guests)
  const now = new Date().toISOString()
  const booking = {
    tenantId, bookingId: randomUUID(), ...input, unitId: unit.unitId, source: 'manual',
    ...(price ? { nights: price.nights, accommodation: price.accommodation, cleaning: price.cleaning, tax: price.tax, total: input.priceOverride ?? price.total } : {}),
    created: now, updated: now,
  }
  delete (booking as any).priceOverride
  await getDynamoClient().send(new PutCommand({ TableName: BOOKINGS_TABLE, Item: booking, ConditionExpression: 'attribute_not_exists(bookingId)' }))
  return { success: true, booking }
})
