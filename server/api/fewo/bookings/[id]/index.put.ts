import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { assertNotDemo } from '../../../../utils/demoPolicy'
import { requireAuth } from '../../../../utils/verifyAuth'
import { fewoContext, loadUnit, loadBooking, listBookings, BOOKINGS_TABLE } from '../../../../utils/fewoStore'
import { parseBookingInput, priceStay, findConflicts, isOccupying, FewoError } from '../../../../../shared/fewo'

// Buchung ändern (Daten, Gast, Status). Eingelesene Kanal-Sperrzeiten gehören dem Kanal und sind hier nicht änderbar.
export default defineEventHandler(async (event) => {
  assertNotDemo(requireAuth(event), 'Im Demo-Zugang nicht möglich.')
  const { tenantId } = await fewoContext(event)
  const cur = await loadBooking(tenantId, String(getRouterParam(event, 'id') || ''))
  if (String(cur.source).startsWith('ical:')) throw createError({ statusCode: 409, message: 'Diese Sperrzeit kommt aus einem Kanal-Kalender und wird dort geändert.' })
  const body: any = await readBody(event).catch(() => ({}))
  const unit = await loadUnit(tenantId, String(body?.unitId || cur.unitId))
  let input
  try { input = parseBookingInput({ ...cur, ...body }, unit) } catch (e) { if (e instanceof FewoError) throw createError({ statusCode: 400, message: e.message }); throw e }
  if (isOccupying(input)) {
    const clash = findConflicts(await listBookings(tenantId), unit.unitId, input.checkIn, input.checkOut, cur.bookingId)
    if (clash.length) throw createError({ statusCode: 409, message: `Der Zeitraum ist schon belegt (${clash[0].guestName || 'Sperrzeit'}, ${clash[0].checkIn} bis ${clash[0].checkOut}).` })
  }
  const price = input.status === 'blocked' ? null : priceStay(unit, input.checkIn, input.checkOut, input.guests)
  // Der Preis wird neu berechnet, wenn sich Zeitraum, Personen oder Unterkunft ändern; sonst bleibt ein früher festgelegter (auch überschriebener) Preis.
  const priceInputsChanged = cur.checkIn !== input.checkIn || cur.checkOut !== input.checkOut || cur.guests !== input.guests || cur.unitId !== unit.unitId
  const money = price && (priceInputsChanged || input.priceOverride !== null)
    ? { nights: price.nights, accommodation: price.accommodation, cleaning: price.cleaning, tax: price.tax, total: input.priceOverride ?? price.total } : {}
  const { priceOverride, ...fields } = input
  const next = { ...cur, ...fields, unitId: unit.unitId, ...money, updated: new Date().toISOString() }
  if (!price) for (const k of ['nights', 'accommodation', 'cleaning', 'tax', 'total']) delete (next as any)[k]
  await getDynamoClient().send(new PutCommand({ TableName: BOOKINGS_TABLE, Item: next }))
  return { success: true, booking: next }
})
