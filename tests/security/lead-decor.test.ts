import { describe, it, expect } from 'vitest'
import * as L from '../../shared/leadDecor'

const XSS = ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '"><svg onload=alert(1)>', "' onmouseover='alert(1)", 'javascript:alert(1)']

describe('Standardwerte (bestehende Kampagnen bleiben unverändert)', () => {
  it('ohne gespeicherte Felder gelten die drei Punkte mit den korrigierten Texten und die neue Datenschutzzeile', () => {
    expect(L.resolveTrustItems(undefined).map(t => `${t.icon}|${t.text}|${t.on}`)).toEqual(['shield-check|Anfrage 100 % kostenlos|true', 'lock|SSL gesichert|true', 'clock|Antwort in 24 h|true'])
    expect(L.resolvePrivacyLine(undefined)).toEqual({ on: true, text: 'Deine Daten werden vertraulich behandelt.' })
    expect(L.resolveOverlays(undefined)).toEqual([])
    expect(L.resolveTrustItems(null)).toHaveLength(3); expect(L.resolveTrustItems('quatsch')).toHaveLength(3)
  })
  it('eine bewusst leere Liste bleibt leer (alle Punkte entfernt), die Standardwerte lassen sich nicht verändern', () => {
    expect(L.resolveTrustItems([])).toEqual([])
    const d = L.resolveTrustItems(undefined); d[0].text = 'geändert'; expect(L.DEFAULT_TRUST_ITEMS[0].text).toBe('Anfrage 100 % kostenlos')
    expect(L.trustItemsHtml(undefined)).toContain('SSL gesichert')
    expect(L.trustItemsHtml([])).toBe('')
  })
  it('keine vorgefertigten Dringlichkeits- oder Superlativ-Texte in den Standardwerten und Bibliotheken', () => {
    const all = JSON.stringify([L.DEFAULT_TRUST_ITEMS, L.DEFAULT_PRIVACY_LINE, L.OVERLAY_SHAPES, L.TRUST_ICON_LABELS, L.OVERLAY_ANIMATIONS, L.DEFAULT_OVERLAY])
    for (const bad of [/nur noch/i, /testsieger/i, /bestseller/i, /einzigartig/i, /\bbeste[rn]?\b/i, /countdown/i, /letzte chance/i, /nur heute/i, /sofort/i, /limitiert/i, /ausverkauft/i]) expect(all).not.toMatch(bad)
    expect(L.DEFAULT_OVERLAY.text).toBe('')
  })
})

