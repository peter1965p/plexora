import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { enforcePublicRateLimit } from '../../../../utils/rateLimit'
import { parseIcalRef, tokenOk } from '../../../../utils/termineIcalStore'
import { buildTermineIcs } from '../../../../../shared/termineIcal'

// Terminkalender zum Abonnieren (Google/Apple/Outlook-Kalender). Das Geheimnis im Link ist der Nachweis; jeder Fehler ergibt dasselbe 404.
// In der Datei stehen Terminart, Zeit, Name und Telefon der Gäste und der Video-Link, nie E-Mail-Adressen oder Notizen.
export default defineEventHandler(async (event) => {
  await enforcePublicRateLimit(event, 'termine-ical')
  const notFound = () => createError({ statusCode: 404, message: 'Nicht gefunden' })
  const ref = parseIcalRef(String(getRouterParam(event, 'ref') || ''))
  if (!ref) throw notFound()
  const db = getDynamoClient()
  const tenant = (await db.send(new GetCommand({ TableName: 'plexora-nexora', Key: { tenantId: ref.tenantId } }))).Item
  if (!tenant || !tokenOk(tenant.termineIcalToken, ref.token)) throw notFound()
  const since = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)
  const rows = ((await db.send(new QueryCommand({ TableName: 'plexora-termine-bookings', KeyConditionExpression: 'tenantId = :t', ExpressionAttributeValues: { ':t': ref.tenantId } }))).Items || []).filter((b: any) => b.date >= since)
  setHeader(event, 'Content-Type', 'text/calendar; charset=utf-8')
  setHeader(event, 'Cache-Control', 'no-store')
  return buildTermineIcs(String(tenant.companyName || 'Termine'), rows, String(tenant.termineTimezone || 'Europe/Berlin'))
})
