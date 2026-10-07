import { createHash, randomBytes } from 'node:crypto'
import { GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'

// Einmal-Link "Passwort festlegen" (nach einem Kauf oder wenn ein Link abgelaufen ist).
// Das Token hat 256 Bit Zufall, gespeichert wird NUR sein SHA-256-Hash (mit Ablauf), nie das Token selbst. Es gilt 60 Minuten und genau einmal:
// Das Einlösen löscht den Eintrag bedingt (zwei gleichzeitige Versuche: nur einer gewinnt). Je Konto gilt nur das jeweils neueste Token.
// Es wird in der vorhandenen Zähler-Tabelle abgelegt (Ablauf per TTL), also ohne neue Tabelle.
export const SET_PASSWORD_TTL_MINUTES = 60
export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/
const TABLE = 'plexora-newsletter-ratelimit'
const sha = (s: string) => createHash('sha256').update(s).digest('hex')
const tokenKey = (token: string) => `setpw:${sha(token)}`
const latestKey = (username: string) => `setpw-latest:${sha(username)}`

export interface SetPasswordRecord { username: string; email: string; exp: number }

export async function issueSetPasswordToken(username: string, email: string, now = Date.now()): Promise<string> {
  const token = randomBytes(32).toString('base64url')
  const exp = Math.floor(now / 1000) + SET_PASSWORD_TTL_MINUTES * 60
  const db = getDynamoClient()
  await db.send(new PutCommand({ TableName: TABLE, Item: { throttleKey: tokenKey(token), username, email, exp, ttl: exp + 3600 }, ConditionExpression: 'attribute_not_exists(throttleKey)' }))
  await db.send(new PutCommand({ TableName: TABLE, Item: { throttleKey: latestKey(username), tokenKey: tokenKey(token), exp, ttl: exp + 3600 } }))
  return token
}

/** Prüft das Token und verbraucht es (atomar). Liefert den Eintrag oder null (ungültig, abgelaufen, schon benutzt, ersetzt, Speicher nicht erreichbar). */
export async function redeemSetPasswordToken(token: unknown, now = Date.now()): Promise<SetPasswordRecord | null> {
  if (typeof token !== 'string' || !TOKEN_RE.test(token)) return null
  const db = getDynamoClient()
  try {
    const row = (await db.send(new GetCommand({ TableName: TABLE, Key: { throttleKey: tokenKey(token) } }))).Item as any
    if (!row || typeof row.exp !== 'number' || row.exp < Math.floor(now / 1000) || !row.username || !row.email) return null
    const latest = (await db.send(new GetCommand({ TableName: TABLE, Key: { throttleKey: latestKey(row.username) } }))).Item as any
    if (!latest || latest.tokenKey !== tokenKey(token)) return null                  // inzwischen wurde ein neuerer Link ausgestellt
    const del = await db.send(new DeleteCommand({ TableName: TABLE, Key: { throttleKey: tokenKey(token) }, ConditionExpression: 'attribute_exists(throttleKey)', ReturnValues: 'ALL_OLD' }))
    if (!del.Attributes) return null
    return { username: String(row.username), email: String(row.email), exp: row.exp }
  } catch (e: any) {
    if (e?.name !== 'ConditionalCheckFailedException') console.error('[set-password] Token nicht prüfbar, abgelehnt:', e?.message)
    return null
  }
}

/** Gibt ein bereits verbrauchtes Token zurück (z. B. wenn das Setzen des Passworts am Passwort scheiterte, nicht am Link). Best effort. */
export async function restoreSetPasswordToken(token: string, rec: SetPasswordRecord): Promise<void> {
  try { await getDynamoClient().send(new PutCommand({ TableName: TABLE, Item: { throttleKey: tokenKey(token), username: rec.username, email: rec.email, exp: rec.exp, ttl: rec.exp + 3600 } })) } catch { /* der Nutzer kann einen neuen Link anfordern */ }
}
