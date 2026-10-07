import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'

// Kurzlebiger Einmalwert für Abläufe, die per Browser-Navigation starten (kein Authorization-Header möglich), z. B. die Google-Kalender-Verknüpfung.
// Er entsteht nur aus einer angemeldeten Anfrage, gilt nur für einen Zweck, 60 Sekunden und genau einmal. Er ist KEIN Anmeldetoken:
// er schaltet keine API-Route frei und lässt sich nicht für etwas anderes verwenden. Das Einlösen markiert ihn in der Zähler-Tabelle
// (bedingter Eintrag), ein zweites Einlösen scheitert – auch auf einer anderen Lambda-Instanz.
export const TICKET_TTL_SECONDS = 60

interface Payload { p: string; s: string; m: string; j: string; e: number }
const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64url')
const unb64 = (s: string) => Buffer.from(s, 'base64url').toString('utf8')

function secret(): Buffer {
  const k = String(useRuntimeConfig().encryptionKey || '')
  if (!k) throw new Error('NUXT_ENCRYPTION_KEY ist nicht gesetzt')
  return createHmac('sha256', Buffer.from(k, 'base64')).update('plexora-one-time-ticket-v1').digest()
}
const sign = (body: string) => createHmac('sha256', secret()).update(body).digest('base64url')

export function createTicket(identity: { userId: string; email: string }, purpose: string, now = Date.now()): string {
  const body = b64(JSON.stringify({ p: purpose, s: identity.userId, m: identity.email, j: randomBytes(16).toString('base64url'), e: Math.floor(now / 1000) + TICKET_TTL_SECONDS } satisfies Payload))
  return `${body}.${sign(body)}`
}

/** Prüft Signatur, Zweck und Ablauf und verbraucht den Wert. Liefert die Identität oder null (ungültig, abgelaufen, schon benutzt, Prüfung nicht möglich). */
export async function redeemTicket(ticket: unknown, purpose: string, now = Date.now()): Promise<{ userId: string; email: string } | null> {
  if (typeof ticket !== 'string' || ticket.length > 1000) return null
  const [body, sig] = ticket.split('.')
  if (!body || !sig) return null
  const a = Buffer.from(sig); const b = Buffer.from(sign(body))
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  let p: Payload
  try { p = JSON.parse(unb64(body)) } catch { return null }
  if (p?.p !== purpose || !p.j || !p.m || !p.s || typeof p.e !== 'number' || p.e < Math.floor(now / 1000)) return null
  try {
    await getDynamoClient().send(new UpdateCommand({
      TableName: 'plexora-newsletter-ratelimit',
      Key: { throttleKey: `ticket:${p.j}` },
      UpdateExpression: 'SET #t = :ttl',
      ConditionExpression: 'attribute_not_exists(throttleKey)',
      ExpressionAttributeNames: { '#t': 'ttl' },
      ExpressionAttributeValues: { ':ttl': p.e + 3600 },
    }))
  } catch (e: any) {
    if (e?.name !== 'ConditionalCheckFailedException') console.error('[ticket] Einlösen nicht möglich, Wert wird abgelehnt', e?.message)
    return null     // schon benutzt oder Speicher nicht erreichbar: im Zweifel ablehnen
  }
  return { userId: p.s, email: p.m }
}
