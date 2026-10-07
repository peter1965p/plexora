import { PNG } from 'pngjs'
import jpeg from 'jpeg-js'

// Verarbeitung des Mail-Logos. Dem Upload wird nie vertraut: Der Typ wird an den Magic Bytes erkannt (nicht an Endung oder MIME-Angabe),
// das Bild wird serverseitig dekodiert, verkleinert und NEU kodiert. Gespeichert wird nur dieses Ergebnis – EXIF (Standort, Kamera),
// Textblöcke, Profile und alles, was in Metadaten oder hinter dem Bildende steckt, ist damit weg.
export const MAX_LOGO_BYTES = 300 * 1024
export const MAX_LOGO_DIM = 2000
/** Gespeichert wird in doppelter Auflösung (bis 480 Pixel); die Mail zeigt es höchstens 240 Pixel breit (scharf auf hochauflösenden Bildschirmen) */
export const LOGO_OUT_MAX = 480
export const LOGO_DISPLAY_MAX = 240

export class LogoError extends Error { constructor(message: string) { super(message) } }

export type LogoType = 'png' | 'jpg'
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

export function detectLogoType(buf: Buffer): LogoType | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_SIG)) return 'png'
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg'
  return null
}

const DANGEROUS_EXT = new Set(['html', 'htm', 'xhtml', 'shtml', 'svg', 'svgz', 'xml', 'php', 'phtml', 'php3', 'php4', 'php5', 'js', 'mjs', 'jsp', 'asp', 'aspx', 'cgi', 'pl', 'py', 'rb', 'sh', 'bat', 'cmd', 'exe', 'dll', 'swf', 'jar', 'war', 'htaccess', 'gif', 'webp', 'bmp', 'ico', 'tif', 'tiff', 'pdf', 'zip'])
/** Dateiname nur zur Abwehr: Pfadangriffe, Steuerzeichen, Doppelendungen. Der Name selbst wird NIE gespeichert oder ausgeliefert. */
export function assertSafeFileName(name: unknown) {
  if (name === undefined || name === null || name === '') return           // der Name ist optional
  if (typeof name !== 'string' || name.length > 120) throw new LogoError('Der Dateiname ist ungültig oder zu lang.')
  if (/[\u0000-\u001f\u007f\\\/:*?"<>|%]/.test(name) || name.includes('..') || name.startsWith('.') || /[‪-‮⁦-⁩]/.test(name)) throw new LogoError('Der Dateiname enthält unzulässige Zeichen (Pfadangaben sind nicht erlaubt).')
  const parts = name.toLowerCase().split('.')
  if (parts.length < 2) throw new LogoError('Dateiendung fehlt. Erlaubt sind PNG und JPG.')
  const ext = parts[parts.length - 1]
  if (!['png', 'jpg', 'jpeg'].includes(ext)) throw new LogoError('Nur PNG und JPG sind erlaubt (kein SVG, GIF oder WebP).')
  for (const inner of parts.slice(1, -1)) if (DANGEROUS_EXT.has(inner)) throw new LogoError('Dateien mit Doppelendung (z. B. .html.png) werden abgelehnt.')
}

// nur lange, eindeutige Muster: kurze wie "<a " kämen in komprimierten Bilddaten zufällig vor
const ACTIVE_CONTENT = /<\s*(?:script|svg|html|iframe|object|embed|style|link|meta|body|form)\b|<\?php|<\?xml|javascript:|onerror\s*=|onload\s*=/i
function pngDims(b: Buffer) { if (b.length < 33 || b.toString('latin1', 12, 16) !== 'IHDR') throw new LogoError('Das PNG ist beschädigt.'); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) } }
/** liest die Maße aus dem JPEG-Kopf, ohne zu dekodieren (schützt vor Bildbomben); prüft das Dateiende */
function jpegDims(b: Buffer) {
  let i = 2
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) { i++; continue }
    const m = b[i + 1]
    if (m === 0xff) { i++; continue }
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) }
    if (m === 0xd8 || (m >= 0xd0 && m <= 0xd7) || m === 0x01) { i += 2; continue }
    i += 2 + b.readUInt16BE(i + 2)
  }
  throw new LogoError('Das JPG ist beschädigt.')
}
function assertNoTrailingData(buf: Buffer, type: LogoType) {
  if (type === 'png') {
    // Blöcke durchlaufen; nach IEND darf nichts mehr kommen
    let p = 8
    while (p + 12 <= buf.length) {
      const len = buf.readUInt32BE(p), name = buf.toString('latin1', p + 4, p + 8)
      p += 12 + len
      if (name === 'IEND') { if (p !== buf.length) throw new LogoError('Hinter dem Bildende stehen zusätzliche Daten – die Datei wird abgelehnt.'); return }
      if (len > buf.length) break
    }
    throw new LogoError('Das PNG ist beschädigt oder unvollständig.')
  }
  const eoi = buf.lastIndexOf(Buffer.from([0xff, 0xd9]))
  if (eoi < 0) throw new LogoError('Das JPG ist beschädigt oder unvollständig.')
  if (eoi + 2 !== buf.length) throw new LogoError('Hinter dem Bildende stehen zusätzliche Daten – die Datei wird abgelehnt.')
}

