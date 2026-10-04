import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { loadTenantAndType, computeFreeSlots, toMinutes, toHHMM, createGoogleCalendarEvent } from '../../../../utils/termine'
import { randomUUID } from 'crypto'
import { sendMail } from '../../../../utils/mailer'

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  })

  const tenantId = getRouterParam(event, 'tenantId') || ''
  const body = await readBody(event)

  const typeId = String(body.typeId || '')
  const date = String(body.date || '')
  const startTime = String(body.startTime || '')
  const customerName = String(body.customerName || '').trim()
  const customerEmail = String(body.customerEmail || '').trim()
  const customerPhone = String(body.customerPhone || '').trim()
  const channel = body.channel === 'phone' ? 'phone' : 'video'

  if (!typeId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(startTime) || !customerName || !customerEmail) {
    throw createError({ statusCode: 400, message: 'Pflichtfelder fehlen' })
  }
  if (channel === 'phone' && !customerPhone) {
    throw createError({ statusCode: 400, message: 'Telefonnummer erforderlich für einen Telefontermin' })
  }

  const { tenantItem, typeItem } = await loadTenantAndType(tenantId, typeId)

  const freeSlots = await computeFreeSlots(tenantId, tenantItem, typeItem, date)
  if (!freeSlots.includes(startTime)) {
    throw createError({ statusCode: 409, message: 'Dieser Termin ist nicht mehr verfügbar' })
  }

  const durationMinutes = Number(typeItem.durationMinutes) || 30
  const endTime = toHHMM(toMinutes(startTime) + durationMinutes)

  const dynamo = getDynamoClient()
  const bookingId = randomUUID()
  const now = new Date().toISOString()
  const notes = String(body.notes || '')

  let googleEventId = ''
  let googleCalendarId = ''
  let googleMeetLink = ''
  try {
    const googleEvent = await createGoogleCalendarEvent(tenantItem, {
      summary: typeItem.name,
      description: channel === 'phone' ? `Telefontermin — ${customerPhone}\n${notes}`.trim() : notes,
      date, startTime, endTime,
      customerEmail,
      channel,
    })
    if (googleEvent) {
      googleEventId = googleEvent.eventId
      googleCalendarId = googleEvent.calendarId
      googleMeetLink = googleEvent.meetLink
    }
  } catch (e) {
    console.error('Google Calendar event creation failed', tenantId, e)
  }

  const item = {
    tenantId,
    bookingId,
    typeId,
    typeName: typeItem.name,
    durationMinutes,
    date,
    startTime,
    endTime,
    customerName,
    customerEmail,
    customerPhone,
    channel,
    notes,
    status: 'confirmed',
    source: 'public',
    googleEventId,
    googleCalendarId,
    googleMeetLink,
    createdAt: now,
    updatedAt: now,
  }
  await dynamo.send(new PutCommand({ TableName: 'plexora-termine-bookings', Item: item }))
  await dynamo.send(new PutCommand({
    TableName: 'plexora-notifications',
    Item: {
      notificationId: randomUUID(),
      userId: tenantItem.email,
      type: 'termin_booked',
      title: 'Neuer Termin gebucht',
      message: `${customerName} – ${typeItem.name} am ${date} um ${startTime} Uhr`,
      bookingId,
      level: 'info',
      link: '/termine',
      read: false,
      created: now,
    },
  }))

  const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  const companyName = tenantItem.companyName || 'Wir'
  const details = channel === 'phone'
    ? `Wir rufen dich unter ${customerPhone} an.`
    : googleMeetLink
      ? `Video-Gespräch über Google Meet: <a href="${googleMeetLink}">${googleMeetLink}</a>`
      : tenantItem.videoFallbackLink
        ? `Video-Gespräch: <a href="${tenantItem.videoFallbackLink}">${tenantItem.videoFallbackLink}</a>`
        : 'Den Video-Link erhältst du separat.'
  await sendMail({
    userId: tenantItem.email,
    kind: 'booking_confirmation',
    from: `${companyName} <termine@plexora.eu>`,
    to: customerEmail,
    subject: `Terminbestätigung: ${typeItem.name} am ${dateLabel}`,
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <p>Hallo ${customerName},</p>
      <p>dein Termin ist bestätigt:</p>
      <p><strong>${typeItem.name}</strong><br>${dateLabel}, ${startTime} – ${endTime} Uhr (${durationMinutes} Min.)</p>
      <p>${details}</p>
      <p>Viele Grüße<br>${companyName}</p>
    </div>`,
  })

  return {
    booking: {
      bookingId, typeName: item.typeName, date, startTime, endTime,
      customerName, channel, meetLink: item.googleMeetLink || null,
    },
  }
})
