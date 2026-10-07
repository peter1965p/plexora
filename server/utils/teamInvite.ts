import { QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'

// Regeln für Team-Einladungen (eine Quelle für Einladen, Vorschau und Annehmen).
export const INVITE_TTL_DAYS = 7
export const INVITES_PER_DAY = 10

export const sameEmail = (a: unknown, b: unknown) => typeof a === 'string' && typeof b === 'string' && a.trim() !== '' && a.trim().toLowerCase() === b.trim().toLowerCase()

/** Läuft die Einladung ab (7 Tage nach dem Einladen)? Fehlt oder kaputt: gilt als abgelaufen. */
export function inviteExpired(invitedAt: unknown, now = Date.now()): boolean {
  const t = typeof invitedAt === 'string' ? Date.parse(invitedAt) : NaN
  if (!Number.isFinite(t)) return true
  return now - t > INVITE_TTL_DAYS * 86_400_000
}
export const inviteExpiresAt = (invitedAt: unknown): string | null => {
  const t = typeof invitedAt === 'string' ? Date.parse(invitedAt) : NaN
  return Number.isFinite(t) ? new Date(t + INVITE_TTL_DAYS * 86_400_000).toISOString() : null
}

// Tabellen, in denen ein eigener Arbeitsbereich unter der eigenen E-Mail (Partitionsschlüssel userId) Daten hinterlässt.
const OWN_DATA_TABLES = ['plexora-contacts', 'plexora-companies', 'plexora-deals', 'plexora-finance', 'plexora-projects', 'plexora-marketing', 'plexora-support', 'plexora-contracts', 'plexora-hr', 'plexora-cashbook', 'plexora-bank-txn'] as const

/**
 * Hat dieses Konto schon einen eigenen Arbeitsbereich? Dann würde das Annehmen einer fremden Einladung ihn ersetzen
 * (resolveUserId leitet jeden Zugriff auf den fremden Mandanten um), und neue Daten landeten beim Einladenden.
 * Zählt als "eigen": Daten in den Kernmodulen, eine Lizenz, ein Nexora-Mandant, eigene Teammitglieder.
 * Fehler bei der Prüfung gelten als "hat Daten" (im Zweifel nicht übernehmen).
 */
export async function hasOwnWorkspace(email: string): Promise<boolean> {
  const db = getDynamoClient()
  try {
    const checks: Promise<boolean>[] = [
      ...OWN_DATA_TABLES.map(async t => ((await db.send(new QueryCommand({ TableName: t, KeyConditionExpression: 'userId = :u', ExpressionAttributeValues: { ':u': email }, Limit: 1 }))).Items || []).length > 0),
      db.send(new QueryCommand({ TableName: 'plexora-team-members', KeyConditionExpression: 'tenantId = :t', ExpressionAttributeValues: { ':t': email }, Limit: 1 })).then(r => (r.Items || []).length > 0),
      db.send(new ScanCommand({ TableName: 'plexora-nexora', FilterExpression: 'email = :e', ExpressionAttributeValues: { ':e': email } })).then(r => (r.Items || []).length > 0),
      db.send(new ScanCommand({ TableName: 'plexora-licenses', FilterExpression: 'customerEmail = :e', ExpressionAttributeValues: { ':e': email } })).then(r => (r.Items || []).length > 0),
    ]
    return (await Promise.all(checks)).some(Boolean)
  } catch (e) {
    console.error('[team] Prüfung auf eigenen Arbeitsbereich fehlgeschlagen, Annahme wird sicherheitshalber verweigert', (e as Error)?.message)
    return true
  }
}

export const OWN_WORKSPACE_MESSAGE = 'Mit dieser E-Mail-Adresse nutzt du Plexora bereits mit eigenen Daten. Eine Einladung würde deinen Arbeitsbereich ersetzen. Bitte nimm die Einladung mit einer anderen E-Mail-Adresse an oder bitte um eine Einladung an eine neue Adresse.'