/** Flächenmittel mit vormultiplizierter Transparenz (keine Ränder durch halbtransparente Pixel) */
function downscale(src: { data: Buffer | Uint8Array; width: number; height: number }, tw: number, th: number): { data: Buffer; width: number; height: number } {
  const out = Buffer.alloc(tw * th * 4)
  const sx = src.width / tw, sy = src.height / th
  for (let y = 0; y < th; y++) {
    const y0 = Math.floor(y * sy), y1 = Math.max(y0 + 1, Math.min(src.height, Math.ceil((y + 1) * sy)))
    for (let x = 0; x < tw; x++) {
      const x0 = Math.floor(x * sx), x1 = Math.max(x0 + 1, Math.min(src.width, Math.ceil((x + 1) * sx)))
      let r = 0, g = 0, b = 0, a = 0, n = 0
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const o = (yy * src.width + xx) * 4, al = src.data[o + 3]; r += src.data[o] * al; g += src.data[o + 1] * al; b += src.data[o + 2] * al; a += al; n++ }
      const o = (y * tw + x) * 4
      if (a > 0) { out[o] = Math.round(r / a); out[o + 1] = Math.round(g / a); out[o + 2] = Math.round(b / a) }
      out[o + 3] = Math.round(a / n)
    }
  }
  return { data: out, width: tw, height: th }
}

export interface ProcessedLogo { type: LogoType; data: Buffer; width: number; height: number }

export function processLogo(buf: Buffer, fileName?: unknown): ProcessedLogo {
  assertSafeFileName(fileName)
  if (!buf || buf.length === 0) throw new LogoError('Die Datei ist leer.')
  if (buf.length > MAX_LOGO_BYTES) throw new LogoError(`Die Datei ist zu groß (höchstens ${Math.round(MAX_LOGO_BYTES / 1024)} KB).`)
  const type = detectLogoType(buf)
  if (!type) throw new LogoError('Das ist kein PNG oder JPG (geprüft am Dateiinhalt, nicht an der Endung). SVG, GIF und WebP sind nicht erlaubt.')
  // Polyglots und Tarnung: aktiver Inhalt irgendwo in der Datei oder Daten hinter dem Bildende
  if (ACTIVE_CONTENT.test(buf.toString('latin1'))) throw new LogoError('Die Datei enthält verdächtigen Inhalt (z. B. Skript oder Markup) und wird abgelehnt.')
  assertNoTrailingData(buf, type)
  const dims = type === 'png' ? pngDims(buf) : jpegDims(buf)
  if (!dims.w || !dims.h) throw new LogoError('Die Bildgröße ist ungültig.')
  if (dims.w > MAX_LOGO_DIM || dims.h > MAX_LOGO_DIM) throw new LogoError(`Das Bild ist zu groß (höchstens ${MAX_LOGO_DIM} × ${MAX_LOGO_DIM} Pixel, hier ${dims.w} × ${dims.h}).`)

  let img: { data: Buffer | Uint8Array; width: number; height: number }
  try {
    if (type === 'png') { const p = PNG.sync.read(buf); img = { data: p.data, width: p.width, height: p.height } }
    else { const j = jpeg.decode(buf, { useTArray: true, formatAsRGBA: true, maxResolutionInMP: 4, maxMemoryUsageInMB: 128 }); img = { data: j.data, width: j.width, height: j.height } }
  } catch { throw new LogoError('Das Bild ist beschädigt oder kann nicht gelesen werden.') }
  if (img.width !== dims.w || img.height !== dims.h) throw new LogoError('Die Bildangaben stimmen nicht überein – die Datei wird abgelehnt.')

  const scale = Math.min(1, LOGO_OUT_MAX / img.width, LOGO_OUT_MAX / img.height)
  const out = scale < 1 ? downscale(img, Math.max(1, Math.round(img.width * scale)), Math.max(1, Math.round(img.height * scale))) : { data: Buffer.from(img.data), width: img.width, height: img.height }
  let data: Buffer
  if (type === 'png') { const p = new PNG({ width: out.width, height: out.height }); Buffer.from(out.data).copy(p.data); data = PNG.sync.write(p, { colorType: 6 }) }
  else data = Buffer.from(jpeg.encode({ data: out.data, width: out.width, height: out.height }, 85).data)
  return { type, data, width: out.width, height: out.height }
}
