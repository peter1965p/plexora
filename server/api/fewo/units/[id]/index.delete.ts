import { DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { assertNotDemo } from '../../../../utils/demoPolicy'
import { requireAuth } from '../../../../utils/verifyAuth'
import { fewoContext, loadUnit, listBookings, UNITS_TABLE, BOOKINGS_TABLE } from '../../../../utils/fewoStore'
import { todayIsoDate } from '../../../../../shared/fewo'

// Löschen nur, wenn keine bestätigte oder angefragte Buchung in der Zukunft hängt; Sperrzeiten aus Kanälen werden mit entfernt.
export default defineEventHandler(async (event) => {
  assertNotDemo(requireAuth(event), 'Im Demo-Zugang nicht möglich.')
  const { tenantId } = await fewoContext(event)
  const unit = await loadUnit(tenantId, String(getRouterParam(event, 'id') || ''))
  const mine = (await listBookings(tenantId)).filter(b => b.unitId === unit.unitId)
  const today = todayIsoDate()
  if (mine.some(b => ['confirmed', 'inquiry'].includes(b.status) && b.checkOut >= today)) throw createError({ statusCode: 409, message: 'Es gibt noch laufende oder zukünftige Buchungen. Bitte erst stornieren oder löschen.' })
  const db = getDynamoClient()
  for (const b of mine) await db.send(new DeleteCommand({ TableName: BOOKINGS_TABLE, Key: { tenantId, bookingId: b.bookingId } }))
  await db.send(new DeleteCommand({ TableName: UNITS_TABLE, Key: { tenantId, unitId: unit.unitId } }))
  return { success: true }
})
