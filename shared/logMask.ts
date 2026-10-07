// Maskierung für das Versand-Protokoll (plexora-mail-log): Alle Konten eines Mandanten dürfen es lesen, deshalb stehen dort nie Links mit Pfad,
// Parameter oder Token. Von einer Adresse bleibt nur der Host ("https://meet.google.com/…"); lange Zufallswerte und UUIDs werden ersetzt.
// scripts/security/mask-mail-log.mjs enthält dieselbe Logik für bestehende Einträge; ein Test erzwingt, dass beide gleich arbeiten.
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi
const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi
const LONG_TOKEN_RE = /\b(?=[A-Za-z0-9_-]*\d)(?=[A-Za-z0-9_-]*[A-Za-z])[A-Za-z0-9_-]{24,}\b/g
export function maskLogText(text: unknown): string {
  return String(text ?? '')
    .replace(URL_RE, (m) => { const tail = (m.match(/[.,;:!?]+$/) || [''])[0]; const u = tail ? m.slice(0, -tail.length) : m; try { const x = new URL(/^www\./i.test(u) ? `https://${u}` : u); return `${x.protocol}//${x.host}/…${tail}` } catch { return `[Link]${tail}` } })
    .replace(UUID_RE, '[…]')
    .replace(LONG_TOKEN_RE, '[…]')
}
/** Vorschau fürs Protokoll: bei Einladungen leer (nur Adresse und Betreff), sonst Text ohne Tags und mit maskierten Links, höchstens 600 Zeichen */
export function logPreview(kind: string, textOrHtml: string): string {
  if (kind === 'team_invite') return ''
  return maskLogText(String(textOrHtml || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 600)
}
