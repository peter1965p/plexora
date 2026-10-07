import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { SHAPE_PRIMS, SHAPE_ASPECT, SHAPE_TEXT_BOX, overlayBoxStyle, overlayTextColor, overlayTextLayout, overlayTextLines } from '../../app/utils/leadShapes'
import { OVERLAY_SHAPES, resolveOverlays } from '../../shared/leadDecor'

const page = readFileSync('app/pages/lead/[slug].vue', 'utf8')
const comp = readFileSync('app/components/LeadOverlays.vue', 'utf8')
const tpl = page.slice(0, page.indexOf('<script'))

describe('Formen-Bibliothek', () => {
  it('jede wählbare Form hat eine Zeichnung und umgekehrt; nur harmlose SVG-Attribute (keine Ereignisse, keine Links)', () => {
    expect(Object.keys(SHAPE_PRIMS).sort()).toEqual(Object.keys(OVERLAY_SHAPES).sort())
    const ok = new Set(['d', 'points', 'cx', 'cy', 'r', 'fill', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'])
    for (const [id, prims] of Object.entries(SHAPE_PRIMS)) for (const p of prims) {
      expect(['path', 'polygon', 'circle']).toContain(p.tag)
      for (const [k, v] of Object.entries(p.attrs)) { expect(ok.has(k), `${id}.${k}`).toBe(true); expect(String(v), `${id}.${k}`).not.toMatch(/javascript:|<|on\w+=/i) }
    }
  })
})

describe('Lage und Größe: bleibt im Bild (Desktop und Handy)', () => {
  it('Position und Größe werden auf den Bildrand begrenzt und enthalten nur Zahlen', () => {
    const o = resolveOverlays([{ shape: 'star', size: 40, x: 92, y: 92, rotate: -30 }, { shape: 'ribbon', size: 40, x: 0, y: 0 }])
    const a = overlayBoxStyle(o[0]), b = overlayBoxStyle(o[1])
    expect(a.left).toBe('min(92%, calc(100% - 40cqw))'); expect(a.top).toBe('min(92%, calc(100% - 40.00cqw))'); expect(a.width).toBe('40cqw'); expect(a.transform).toBe('rotate(-30deg)')
    expect(b.aspectRatio).toBe(String(SHAPE_ASPECT.ribbon)); expect(b.top).toBe('min(0%, calc(100% - 20.00cqw))')
    for (const v of Object.values({ ...a, ...b })) expect(v).toMatch(/^[0-9a-z%(),. \-]+$/)
  })
  it('eingeschleuste Werte landen nie im Stil (Zahlen werden zu Zahlen, Rest ersetzt)', () => {
    const [o] = resolveOverlays([{ size: '20; background:url(x)', x: '1}</style><script>', y: 'expression(1)', rotate: 'calc(1)' }])
    expect(JSON.stringify(overlayBoxStyle(o))).not.toMatch(/url|script|expression|calc\(1\)|;/)
  })
  it('Textfarbe hat Kontrast: helle Fläche dunkler Text, dunkle Fläche weißer Text', () => {
    expect(overlayTextColor({ color: '#ffffff' })).toBe('#1a1a1a'); expect(overlayTextColor({ color: '#000000' })).toBe('#ffffff'); expect(overlayTextColor({ color: '#f59e0b' })).toBe('#ffffff')
  })
})

describe('Overlay-Komponente: sicher und rücksichtsvoll', () => {
  it('kein v-html, Text nur als Interpolation, Formen über die feste Bibliothek', () => {
    expect(comp).not.toMatch(/v-html|innerHTML/); expect(comp).toContain('{{ line }}'); expect(comp).not.toMatch(/\{\{ o\.text \}\}.*v-html/); expect(comp).toContain('SHAPE_PRIMS')
  })
  it('prefers-reduced-motion schaltet alle Animationen ab; keine Animation schneller als 1 Sekunde Periode (unter 3 Hz)', () => {
    expect(comp).toMatch(/@media \(prefers-reduced-motion: reduce\)[^}]*animation: none/)
    const periods = [...comp.matchAll(/animation:\s*lo-\w+\s+([\d.]+)s/g)].map(m => Number(m[1]))
    expect(periods.length).toBe(3); for (const p of periods) expect(1 / p, `Periode ${p}s`).toBeLessThan(3)
    expect(comp).not.toMatch(/steps\(|blink|0\.\d+s\s+(ease|linear|infinite)/)
  })
})

describe('Lead-Seite', () => {
  it('Overlays stehen nur im Hero-Banner, nie in der Formularspalte oder am Button; die Standardwerte kommen aus shared/leadDecor.ts', () => {
    const banner = tpl.slice(tpl.indexOf('lp-banner-card'), tpl.indexOf('<!-- Content Block -->'))
    expect(banner).toContain('<LeadOverlays')
    const formCol = tpl.slice(tpl.indexOf('lp-form-col'))
    expect(formCol).not.toContain('LeadOverlays')
    for (const t of ['resolveTrustItems', 'resolvePrivacyLine', 'resolveOverlays', 'TRUST_ICONS']) expect(page).toContain(t)
    expect(page).toContain('container-type: inline-size')
  })
  it('Texte der Vertrauenspunkte und der Datenschutzzeile werden nur als Text ausgegeben (kein v-html)', () => {
    expect(tpl).toContain('{{ t.text }}'); expect(tpl).toContain('{{ privacyLine.text }}'); expect(tpl).not.toMatch(/v-html="(?!customHtml)/)
  })
  it('Datenschutzzeile und Vertrauenspunkte lassen sich ausschalten (Schalter an der Kampagne)', () => {
    expect(tpl).toContain('v-if="privacyLine.on"'); expect(tpl).toContain('v-if="trustItems.length"')
  })
})

describe('Text im Sticker passt sich der Form an', () => {
  const CHAR_EM = 0.6
  it('jede Form hat eine Textfläche', () => { expect(Object.keys(SHAPE_TEXT_BOX).sort()).toEqual(Object.keys(OVERLAY_SHAPES).sort()) })
  it('Zeilen werden bei Leerzeichen höchstens in zwei Teile geteilt, die längere Zeile möglichst kurz', () => {
    expect(overlayTextLines('450,- EUR')).toEqual(['450,-', 'EUR']); expect(overlayTextLines('Nur heute')).toEqual(['Nur', 'heute']); expect(overlayTextLines('SALE')).toEqual(['SALE']); expect(overlayTextLines('  ')).toEqual([])
    expect(overlayTextLines('a bb ccc dddd eeeee').length).toBe(2)
  })
  it('bei jeder Form und jedem Text (bis 24 Zeichen) ist der Text höchstens so breit und hoch wie die Textfläche (Regler 100 %)', () => {
    for (const shape of Object.keys(OVERLAY_SHAPES)) for (const size of [8, 22, 40]) for (const text of ['450,- EUR', 'A', 'Sehr gut und günstig!!!', 'WWWWWWWWWWWWWWWWWWWWWWWW', 'ab cd ef gh ij kl mn op']) {
      const o = resolveOverlays([{ shape, size, text, textSize: 100 }])[0]
      const l = overlayTextLayout(o), box = SHAPE_TEXT_BOX[shape], aspect = SHAPE_ASPECT[shape] || 1
      const w = Math.max(...l.lines.map(x => x.length)) * CHAR_EM * l.fontSize, h = l.lines.length * 1.1 * l.fontSize
      if (l.fontSize > 0.5) { expect(w, `${shape} ${size} "${text}" Breite`).toBeLessThanOrEqual(size * box.w + 1e-9); expect(h, `${shape} ${size} "${text}" Höhe`).toBeLessThanOrEqual((size / aspect) * box.h + 1e-9) }
    }
  })
  it('kurzer Text wird nie größer als 17 % der Formbreite; der Regler skaliert (50–150 %) und begrenzt sich selbst', () => {
    const base = overlayTextLayout(resolveOverlays([{ shape: 'percent', size: 40, text: 'A', textSize: 100 }])[0]).fontSize
    expect(base).toBeLessThanOrEqual(40 * 0.17 + 1e-9)
    const half = overlayTextLayout(resolveOverlays([{ shape: 'percent', size: 40, text: 'A', textSize: 50 }])[0]).fontSize
    const big = overlayTextLayout(resolveOverlays([{ shape: 'percent', size: 40, text: 'A', textSize: 150 }])[0]).fontSize
    expect(half).toBeCloseTo(base / 2, 5); expect(big).toBeCloseTo(base * 1.5, 5)
    expect(resolveOverlays([{ textSize: 9999 }])[0].textSize).toBe(150); expect(resolveOverlays([{ textSize: -5 }])[0].textSize).toBe(50)
    expect(resolveOverlays([{ textSize: 'x; color:red' }])[0].textSize).toBe(100); expect(resolveOverlays([{}])[0].textSize).toBe(100)
  })
  it('der Beispielfall aus der Praxis: Stern mit "450,- EUR" läuft nicht mehr über die Zacken', () => {
    const o = resolveOverlays([{ shape: 'star', size: 22, text: '450,- EUR' }])[0]
    const l = overlayTextLayout(o)
    expect(l.lines).toEqual(['450,-', 'EUR'])
    expect(Math.max(...l.lines.map(x => x.length)) * CHAR_EM * l.fontSize).toBeLessThanOrEqual(22 * SHAPE_TEXT_BOX.star.w + 1e-9)
  })
})
