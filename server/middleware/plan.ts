import { createHash } from 'node:crypto'
import { findPublicRule } from '../utils/routePolicy'
import { findModuleRule, describeNeed } from '../utils/moduleAccess'
import { resolvePlan, planEnforced } from '../utils/tenantPlan'
import { planAllows, PLAN_LABELS, type ModuleNeed } from '../../shared/plans'

// Zentrale Tarif-/Modulprüfung: läuft nach der Anmeldung (auth.ts) und vor jedem Handler.
// Die Oberfläche sperrt nicht lizenzierte Module nur optisch; hier gilt es auch für direkte API-Aufrufe.
// Beobachtungsmodus (NUXT_PLAN_ENFORCE nicht "true"): es wird nur protokolliert "würde ablehnen", nichts wird abgelehnt.
// Scharf: 402 mit { code: 'PLAN_REQUIRED', module, plan } (die Oberfläche zeigt "gehört nicht zu deinem Tarif").

export default defineEventHandler(async (event) => {
  const path = (event.path || '').split('?')[0]
  if (!path.startsWith('/api/')) return
  const method = (event.method || 'GET').toUpperCase()
  if (method === 'OPTIONS') return
  if (findPublicRule(path, method)) return                 // öffentliche Routen: kein Konto, kein Tarif
  const auth = event.context.auth
  if (!auth) return                                         // ohne Anmeldung entscheidet auth.ts (NUXT_AUTH_ENFORCE)

  const rule = findModuleRule(path, method)
  const need: ModuleNeed = rule ? rule.need : 'paid'        // Route ohne Regel (nur durch fehlerhaften Test möglich): wie "paid"
  if (need === 'none') return

  const enforce = planEnforced()
  let info
  try { info = await resolvePlan(auth) } catch (e: any) {
    console.error('[plan] Tarif nicht ermittelbar:', e?.message)
    if (enforce) throw e
    return
  }
  if (planAllows(info, need)) return

  const tenant = createHash('sha256').update(info.tenantId).digest('hex').slice(0, 8)
  console.warn(`[plan] ${enforce ? 'abgelehnt' : 'würde ablehnen'} ${JSON.stringify({ method, path, need: describeNeed(need), plan: info.plan, tenant, rule: !!rule })}`)
  if (!enforce) return
  const label = need === 'paid' ? 'eine Lizenz' : `das Modul „${describeNeed(need).replace('branch:', '')}“`
  throw createError({
    statusCode: 402,
    message: `Dafür brauchst du ${label}. Dein Tarif: ${PLAN_LABELS[info.plan]}. Du kannst Module im Modul-Store bestellen.`,
    data: { code: 'PLAN_REQUIRED', need: describeNeed(need), plan: info.plan },
  })
})
