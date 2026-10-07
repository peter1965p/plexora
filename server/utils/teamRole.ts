import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'
import { isDemoAccount } from './mailGuard'
import type { Role } from '../../shared/roles'

// Rolle des angemeldeten Kontos im Mandanten, immer aus dem verifizierten Token und der Team-Tabelle, nie aus der Anfrage:
//  1. Cognito-Gruppe admins            -> platform (Betreiber)
//  2. aktive Zeile in plexora-team-members -> deren Rolle (nur "admin" oder "member" zählen; alles andere = member, im Zweifel weniger Rechte)
//  3. sonst                             -> owner (das Konto ist sein eigener Mandant)
// Fällt die Abfrage aus, gilt der zuletzt bekannte Stand bis 10 Minuten, danach ein Fehler (503). NIE wird bei einem Ausfall auf "owner" zurückgefallen:
// ein Mitglied würde sonst bei einer Störung zum Inhaber (resolveUserId in tenant.ts fällt dagegen auf die eigene Adresse zurück).
export interface ResolvedRole { role: Role; tenantId: string; stale?: boolean }
const TTL = 60_000, STALE_MAX = 10 * 60_000
const cache = new Map<string, { v: ResolvedRole; ts: number }>()
export const invalidateRoleCache = (email?: string) => { if (email) cache.delete(email.toLowerCase()); else cache.clear() }

export async function resolveRole(auth: { email: string; groups?: string[] }): Promise<ResolvedRole> {
  const email = String(auth.email || '')
  if ((auth.groups || []).includes('admins')) return { role: 'platform', tenantId: email }
  if (!email || isDemoAccount({ email, groups: auth.groups || [] })) return { role: 'owner', tenantId: email }
  const key = email.toLowerCase()
  const hit = cache.get(key)
  if (hit && Date.now() - hit.ts < TTL) return hit.v
  try {
    const res = await getDynamoClient().send(new ScanCommand({
      TableName: 'plexora-team-members',
      FilterExpression: 'memberEmail = :e AND #s = :active',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':e': email, ':active': 'active' },
    }))
    const row: any = res.Items?.[0]
    const v: ResolvedRole = row?.tenantId ? { role: row.role === 'admin' ? 'admin' : 'member', tenantId: String(row.tenantId) } : { role: 'owner', tenantId: email }
    cache.set(key, { v, ts: Date.now() })
    return v
  } catch {
    if (hit && Date.now() - hit.ts < STALE_MAX) return { ...hit.v, stale: true }
    throw createError({ statusCode: 503, message: 'Die Rolle konnte gerade nicht geprüft werden. Bitte gleich noch einmal versuchen.' })
  }
}

/** NUXT_ROLES_ENFORCE=true: Rollenprüfung lehnt ab; sonst nur Protokoll ("würde ablehnen") */
export const rolesEnforced = () => { const v: any = useRuntimeConfig().rolesEnforce; return v === true || v === 'true' }