describe('Sicherheit: Texte nur als reiner Text, Formen und Icons nur als IDs', () => {
  it('XSS-Texte werden in den HTML-Bausteinen maskiert (script, onerror, onload, Anführungszeichen)', () => {
    for (const x of XSS) {
      const html = L.trustItemsHtml([{ icon: 'check', text: x }]) + L.privacyLineHtml({ on: true, text: x })
      expect(html, x).not.toMatch(/<script|<img|<svg|onerror=|onload=|onmouseover=/i)
      expect(html).not.toMatch(/["'][^<>]*\sonmouseover=/i)
      if (/[<>"'=]/.test(x)) expect(html).toContain('&')
    }
  })
  it('Texte werden gekürzt, Steuerzeichen entfernt; unbekannte Icons, Formen, Animationen und Farben werden ersetzt', () => {
    const t = L.resolveTrustItems([{ icon: '<img src=x>', text: 'a'.repeat(200) + '\u0000\n' }])[0]
    expect(t.icon).toBe('check'); expect(t.text.length).toBe(L.MAX_TRUST_TEXT); expect(t.text).not.toMatch(/[\u0000-\u001f]/)
    const o = L.resolveOverlays([{ shape: '<svg onload=1>', color: 'red', anim: 'blink', text: 'x'.repeat(99), size: 9999, x: -5, y: 500, rotate: 9999 }])[0]
    expect(o).toMatchObject({ shape: 'star', color: '#f59e0b', anim: 'none', size: 40, x: 0, y: 92, rotate: 180 }); expect(o.text.length).toBe(L.MAX_OVERLAY_TEXT)
  })
  it('Icon-Klassen kommen ausschließlich aus der Allowlist (Tabler), nie aus dem Request', () => {
    for (const cls of Object.values(L.TRUST_ICONS)) expect(cls).toMatch(/^ti-[a-z-]+$/)
    expect(L.trustItemsHtml([{ icon: 'x" onclick="alert(1)', text: 'ok' }])).not.toContain('onclick')
    expect(Object.keys(L.TRUST_ICONS).sort()).toEqual(Object.keys(L.TRUST_ICON_LABELS).sort())
  })
  it('Farben nur als Hex #RRGGBB', () => {
    for (const bad of ['red', '#fff', 'url(javascript:1)', '#gggggg', 'rgb(0,0,0)', '#12345678', '']) expect(L.resolveOverlays([{ color: bad }])[0].color, bad).toBe('#f59e0b')
    expect(L.resolveOverlays([{ color: '#AbCdEf' }])[0].color).toBe('#AbCdEf')
  })
})

describe('Grenzen beim Speichern (streng, mit Meldung)', () => {
  it('Vertrauenspunkte: höchstens 8, Text höchstens 60 Zeichen, Symbol aus der Liste, Text Pflicht', () => {
    const ok = Array.from({ length: 8 }, (_, i) => ({ icon: 'check', text: `Punkt ${i}` }))
    expect(L.validateTrustItems(ok).ok).toBe(true)
    expect(L.validateTrustItems([...ok, { icon: 'check', text: 'neun' }])).toMatchObject({ ok: false, error: expect.stringMatching(/Höchstens 8/) })
    expect(L.validateTrustItems([{ icon: 'check', text: 'x'.repeat(61) }])).toMatchObject({ ok: false })
    expect(L.validateTrustItems([{ icon: 'check', text: 'x'.repeat(60) }]).ok).toBe(true)
    expect(L.validateTrustItems([{ icon: 'evil', text: 'a' }])).toMatchObject({ ok: false })
    expect(L.validateTrustItems([{ icon: 'check', text: '   ' }])).toMatchObject({ ok: false })
    expect(L.validateTrustItems('x')).toMatchObject({ ok: false })
  })
  it('Datenschutzzeile: Text höchstens 120 Zeichen; ohne Text nur bei ausgeschaltetem Schalter', () => {
    expect(L.validatePrivacyLine({ on: true, text: 'x'.repeat(121) })).toMatchObject({ ok: false })
    expect(L.validatePrivacyLine({ on: true, text: '' })).toMatchObject({ ok: false })
    expect(L.validatePrivacyLine({ on: false, text: '' })).toMatchObject({ ok: true, value: { on: false } })
    expect(L.validatePrivacyLine('x')).toMatchObject({ ok: false })
  })
  it('Overlays: höchstens 8, Text höchstens 24, bekannte Form/Animation, Hex-Farbe, höchstens 2 animierte', () => {
    const eight = Array.from({ length: 8 }, () => ({ shape: 'star' }))
    expect(L.validateOverlays(eight).ok).toBe(true)
    expect(L.validateOverlays([...eight, { shape: 'star' }])).toMatchObject({ ok: false })
    expect(L.validateOverlays([{ shape: 'star', text: 'x'.repeat(25) }])).toMatchObject({ ok: false })
    expect(L.validateOverlays([{ shape: 'star', text: 'x'.repeat(24) }]).ok).toBe(true)
    expect(L.validateOverlays([{ shape: 'unbekannt' }])).toMatchObject({ ok: false })
    expect(L.validateOverlays([{ shape: 'star', anim: 'blink' }])).toMatchObject({ ok: false })
    expect(L.validateOverlays([{ shape: 'star', color: 'red' }])).toMatchObject({ ok: false })
    expect(L.validateOverlays([{ anim: 'pulse' }, { anim: 'wiggle' }, { anim: 'spin' }])).toMatchObject({ ok: false, error: expect.stringMatching(/animierte/) })
    expect(L.validateOverlays([{ anim: 'pulse' }, { anim: 'wiggle' }, { anim: 'none' }]).ok).toBe(true)
  })
  it('beim Lesen werden mehr als zwei animierte Overlays still auf "keine" gesetzt (nichts flackert)', () => {
    const r = L.resolveOverlays([{ anim: 'pulse' }, { anim: 'wiggle' }, { anim: 'spin' }, { anim: 'pulse' }])
    expect(r.filter(o => o.anim !== 'none')).toHaveLength(2)
    expect(L.resolveOverlays(Array.from({ length: 20 }, () => ({}))).length).toBe(8)
  })
  it('Bibliotheken: alle 13 Formen und die vier Animationen sind vorhanden', () => {
    expect(Object.keys(L.OVERLAY_SHAPES).sort()).toEqual(['arrow', 'bolt', 'burst', 'check', 'crown', 'flame', 'gift', 'heart', 'percent', 'ribbon', 'rocket', 'star', 'thumbs-up'])
    expect(Object.keys(L.OVERLAY_ANIMATIONS)).toEqual(['none', 'pulse', 'wiggle', 'spin'])
  })
})

describe('Platzierung auf der Seite (Desktop und Handy getrennt)', () => {
  it('bestehende Sticker (ohne neue Felder) bleiben auf dem Hero-Bild; Standard für die Seitenlage und Handy-Anzeige', () => {
    const [o] = L.resolveOverlays([{ id: 'a', shape: 'star', text: '450,- EUR', x: 36, y: 0, size: 27 }])
    expect(o.place).toBe('image'); expect(o.hideMobile).toBe(false); expect([o.x, o.y, o.size]).toEqual([36, 0, 27])
    expect([o.px, o.py, o.mx, o.my]).toEqual([L.DEFAULT_OVERLAY.px, L.DEFAULT_OVERLAY.py, L.DEFAULT_OVERLAY.mx, L.DEFAULT_OVERLAY.my])
  })
  it('Platzierung nur aus der Liste; Lage nur als ganze Zahlen in den Grenzen; Schalter nur wahr/falsch', () => {
    const [o] = L.resolveOverlays([{ place: 'page', px: 99999, py: -99999, mx: -101, my: 151.6, hideMobile: 'yes' }])
    expect(o.place).toBe('page'); expect([o.px, o.py, o.mx, o.my]).toEqual([100, -150, -100, 150]); expect(o.hideMobile).toBe(false)
    expect(L.resolveOverlays([{ place: '__proto__' }])[0].place).toBe('image'); expect(L.resolveOverlays([{ place: '<script>' }])[0].place).toBe('image')
    expect(L.resolveOverlays([{ px: 'x; top:0', py: 'calc(1)' }])[0].px).toBe(L.DEFAULT_OVERLAY.px)
    expect(L.resolveOverlays([{ hideMobile: true }])[0].hideMobile).toBe(true)
  })
  it('beim Speichern: unbekannte Platzierung, Nicht-Zahl und Nicht-Schalter werden mit Meldung abgelehnt; gültige Werte bleiben erhalten', () => {
    for (const bad of [{ place: 'overlay' }, { place: 5 }, { px: '10' }, { py: NaN }, { mx: null }, { hideMobile: 'true' }, { hideMobile: 1 }]) { const v = L.validateOverlays([bad]); expect(v.ok, JSON.stringify(bad)).toBe(false) }
    const ok = L.validateOverlays([{ place: 'page', px: -42, py: 17, mx: 5, my: -80, hideMobile: true }])
    expect(ok.ok).toBe(true); if (ok.ok) expect(ok.value[0]).toMatchObject({ place: 'page', px: -42, py: 17, mx: 5, my: -80, hideMobile: true })
  })
  it('die Höchstzahl 8 und höchstens 2 animierte gelten für Hero- und Seitensticker zusammen', () => {
    const mk = (n: number, place: string, anim = 'none') => Array.from({ length: n }, (_, i) => ({ id: `${place}${i}`, place, anim }))
    expect(L.validateOverlays([...mk(4, 'image'), ...mk(5, 'page')]).ok).toBe(false)
    expect(L.validateOverlays([...mk(4, 'image'), ...mk(4, 'page')]).ok).toBe(true)
    expect(L.validateOverlays([...mk(1, 'image', 'pulse'), ...mk(1, 'page', 'spin'), ...mk(1, 'page', 'wiggle')]).ok).toBe(false)
  })
})

describe('Listen-Prüfung: geerbte Namen wie "constructor" sind keine gültigen Einträge', () => {
  const INHERITED = ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf']
  it('Form, Symbol, Animation und Platzierung nur aus der eigenen Liste: beim Lesen Standard, beim Speichern abgelehnt', () => {
    for (const x of INHERITED) {
      const [o] = L.resolveOverlays([{ shape: x, anim: x, place: x }]); expect(o.shape, x).toBe('star'); expect(o.anim, x).toBe('none'); expect(o.place, x).toBe('image')
      expect(L.resolveTrustItems([{ icon: x, text: 'a' }])[0].icon, x).toBe('check')
      expect(L.validateOverlays([{ shape: x }]).ok, `shape ${x}`).toBe(false); expect(L.validateOverlays([{ anim: x }]).ok, `anim ${x}`).toBe(false); expect(L.validateOverlays([{ place: x }]).ok, `place ${x}`).toBe(false)
      expect(L.validateTrustItems([{ icon: x, text: 'a' }]).ok, `icon ${x}`).toBe(false)
    }
  })
})
