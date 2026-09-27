// Gemeinsamer, geteilter State für Branchen-Module — Store-Seite und Sidebar lesen
// und schreiben dieselben Refs, damit z.B. ein Install im Store sofort in der
// Sidebar auftaucht, ohne dass die Seite neu geladen werden muss.
export interface BranchModuleCatalogItem {
  key: string
  name: string
  icon: string
  price: number
  desc: string
  features: string[]
  builtin: boolean
  route?: string
  remoteEntryUrl?: string
}
export interface InstalledBranchModule { key: string; status: 'active' | 'disabled' }

export function useBranchModules() {
  const catalog   = useState<BranchModuleCatalogItem[]>('branch-module-catalog', () => [])
  const installed = useState<InstalledBranchModule[]>('branch-modules-installed', () => [])
  const loaded    = useState<boolean>('branch-modules-loaded', () => false)

  async function load(force = false) {
    if (loaded.value && !force) return
    try {
      const { useAuthUser, useAuthHeader } = await import('~/composables/useAuth')
      const u = await useAuthUser()
      const headers = await useAuthHeader()
      const catalogRes = await $fetch<{ modules: BranchModuleCatalogItem[] }>(useApiUrl('/api/store/branch-modules'), { headers })
      catalog.value = catalogRes.modules || []
      if (u.email) {
        const installedRes = await $fetch<{ branchModules: InstalledBranchModule[] }>(useApiUrl('/api/settings/branch-packages'), { headers })
        installed.value = installedRes.branchModules || []
      }
      loaded.value = true
    } catch { /* Sidebar/Store zeigen dann einfach nichts an — kein harter Fehler nötig */ }
  }

  return { catalog, installed, load }
}
