import { roleVisible, type Role, type RoleNeed } from '~~/shared/roles'

// Eigene Rolle im Mandanten (GET /api/team/role). Die Oberfläche blendet Menüpunkte und Seiten nur aus, wenn der Server die Rollenprüfung
// auch durchsetzt (enforced): im Beobachtungsmodus bleibt alles sichtbar. Maßgeblich ist immer der Server; das hier ist nur Komfort.
export function useRole() {
  const state = useState('plx-role', () => ({ role: '' as '' | Role, owner: null as string | null, enforced: false, loaded: false }))
  let pending: Promise<void> | null = null
  async function load(force = false) {
    if (state.value.loaded && !force) return
    if (pending) return pending
    pending = (async () => {
      try {
        const { useAuthHeader } = await import('~/composables/useAuth')
        const r: any = await $fetch(useApiUrl('/api/team/role'), { headers: await useAuthHeader() })
        state.value = { role: r.role, owner: r.owner ?? null, enforced: !!r.enforced, loaded: true }
      } catch { state.value = { ...state.value, loaded: false } }     // nicht angemeldet oder Server nicht erreichbar: nichts ausblenden
      finally { pending = null }
    })()
    return pending
  }
  const can = (need: RoleNeed) => roleVisible(state.value, need)
  return { state, load, can, role: computed(() => state.value.role), enforced: computed(() => state.value.enforced), owner: computed(() => state.value.owner) }
}
