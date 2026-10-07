import { createHash } from 'node:crypto'
import { findPublicRule } from '../utils/routePolicy'
import { needForRoute } from '../utils/rolePolicy'
import { resolveRole, rolesEnforced } from '../utils/teamRole'
import { roleAllows, ROLE_LABELS, type Role } from '../../shared/roles'

// Zentrale Rollenprüfung (Inhaber, Admin, Mitglied): läuft nach der Anmeldung (auth.ts) und vor jedem Handler.
// Beobachtungsmodus (NUXT_ROLES_ENFORCE nicht "true"): es wird nur protokolliert, was abgelehnt WÜRDE ("[roles] würde ablehnen …"), nichts wird abgelehnt.
// Scharf: 403 mit fester Form { code: 'ROLE_REQUIRED', requiredRole, yourRole } und verständlicher Meldung (nie leer, nie 404/500).
export default defineEventHandler(async (event) => {
  const path = (event.path || '').split('?')[0]
  if (!path.startsWith('/api/')) return
  const method = (event.method || 'GET').toUpperCase()
  if (method === 'OPTIONS') return
  if (findPublicRule(path, method)) return                 // öffentliche Routen: keine Rolle
  const auth = event.context.auth
  if (!auth) return                                         // ohne Anmeldung entscheidet auth.ts (NUXT_AUTH_ENFORCE)

  const { need, rule } = needForRoute(path, method)
  if (need === 'self') return                               // jedes angemeldete Konto: keine Abfrage nötig

  const enforce = rolesEnforced()
  let me
  try { me = await resolveRole(auth) } catch (e: any) {
    console.error('[roles] Rolle nicht ermittelbar:', e?.message)
    if (enforce) throw e
    return
  }
  if (roleAllows(me.role, need)) return

  const tenant = createHash('sha256').update(me.tenantId).digest('hex').slice(0, 8)
  console.warn(`[roles] ${enforce ? 'abgelehnt' : 'würde ablehnen'} ${JSON.stringify({ method, path, required: need, role: me.role, tenant, rule })}`)
  if (!enforce) return
  throw createError({
    statusCode: 403,
    message: `Dafür brauchst du die Rolle ${ROLE_LABELS[need as Role]}. Du bist als ${ROLE_LABELS[me.role]} angemeldet.`,
    data: { code: 'ROLE_REQUIRED', requiredRole: need, yourRole: me.role },
  })
})
