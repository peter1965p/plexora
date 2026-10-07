// Zeichnungen der Overlay-Formen (fest eingebaut, viewBox 0 0 100 100). Es gibt keine freien SVGs und keine Uploads:
// die Seite zeichnet nur diese Formen, ausgewählt über die ID aus shared/leadDecor.ts.
import type { Overlay } from '../../shared/leadDecor'

export interface Prim { tag: 'path' | 'polygon' | 'circle'; attrs: Record<string, string | number>; accent?: 'white' }

function burst(points: number, outer: number, inner: number): string {
  const pts: string[] = []
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner; const a = (Math.PI * i) / points - Math.PI / 2
    pts.push(`${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(' ')
}

export const SHAPE_PRIMS: Record<string, Prim[]> = {
  star: [{ tag: 'polygon', attrs: { points: '50,5 61,38 96,38 68,59 79,92 50,72 21,92 32,59 4,38 39,38' } }],
  burst: [{ tag: 'polygon', attrs: { points: burst(12, 48, 32) } }],
  bolt: [{ tag: 'polygon', attrs: { points: '58,2 18,56 46,56 38,98 82,40 54,40' } }],
  flame: [{ tag: 'path', attrs: { d: 'M50 4 C60 22 82 34 82 60 C82 82 66 96 50 96 C34 96 18 82 18 60 C18 46 28 38 34 28 C36 40 44 44 46 40 C48 30 44 16 50 4 Z' } }],
  arrow: [{ tag: 'path', attrs: { d: 'M6 38 H56 V14 L96 50 L56 86 V62 H6 Z' } }],
  percent: [{ tag: 'polygon', attrs: { points: burst(16, 48, 41) } }],
  check: [{ tag: 'circle', attrs: { cx: 50, cy: 50, r: 46 } }, { tag: 'path', accent: 'white', attrs: { d: 'M26 52 L44 70 L76 32', fill: 'none', 'stroke-width': 10, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' } }],
  heart: [{ tag: 'path', attrs: { d: 'M50 90 C10 60 4 38 20 22 C34 8 50 20 50 30 C50 20 66 8 80 22 C96 38 90 60 50 90 Z' } }],
  'thumbs-up': [{ tag: 'path', attrs: { d: 'M8 46 H28 V92 H8 Z M34 48 L54 8 C66 8 72 16 68 30 L66 40 H88 C94 40 98 46 96 52 L88 84 C86 90 82 92 76 92 H34 Z' } }],
  crown: [{ tag: 'path', attrs: { d: 'M8 78 L14 30 L36 54 L50 22 L64 54 L86 30 L92 78 Z M10 84 H90 V94 H10 Z' } }],
  gift: [{ tag: 'path', attrs: { d: 'M12 42 H88 V94 H12 Z M6 26 H94 V42 H6 Z' } }, { tag: 'path', accent: 'white', attrs: { d: 'M46 26 H54 V94 H46 Z' } },
         { tag: 'path', attrs: { d: 'M50 26 C30 26 26 6 40 6 C46 6 50 16 50 26 C50 16 54 6 60 6 C74 6 70 26 50 26 Z' } }],
  rocket: [{ tag: 'path', attrs: { d: 'M50 4 C70 20 76 46 70 72 L50 90 L30 72 C24 46 30 20 50 4 Z M30 72 L12 90 L36 84 Z M70 72 L88 90 L64 84 Z' } }, { tag: 'circle', accent: 'white', attrs: { cx: 50, cy: 38, r: 9 } }],
  ribbon: [{ tag: 'polygon', attrs: { points: '2,28 98,28 88,50 98,72 2,72 12,50' } }],
}
/** Seitenverhältnis (Breite : Höhe) je Form; das Band ist doppelt so breit wie hoch (viewBox bleibt 100 x 100, es wird gestreckt). */
export const SHAPE_ASPECT: Record<string, number> = { ribbon: 2 }

const lum = (hex: string) => { const n = parseInt(hex.slice(1), 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255 }
/** Textfarbe mit Kontrast zur Overlay-Farbe (helle Fläche = dunkler Text). */
export const overlayTextColor = (o: Pick<Overlay, 'color'>) => (lum(o.color) > 0.72 ? '#1a1a1a' : '#ffffff')

/**
 * Lage und Größe: Größe in Prozent der Bildbreite (cqw), Position in Prozent. Die Lage wird so begrenzt, dass das Overlay nie über den Bildrand hinausläuft
 * (auch auf dem Handy). Overlays liegen nur über dem Hero-Bild – nie über Formular oder Button.
 */
export function overlayBoxStyle(o: Overlay): Record<string, string> {
  const aspect = SHAPE_ASPECT[o.shape] || 1
  return {
    width: `${o.size}cqw`, aspectRatio: String(aspect), position: 'absolute',
    left: `min(${o.x}%, calc(100% - ${o.size}cqw))`,
    top: `min(${o.y}%, calc(100% - ${(o.size / aspect).toFixed(2)}cqw))`,
    transform: `rotate(${o.rotate}deg)`,
  }
}

/**
 * Textfläche je Form (Anteile von Breite und Höhe der Form) und Verschiebung des Textmittelpunkts. Der Text passt sich der Fläche an,
 * damit er auch bei Stern, Herz oder Blitz nicht über die Zacken läuft. Reine Zahlen, nur Anzeige.
 */
export const SHAPE_TEXT_BOX: Record<string, { w: number; h: number; dx: number; dy: number }> = {
  star: { w: 0.46, h: 0.3, dx: 0, dy: 0.06 }, burst: { w: 0.62, h: 0.46, dx: 0, dy: 0 }, bolt: { w: 0.3, h: 0.3, dx: 0, dy: 0 },
  flame: { w: 0.46, h: 0.32, dx: 0, dy: 0.14 }, arrow: { w: 0.44, h: 0.24, dx: -0.19, dy: 0 }, percent: { w: 0.8, h: 0.56, dx: 0, dy: 0 },
  check: { w: 0.7, h: 0.26, dx: 0, dy: 0.3 }, heart: { w: 0.5, h: 0.28, dx: 0, dy: -0.02 }, 'thumbs-up': { w: 0.5, h: 0.26, dx: 0.08, dy: 0.14 },
  crown: { w: 0.66, h: 0.3, dx: 0, dy: 0.1 }, gift: { w: 0.7, h: 0.26, dx: 0, dy: 0.2 }, rocket: { w: 0.26, h: 0.26, dx: 0, dy: 0 }, ribbon: { w: 0.76, h: 0.34, dx: 0, dy: 0 },
}
const CHAR_EM = 0.6 // durchschnittliche Zeichenbreite fetter Schrift in em (bewusst großzügig)

/** Teilt den Text bei einem Leerzeichen so in höchstens zwei Zeilen, dass die längere Zeile möglichst kurz wird. */
export function overlayTextLines(text: string): string[] {
  const t = text.trim()
  if (!t) return []
  const words = t.split(' ')
  if (words.length < 2) return [t]
  let best = [t], bestLen = t.length
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ')
    const l = Math.max(a.length, b.length)
    if (l < bestLen) { best = [a, b]; bestLen = l }
  }
  return best
}

/**
 * Schriftgröße (in cqw), Zeilen und Lage des Textes: so groß wie möglich (höchstens 17 % der Formbreite), aber nie breiter oder höher als die Textfläche der Form.
 * Mit einer Zeile oder zwei Zeilen wird die größere Schrift gewählt. Der Regler "Textgröße" (50–150 %) skaliert das Ergebnis.
 */
export function overlayTextLayout(o: Pick<Overlay, 'shape' | 'text' | 'size' | 'textSize'>) {
  const box = SHAPE_TEXT_BOX[o.shape] || { w: 0.6, h: 0.3, dx: 0, dy: 0 }
  const aspect = SHAPE_ASPECT[o.shape] || 1
  const boxW = o.size * box.w, boxH = (o.size / aspect) * box.h
  const fit = (lines: string[]) => {
    if (!lines.length) return 0
    const byW = boxW / (Math.max(...lines.map(l => l.length)) * CHAR_EM)
    const byH = boxH / (lines.length * 1.1)
    return Math.min(o.size * 0.17, byW, byH)
  }
  const one = o.text.trim() ? [o.text.trim()] : [], two = overlayTextLines(o.text)
  const lines = fit(two) > fit(one) ? two : one
  return { lines, fontSize: Math.max(0.5, fit(lines) * (o.textSize / 100)), dx: box.dx, dy: box.dy }
}
