import { fewoContext, listBookings, withConflicts } from '../../../utils/fewoStore'

// Alle Buchungen und Sperrzeiten des Mandanten (optional ?unitId= und ?from=/?to= als JJJJ-MM-TT), mit Markierung bei Doppelbelegung.
export default defineEventHandler(async (event) => {
  const { tenantId } = await fewoContext(event)
  const q = getQuery(event)
  const unitId = String(q.unitId || ''), from = String(q.from || ''), to = String(q.to || '')
  let rows = withConflicts(await listBookings(tenantId))
  if (unitId) rows = rows.filter(b => b.unitId === unitId)
  if (/^\d{4}-\d{2}-\d{2}$/.test(from)) rows = rows.filter(b => b.checkOut > from)
  if (/^\d{4}-\d{2}-\d{2}$/.test(to)) rows = rows.filter(b => b.checkIn < to)
  return { bookings: rows.sort((a, b) => a.checkIn.localeCompare(b.checkIn)) }
})
