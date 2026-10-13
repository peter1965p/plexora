import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { DeleteCommand, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'
import { ownerContext } from './quoteStore'
import { fetchTextSafe, assertPublicHttpsUrl } from './safeFetch'
import { parseIcs, isOccupying, overlaps, todayIsoDate } from '../../shared/fewo'

// Ferienwohnungen: Tabellen plexora-fewo-units und plexora-fewo-bookings (Schlüssel tenantId = Mandant, dazu unitId bzw. bookingId).
export const UNITS_TABLE = 'plexora-fewo-units'
export const BOOKINGS_TABLE = 'plexora-fewo-bookings'
export const ICAL_ORIGIN = 'https://app.plexora.eu'
const ID_RE = /^[0-9a-f-]{36}$/

export const fewoContext = ownerContext

export async function loadUnit(tenantId: string, unitId: string): Promise<any> {
  if (!ID_RE.test(unitId)) throw createError({ statusCode: 404, message: 'Unterkunft nicht gefunden' })
  const unit = (await getDynamoClient().send(new GetCommand({ TableName: UNITS_TABLE, Key: { tenantId, unitId } }))).Item
  if (!unit) throw createError({ statusCode: 404, message: 'Unterkunft nicht gefunden' })
  return unit
}
export async function listUnits(tenantId: string): Promise<any[]> {
  return (await getDynamoClient().send(new QueryCommand({ TableName: UNITS_TABLE, KeyConditionExpression: 'tenantId = :t', ExpressionAttributeValues: { ':t': tenantId } }))).Items || []
}
export async function listBookings(tenantId: string): Promise<any[]> {
  return (await getDynamoClient().send(new QueryCommand({ TableName: BOOKINGS_TABLE, KeyConditionExpression: 'tenantId = :t', ExpressionAttributeValues: { ':t': tenantId } }))).Items || []
}
export async function loadBooking(tenantId: string, bookingId: string): Promise<any> {
  if (!ID_RE.test(bookingId)) throw createError({ statusCode: 404, message: 'Buchung nicht gefunden' })
  const b = (await getDynamoClient().send(new GetCommand({ TableName: BOOKINGS_TABLE, Key: { tenantId, bookingId } }))).Item
  if (!b) throw createError({ statusCode: 404, message: 'Buchung nicht gefunden' })
  return b
}

export const newIcalToken = () => randomBytes(24).toString('base64url')
export const icalUrl = (unit: any, query = '') => `${ICAL_ORIGIN}/api/public/fewo/ical/${unit.unitId}.${unit.icalToken}.ics${query}`
const same = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y) }
export const tokenMatches = (unit: any, token: string) => !!unit?.icalToken && same(String(unit.icalToken), token)

/** Sicht für den Besitzer: die Adressen der Kanäle (enthalten oft ein Geheimnis) werden nur als Servername gezeigt */
export function unitView(unit: any) {
  const { icalToken, feeds, ...rest } = unit
  return {
    ...rest, icalUrl: icalUrl(unit),
    feeds: (feeds || []).map((f: any) => ({ feedId: f.feedId, name: f.name, host: (() => { try { return new URL(f.url).hostname } catch { return '' } })(), lastSyncAt: f.lastSyncAt || '', lastStatus: f.lastStatus || '', lastError: f.lastError || '', count: f.count || 0, exportUrl: icalUrl(unit, `?kanaele=1&ohne=${f.feedId}`) })),
  }
}

/** Markiert Buchungen, die sich mit einer anderen belegenden Buchung derselben Unterkunft überschneiden (Doppelbelegung, z. B. durch einen Kanal) */
export function withConflicts(bookings: any[]) {
  return bookings.map(b => ({ ...b, conflict: isOccupying(b) && bookings.some(o => o.bookingId !== b.bookingId && o.unitId === b.unitId && isOccupying(o) && overlaps(b.checkIn, b.checkOut, o.checkIn, o.checkOut)) }))
}

export async function addFeed(unit: any, name: string, url: string) {
  await assertPublicHttpsUrl(url)   // wirft mit verständlicher Meldung
  const feed = { feedId: randomUUID(), name, url, lastSyncAt: '', lastStatus: '', lastError: '', count: 0 }
  return feed
}

/** Liest einen Kanal-Kalender ein: neue/geänderte Einträge werden als "gesperrt" gespeichert, verschwundene (zukünftige) gelöscht. Fehler brechen nichts ab, sie stehen am Kanal. */
export async function syncFeed(tenantId: string, unit: any, feed: any): Promise<{ added: number; updated: number; removed: number }> {
  const db = getDynamoClient(), source = `ical:${feed.feedId}`, today = todayIsoDate()
  const events = parseIcs(await fetchTextSafe(feed.url))
  const existing = (await listBookings(tenantId)).filter(b => b.unitId === unit.unitId && b.source === source)
  const byUid = new Map(existing.map(b => [b.uid, b]))
  const seen = new Set<string>(); let added = 0, updated = 0, removed = 0
  const now = new Date().toISOString()
  for (const ev of events) {
    seen.add(ev.uid)
    const cur = byUid.get(ev.uid)
    if (!cur) { await db.send(new PutCommand({ TableName: BOOKINGS_TABLE, Item: { tenantId, bookingId: randomUUID(), unitId: unit.unitId, status: 'blocked', source, sourceName: feed.name, uid: ev.uid, guestName: ev.summary || feed.name, guestEmail: '', guestPhone: '', guests: 1, checkIn: ev.checkIn, checkOut: ev.checkOut, notes: '', created: now, updated: now } })); added++ }
    else if (cur.checkIn !== ev.checkIn || cur.checkOut !== ev.checkOut) { await db.send(new PutCommand({ TableName: BOOKINGS_TABLE, Item: { ...cur, checkIn: ev.checkIn, checkOut: ev.checkOut, updated: now } })); updated++ }
  }
  for (const b of existing) if (!seen.has(b.uid) && b.checkOut >= today) { await db.send(new DeleteCommand({ TableName: BOOKINGS_TABLE, Key: { tenantId, bookingId: b.bookingId } })); removed++ }
  return { added, updated, removed }
}
