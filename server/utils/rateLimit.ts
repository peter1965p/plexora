import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'

// Drossel für öffentliche Routen (Formulare, Buchung, Kontakt, Newsletter …).
// Echte Fixed-Window-Zähler: Das Fenster steckt im Schlüssel, ein neues Fenster beginnt also bei 0,
// egal wann DynamoDB-TTL die alten Zeilen löscht (TTL räumt nur auf, sie begrenzt nichts).
export async function checkRateLimit(bucket: string, identifier: string, maxAttempts: number, windowSeconds: number): Promise<boolean> {
  if (!identifier) return true
  const client = getDynamoClient()
  const now = Math.floor(Date.now() / 1000)
  const windowIndex = Math.floor(now / windowSeconds)
  try {
    const res = await client.send(new UpdateCommand({
      TableName: 'plexora-newsletter-ratelimit',
      Key: { throttleKey: `${bucket}:${identifier}:${windowIndex}` },
      UpdateExpression: 'ADD #c :one SET #t = :ttl',
      ExpressionAttributeNames: { '#c': 'count', '#t': 'ttl' },
      ExpressionAttributeValues: { ':one': 1, ':ttl': (windowIndex + 1) * windowSeconds + 3600 },
      ReturnValues: 'ALL_NEW',
    }))
    return ((res.Attributes?.count as number) || 0) <= maxAttempts
  } catch (e) {
    // Die Drossel darf echte Besucher nie aussperren, wenn sie selbst ausfällt. Der Vorfall wird protokolliert.
    console.error('[rate-limit] Zähler nicht erreichbar, Anfrage wird durchgelassen', bucket, (e as Error)?.message)
    return true
  }
}

// Echte Absender-Adresse. API Gateway hängt die Quell-IP an einen vom Aufrufer mitgeschickten
// X-Forwarded-For HINTEN an; der erste Eintrag ist frei wählbar und damit wertlos. Es zählt der letzte.
export function clientIp(event: any): string {
  const xff = String(getHeader(event, 'x-forwarded-for') || '')
  const parts = xff.split(',').map(s => s.trim()).filter(Boolean)
  return parts[parts.length - 1] || 'unknown'
}

export const PUBLIC_LIMITS = { perMinute: 5, perDay: 30 }

// Drosselt eine öffentliche Route je IP: pro Minute und pro Tag. Gilt immer, unabhängig vom Bot-Schutz-Schalter.
// Wirft 429 mit verständlicher Meldung.
export async function enforcePublicRateLimit(event: any, route: string, limits: { perMinute: number; perDay: number } = PUBLIC_LIMITS): Promise<void> {
  const ip = clientIp(event)
  const [minuteOk, dayOk] = await Promise.all([
    checkRateLimit(`${route}:min`, ip, limits.perMinute, 60),
    checkRateLimit(`${route}:day`, ip, limits.perDay, 86400),
  ])
  if (minuteOk && dayOk) return
  setResponseHeader(event, 'Retry-After', minuteOk ? '3600' : '60')
  throw createError({
    statusCode: 429,
    message: minuteOk
      ? 'Heute wurden zu viele Anfragen von Ihrer Adresse gesendet. Bitte versuchen Sie es morgen erneut.'
      : 'Zu viele Anfragen in kurzer Zeit. Bitte warten Sie eine Minute und versuchen Sie es erneut.',
  })
}
