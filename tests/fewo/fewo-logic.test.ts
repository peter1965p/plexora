import { describe, it, expect } from 'vitest'
import { parseUnitInput, parseBookingInput, priceStay, overlaps, findConflicts, buildIcs, parseIcs, nightsBetween, FewoError } from '../../shared/fewo'

const U = { name: 'Seeblick', nightlyRate: 100, cleaningFee: 50, touristTax: 2, capacity: 4, minNights: 2 }

describe('Unterkunft', () => {
  it('prüft Eingaben und setzt Standardwerte', () => {
    const u = parseUnitInput({ name: ' Seeblick ', nightlyRate: '89,5' as any })
    expect(u).toMatchObject({ name: 'Seeblick', capacity: 2, minNights: 1, checkInTime: '15:00', checkOutTime: '10:00' })
  })
  it('lehnt unsinnige Werte ab', () => {
    for (const bad of [{}, { name: 'x', nightlyRate: -1 }, { name: 'x', capacity: 0 }, { name: 'x', checkInTime: '25:00' }, { name: 'x', seasons: [{ from: '2026-08-10', to: '2026-08-01', rate: 1 }] }, { name: 'x', nightlyRate: 1e9 }])
      expect(() => parseUnitInput(bad), JSON.stringify(bad)).toThrow(FewoError)
  })
})

describe('Preis', () => {
  it('Nächte x Preis + Endreinigung + Kurtaxe je Person und Nacht', () => {
    expect(priceStay(U as any, '2026-10-10', '2026-10-13', 2)).toEqual({ nights: 3, accommodation: 300, cleaning: 50, tax: 12, total: 362 })
  })
  it('Saisonpreis gilt je Nacht, auch wenn der Aufenthalt hineinragt', () => {
    const u = { ...U, seasons: [{ from: '2026-08-01', to: '2026-08-31', rate: 150 }] }
    expect(priceStay(u as any, '2026-07-30', '2026-08-02', 1).accommodation).toBe(100 + 100 + 150)   // 30.7., 31.7. Grundpreis, 1.8. Saison
    expect(priceStay(u as any, '2026-08-31', '2026-09-02', 1).accommodation).toBe(150 + 100)
  })
})

describe('Buchung und Belegung', () => {
  const ok = { unitId: 'u1', checkIn: '2026-10-10', checkOut: '2026-10-13', guestName: 'Anna', guests: 2 }
  it('Abreise muss nach der Anreise liegen; Datumsformat wird geprüft', () => {
    expect(() => parseBookingInput({ ...ok, checkOut: '2026-10-10' })).toThrow(FewoError)
    expect(() => parseBookingInput({ ...ok, checkIn: '10.10.2026' })).toThrow(FewoError)
    expect(() => parseBookingInput({ ...ok, checkIn: '2026-02-30' })).toThrow(FewoError)
  })
  it('Gast Pflicht, außer bei Sperrzeiten; Kapazität und Mindestaufenthalt der Unterkunft', () => {
    expect(() => parseBookingInput({ ...ok, guestName: '' })).toThrow(FewoError)
    expect(parseBookingInput({ ...ok, guestName: '', status: 'blocked' }).status).toBe('blocked')
    expect(() => parseBookingInput({ ...ok, guests: 9 }, { capacity: 4, minNights: 1 })).toThrow(/höchstens 4/)
    expect(() => parseBookingInput({ ...ok, checkOut: '2026-10-11' }, { capacity: 4, minNights: 2 })).toThrow(/Mindestaufenthalt/)
  })
  it('Abreisetag = Anreisetag ist keine Überschneidung', () => {
    expect(overlaps('2026-10-10', '2026-10-13', '2026-10-13', '2026-10-15')).toBe(false)
    expect(overlaps('2026-10-10', '2026-10-13', '2026-10-12', '2026-10-15')).toBe(true)
    expect(overlaps('2026-10-10', '2026-10-13', '2026-10-01', '2026-10-30')).toBe(true)
  })
  it('Konflikte: nur belegende Status derselben Unterkunft, ohne die eigene Buchung', () => {
    const ex = [
      { bookingId: 'a', unitId: 'u1', checkIn: '2026-10-10', checkOut: '2026-10-13', status: 'confirmed' },
      { bookingId: 'b', unitId: 'u1', checkIn: '2026-10-10', checkOut: '2026-10-13', status: 'cancelled' },
      { bookingId: 'c', unitId: 'u2', checkIn: '2026-10-10', checkOut: '2026-10-13', status: 'confirmed' },
      { bookingId: 'd', unitId: 'u1', checkIn: '2026-10-12', checkOut: '2026-10-14', status: 'inquiry' },
    ]
    expect(findConflicts(ex, 'u1', '2026-10-11', '2026-10-12').map(x => x.bookingId)).toEqual(['a'])
    expect(findConflicts(ex, 'u1', '2026-10-12', '2026-10-13').map(x => x.bookingId)).toEqual(['a', 'd'])
    expect(findConflicts(ex, 'u1', '2026-10-10', '2026-10-13', 'a').map(x => x.bookingId)).toEqual(['d'])
  })
})

