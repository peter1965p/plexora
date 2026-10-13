import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

// SSRF-Schutz für Adressen, die der Mandant selbst einträgt (Webhooks, Kalender-Links): der Server ruft sie aus dem AWS-Netz auf.
// Ohne Prüfung könnte jemand interne Adressen erreichen (z. B. 169.254.169.254 = Metadaten mit Zugangsdaten).
export function isPrivateIp(ip: string): boolean {
  if (ip === '169.254.169.254') return true
  const v4 = ip.startsWith('::ffff:') ? ip.slice(7) : ip     // IPv4 in IPv6-Schreibweise
  if (isIP(v4) === 4) {
    const [a, b] = v4.split('.').map(Number)
    if (a === 127 || a === 10 || a === 0) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true
    if (a === 100 && b >= 64 && b <= 127) return true          // CGNAT
    if (a >= 224) return true                                  // Multicast/reserviert
  }
  if (isIP(ip) === 6) {
    const lower = ip.toLowerCase()
    if (lower === '::1' || lower === '::' || lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) return true
  }
  return false
}

/** Nur https, kein localhost, keine Zugangsdaten in der Adresse, Ziel nicht intern. Wirft Error mit verständlicher Meldung. */
export async function assertPublicHttpsUrl(raw: string): Promise<URL> {
  let url: URL
  try { url = new URL(raw) } catch { throw new Error('Das ist keine gültige Adresse.') }
  if (url.protocol !== 'https:') throw new Error('Nur Adressen mit https:// sind erlaubt.')
  if (url.username || url.password) throw new Error('Adressen mit Benutzername/Passwort sind nicht erlaubt.')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) throw new Error('Interne Adresse nicht erlaubt.')
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => { throw new Error('Der Servername wurde nicht gefunden.') })
  if (!addrs.length || addrs.some(a => isPrivateIp(a.address))) throw new Error('Interne Adresse nicht erlaubt.')
  return url
}

/** Text von einer fremden Adresse holen: Weiterleitungen werden einzeln geprüft (höchstens 3), Zeit und Größe begrenzt */
export async function fetchTextSafe(raw: string, opts: { maxBytes?: number; timeoutMs?: number } = {}): Promise<string> {
  const maxBytes = opts.maxBytes ?? 2_000_000, timeoutMs = opts.timeoutMs ?? 10_000
  let target = raw
  for (let hop = 0; hop <= 3; hop++) {
    const url = await assertPublicHttpsUrl(target)
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(timeoutMs), headers: { 'user-agent': 'Plexora-Kalenderabgleich/1.0', accept: 'text/calendar, text/plain, */*' } })
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) { target = new URL(res.headers.get('location')!, url).toString(); continue }
    if (!res.ok) throw new Error(`Die Gegenstelle antwortet mit Fehler ${res.status}.`)
    const declared = Number(res.headers.get('content-length') || 0)
    if (declared > maxBytes) throw new Error('Die Datei ist zu groß.')
    const reader = res.body?.getReader()
    if (!reader) return ''
    const chunks: Uint8Array[] = []; let size = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > maxBytes) { await reader.cancel(); throw new Error('Die Datei ist zu groß.') }
      chunks.push(value)
    }
    return Buffer.concat(chunks).toString('utf8')
  }
  throw new Error('Zu viele Weiterleitungen.')
}
