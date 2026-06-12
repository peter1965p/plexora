<template>
  <div class="portal-wrap">
    <header class="portal-header">
      <div class="portal-logo">
        <span class="logo-text">{{ brandFirst }}<span class="logo-accent">{{ brandLast }}</span></span>
        <span class="portal-badge">{{ branding.portalTitle }}</span>
      </div>
      <div class="portal-user">
        <span class="portal-email">{{ email }}</span>
        <button class="icon-btn" title="Abmelden" @click="logout">
          <i class="ti ti-logout"></i>
        </button>
      </div>
    </header>
    <nav class="portal-nav">
      <NuxtLink to="/portal" class="portal-nav-item" :class="{ active: route.path === '/portal' }">
        <i class="ti ti-home"></i> Übersicht
      </NuxtLink>
      <NuxtLink to="/portal/invoices" class="portal-nav-item" :class="{ active: route.path.includes('invoices') }">
        <i class="ti ti-receipt"></i> Rechnungen
      </NuxtLink>
      <NuxtLink to="/portal/orders" class="portal-nav-item" :class="{ active: route.path.includes('orders') }">
        <i class="ti ti-shopping-cart"></i> Bestellungen
      </NuxtLink>
      <NuxtLink to="/portal/documents" class="portal-nav-item" :class="{ active: route.path.includes('documents') }">
        <i class="ti ti-file"></i> Dokumente
      </NuxtLink>
    </nav>
    <main class="portal-main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { signOut } from 'aws-amplify/auth'

const route   = useRoute()
const email   = ref('')
const { branding, loadBranding } = useBranding()

// Split brandName in zwei Teile für Styling: "Plexora" → "Plexor" + "a"
const brandFirst = computed(() => branding.value.brandName.slice(0, -1))
const brandLast  = computed(() => branding.value.brandName.slice(-1))

onMounted(async () => {
  await loadBranding()
  const { useAuthUser } = await import('~/composables/useAuth')
  const u = await useAuthUser()
  email.value = u.email
})

async function logout() {
  await signOut()
  navigateTo('/login')
}
</script>