describe('iCal', () => {
  it('Export: nur "Belegt", Datum ohne Uhrzeit, CRLF, keine Gästedaten', () => {
    const ics = buildIcs('Seeblick, Haus 1', [{ bookingId: 'abc', checkIn: '2026-10-10', checkOut: '2026-10-13' }], new Date('2026-10-01T10:00:00Z'))
    expect(ics).toContain('BEGIN:VCALENDAR\r\n')
    expect(ics).toContain('DTSTART;VALUE=DATE:20261010\r\nDTEND;VALUE=DATE:20261013')
    expect(ics).toContain('UID:abc@plexora.eu')
    expect(ics).toContain('SUMMARY:Belegt')
    expect(ics).toContain('X-WR-CALNAME:Seeblick\\, Haus 1')
    expect(ics.split('\r\n').every(l => new TextEncoder().encode(l).length <= 75)).toBe(true)
  })
  it('Import: Booking-Stil mit Datum, Airbnb-Stil mit Uhrzeit, ohne Ende, gefaltete Zeilen', () => {
    const txt = ['BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'DTSTART;VALUE=DATE:20261010', 'DTEND;VALUE=DATE:20261013', 'UID:b1', 'SUMMARY:CLOSED - Not available', 'END:VEVENT',
      'BEGIN:VEVENT', 'DTSTART:20261020T150000Z', 'DTEND:20261022T100000Z', 'UID:a1', 'SUMMARY:Reserved', 'END:VEVENT',
      'BEGIN:VEVENT', 'DTSTART;VALUE=DATE:20261101', 'UID:x1', 'SUMMARY:Lang', ' er Text', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
    expect(parseIcs(txt)).toEqual([
      { uid: 'b1', checkIn: '2026-10-10', checkOut: '2026-10-13', summary: 'CLOSED - Not available' },
      { uid: 'a1', checkIn: '2026-10-20', checkOut: '2026-10-22', summary: 'Reserved' },
      { uid: 'x1', checkIn: '2026-11-01', checkOut: '2026-11-02', summary: 'Langer Text' },
    ])
  })
  it('Import überspringt Abgesagtes, Wiederholungen und Müll; begrenzt die Anzahl', () => {
    const ev = (extra: string) => `BEGIN:VEVENT\nDTSTART;VALUE=DATE:20261010\nDTEND;VALUE=DATE:20261012\nUID:${Math.random()}\n${extra}\nEND:VEVENT`
    expect(parseIcs(ev('STATUS:CANCELLED'))).toEqual([])
    expect(parseIcs(ev('RRULE:FREQ=WEEKLY'))).toEqual([])
    expect(parseIcs('BEGIN:VEVENT\nDTSTART:abc\nEND:VEVENT')).toEqual([])
    expect(parseIcs('<html>nicht ical</html>')).toEqual([])
    expect(parseIcs(Array.from({ length: 3000 }, () => ev('')).join('\n')).length).toBe(2000)
  })
  it('Roundtrip: was wir exportieren, lesen wir wieder ein', () => {
    const back = parseIcs(buildIcs('X', [{ bookingId: 'r1', checkIn: '2026-12-24', checkOut: '2026-12-27' }]))
    expect(back).toMatchObject([{ checkIn: '2026-12-24', checkOut: '2026-12-27' }])
    expect(nightsBetween(back[0].checkIn, back[0].checkOut)).toBe(3)
  })
})
