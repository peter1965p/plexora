import { requireAuth } from '../../utils/verifyAuth'
import { resolveRole, rolesEnforced } from '../../utils/teamRole'
import { ROLE_LABELS } from '../../../shared/roles'

// Eigene Rolle im Mandanten (für Menü, Seitenschutz und die Seite "Kein Zugriff"). Mitglieder und Admins sehen den Inhaber ihres Teams; Inhaber und Betreiber nur ihre Rolle.
export default defineEventHandler(async (event) => {
  const me = await resolveRole(requireAuth(event))
  return { role: me.role, label: ROLE_LABELS[me.role], owner: me.role === 'member' || me.role === 'admin' ? me.tenantId : null, enforced: rolesEnforced() }
})
