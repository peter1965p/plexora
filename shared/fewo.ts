// Ferienwohnungs-Verwaltung: reine Logik für Server und Oberfläche (Eingaben prüfen, Preis, Belegung, iCal). Keine Datenbank, kein Netz.
export const BOOKING_STATUS = ['inquiry', 'confirmed', 'cancelled', 'blocked'] as const
export type FewoStatus = typeof BOOKING_STATUS[number]
export const FEWO_STATUS_LABELS: Record<FewoStatus, string> = { inquiry: 'Anfrage', confirmed: 'Bestätigt', cancelled: 'Storniert', blocked: 'Gesperrt' }
/** Diese Status belegen die Unterkunft (Anfragen gelten als belegt, damit nichts doppelt vergeben wird) */
export const OCCUPYING: readonly FewoStatus[] = ['inquiry', 'confirmed', 'blocked']

export const LIMITS = { name: 100, text: 2000, address: 300, guest: 120, email: 254, phone: 40, note: 1000, seasons: 24, feeds: 5, maxNights: 366, money: 1_000_000, events: 2000 }

export class FewoError extends Error { constructor(message: string) { super(message) } }

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max) : '')
const EMAIL_RE = /^[^\s@,;<>"'()\\]+@[^\s@,;<>"'()\\]+\.[^\s@,;<>"'()\\]+$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
export const isIsoDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s
export const todayIsoDate = (now = Date.now()) => new Date(now).toISOString().slice(0, 10)
export const addDays = (iso: string, days: number) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10) }
export const nightsBetween = (checkIn: string, checkOut: string) => Math.round((Date.parse(checkOut + 'T00:00:00Z') - Date.parse(checkIn + 'T00:00:00Z')) / 86400000)
export const round2 = (n: number) => Math.round(n * 100) / 100
const money = (v: unknown, label: string, def = 0) => {
  if (v === undefined || v === null || v === '') return def
  const n = Number(typeof v === 'string' ? v.replace(',', '.') : v)
  if (!Number.isFinite(n) || n < 0 || n > LIMITS.money) throw new FewoError(`${label} ist ungültig.`)
  return round2(n)
}

export interface Season { from: string; to: string; rate: number }
export interface UnitInput {
  name: string; address: string; description: string; capacity: number; bedrooms: number
  nightlyRate: number; cleaningFee: number; touristTax: number; minNights: number
  checkInTime: string; checkOutTime: string; seasons: Season[]
}

/** Prüft und bereinigt die Eingaben einer Unterkunft. Saisonpreise gelten von (einschließlich) bis (einschließlich) je Nacht. */
export function parseUnitInput(raw: any): UnitInput {
  const b = raw && typeof raw === 'object' ? raw : {}
  const name = clean(b.name, LIMITS.name)
  if (!name) throw new FewoError('Bitte einen Namen für die Unterkunft angeben.')
  const capacity = Math.round(Number(b.capacity ?? 2)), bedrooms = Math.round(Number(b.bedrooms ?? 1))
  if (!Number.isFinite(capacity) || capacity < 1 || capacity > 100) throw new FewoError('Die Personenzahl ist ungültig.')
  if (!Number.isFinite(bedrooms) || bedrooms < 0 || bedrooms > 100) throw new FewoError('Die Zahl der Schlafzimmer ist ungültig.')
  const minNights = Math.round(Number(b.minNights ?? 1))
  if (!Number.isFinite(minNights) || minNights < 1 || minNights > 60) throw new FewoError('Die Mindestaufenthaltsdauer ist ungültig.')
  const checkInTime = b.checkInTime === undefined || b.checkInTime === '' ? '15:00' : b.checkInTime
  const checkOutTime = b.checkOutTime === undefined || b.checkOutTime === '' ? '10:00' : b.checkOutTime
  if (!TIME_RE.test(checkInTime) || !TIME_RE.test(checkOutTime)) throw new FewoError('Die Uhrzeit für An- oder Abreise ist ungültig (HH:MM).')
  const seasonsRaw: any[] = Array.isArray(b.seasons) ? b.seasons : []
  if (seasonsRaw.length > LIMITS.seasons) throw new FewoError(`Höchstens ${LIMITS.seasons} Saisonpreise.`)
  const seasons = seasonsRaw.map((s, n) => {
    if (!isIsoDate(s?.from) || !isIsoDate(s?.to) || s.to < s.from) throw new FewoError(`Saison ${n + 1}: Zeitraum ungültig.`)
    return { from: s.from, to: s.to, rate: money(s.rate, `Saison ${n + 1}: Preis`) }
  })
  return { name, address: clean(b.address, LIMITS.address), description: clean(b.description, LIMITS.text), capacity, bedrooms, nightlyRate: money(b.nightlyRate, 'Der Preis pro Nacht'), cleaningFee: money(b.cleaningFee, 'Die Endreinigung'), touristTax: money(b.touristTax, 'Die Kurtaxe'), minNights, checkInTime, checkOutTime, seasons }
}

