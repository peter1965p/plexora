import { GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'
import { decryptSecret } from './crypto'
import { notifySystem } from './notifications'

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

// Holt ein Access-Token über den Refresh-Token. Schlägt das fehl (z. B. Zugriff im Google-Konto
// entzogen), bekommt der Inhaber eine Glocken-Nachricht – höchstens einmal pro Tag.
async function refreshGoogleAccessToken(tenantItem: any, refreshToken: string): Promise<string> {
  const config = useRuntimeConfig()
  try {
    const tokenRes = await $fetch<any>('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: {
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      },
    })
    const accessToken = tokenRes.access_token as string
    if (!accessToken) throw new Error('Kein Access-Token von Google erhalten')
    return accessToken
  } catch (e) {
    const cutoff = new Date(Date.now() - 24 * 3600_000).toISOString()
    try {
      await getDynamoClient().send(new UpdateCommand({
        TableName: 'plexora-nexora',
        Key: { tenantId: tenantItem.tenantId },
        UpdateExpression: 'SET googleAuthNotifiedAt = :now',
        ConditionExpression: 'attribute_not_exists(googleAuthNotifiedAt) OR googleAuthNotifiedAt < :cutoff',
        ExpressionAttributeValues: { ':now': new Date().toISOString(), ':cutoff': cutoff },
      }))
      await notifySystem({
        userId: tenantItem.email,
        type: 'google_auth_failed',
        title: 'Google-Verbindung abgelaufen',
        message: 'Termine können nicht mehr in deinen Google-Kalender geschrieben werden. Bitte verbinde Google neu.',
        level: 'warning',
        link: '/termine',
      })
    } catch {}
    throw e
  }
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
export function toHHMM(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, '0')
  const m = (mins % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

export async function computeFreeSlots(tenantId: string, tenantItem: any, typeItem: any, date: string): Promise<string[]> {
  const durationMinutes = Number(typeItem.durationMinutes) || 30
  const workingHours = tenantItem.termineWorkingHours || {}
  const weekday = WEEKDAY_KEYS[new Date(date + 'T00:00:00Z').getUTCDay()]
  const dayHours = workingHours[weekday]
  if (!dayHours || !dayHours.enabled) return []

  const slotStep       = Number(tenantItem.termineSlotStepMinutes) || 30
  const minNoticeHours = Number(tenantItem.termineMinNoticeHours) ?? 2
  const maxAdvanceDays = Number(tenantItem.termineMaxAdvanceDays) || 60
  const timezone       = tenantItem.termineTimezone || 'Europe/Berlin'

  const nowParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date())
  const partsMap: Record<string, string> = {}
  for (const p of nowParts) partsMap[p.type] = p.value
  const todayStr   = `${partsMap.year}-${partsMap.month}-${partsMap.day}`
  const nowMinutes = Number(partsMap.hour) * 60 + Number(partsMap.minute)

  const maxDate = new Date(todayStr + 'T00:00:00Z')
  maxDate.setUTCDate(maxDate.getUTCDate() + maxAdvanceDays)
  const maxDateStr = maxDate.toISOString().slice(0, 10)
  if (date < todayStr || date > maxDateStr) return []

  const windowStart = toMinutes(dayHours.start)
  const windowEnd   = toMinutes(dayHours.end)

  const dynamo = getDynamoClient()
  const bookingsRes = await dynamo.send(new QueryCommand({
    TableName: 'plexora-termine-bookings',
    KeyConditionExpression: 'tenantId = :t',
    ExpressionAttributeValues: { ':t': tenantId },
  }))
  const busy = (bookingsRes.Items || [])
    .filter(b => b.date === date && b.status !== 'cancelled')
    .map(b => [toMinutes(b.startTime), toMinutes(b.endTime)])

  const slots: string[] = []
  for (let start = windowStart; start + durationMinutes <= windowEnd; start += slotStep) {
    const end = start + durationMinutes
    if (date === todayStr && start < nowMinutes + minNoticeHours * 60) continue
    const overlaps = busy.some(([bs, be]) => start < be && end > bs)
    if (!overlaps) slots.push(toHHMM(start))
  }
  return slots
}

