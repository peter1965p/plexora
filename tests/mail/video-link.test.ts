import { describe, it, expect } from 'vitest'
import { jitsiLink, bookingVideoLink, videoDetailsHtml } from '../../server/utils/videoLink'

describe('Jitsi-Videolink je Buchung', () => {
  it('Adresse bei meet.jit.si mit langem Zufallsteil, jedes Mal anders', () => {
    const a = jitsiLink(), b = jitsiLink()
    expect(a).toMatch(/^https:\/\/meet\.jit\.si\/Plexora-[0-9a-f]{20}$/)
    expect(a).not.toBe(b)
  })
  it('eigener Raum geht vor Google Meet', () => {
    expect(bookingVideoLink({ videoLink: 'https://meet.jit.si/Plexora-x', googleMeetLink: 'https://meet.google.com/a' })).toBe('https://meet.jit.si/Plexora-x')
    expect(bookingVideoLink({ googleMeetLink: 'https://meet.google.com/a' })).toBe('https://meet.google.com/a')
    expect(bookingVideoLink({})).toBe('')
  })
  it('Mailzeile: Telefon, Jitsi, Google Meet, Standardlink, sonst Hinweis', () => {
    expect(videoDetailsHtml({ channel: 'phone', customerPhone: '0176 1' }, {})).toContain('0176 1')
    expect(videoDetailsHtml({ channel: 'video', videoLink: 'https://meet.jit.si/Plexora-ab' }, {})).toContain('href="https://meet.jit.si/Plexora-ab"')
    expect(videoDetailsHtml({ channel: 'video', googleMeetLink: 'https://meet.google.com/a' }, {})).toContain('Google Meet')
    expect(videoDetailsHtml({ channel: 'video' }, { videoFallbackLink: 'https://zoom.us/j/1' })).toContain('zoom.us/j/1')
    expect(videoDetailsHtml({ channel: 'video' }, {})).toContain('separat')
  })
  it('unsichere Adressen und HTML in der Telefonnummer kommen nie ungeschützt in die Mail', () => {
    expect(videoDetailsHtml({ channel: 'video', videoLink: 'javascript:alert(1)' }, {})).toContain('separat')
    expect(videoDetailsHtml({ channel: 'video', videoLink: 'https://x.de/"><script>' }, {})).not.toContain('<script>')
    expect(videoDetailsHtml({ channel: 'phone', customerPhone: '<img onerror=x>' }, {})).not.toContain('<img')
  })
})