export interface PriceBreakdown { nights: number; accommodation: number; cleaning: number; tax: number; total: number }
/** Preis eines Aufenthalts: je Nacht der Saisonpreis (die erste passende Saison) sonst der Grundpreis, dazu Endreinigung und Kurtaxe (je Person und Nacht) */
export function priceStay(unit: Pick<UnitInput, 'nightlyRate' | 'cleaningFee' | 'touristTax' | 'seasons'>, checkIn: string, checkOut: string, guests: number): PriceBreakdown {
  const nights = nightsBetween(checkIn, checkOut)
  let accommodation = 0
  for (let i = 0; i < nights; i++) {
    const day = addDays(checkIn, i)
    const season = (unit.seasons || []).find(s => day >= s.from && day <= s.to)
    accommodation += season ? season.rate : unit.nightlyRate
  }
  accommodation = round2(accommodation)
  const tax = round2((unit.touristTax || 0) * Math.max(1, guests) * nights)
  const cleaning = round2(unit.cleaningFee || 0)
  return { nights, accommodation, cleaning, tax, total: round2(accommodation + cleaning + tax) }
}

export interface BookingInput {
  unitId: string; status: FewoStatus; guestName: string; guestEmail: string; guestPhone: string; guests: number
  checkIn: string; checkOut: string; notes: string; priceOverride: number | null
}
/** Prüft und bereinigt die Eingaben einer Buchung (oder Sperrzeit). Kein Datum in der Vergangenheit wird verboten (nachträgliche Erfassung ist erlaubt). */
export function parseBookingInput(raw: any, unit?: { capacity: number; minNights: number }): BookingInput {
  const b = raw && typeof raw === 'object' ? raw : {}
  const status: FewoStatus = (BOOKING_STATUS as readonly string[]).includes(b.status) ? b.status : 'confirmed'
  if (!isIsoDate(b.checkIn) || !isIsoDate(b.checkOut)) throw new FewoError('Bitte An- und Abreisedatum angeben.')
  const nights = nightsBetween(b.checkIn, b.checkOut)
  if (nights < 1) throw new FewoError('Die Abreise muss nach der Anreise liegen.')
  if (nights > LIMITS.maxNights) throw new FewoError(`Höchstens ${LIMITS.maxNights} Nächte.`)
  const blocked = status === 'blocked'
  const guestName = clean(b.guestName, LIMITS.guest)
  if (!blocked && !guestName) throw new FewoError('Bitte den Gast angeben.')
  const guestEmail = clean(b.guestEmail, LIMITS.email).toLowerCase()
  if (guestEmail && !EMAIL_RE.test(guestEmail)) throw new FewoError('Die E-Mail-Adresse des Gastes ist ungültig.')
  const guests = Math.round(Number(b.guests ?? 1))
  if (!Number.isFinite(guests) || guests < 1 || guests > 100) throw new FewoError('Die Personenzahl ist ungültig.')
  if (unit && !blocked) {
    if (guests > unit.capacity) throw new FewoError(`Die Unterkunft bietet höchstens ${unit.capacity} Personen Platz.`)
    if (nights < unit.minNights && status !== 'blocked') throw new FewoError(`Mindestaufenthalt: ${unit.minNights} Nächte.`)
  }
  return {
    unitId: clean(b.unitId, 64), status, guestName, guestEmail, guestPhone: clean(b.guestPhone, LIMITS.phone), guests,
    checkIn: b.checkIn, checkOut: b.checkOut, notes: clean(b.notes, LIMITS.note),
    priceOverride: b.priceOverride === undefined || b.priceOverride === null || b.priceOverride === '' ? null : money(b.priceOverride, 'Der Gesamtpreis'),
  }
}

