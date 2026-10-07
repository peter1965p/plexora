import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'
import { resolveUserId } from './tenant'
import { isDemoAccount } from './mailGuard'
import { planFromLicenses, type PlanInfo } from '../../shared/plans'

// Tarif eines Mandanten, serverseitig aus plexora-licenses (aktive, nicht abgelaufene Lizenz auf die E-Mail des Inhabers).
// Team-Mitglieder erben den Tarif des Inhabers (resolveUserId liefert den Mandanten). Betreiber (Gruppe admins) und Demo-Konto sind ausgenommen.
// Zwischenspeicher 60 s. Fällt die Lizenzabfrage aus, gilt der zuletzt bekannte Tarif bis zu 10 Minuten, danach Fehler (nie "alles erlaubt").

export interface ResolvedPlan extends PlanInfo { tenantId: string; stale?: boolean }

const TTL = 60_000
const STALE_MAX = 10 * 60_000
const cache = new Map<string, { v: ResolvedPlan; ts: number }>()
const ALL_MODULES = ['crm', 'support', 'finance', 'projects', 'contracts', 'hr', 'analytics', 'shop', 'forms', 'marketing', 'nexora', 'newsletter']

/** NUXT_PLAN_ENFORCE=true: Tarif-/Mengenprüfungen lehnen ab; sonst nur Protokoll ("würde ablehnen") */
export const planEnforced = () => { const v: any = useRuntimeConfig().planEnforce; return v === true || v === 'true' }

export function invalidatePlanCache(tenantId?: string) { if (tenantId) cache.delete(tenantId); else cache.clear() }

async function installedBranches(email: string): Promise<string[]> {
  const res = await getDynamoClient().send(new ScanCommand({ TableName: 'plexora-nexora', FilterExpression: 'email = :e', ExpressionAttributeValues: { ':e': email } }))
  const item: any = res.Items?.[0]
  if (Array.isArray(item?.branchModules)) return item.branchModules.filter((b: any) => b && b.status === 'active').map((b: any) => String(b.key).toLowerCase())
  const bp = item?.branchPackages
  const legacy: string[] = bp instanceof Set ? Array.from(bp as Set<string>) : (Array.isArray(bp) ? bp : [])
  return legacy.map(k => String(k).toLowerCase())
}

export async function resolvePlan(auth: { email: string; groups?: string[] }): Promise<ResolvedPlan> {
  const email = auth.email || ''
  if ((auth.groups || []).includes('admins')) return { tenantId: email, plan: 'enterprise', exempt: 'platform', modules: ALL_MODULES }
  if (isDemoAccount({ email, groups: auth.groups || [] })) return { tenantId: email, plan: 'enterprise', exempt: 'demo', modules: ALL_MODULES }

  const tenantId = await resolveUserId(email)
  const hit = cache.get(tenantId)
  if (hit && Date.now() - hit.ts < TTL) return hit.v
  try {
    const res = await getDynamoClient().send(new ScanCommand({
      TableName: 'plexora-licenses',
      FilterExpression: 'customerEmail = :e',
      ExpressionAttributeValues: { ':e': tenantId },
    }))
    const { plan, modules } = planFromLicenses((res.Items || []) as any[])
    const branches = plan === 'free' ? await installedBranches(tenantId) : []
    const v: ResolvedPlan = { tenantId, plan, exempt: null, modules, branches }
    cache.set(tenantId, { v, ts: Date.now() })
    return v
  } catch (e) {
    if (hit && Date.now() - hit.ts < STALE_MAX) return { ...hit.v, stale: true }
    throw createError({ statusCode: 503, message: 'Der Tarif konnte gerade nicht geprüft werden. Bitte gleich noch einmal versuchen.' })
  }
}
