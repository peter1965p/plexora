import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'

// Einfache Fixed-Window-Drossel für öffentliche Newsletter-Routen (Signup/Confirm/
// Unsubscribe) — es gibt im Projekt sonst nirgends Rate-Limiting auf öffentlichen
// Routen, aber Opt-in-Formulare sind ein klassisches Missbrauchsziel (Subscription-
// Bombing, Massen-Fake-Signups). TTL auf plexora-newsletter-ratelimit räumt die
// Zähler-Zeilen selbst auf, kein Cronjob nötig.
export async function checkRateLimit(bucket: string, identifier: string, maxAttempts: number, windowSeconds: number): Promise<boolean> {
  if (!identifier) return true
  const client = getDynamoClient()
  const now = Math.floor(Date.now() / 1000)
  try {
    const res = await client.send(new UpdateCommand({
      TableName: 'plexora-newsletter-ratelimit',
      Key: { throttleKey: `${bucket}:${identifier}` },
      UpdateExpression: 'ADD #c :one SET #t = if_not_exists(#t, :ttl)',
      ExpressionAttributeNames: { '#c': 'count', '#t': 'ttl' },
      ExpressionAttributeValues: { ':one': 1, ':ttl': now + windowSeconds },
      ReturnValues: 'ALL_NEW',
    }))
    return ((res.Attributes?.count as number) || 0) <= maxAttempts
  } catch {
    // Drossel darf den eigentlichen Request nie blockieren, wenn sie selbst fehlschlägt
    return true
  }
}
