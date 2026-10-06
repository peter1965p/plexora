import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { SHAPE_PRIMS, SHAPE_ASPECT, overlayBoxStyle, overlayTextColor } from '../../app/utils/leadShapes'
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
    expect(comp).not.toMatch(/v-html|innerHTML/); expect(comp).toContain('{{ o.text }}'); expect(comp).toContain('SHAPE_PRIMS')
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
