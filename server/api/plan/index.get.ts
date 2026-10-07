import { requireAuth } from '../../utils/verifyAuth'
import { resolvePlan, planEnforced } from '../../utils/tenantPlan'
import { readMailUsage } from '../../utils/mailQuota'
import { PLAN_LIMITS, PLAN_LABELS } from '../../../shared/plans'

// Eigener Tarif, Limits und heutiger Mailverbrauch (nur Zahlen des eigenen Mandanten). Für die Anzeige in den Einstellungen.
export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const info = await resolvePlan(auth)
  const usage = info.exempt ? { system: 0, bulk: 0 } : await readMailUsage(info.tenantId).catch(() => ({ system: 0, bulk: 0 }))
  const lim = PLAN_LIMITS[info.plan]
  return {
    plan: info.plan, label: PLAN_LABELS[info.plan], exempt: info.exempt, modules: info.modules,
    enforced: planEnforced(),
    limits: { mailSystemPerDay: lim.mailSystemPerDay, mailBulkPerDay: lim.mailBulkPerDay, uploadMaxBytes: lim.uploadMaxBytes, uploadsPerDay: lim.uploadsPerDay, records: lim.records },
    usage,
  }
})
