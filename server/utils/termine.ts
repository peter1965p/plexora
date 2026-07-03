import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

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
