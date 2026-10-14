import { describe, it, expect } from 'vitest'
import { zonedToUtcStamp, buildTermineIcs, buildInviteIcs } from '../../shared/termineIcal'
import { parseIcs } from '../../shared/fewo'

const B = { bookingId: 'b1', typeName: 'Website Beratung', date: '2026-10-12', startTime: '15:00', endTime: '15:30', customerName: 'Anna; Muster', customerPhone: '0176 1', channel: 'video', status: 'confirmed', videoLink: 'https://meet.jit.si/Plexora-abc' }
describe('Zeitzonen', () => {
  it('Berlin: Sommerzeit UTC+2, Winterzeit UTC+1', () => {
    expect(zonedToUtcStamp('2026-10-12', '15:00')).toBe('20261012T130000Z')      // vor der Umstellung (25.10.)
    expect(zonedToUtcStamp('2026-11-12', '15:00')).toBe('20261112T140000Z')
    expect(zonedToUtcStamp('2026-07-01', '00:30')).toBe('20260630T223000Z')      // über Mitternacht
    expect(zonedToUtcStamp('2026-10-12', '15:00', 'UTC')).toBe('20261012T150000Z')
    expect(zonedToUtcStamp('2026-01-15', '09:00', 'America/New_York')).toBe('20260115T140000Z')
  })
})
describe('Abo-Kalender', () => {
  it('enthält Termine mit Name, Video-Link, aber nie stornierte, E-Mails oder Notizen', () => {
    const ics = buildTermineIcs('Päffgen IT', [{ ...B, customerEmail: 'geheim@kunde.de', notes: 'vertraulich' } as any, { ...B, bookingId: 'b2', status: 'cancelled' }])
    expect((ics.match(/BEGIN:VEVENT/g) || []).length).toBe(1)
    expect(ics).toContain('DTSTART:20261012T130000Z'); expect(ics).toContain('SUMMARY:Website Beratung – Anna\; Muster')
    expect(ics).toContain('LOCATION:https://meet.jit.si/Plexora-abc')
    for (const s of ['geheim@kunde.de', 'vertraulich']) expect(ics).not.toContain(s)
    expect(ics.split('\r\n').every(l => new TextEncoder().encode(l).length <= 75)).toBe(true)
  })
  it('Telefontermin zeigt die Nummer, ohne Ort; ein Termin ohne Raum hat keinen Ort', () => {
    expect(buildTermineIcs('x', [{ ...B, channel: 'phone' }])).toContain('Telefontermin: 0176 1')
    expect(buildTermineIcs('x', [{ ...B, videoLink: '' }])).not.toContain('LOCATION')
  })
  it('lässt sich wieder einlesen (Roundtrip)', () => { expect(parseIcs(buildTermineIcs('x', [B]))).toMatchObject([{ uid: 'b1@plexora.eu' }]) })
})
describe('Einladung für den Kunden', () => {
  it('genau ein Termin, ohne Namen anderer Gäste oder Telefonnummern', () => {
    const ics = buildInviteIcs('Päffgen IT', B)
    expect((ics.match(/BEGIN:VEVENT/g) || []).length).toBe(1)
    expect(ics).toContain('SUMMARY:Website Beratung\r\n'); expect(ics).not.toContain('Anna'); expect(ics).not.toContain('0176')
    expect(ics).toContain('Video-Gespräch: https://meet.jit.si/Plexora-abc')
  })
})
