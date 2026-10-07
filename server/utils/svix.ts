import { createHmac, timingSafeEqual } from 'crypto'

// Signaturprüfung für Webhooks im Svix-Verfahren (Resend nutzt es): HMAC-SHA256 über "<svix-id>.<svix-timestamp>.<Rohtext>" mit dem
// Base64-dekodierten Secret (Präfix "whsec_" entfällt). Der Header svix-signature enthält eine oder mehrere Signaturen "v1,<base64>" (durch Leerzeichen getrennt,
// z. B. während eines Secret-Wechsels); eine gültige genügt. Der Zeitstempel darf höchstens 5 Minuten von jetzt abweichen (Schutz vor Wiedereinspielen alter Aufrufe).
export const SVIX_TOLERANCE_SECONDS = 300

export interface SvixInput { id?: unknown; timestamp?: unknown; signature?: unknown; body: string; secret: string; now?: number; toleranceSeconds?: number }

export function svixSign(secret: string, id: string, timestamp: string | number, body: string): string {
  const key = Buffer.from(String(secret).replace(/^whsec_/, ''), 'base64')
  return createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64')
}

export function verifySvix(i: SvixInput): boolean {
  const { id, timestamp, signature, body, secret } = i
  if (typeof id !== 'string' || typeof timestamp !== 'string' || typeof signature !== 'string' || typeof body !== 'string' || !id || !timestamp || !signature) return false
  if (typeof secret !== 'string' || secret.length < 16) return false                 // ohne Secret wird nie etwas angenommen
  if (!/^\d{9,13}$/.test(timestamp)) return false
  const now = Math.floor((i.now ?? Date.now()) / 1000), tol = i.toleranceSeconds ?? SVIX_TOLERANCE_SECONDS
  if (Math.abs(now - Number(timestamp)) > tol) return false
  let expected: Buffer
  try { expected = Buffer.from(svixSign(secret, id, timestamp, body), 'base64') } catch { return false }
  if (!expected.length) return false
  for (const part of signature.split(' ')) {
    const [version, sig] = part.split(',')
    if (version !== 'v1' || !sig) continue
    let got: Buffer; try { got = Buffer.from(sig, 'base64') } catch { continue }
    if (got.length === expected.length && timingSafeEqual(got, expected)) return true
  }
  return false
}
