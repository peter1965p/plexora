import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { SHAPE_PRIMS, SHAPE_ASPECT, SHAPE_TEXT_BOX, overlayBoxStyle, overlayTextColor, overlayTextLayout, overlayTextLines, dragPosition, pageBoxStyle, pageDragPosition } from '../../app/utils/leadShapes'
import { OVERLAY_SHAPES, PAGE_X_LIMIT, PAGE_Y_LIMIT, resolveOverlays, validateOverlays } from '../../shared/leadDecor'

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
    const pageLayer = tpl.indexOf('<!-- Sticker, die frei auf der Seite liegen')
    const formCol = tpl.slice(tpl.indexOf('lp-form-col'), pageLayer)
    expect(formCol).not.toContain('LeadOverlays')
    // Seitenebene: genau einmal, als letztes Kind des Wurzelelements (außerhalb von Hero und Formularspalte), ohne Bedienung
    expect(tpl.match(/<LeadOverlays/g)?.length).toBe(2); expect(pageLayer).toBeGreaterThan(tpl.indexOf('lp-form-col')); expect(tpl.slice(pageLayer, pageLayer + 250)).toContain('layer="page"'); expect(tpl.slice(pageLayer, pageLayer + 250)).not.toContain('editable')
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

describe('Ziehen in der Vorschau (Lage berechnen)', () => {
  const base = { left: 50, top: 20, bw: 22, bh: 22, W: 400, H: 200 }
  it('Zugweg in Pixeln wird in ganze Prozent der Bildfläche umgerechnet', () => {
    expect(dragPosition({ ...base, dxPx: 40, dyPx: 20 })).toEqual({ x: 60, y: 30 })
    expect(dragPosition({ ...base, dxPx: -40, dyPx: -20 })).toEqual({ x: 40, y: 10 })
    expect(dragPosition({ ...base, dxPx: 1, dyPx: 0 })).toEqual({ x: 50, y: 20 })
  })
  it('bleibt im Bild und innerhalb der Server-Grenzen 0–92, auch bei wildem Ziehen', () => {
    expect(dragPosition({ ...base, dxPx: -99999, dyPx: -99999 })).toEqual({ x: 0, y: 0 })
    expect(dragPosition({ ...base, dxPx: 99999, dyPx: 99999 })).toEqual({ x: 78, y: 78 })              // 100 - Größe 22
    expect(dragPosition({ ...base, bw: 8, bh: 8, dxPx: 99999, dyPx: 99999 })).toEqual({ x: 92, y: 92 }) // nie über 92
    expect(dragPosition({ ...base, bw: 120, bh: 120, dxPx: 5, dyPx: 5 })).toEqual({ x: 0, y: 0 })        // nie negativ
  })
  it('kaputte Eingaben (NaN, Bildgröße 0) ergeben gültige Zahlen statt NaN', () => {
    for (const a of [{ ...base, W: 0 }, { ...base, dxPx: NaN, dyPx: 0 }, { ...base, left: NaN }]) {
      const r = dragPosition({ dxPx: 5, dyPx: 5, ...a } as any); expect(Number.isInteger(r.x) && Number.isInteger(r.y)).toBe(true); expect(r.x).toBeGreaterThanOrEqual(0); expect(r.y).toBeLessThanOrEqual(92)
    }
  })
  it('Ergebnis passt immer durch die Prüfung des Servers (validateOverlays)', async () => {
    const { validateOverlays } = await import('../../shared/leadDecor')
    for (const dx of [-5000, -37, 0, 83, 5000]) { const { x, y } = dragPosition({ ...base, dxPx: dx, dyPx: dx / 2 }); const v = validateOverlays([{ shape: 'star', x, y }]); expect(v.ok).toBe(true); if (v.ok) { expect(v.value[0].x).toBe(x); expect(v.value[0].y).toBe(y) } }
  })
})

