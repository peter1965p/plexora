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

const { data } = await useFetch(useApiUrl('/api/support'))
const openTickets = computed(() => {
  const tickets = (data.value as any)?.tickets || []
  return tickets.filter((tk: any) => tk.status === 'open' || tk.status === 'in_progress').length
})

const moduleRoutes: Record<string, string> = {
  crm: '/crm', projects: '/projects', contracts: '/contracts', finance: '/finance',
  hr: '/hr', support: '/support', analytics: '/analytics', shop: '/shop-admin',
  forms: '/forms', marketing: '/marketing', nexora: '/website',
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
    items: store.modules
      .filter(m => m.on && !m.locked && moduleRoutes[m.key] && m.key !== 'analytics')
      .map(m => ({
        to: moduleRoutes[m.key],
        label: t.value.moduleNames[m.key] || m.name,
        icon: m.icon,
        key: m.key,
      }))
  },
  {
    label: t.value.navSystem,
    items: [
      { to: '/settings', label: t.value.settings, icon: 'ti-settings', key: 'settings' },
      { to: '/seo', label: 'SEO / GEO', icon: 'ti-chart-line', key: 'seo' },
      { to: '/store', label: 'Modul-Store', icon: 'ti-building-store', key: 'store' },
    ]
  }
])
</script>
