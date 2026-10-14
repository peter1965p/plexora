import { describe, it, expect } from 'vitest'
import { parseJitsiHost, jitsiHostOf, wantsJitsi, jitsiLink, bookingVideoLink, videoDetailsHtml } from '../../server/utils/videoLink'

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
  it('wantsJitsi: Standard ja; nein bei ausdrücklichem Aus oder (ohne Wahl) bei festem Standardlink; frühere Google-Felder spielen keine Rolle mehr', () => {
    expect(wantsJitsi({ videoAutoJitsi: true })).toBe(true)
    expect(wantsJitsi({})).toBe(true)
    expect(wantsJitsi({ googleConnected: true, googleRefreshTokenEncrypted: 'x' })).toBe(true)
    expect(wantsJitsi({ videoAutoJitsi: true, videoFallbackLink: 'https://zoom.us/j/1' })).toBe(true)
    expect(wantsJitsi({ videoFallbackLink: 'https://zoom.us/j/1' })).toBe(false)
    expect(wantsJitsi({ videoAutoJitsi: false })).toBe(false)
  })
  it('eigener Jitsi-Server: nur ein sauberer Hostname, sonst Standard', () => {
    expect(parseJitsiHost('')).toBe('')
    expect(parseJitsiHost(' Meet.Paeffgen-IT.de ')).toBe('meet.paeffgen-it.de')
    for (const bad of ['https://meet.x.de', 'meet.x.de/raum', 'meet.x.de:8443', 'x', 'a b.de', 'evil.de"><script>', '-x.de']) expect(() => parseJitsiHost(bad), bad).toThrow()
    expect(jitsiLink('meet.paeffgen-it.de')).toMatch(/^https:\/\/meet\.paeffgen-it\.de\/Plexora-[0-9a-f]{20}$/)
    expect(jitsiHostOf({ jitsiHost: 'meet.paeffgen-it.de' })).toBe('meet.paeffgen-it.de')
    expect(jitsiHostOf({ jitsiHost: 'https://böse' })).toBe('meet.jit.si')
    expect(jitsiHostOf({})).toBe('meet.jit.si')
  })
})
