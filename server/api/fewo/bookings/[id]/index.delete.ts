import { DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { assertNotDemo } from '../../../../utils/demoPolicy'
import { requireAuth } from '../../../../utils/verifyAuth'
import { fewoContext, loadBooking, BOOKINGS_TABLE } from '../../../../utils/fewoStore'

export default defineEventHandler(async (event) => {
  assertNotDemo(requireAuth(event), 'Im Demo-Zugang nicht möglich.')
  const { tenantId } = await fewoContext(event)
  const b = await loadBooking(tenantId, String(getRouterParam(event, 'id') || ''))
  if (String(b.source).startsWith('ical:')) throw createError({ statusCode: 409, message: 'Diese Sperrzeit kommt aus einem Kanal-Kalender. Entferne den Kanal oder ändere sie dort.' })
  if (b.invoiceId) throw createError({ statusCode: 409, message: 'Zu dieser Buchung gibt es schon eine Rechnung. Bitte stattdessen stornieren.' })
  await getDynamoClient().send(new DeleteCommand({ TableName: BOOKINGS_TABLE, Key: { tenantId, bookingId: b.bookingId } }))
  return { success: true }
})