// Push-only Google Calendar/Meet-Integration: Fehler hier dürfen eine Buchung nie blockieren —
// der Aufrufer wraped dies in try/catch und läuft ohne Meet-Link weiter.
export async function createGoogleCalendarEvent(tenantItem: any, opts: {
  summary: string
  description: string
  date: string
  startTime: string
  endTime: string
  customerEmail: string
  channel?: 'phone' | 'video'
}): Promise<{ eventId: string; meetLink: string } | null> {
  if (!tenantItem.googleConnected || !tenantItem.googleRefreshTokenEncrypted) return null

  const refreshToken = decryptSecret(tenantItem.googleRefreshTokenEncrypted)

  const accessToken = await refreshGoogleAccessToken(tenantItem, refreshToken)
  if (!accessToken) return null

  // Nur bei Video-Terminen einen Meet-Link anfordern — beim Telefontermin braucht's keinen.
  const wantsMeet = opts.channel !== 'phone'
  const timeZone = tenantItem.termineTimezone || 'Europe/Berlin'
  const event = await $fetch<any>(`https://www.googleapis.com/calendar/v3/calendars/primary/events${wantsMeet ? '?conferenceDataVersion=1' : ''}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: {
      summary: opts.summary,
      description: opts.description,
      start: { dateTime: `${opts.date}T${opts.startTime}:00`, timeZone },
      end:   { dateTime: `${opts.date}T${opts.endTime}:00`,   timeZone },
      attendees: [{ email: opts.customerEmail }],
      ...(wantsMeet ? {
        conferenceData: {
          createRequest: { requestId: `${opts.date}-${opts.startTime}-${Math.random().toString(36).slice(2)}`, conferenceSolutionKey: { type: 'hangoutsMeet' } },
        },
      } : {}),
    },
  })

  return { eventId: event.id || '', meetLink: event.hangoutLink || '' }
}

// Reine Lese-Anzeige: holt Termine direkt aus Google Calendar (auch die, die NICHT über
// Plexora gebucht wurden, z.B. manuell in Google eingetragen). Läuft komplett getrennt von
// plexora-termine-bookings — es gibt bewusst keinen Sync zwischen beiden Seiten.
export async function listGoogleCalendarEvents(tenantItem: any, opts: { timeMin: string; timeMax: string }): Promise<Array<{
  id: string; summary: string; start: string; end: string; meetLink: string; htmlLink: string
}>> {
  if (!tenantItem.googleConnected || !tenantItem.googleRefreshTokenEncrypted) return []

  const refreshToken = decryptSecret(tenantItem.googleRefreshTokenEncrypted)

  const accessToken = await refreshGoogleAccessToken(tenantItem, refreshToken)
  if (!accessToken) return []

  const res = await $fetch<any>('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    headers: { Authorization: `Bearer ${accessToken}` },
    query: { timeMin: opts.timeMin, timeMax: opts.timeMax, singleEvents: true, orderBy: 'startTime', maxResults: 250 },
  })

  return (res.items || []).map((e: any) => ({
    id: e.id,
    summary: e.summary || '(Ohne Titel)',
    start: e.start?.dateTime || e.start?.date || '',
    end: e.end?.dateTime || e.end?.date || '',
    meetLink: e.hangoutLink || '',
    htmlLink: e.htmlLink || '',
  }))
}

export async function loadTenantAndType(tenantId: string, typeId: string) {
  const dynamo = getDynamoClient()
  const [tenantRes, typeRes] = await Promise.all([
    dynamo.send(new GetCommand({ TableName: 'plexora-nexora', Key: { tenantId } })),
    dynamo.send(new GetCommand({ TableName: 'plexora-termine-types', Key: { tenantId, typeId } })),
  ])
  if (!tenantRes.Item || tenantRes.Item.status !== 'active' || !tenantRes.Item.termineEnabled) {
    throw createError({ statusCode: 404, message: 'Termine nicht aktiviert' })
  }
  if (!typeRes.Item || !typeRes.Item.active) {
    throw createError({ statusCode: 404, message: 'Terminart nicht gefunden' })
  }
  return { tenantItem: tenantRes.Item, typeItem: typeRes.Item }
}
