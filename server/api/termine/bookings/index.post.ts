import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { requireTenantId } from '../../../utils/auth'
import { loadTenantAndType, toMinutes, toHHMM, createGoogleCalendarEvent } from '../../../utils/termine'
import { randomUUID } from 'crypto'

// Manuelles Eintragen eines Termins durch den Tenant selbst (z.B. telefonisch vereinbart) —
// im Gegensatz zur öffentlichen Buchung wird die Slot-Verfügbarkeit nicht erzwungen, da der
// Nutzer bewusst einen Termin außerhalb der normalen Regeln eintragen können muss.
import { jitsiLink, wantsJitsi } from '../../../utils/videoLink'
export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const body = await readBody(event)

  const typeId = String(body.typeId || '')
  const date = String(body.date || '')
  const startTime = String(body.startTime || '')
  const customerName = String(body.customerName || '').trim()
  const customerEmail = String(body.customerEmail || '').trim()
  const customerPhone = String(body.customerPhone || '').trim()
  const channel = body.channel === 'phone' ? 'phone' : 'video'
  const notes = String(body.notes || '')

  if (!typeId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(startTime) || !customerName) {
    throw createError({ statusCode: 400, message: 'Pflichtfelder fehlen' })
  }
  if (channel === 'phone' && !customerPhone) {
    throw createError({ statusCode: 400, message: 'Telefonnummer erforderlich für einen Telefontermin' })
  }
  if (channel === 'video' && !customerEmail) {
    throw createError({ statusCode: 400, message: 'E-Mail erforderlich für einen Video-Termin (für die Meet-Einladung)' })
  }

  const { tenantItem, typeItem } = await loadTenantAndType(tenantId, typeId)
  const durationMinutes = Number(typeItem.durationMinutes) || 30
  const endTime = toHHMM(toMinutes(startTime) + durationMinutes)

  let googleEventId = ''
  let googleMeetLink = ''
  let videoLink = channel === 'video' && wantsJitsi(tenantItem) ? jitsiLink() : ''
  if (customerEmail) {
    try {
      const googleEvent = await createGoogleCalendarEvent(tenantItem, {
        summary: typeItem.name,
        description: channel === 'phone' ? `Telefontermin — ${customerPhone}\n${notes}`.trim() : [videoLink && `Video: ${videoLink}`, notes].filter(Boolean).join('\n'),
        date, startTime, endTime,
        customerEmail,
        channel: videoLink ? 'phone' : channel,
      })
      if (googleEvent) {
        googleEventId = googleEvent.eventId
        googleMeetLink = googleEvent.meetLink
      }
    } catch (e) {
      console.error('Google Calendar event creation failed', tenantId, e)
    }
  }

  // Google lieferte keinen Meet-Link (nicht verbunden, abgelaufen, Fehler): sonst bekäme der Kunde keinen Link. Ausdrücklich ausgeschaltet oder fester Standardlink vorhanden: nichts ergänzen.
  if (channel === 'video' && !videoLink && !googleMeetLink && tenantItem.videoAutoJitsi !== false && !tenantItem.videoFallbackLink) videoLink = jitsiLink()

  const dynamo = getDynamoClient()
  const bookingId = randomUUID()
  const now = new Date().toISOString()
  const item = {
    tenantId, bookingId, typeId,
    typeName: typeItem.name,
    durationMinutes, date, startTime, endTime,
    customerName, customerEmail, customerPhone, channel, notes,
    status: 'confirmed',
    source: 'admin',
    googleEventId, googleMeetLink, ...(videoLink ? { videoLink } : {}),
    createdAt: now, updatedAt: now,
  }
  await dynamo.send(new PutCommand({ TableName: 'plexora-termine-bookings', Item: item }))

  return { booking: item }
})
