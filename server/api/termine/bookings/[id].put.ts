import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { requireTenantId } from '../../../utils/auth'
import { deleteGoogleCalendarEvent } from '../../../utils/termine'
import { sendMail } from '../../../utils/mailer'

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const bookingId = getRouterParam(event, 'id') || ''
  const body = await readBody(event)
  const dynamo = getDynamoClient()
  const existing = await dynamo.send(new GetCommand({
    TableName: 'plexora-termine-bookings',
    Key: { tenantId, bookingId },
  }))
  if (!existing.Item) throw createError({ statusCode: 404 })
  const wasCancelled = existing.Item.status === 'cancelled'
  const item = { ...existing.Item, ...body, tenantId, bookingId, updatedAt: new Date().toISOString() }
  await dynamo.send(new PutCommand({ TableName: 'plexora-termine-bookings', Item: item }))

  // Wechsel auf "storniert": Google-Termin entfernen und den Kunden benachrichtigen
  if (item.status === 'cancelled' && !wasCancelled) {
    const tenant = (await dynamo.send(new GetCommand({ TableName: 'plexora-nexora', Key: { tenantId } }))).Item
    if (tenant) {
      await deleteGoogleCalendarEvent(tenant, existing.Item.googleEventId || '')
      if (item.customerEmail) {
        const companyName = tenant.companyName || 'Wir'
        const dateLabel = new Date(item.date + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
        await sendMail({
          userId: tenant.email,
          kind: 'booking_cancelled',
          from: `${companyName} <termine@plexora.eu>`,
          to: item.customerEmail,
          subject: `Termin storniert: ${item.typeName} am ${dateLabel}`,
          html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <p>Hallo ${item.customerName},</p>
            <p>dein Termin wurde storniert:</p>
            <p><strong>${item.typeName}</strong><br>${dateLabel}, ${item.startTime} – ${item.endTime} Uhr</p>
            <p>Wenn du einen neuen Termin möchtest, buche gern über unsere Terminseite.</p>
            <p>Viele Grüße<br>${companyName}</p>
          </div>`,
        })
      }
    }
  }
  return { booking: item }
})
