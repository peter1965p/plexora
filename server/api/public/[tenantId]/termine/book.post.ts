import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { loadTenantAndType, computeFreeSlots, toMinutes, toHHMM } from '../../../../utils/termine'
import { randomUUID } from 'crypto'
import { buildInviteIcs } from '../../../../../shared/termineIcal'
import { wantsJitsi, jitsiHostOf, jitsiLink, bookingVideoLink, videoDetailsHtml } from '../../../../utils/videoLink'
import { sendMail } from '../../../../utils/mailer'
import { enforcePublicRateLimit } from '../../../../utils/rateLimit'
import { campaignTypeIsProtected, verifyBotToken } from '../../../../utils/botGuard'

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  })
  await enforcePublicRateLimit(event, 'termine-book')

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

  // Bot-Schutz nur für Kampagnen-Termine, deren Kampagne den Schalter an hat (Entscheidung aus gespeicherten Daten)
  const guard = await campaignTypeIsProtected(String(tenantItem.email || ''), String(typeItem.campaignId || ''))
  if (guard.protected) await verifyBotToken(event, guard.ownerScope, body?.turnstileToken, tenantItem.customDomain)

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

  // Video-Termine bekommen einen eigenen Jitsi-Raum (Standard), außer der Inhaber hat das ausgeschaltet oder einen festen Standardlink hinterlegt
  const videoLink = channel === 'video' && wantsJitsi(tenantItem) ? jitsiLink(jitsiHostOf(tenantItem)) : ''

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
    ...(videoLink ? { videoLink } : {}),
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
  const details = videoDetailsHtml(item, tenantItem)
  await sendMail({
    userId: tenantItem.email,
    kind: 'booking_confirmation',
    from: `${companyName} <termine@plexora.eu>`,
    to: customerEmail,
    attachments: [{ filename: 'termin.ics', content: buildInviteIcs(companyName, item as any, String(tenantItem.termineTimezone || 'Europe/Berlin')), contentType: 'text/calendar; charset=utf-8; method=PUBLISH' }],
    subject: `Terminbestätigung: ${typeItem.name} am ${dateLabel}`,
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <p>Hallo ${customerName},</p>
      <p>dein Termin ist bestätigt:</p>
      <p><strong>${typeItem.name}</strong><br>${dateLabel}, ${startTime} – ${endTime} Uhr (${durationMinutes} Min.)</p>
      <p>${details}</p>
      <p style="font-size:12px;color:#666">Im Anhang findest du eine Kalenderdatei (termin.ics) zum Übernehmen in deinen Kalender.</p>
      <p>Viele Grüße<br>${companyName}</p>
    </div>`,
  })

  return {
    booking: {
      bookingId, typeName: item.typeName, date, startTime, endTime,
      customerName, channel, meetLink: bookingVideoLink(item) || null,
    },
  }
})