describe('Ziehen: nur im Editor, sonst unverändert', () => {
  const prev = readFileSync('app/components/LeadPreview.vue', 'utf8'), ed = readFileSync('app/components/LeadDecorEditor.vue', 'utf8'), mk = readFileSync('app/pages/marketing/index.vue', 'utf8')
  it('die echte Lead-Seite übergibt kein "editable"; nur die Vorschau macht Sticker beweglich', () => {
    expect(tpl).not.toMatch(/<LeadOverlays[^>]*editable/); expect(prev).toMatch(/<LeadOverlays[^>]*\seditable/)
    expect(comp).toMatch(/if \(!props\.editable/); expect(comp).toMatch(/\.lo-edit \{ pointer-events: auto/); expect(comp).toMatch(/\.lo \{ pointer-events: none; \}/)
  })
  it('Bedienung per Zeiger (Maus/Finger) und Tastatur; Finger-Ziehen scrollt nicht mit (touch-action)', () => {
    for (const t of ['@pointerdown', '@pointermove', '@pointerup', '@pointercancel', '@keydown', 'setPointerCapture', 'ArrowLeft', 'ArrowDown', 'touch-action: none', 'tabindex']) expect(comp, t).toContain(t)
  })
  it('Ziehen läuft über den Editor-Zustand (touched, Prüfung beim Speichern) – nicht an ihm vorbei', () => {
    expect(ed).toContain('defineExpose({ setOverlayPos })'); expect(ed).toMatch(/function setOverlayPos[\s\S]*o\.x = x; o\.y = y/)
    expect(mk).toContain('decorEditor?.setOverlayPos(m.id, m.x, m.y, m.view)'); expect(mk).not.toMatch(/decor\.overlays\.find/)
  })
})

describe('Seitenebene: Lage und Größe', () => {
  const o = resolveOverlays([{ shape: 'star', size: 20, place: 'page', px: -40, py: -30, mx: 12, my: 55, rotate: 15 }])[0]
  it('Stil besteht nur aus Zahlen und CSS-Funktionen, der Sticker bleibt in der Seite (max/min-Begrenzung), Rotation und Größe in Einheiten u', () => {
    const st = pageBoxStyle(o)
    expect(st.width).toBe('calc(var(--lo-u) * 20)'); expect(st.transform).toBe('rotate(15deg)'); expect(st.position).toBe('absolute')
    expect(st.left).toBe('max(0px, min(calc(50% + var(--lo-u) * (var(--lo-x) - 10)), calc(100% - var(--lo-u) * 20)))')
    expect(st.top).toBe('max(0px, min(calc(50% + var(--lo-u) * (var(--lo-y) - 10)), calc(100% - var(--lo-u) * 20)))')
    for (const v of Object.values(st)) expect(v).toMatch(/^[0-9a-z%(),.*+ \-]+$/)
  })
  it('echte Seite (ohne Ansicht): alle vier Lagen als Zahlen, die Media-Query wählt; Vorschau (mit Ansicht): nur die Lage der gewählten Ansicht', () => {
    const auto = pageBoxStyle(o); expect([auto['--lo-px'], auto['--lo-py'], auto['--lo-mx'], auto['--lo-my']]).toEqual(['-40', '-30', '12', '55']); expect(auto['--lo-x']).toBeUndefined()
    const d = pageBoxStyle(o, 'desktop'), m = pageBoxStyle(o, 'mobile')
    expect([d['--lo-x'], d['--lo-y']]).toEqual(['-40', '-30']); expect([m['--lo-x'], m['--lo-y']]).toEqual(['12', '55']); expect(d['--lo-px']).toBeUndefined()
  })
  it('eingeschleuste Werte landen nie im Stil', () => {
    const e = resolveOverlays([{ place: 'page', size: '20; background:url(x)', px: '1}</style>', py: 'expression(1)', mx: 'url(x)', my: ';', rotate: 'calc(1)' }])[0]
    for (const v of [pageBoxStyle(e), pageBoxStyle(e, 'mobile')]) expect(JSON.stringify(v)).not.toMatch(/url|script|expression|style>|;/)
  })
  it('das Band (doppelt so breit wie hoch) rechnet die Höhe mit dem Seitenverhältnis', () => {
    const r = resolveOverlays([{ shape: 'ribbon', size: 30, place: 'page' }])[0]; expect(pageBoxStyle(r).aspectRatio).toBe('2'); expect(pageBoxStyle(r).top).toContain('(var(--lo-y) - 7.5)')
  })
})

describe('Ziehen auf der Seitenebene (Lage berechnen)', () => {
  const base = { cx: 0, cy: 0, bw: 200, bh: 200, W: 1900, H: 1000, uPx: 12 }
  it('Zugweg in Pixeln wird in ganze Einheiten u von der Seitenmitte umgerechnet', () => {
    expect(pageDragPosition({ ...base, dxPx: 120, dyPx: -60 })).toEqual({ x: 10, y: -5 }); expect(pageDragPosition({ ...base, cx: -40, cy: 7, dxPx: -24, dyPx: 12 })).toEqual({ x: -42, y: 8 })
  })
  it('bleibt auf der Seite und innerhalb der Server-Grenzen, auch bei wildem Ziehen', () => {
    const r = pageDragPosition({ ...base, dxPx: 99999, dyPx: 99999 })
    expect(r.x).toBeLessThanOrEqual(PAGE_X_LIMIT); expect(r.y).toBeLessThanOrEqual(PAGE_Y_LIMIT)
    expect(r.x * 12 + 100).toBeLessThanOrEqual(950 + 1e-9)   // rechter Rand des Stickers höchstens am Seitenrand
    expect(r.y * 12 + 100).toBeLessThanOrEqual(500 + 1e-9)
    expect(pageDragPosition({ ...base, dxPx: -99999, dyPx: -99999 })).toEqual({ x: -r.x, y: -r.y })
    expect(pageDragPosition({ ...base, W: 300, H: 300, bw: 900, bh: 900, dxPx: 5, dyPx: 5 })).toEqual({ x: 0, y: 0 })   // Sticker größer als Seite: nie NaN/negativ-unsinnig
  })
  it('kaputte Eingaben ergeben gültige Zahlen', () => {
    for (const a of [{ ...base, uPx: 0 }, { ...base, W: 0 }, { ...base, dxPx: NaN }, { ...base, cx: NaN }]) { const r = pageDragPosition({ dxPx: 5, dyPx: 5, ...a } as any); expect(Number.isInteger(r.x) && Number.isInteger(r.y)).toBe(true) }
  })
  it('Ergebnis passt immer durch die Prüfung des Servers', () => {
    for (const dx of [-90000, -777, 0, 333, 90000]) { const { x, y } = pageDragPosition({ ...base, dxPx: dx, dyPx: dx / 3 }); const v = validateOverlays([{ shape: 'star', place: 'page', px: x, py: y, mx: x, my: y }]); expect(v.ok).toBe(true); if (v.ok) expect([v.value[0].px, v.value[0].py]).toEqual([x, y]) }
  })
})

describe('Komponente: Seitenebene', () => {
  it('Ebene "page" zeigt nur Seiten-Sticker, Ebene "image" nur Hero-Sticker; Standard ist das Hero-Bild', () => {
    expect(comp).toMatch(/\(o\.place \|\| 'image'\) === \(props\.layer \|\| 'image'\)/)
  })
  it('Seitenebene klickt nie mit (pointer-events none), liegt über dem Inhalt, wird bei engen Bildschirmen auf die Handy-Lage umgeschaltet und kann auf dem Handy ausgeblendet werden', () => {
    expect(comp).toMatch(/\.lo-layer \{[^}]*pointer-events: none/); expect(comp).toMatch(/\.lo \{ pointer-events: none; \}/); expect(comp).toContain('.lo-layer-page { container-type: inline-size; z-index: 3; }')
    expect(comp).toMatch(/@media \(max-width: 900px\) \{ \.lo-page \{ --lo-x: var\(--lo-mx\); --lo-y: var\(--lo-my\); \} \.lo-hide-m \{ display: none; \} \}/)
    expect(page).toMatch(/@media \(max-width: 900px\)/)   // gleicher Umschaltpunkt wie das einspaltige Layout der Lead-Seite
  })
  it('Seitenebene der echten Seite ist nicht bedienbar (kein editable)', () => {
    expect(tpl).toMatch(/<LeadOverlays :overlays="overlays" layer="page" \/>/)
  })
})