/** Überschneiden sich zwei Aufenthalte? Abreisetag und Anreisetag desselben Tages sind erlaubt (Abreise exklusiv). */
export const overlaps = (aIn: string, aOut: string, bIn: string, bOut: string) => aIn < bOut && bIn < aOut
export const isOccupying = (b: { status?: string }) => (OCCUPYING as readonly string[]).includes(String(b.status))

/** Buchungen derselben Unterkunft, die den Zeitraum belegen (ohne die Buchung selbst beim Ändern) */
export function findConflicts<T extends { bookingId: string; unitId: string; checkIn: string; checkOut: string; status: string }>(existing: T[], unitId: string, checkIn: string, checkOut: string, ignoreId = ''): T[] {
  return existing.filter(b => b.unitId === unitId && b.bookingId !== ignoreId && isOccupying(b) && overlaps(checkIn, checkOut, b.checkIn, b.checkOut))
}

// ─── iCal ────────────────────────────────────────────────────────────────────────────────────────
const icsEscape = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
const compact = (iso: string) => iso.replace(/-/g, '')
/** Zeilen nach RFC 5545 auf höchstens 75 Byte kürzen (Fortsetzung mit Leerzeichen) */
function fold(line: string): string {
  const enc = new TextEncoder(), parts: string[] = []
  let cur = '', bytes = 0
  for (const ch of line) {
    const n = enc.encode(ch).length
    if (bytes + n > (parts.length ? 74 : 75)) { parts.push(cur); cur = ''; bytes = 0 }
    cur += ch; bytes += n
  }
  parts.push(cur)
  return parts.join('\r\n ')
}

/** Kalender-Datei einer Unterkunft. Es steht nur "Belegt" darin, keine Gästedaten. */
export function buildIcs(unitName: string, bookings: Array<{ bookingId: string; checkIn: string; checkOut: string }>, now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Plexora//Ferienwohnung//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${icsEscape(unitName)}`]
  for (const b of bookings) {
    lines.push('BEGIN:VEVENT', `UID:${b.bookingId}@plexora.eu`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${compact(b.checkIn)}`, `DTEND;VALUE=DATE:${compact(b.checkOut)}`, 'SUMMARY:Belegt', 'TRANSP:OPAQUE', 'END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

export interface IcsEvent { uid: string; checkIn: string; checkOut: string; summary: string }
const icsDate = (v: string): string | null => {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(v.trim())
  if (!m) return null
  const iso = `${m[1]}-${m[2]}-${m[3]}`
  return isIsoDate(iso) ? iso : null
}
/** Liest die Termine aus einer iCal-Datei (Booking.com, Airbnb, Vrbo ...). Abgesagte, wiederholte und kaputte Einträge werden übersprungen. */
export function parseIcs(text: string): IcsEvent[] {
  const unfolded = String(text || '').replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '')
  const out: IcsEvent[] = []
  for (const block of unfolded.split('BEGIN:VEVENT').slice(1)) {
    if (out.length >= LIMITS.events) break
    const body = block.split('END:VEVENT')[0]
    const prop = (name: string): string => {
      const m = new RegExp(`^${name}(?:;[^:\\n]*)?:(.*)$`, 'mi').exec(body)
      return m ? m[1].trim() : ''
    }
    if (/^CANCELLED$/i.test(prop('STATUS')) || /^RRULE/mi.test(body)) continue
    const checkIn = icsDate(prop('DTSTART'))
    if (!checkIn) continue
    let checkOut = icsDate(prop('DTEND'))
    if (!checkOut || checkOut <= checkIn) checkOut = addDays(checkIn, 1)   // ohne Ende: eine Nacht
    if (nightsBetween(checkIn, checkOut) > LIMITS.maxNights) continue
    const uid = prop('UID').slice(0, 200) || `${checkIn}_${checkOut}`
    out.push({ uid, checkIn, checkOut, summary: prop('SUMMARY').replace(/\\([,;\\])/g, '$1').replace(/\\n/gi, ' ').slice(0, 120) })
  }
  return out
}
