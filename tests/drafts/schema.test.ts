import { describe, it, expect } from 'vitest'
import { sanitizeDraft, DraftError, MAX_PAYLOAD_BYTES } from '../../server/utils/drafts/schema'

const T = 'marketing-campaign'

describe('sanitizeDraft – Whitelist', () => {
  it('übernimmt erlaubte Felder', () => {
    const out = sanitizeDraft(T, { name: 'Test', slug: 'test', accentColor: '#6C3FE8', contentItems: ['a', 'b'] })
    expect(out).toEqual({ name: 'Test', slug: 'test', accentColor: '#6C3FE8', contentItems: ['a', 'b'] })
  })

  it('verwirft unbekannte Felder, auch userId/tenantId/__proto__', () => {
    const payload = JSON.parse('{"name":"x","userId":"fremd","tenantId":"T-2","owner":"evil","__proto__":{"admin":true},"secret":"abc"}')
    const out = sanitizeDraft(T, payload)
    expect(out).toEqual({ name: 'x' })
    expect(Object.keys(out)).not.toContain('userId')
    expect(Object.keys(out)).not.toContain('tenantId')
    expect(({} as any).admin).toBeUndefined()
  })

  it('lehnt unbekannte Entwurfs-Typen ab (404), auch Prototyp-Namen', () => {
    for (const bad of ['gibts-nicht', '__proto__', 'constructor', 'toString']) {
      expect(() => sanitizeDraft(bad, {})).toThrowError(DraftError)
      try { sanitizeDraft(bad, {}) } catch (e: any) { expect(e.statusCode).toBe(404) }
    }
  })

  it('lehnt Nicht-Objekte ab (400)', () => {
    for (const bad of [null, 'text', 42, [1, 2]]) {
      try { sanitizeDraft(T, bad); throw new Error('sollte werfen') } catch (e: any) { expect(e.statusCode).toBe(400) }
    }
  })
})

describe('sanitizeDraft – Typen und Längen', () => {
  it('kürzt Strings auf die erlaubte Länge und entfernt Steuerzeichen', () => {
    const out = sanitizeDraft(T, { name: 'a'.repeat(500) + '\u0000' })
    expect((out.name as string).length).toBe(120)
    expect(out.name).not.toContain('\u0000')
  })

  it('verwirft falsche Typen statt sie zu speichern', () => {
    const out = sanitizeDraft(T, { name: 123, appointmentEnabled: 'ja', accentColor: 'rot', endsAt: 'morgen', contentItems: 'x' })
    expect(out).toEqual({})
  })

  it('begrenzt Listen und Zahlen', () => {
    const out = sanitizeDraft(T, { contentItems: Array.from({ length: 20 }, (_, i) => `p${i}`), appointmentDurationMinutes: 99999 })
    expect((out.contentItems as string[]).length).toBe(8)
    expect(out.appointmentDurationMinutes).toBe(480)
  })

  it('akzeptiert leeres Datum (Standard) und gültiges Datum', () => {
    expect(sanitizeDraft(T, { endsAt: '' })).toEqual({ endsAt: '' })
    expect(sanitizeDraft(T, { endsAt: '2027-01-02' })).toEqual({ endsAt: '2027-01-02' })
  })
})

describe('sanitizeDraft – Bilder nur als URL/Referenz', () => {
  it('lässt http(s)- und relative URLs durch', () => {
    expect(sanitizeDraft(T, { headerImageUrl: 'https://plexora-files.s3.eu-central-1.amazonaws.com/a.png' }).headerImageUrl)
      .toBe('https://plexora-files.s3.eu-central-1.amazonaws.com/a.png')
    expect(sanitizeDraft(T, { bgImageUrl: '/img/x.jpg' }).bgImageUrl).toBe('/img/x.jpg')
  })

  it('verwirft data:- und javascript:-Adressen (Dateidaten)', () => {
    const out = sanitizeDraft(T, { headerImageUrl: 'data:image/png;base64,AAAA', bgImageUrl: 'javascript:alert(1)' })
    expect(out.headerImageUrl).toBe('')
    expect(out.bgImageUrl).toBe('')
  })
})

describe('sanitizeDraft – Größenlimit', () => {
  it('lehnt zu große Payloads mit 413 ab', () => {
    const big = { name: 'x', contentItems: Array.from({ length: 8 }, () => 'y'.repeat(200)), junk: 'z'.repeat(MAX_PAYLOAD_BYTES) }
    try { sanitizeDraft(T, big); throw new Error('sollte werfen') } catch (e: any) { expect(e.statusCode).toBe(413) }
  })
})
