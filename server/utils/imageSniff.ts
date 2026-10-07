// Dateiinhalt prüfen, nicht Endung oder Angabe des Browsers: Der allgemeine Bild-Upload (aws/s3-upload) schreibt in einen öffentlich lesbaren Bucket.
export type SniffedImage = 'png' | 'jpg' | 'gif' | 'webp' | 'svg'

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

export function sniffImage(buf: Buffer): SniffedImage | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_SIG)) return 'png'
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg'
  if (buf.length >= 6 && /^GIF8[79]a$/.test(buf.subarray(0, 6).toString('latin1'))) return 'gif'
  if (buf.length >= 12 && buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp'
  const head = buf.subarray(0, 2048).toString('utf8').replace(/^﻿/, '')
  if (/^\s*(<\?xml[^>]*\?>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(head)) return 'svg'
  return null
}

/** Endung des Dateinamens -> erwarteter Typ */
const EXT_TYPES: Record<string, SniffedImage> = { png: 'png', jpg: 'jpg', jpeg: 'jpg', gif: 'gif', webp: 'webp', svg: 'svg' }
export const extType = (ext: string): SniffedImage | null => (Object.hasOwn(EXT_TYPES, ext.toLowerCase()) ? EXT_TYPES[ext.toLowerCase()] : null)

/** SVG ohne aktive Inhalte: keine Skripte, Ereignis-Attribute, eingebettete Seiten/Objekte, Entities, fremde Verweise */
export function isSafeSvg(text: string): boolean {
  const t = text.normalize('NFKC')
  if (/<\s*(script|foreignObject|iframe|embed|object|audio|video|animate|set|handler)\b/i.test(t)) return false
  if (/<!\s*(ENTITY|DOCTYPE)/i.test(t)) return false
  if (/\bon[a-z]+\s*=/i.test(t)) return false
  if (/(java|vb)script\s*:/i.test(t.replace(/[\s\u0000-\u001f]+/g, ''))) return false
  // Verweise nur auf Elemente im selben Bild oder eingebettete Bilddaten
  for (const m of t.matchAll(/\b(?:xlink:)?href\s*=\s*["']?\s*([^"'\s>]*)/gi)) {
    const v = m[1].trim()
    if (!(v.startsWith('#') || /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(v))) return false
  }
  if (/@import|url\(\s*["']?\s*(https?:|\/\/|javascript:)/i.test(t)) return false
  return true
}
