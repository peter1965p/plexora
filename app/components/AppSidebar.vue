<template>
  <aside class="sidebar">
    <div class="sidebar-logo">
      <div class="logo-icon"><i class="ti ti-bolt"></i></div>
      <div class="logo-text">{{ brandFirst }}<span>{{ brandLast }}</span></div>
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
const { branding, loadBranding } = useBranding()
const brandFirst = computed(() => branding.value.brandName.slice(0, -1))
const brandLast  = computed(() => branding.value.brandName.slice(-1))
onMounted(() => loadBranding())

const route = useRoute()
const { data } = await useFetch(useApiUrl('/api/support'))
const openTickets = computed(() => {
  const tickets = (data.value as any)?.tickets || []
  return tickets.filter((t: any) => t.status === 'open' || t.status === 'in_progress').length
})

const navSections = [
  {
    label: 'Übersicht',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: 'ti-layout-dashboard', key: 'dashboard' },
      { to: '/analytics', label: 'Analytics',  icon: 'ti-chart-bar',        key: 'analytics' },
    ]
  },
  {
    label: 'Module',
    items: [
      { to: '/crm',      label: 'CRM',      icon: 'ti-users',         key: 'crm'      },
      { to: '/projects', label: 'Projekte', icon: 'ti-layout-kanban', key: 'projects' },
      { to: '/contracts', label: 'Verträge', icon: 'ti-file-text', key: 'contracts' },
      { to: '/finance',  label: 'Finanzen', icon: 'ti-receipt',       key: 'finance'  },
      { to: '/hr',       label: 'HR',       icon: 'ti-id-badge',      key: 'hr'       },
      { to: '/support',  label: 'Support',  icon: 'ti-headset',       key: 'support'  },
      { to: '/shop-admin',    label: 'Shop',        icon: 'ti-shopping-cart', key: 'shop'        },
      { to: '/pagebuilder',  label: 'Pagebuilder', icon: 'ti-layout-2',      key: 'pagebuilder' },
      { to: '/forms',        label: 'Formulare',   icon: 'ti-forms',         key: 'forms'       },
    ]
  },
  {
    label: 'System',
    items: [
      { to: '/themes', label: 'Themes', icon: 'ti-palette', key: 'themes' },
      { to: '/settings', label: 'Einstellungen', icon: 'ti-settings', key: 'settings' },
    ]
  }
]
</script>
