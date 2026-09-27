<template>
  <aside class="sidebar">
    <div class="sidebar-logo">
      <template v-if="branding.logoUrl">
        <img :src="branding.logoUrl" style="height:32px;max-width:120px;object-fit:contain" alt="Logo" />
      </template>
      <template v-else>
        <div class="logo-icon"><i class="ti ti-bolt"></i></div>
        <div class="logo-text">{{ brandFirst }}<span>{{ brandLast }}</span></div>
      </template>
    </div>
    <nav class="sidebar-nav">
      <template v-for="section in navSections" :key="section.label">
        <div class="nav-section-label">{{ section.label }}</div>
        <NuxtLink
          v-for="item in section.items"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="{ active: route.path === item.to }"
        >
          <i class="ti" :class="item.icon"></i>
          {{ item.label }}
          <span v-if="item.key === 'support' && openTickets > 0" class="nav-badge">{{ openTickets }}</span>
        </NuxtLink>
      </template>
    </nav>
  </aside>
</template>

<script setup lang="ts">
const store = useAppStore()
onMounted(() => store.loadModules())
const { branding, loadBranding } = useBranding()
const brandFirst = computed(() => branding.value.brandName.slice(0, -2))
const brandLast  = computed(() => branding.value.brandName.slice(-2))
onMounted(() => loadBranding())

const route = useRoute()
const { t } = useLang()

const openTickets = ref(0)
// Aktive Branchen-Module dieses Tenants (nur status:'active', nicht deaktivierte)
const activeBranchKeys = ref<string[]>([])
// Katalog aller Branchen-Module aus der Registry — kein hartcodiertes Mapping mehr,
// ein neues Modul in der Registry taucht hier automatisch auf.
const branchRegistry = ref<Record<string, { name: string; icon: string; route: string }>>({})

// Registry-Icon-Namen (Lucide, wie im Store) auf die im Sidebar genutzten Tabler-Klassen
// abbilden, damit das bestehende Nav-Markup unverändert bleibt.
const LUCIDE_TO_TABLER: Record<string, string> = {
  Car: 'ti-car', Store: 'ti-shopping-bag', UtensilsCrossed: 'ti-tools-kitchen-2',
  Hammer: 'ti-hammer', Home: 'ti-building-estate', Stethoscope: 'ti-stethoscope',
  Scissors: 'ti-scissors',
}

onMounted(async () => {
  const { useAuthHeader } = await import('~/composables/useAuth')
  const res = await $fetch<any>(useApiUrl('/api/support'), { headers: await useAuthHeader() }).catch(() => null)
  const tickets = res?.tickets || []
  openTickets.value = tickets.filter((tk: any) => tk.status === 'open' || tk.status === 'in_progress').length
})

onMounted(async () => {
  try {
    const { useAuthUser, useAuthHeader } = await import('~/composables/useAuth')
    const u = await useAuthUser()
    if (!u.email) return
    const headers = await useAuthHeader()
    const [installedRes, catalogRes] = await Promise.all([
      $fetch<{ branchModules: { key: string; status: string }[] }>(useApiUrl('/api/settings/branch-packages'), { headers }),
      $fetch<{ modules: any[] }>(useApiUrl('/api/store/branch-modules'), { headers }),
    ])
    branchRegistry.value = Object.fromEntries(
      (catalogRes.modules || []).map((m: any) => [m.key, {
        name: m.name,
        icon: m.icon,
        // Eingebaute Module haben eine feste Route; Zero-Deploy-Plugins laufen
        // über den generischen Lader unter /plugins/<key>.
        route: m.builtin ? m.route : `/plugins/${m.key}`,
      }])
    )
    activeBranchKeys.value = (installedRes.branchModules || [])
      .filter(m => m.status === 'active')
      .map(m => m.key)
  } catch {}
})

const moduleRoutes: Record<string, string> = {
  crm: '/crm', projects: '/projects', contracts: '/contracts', finance: '/finance',
  hr: '/hr', support: '/support', analytics: '/analytics', shop: '/shop-admin',
  forms: '/forms', marketing: '/marketing', termine: '/termine', newsletter: '/newsletter',
}

const navSections = computed(() => [
  {
    label: t.value.navOverview,
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: 'ti-layout-dashboard', key: 'dashboard' },
      { to: '/analytics', label: 'Analytics',  icon: 'ti-chart-bar',        key: 'analytics' },
    ]
  },
  {
    label: t.value.navModules,
    items: [
      ...store.modules
        .filter(m => m.on && !m.locked && moduleRoutes[m.key] && m.key !== 'analytics')
        .map(m => ({
          to: moduleRoutes[m.key],
          label: t.value.moduleNames[m.key] || m.name,
          icon: m.icon,
          key: m.key,
        })),
      ...((store.licenseModules ? store.licenseModules.includes('nexora') : !!store.modules.find(m => m.key === 'nexora')?.on)
        ? [{ to: '/blog', label: 'Blog', icon: 'ti-news', key: 'blog' }]
        : []),
    ]
  },
  ...(activeBranchKeys.value.length ? [{
    label: 'BRANCHE',
    items: activeBranchKeys.value
      .filter(key => branchRegistry.value[key] && branchRegistry.value[key].route)
      .map(key => {
        const mod = branchRegistry.value[key]
        return { to: mod.route, label: mod.name, icon: LUCIDE_TO_TABLER[mod.icon] || 'ti-puzzle', key }
      }),
  }] : []),
  {
    label: t.value.navSystem,
    items: [
      { to: '/settings', label: t.value.settings,  icon: 'ti-settings',       key: 'settings' },
      { to: '/seo',      label: 'SEO / GEO',        icon: 'ti-chart-line',     key: 'seo'      },
      { to: '/store',    label: 'Modul-Store',       icon: 'ti-building-store', key: 'store'    },
      { to: '/rechnungs-design', label: 'Rechnungs-Design', icon: 'ti-file-invoice', key: 'invoiceDesign' },
      ...((store.licenseModules ? store.licenseModules.includes('nexora') : !!store.modules.find(m => m.key === 'nexora')?.on)
        ? [{ to: '/website', label: 'Website', icon: 'ti-world', key: 'nexora' }]
        : []),
    ]
  }
])
</script>
