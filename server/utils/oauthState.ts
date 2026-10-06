import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

// Signierter OAuth-"state" für den Google-Kalender-Rücksprung. Er enthält Mandant und Nutzer, ist 10 Minuten gültig und an einen
// zufälligen Wert (Nonce) gebunden, der zusätzlich als httpOnly-Cookie im Browser liegt, der den Ablauf gestartet hat.
// Damit kann niemand einen fertigen Rücksprung-Link (code + state) einem anderen Browser unterschieben oder die Mandanten-ID selbst setzen.
export const STATE_TTL_SECONDS = 600
export const STATE_COOKIE = 'plx_oauth_nonce'

interface Payload { t: string; s: string; n: string; e: number }

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64url')
const unb64 = (s: string) => Buffer.from(s, 'base64url').toString('utf8')

function secret(): Buffer {
  const k = String(useRuntimeConfig().encryptionKey || '')
  if (!k) throw new Error('NUXT_ENCRYPTION_KEY ist nicht gesetzt')
  return createHmac('sha256', Buffer.from(k, 'base64')).update('plexora-oauth-state-v1').digest()
}
const sign = (body: string) => createHmac('sha256', secret()).update(body).digest('base64url')

export function createOAuthState(tenantId: string, userSub: string, now = Date.now()): { state: string; nonce: string } {
  const nonce = randomBytes(18).toString('base64url')
  const body = b64(JSON.stringify({ t: tenantId, s: userSub, n: nonce, e: Math.floor(now / 1000) + STATE_TTL_SECONDS } satisfies Payload))
  return { state: `${body}.${sign(body)}`, nonce }
}

/** Liefert den Mandanten nur, wenn Signatur, Ablauf und Cookie-Nonce stimmen; sonst null. */
export function verifyOAuthState(state: unknown, cookieNonce: unknown, now = Date.now()): { tenantId: string; userSub: string } | null {
  if (typeof state !== 'string' || typeof cookieNonce !== 'string' || !cookieNonce) return null
  const [body, sig] = state.split('.')
  if (!body || !sig) return null
  const expected = sign(body)
  const a = Buffer.from(sig); const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  let p: Payload
  try { p = JSON.parse(unb64(body)) } catch { return null }
  if (!p?.t || !p?.n || typeof p.e !== 'number' || p.e < Math.floor(now / 1000)) return null
  const n1 = Buffer.from(p.n); const n2 = Buffer.from(cookieNonce)
  if (n1.length !== n2.length || !timingSafeEqual(n1, n2)) return null
  return { tenantId: p.t, userSub: p.s }
}
