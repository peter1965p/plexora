import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { enforcePublicRateLimit } from '../../../../utils/rateLimit'
import { UNITS_TABLE, listBookings, tokenMatches } from '../../../../utils/fewoStore'
import { buildIcs, isOccupying } from '../../../../../shared/fewo'

// Öffentlicher Kalender-Link einer Unterkunft (für Booking.com, Airbnb, Vrbo, Google/Apple Kalender). Das Geheimnis im Link ist der Nachweis.
// Standard: nur eigene Buchungen und Sperrzeiten. ?kanaele=1 nimmt Belegungen aus anderen Kanälen dazu, ?ohne=<kanalId> lässt einen Kanal weg
// (sonst bekäme ein Kanal seine eigenen Buchungen von uns zurück). Es steht nur "Belegt" darin, nie Namen, Mails oder Preise.
export default defineEventHandler(async (event) => {
  await enforcePublicRateLimit(event, 'fewo-ical')
  const notFound = () => createError({ statusCode: 404, message: 'Nicht gefunden' })
  const m = /^([0-9a-f-]{36})\.([A-Za-z0-9_-]{32})\.ics$/.exec(String(getRouterParam(event, 'ref') || ''))
  if (!m) throw notFound()
  // Der Mandant steckt nicht im Link: Suche über die Unterkunfts-ID
  const unit = await findUnitById(m[1])
  if (!unit || !tokenMatches(unit, m[2])) throw notFound()
  const q = getQuery(event), withChannels = String(q.kanaele || '') === '1', without = String(q.ohne || '')
  const rows = (await listBookings(unit.tenantId)).filter(b => b.unitId === unit.unitId && isOccupying(b) && b.checkOut >= new Date(Date.now() - 86400000).toISOString().slice(0, 10) &&
    (!String(b.source).startsWith('ical:') || (withChannels && b.source !== `ical:${without}`)))
  setHeader(event, 'Content-Type', 'text/calendar; charset=utf-8')
  setHeader(event, 'Cache-Control', 'no-store')
  return buildIcs(unit.name, rows)
})

async function findUnitById(unitId: string) {
  const { ScanCommand } = await import('@aws-sdk/lib-dynamodb')
  return (await getDynamoClient().send(new ScanCommand({ TableName: UNITS_TABLE, FilterExpression: 'unitId = :u', ExpressionAttributeValues: { ':u': unitId } }))).Items?.[0]
}
