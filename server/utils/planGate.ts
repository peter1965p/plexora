import { createHash } from 'node:crypto'
import { resolvePlan, planEnforced, type ResolvedPlan } from './tenantPlan'

// Gemeinsame Hilfen für Mengen-Limits (Mails, Uploads, Datensätze): im Beobachtungsmodus wird nur protokolliert ("würde ablehnen"),
// scharf (NUXT_PLAN_ENFORCE=true) wird mit passender Meldung abgelehnt. Betreiber und Demo sind vorher ausgenommen (info.exempt).

export const tenantHash = (tenantId: string) => createHash('sha256').update(tenantId).digest('hex').slice(0, 8)

/** Tarif des Aufrufers; fällt die Abfrage aus: scharf Fehler (503), im Beobachtungsmodus null (nicht prüfen) */
export async function planFor(auth: { email: string; groups?: string[] }): Promise<ResolvedPlan | null> {
  try { return await resolvePlan(auth) } catch (e) {
    if (planEnforced()) throw e
    console.error('[plan] Tarif nicht ermittelbar:', (e as Error)?.message)
    return null
  }
}

export function denyOrLog(info: ResolvedPlan, what: string, status: number, code: string, message: string, extra: Record<string, unknown> = {}): void {
  const enforce = planEnforced()
  console.warn(`[plan] ${enforce ? 'abgelehnt' : 'würde ablehnen'} ${JSON.stringify({ what, code, plan: info.plan, tenant: tenantHash(info.tenantId), ...extra })}`)
  if (enforce) throw createError({ statusCode: status, message, data: { code, plan: info.plan, ...extra } })
}
