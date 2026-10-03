import { ScanCommand, GetCommand, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'crypto'
import { getDynamoClient } from './dynamodb'
import { sendMail } from './mailer'

// Wandelt Datum + Uhrzeit in der Zeitzone des Tenants in einen UTC-Zeitstempel um.
// Lambda läuft in UTC, die Buchungen sind aber lokale Uhrzeiten (meist Europe/Berlin).
function zonedToUtcMs(date: string, time: string, tz: string): number {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const guess = Date.UTC(y, m - 1, d, hh, mm)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(guess))
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return guess - (asUtc - guess)
}

async function loadTenant(tenantId: string, cache: Map<string, any>) {
  if (cache.has(tenantId)) return cache.get(tenantId)
  const res = await getDynamoClient().send(new GetCommand({
    TableName: 'plexora-nexora',
    Key: { tenantId },
  }))
  cache.set(tenantId, res.Item || null)
  return res.Item || null
}

// Läuft alle 5 Minuten (EventBridge). Verschickt pro Buchung genau eine Erinnerung:
// Kunde bekommt eine Mail, Inhaber eine Benachrichtigung (Glocke + Splash im Dashboard).
export async function sendDueTerminReminders() {
  const dynamo = getDynamoClient()
  const now = Date.now()
  const today = new Date(now - 24 * 3600_000).toISOString().slice(0, 10)
  const tenantCache = new Map<string, any>()
  const result = { checked: 0, sent: 0 }

  let lastKey: Record<string, any> | undefined
  do {
    const page = await dynamo.send(new ScanCommand({
      TableName: 'plexora-termine-bookings',
      FilterExpression: '#s = :c AND #d >= :today AND attribute_not_exists(reminderSentAt)',
      ExpressionAttributeNames: { '#s': 'status', '#d': 'date' },
      ExpressionAttributeValues: { ':c': 'confirmed', ':today': today },
      ExclusiveStartKey: lastKey,
    }))
    lastKey = page.LastEvaluatedKey

    for (const b of page.Items || []) {
      result.checked++
      const tenant = await loadTenant(b.tenantId, tenantCache)
      if (!tenant) continue

      const reminderMinutes = Number(tenant.termineReminderMinutes ?? 60)
      if (reminderMinutes <= 0) continue

      const tz = tenant.termineTimezone || 'Europe/Berlin'
      const startMs = zonedToUtcMs(b.date, b.startTime, tz)
      const minutesUntil = (startMs - now) / 60_000
      // Nur im Fenster [Erinnerungszeit .. -15 Min nach Start] senden
      if (minutesUntil > reminderMinutes || minutesUntil < -15) continue
      // Wurde die Buchung schon innerhalb des Erinnerungsfensters gemacht, bekam der Kunde die Bestätigung ohnehin
      if (new Date(b.createdAt).getTime() > startMs - reminderMinutes * 60_000) continue

      // Vor dem Versand markieren, damit sich Läufe nicht überschneiden und doppelt senden
      try {
        await dynamo.send(new UpdateCommand({
          TableName: 'plexora-termine-bookings',
          Key: { tenantId: b.tenantId, bookingId: b.bookingId },
          UpdateExpression: 'SET reminderSentAt = :r',
          ConditionExpression: 'attribute_not_exists(reminderSentAt)',
          ExpressionAttributeValues: { ':r': new Date().toISOString() },
        }))
      } catch {
        continue
      }

      const companyName = tenant.companyName || 'Wir'
      const ownerEmail = tenant.email as string
      const details = b.channel === 'phone'
        ? `Wir rufen dich unter ${b.customerPhone} an.`
        : b.googleMeetLink
          ? `Video-Gespräch über Google Meet: <a href="${b.googleMeetLink}">${b.googleMeetLink}</a>`
          : tenant.videoFallbackLink
            ? `Video-Gespräch: <a href="${tenant.videoFallbackLink}">${tenant.videoFallbackLink}</a>`
            : 'Den Video-Link erhältst du separat.'

      await sendMail({
        userId: ownerEmail,
        kind: 'booking_confirmation',
        from: `${companyName} <termine@plexora.eu>`,
        to: b.customerEmail,
        subject: `Erinnerung: ${b.typeName} um ${b.startTime} Uhr`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <p>Hallo ${b.customerName},</p>
          <p>kleine Erinnerung an deinen Termin:</p>
          <p><strong>${b.typeName}</strong><br>heute, ${b.startTime} – ${b.endTime} Uhr</p>
          <p>${details}</p>
          <p>Viele Grüße<br>${companyName}</p>
        </div>`,
      })

      await dynamo.send(new PutCommand({
        TableName: 'plexora-notifications',
        Item: {
          notificationId: randomUUID(),
          userId: ownerEmail,
          type: 'termin_reminder',
          title: `Termin in ${Math.max(0, Math.round(minutesUntil))} Min.`,
          message: `${b.customerName} – ${b.typeName} um ${b.startTime} Uhr`,
          bookingId: b.bookingId,
          level: 'warning',
          link: '/termine',
          read: false,
          created: new Date().toISOString(),
        },
      }))
      result.sent++
    }
  } while (lastKey)

  return result
}
