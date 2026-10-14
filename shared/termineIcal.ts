// Termin-Kalenderdateien (iCal): ganzer Terminkalender zum Abonnieren und einzelne Einladung für den Kunden. Reine Logik, kein Netz, keine Datenbank.
export interface IcalBooking { bookingId: string; typeName: string; date: string; startTime: string; endTime: string; customerName?: string; customerPhone?: string; channel?: string; status?: string; videoLink?: string; googleMeetLink?: string }

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
function fold(line: string): string {
  const enc = new TextEncoder(), parts: string[] = []
  let cur = '', bytes = 0
  for (const ch of line) { const n = enc.encode(ch).length; if (bytes + n > (parts.length ? 74 : 75)) { parts.push(cur); cur = ''; bytes = 0 } cur += ch; bytes += n }
  parts.push(cur)
  return parts.join('\r\n ')
}

/** Ortszeit (Datum + Uhrzeit in einer Zeitzone) als UTC-Zeitpunkt im iCal-Format JJJJMMTTTHHMMSSZ */
export function zonedToUtcStamp(date: string, time: string, tz = 'Europe/Berlin'): string {
  const [y, mo, d] = date.split('-').map(Number), [h, mi] = time.split(':').map(Number)
  const asUtc = Date.UTC(y, mo - 1, d, h, mi)
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const parts = Object.fromEntries(fmt.formatToParts(new Date(asUtc)).map(p => [p.type, p.value]))
  const shown = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second)
  const utc = new Date(asUtc - (shown - asUtc))                      // Abweichung der Zeitzone abziehen (zweite Näherung genügt außer an der Zeitumstellung selbst)
  return utc.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

const link = (b: IcalBooking) => String(b.videoLink || b.googleMeetLink || '')
function vevent(b: IcalBooking, tz: string, stamp: string, withContact: boolean): string[] {
  const where = b.channel === 'phone' ? '' : link(b)
  const desc = [b.channel === 'phone' ? (withContact && b.customerPhone ? `Telefontermin: ${b.customerPhone}` : 'Telefontermin') : (where ? `Video-Gespräch: ${where}` : ''), withContact && b.customerName ? `Gast: ${b.customerName}` : ''].filter(Boolean).join('\n')
  return ['BEGIN:VEVENT', `UID:${b.bookingId}@plexora.eu`, `DTSTAMP:${stamp}`, `DTSTART:${zonedToUtcStamp(b.date, b.startTime, tz)}`, `DTEND:${zonedToUtcStamp(b.date, b.endTime, tz)}`,
    `SUMMARY:${esc(withContact && b.customerName ? `${b.typeName} – ${b.customerName}` : b.typeName)}`, ...(desc ? [`DESCRIPTION:${esc(desc)}`] : []), ...(where ? [`LOCATION:${esc(where)}`, `URL:${where}`] : []), 'STATUS:CONFIRMED', 'END:VEVENT']
}
const wrap = (name: string, events: string[][], method: string) => ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Plexora//Termine//DE', 'CALSCALE:GREGORIAN', `METHOD:${method}`, `X-WR-CALNAME:${esc(name)}`, ...events.flat(), 'END:VCALENDAR'].map(fold).join('\r\n') + '\r\n'

/** Terminkalender des Inhabers zum Abonnieren (ohne stornierte Termine). Enthält Name und Telefon der Gäste, aber nie E-Mail-Adressen oder Notizen. */
export function buildTermineIcs(calName: string, bookings: IcalBooking[], tz = 'Europe/Berlin', now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  return wrap(calName, bookings.filter(b => b.status !== 'cancelled').map(b => vevent(b, tz, stamp, true)), 'PUBLISH')
}
/** Einladung für den Kunden zu genau einem Termin (ohne Angaben zu anderen Personen) */
export function buildInviteIcs(calName: string, b: IcalBooking, tz = 'Europe/Berlin', now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  return wrap(calName, [vevent(b, tz, stamp, false)], 'PUBLISH')
}
