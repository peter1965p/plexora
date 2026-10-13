import { PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../../utils/dynamodb'
import { assertNotDemo } from '../../../../../utils/demoPolicy'
import { requireAuth } from '../../../../../utils/verifyAuth'
import { fewoContext, loadUnit, listBookings, unitView, UNITS_TABLE, BOOKINGS_TABLE } from '../../../../../utils/fewoStore'

// Kanal entfernen: seine eingelesenen Sperrzeiten verschwinden mit.
export default defineEventHandler(async (event) => {
  assertNotDemo(requireAuth(event), 'Im Demo-Zugang nicht möglich.')
  const { tenantId } = await fewoContext(event)
  const unit = await loadUnit(tenantId, String(getRouterParam(event, 'id') || ''))
  const feedId = String(getRouterParam(event, 'feedId') || '')
  if (!(unit.feeds || []).some((f: any) => f.feedId === feedId)) throw createError({ statusCode: 404, message: 'Kanal nicht gefunden' })
  const db = getDynamoClient()
  for (const b of (await listBookings(tenantId)).filter(x => x.unitId === unit.unitId && x.source === `ical:${feedId}`)) await db.send(new DeleteCommand({ TableName: BOOKINGS_TABLE, Key: { tenantId, bookingId: b.bookingId } }))
  const next = { ...unit, feeds: unit.feeds.filter((f: any) => f.feedId !== feedId), updated: new Date().toISOString() }
  await db.send(new PutCommand({ TableName: UNITS_TABLE, Item: next }))
  return { success: true, unit: unitView(next) }
})
