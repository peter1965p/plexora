<template>
  <header class="topbar">
    <div class="topbar-title">{{ title }}</div>
    <div class="topbar-actions">
      <AppIdleTimer />
      <button class="icon-btn" title="Suche"><i class="ti ti-search"></i></button>
      <button class="icon-btn" style="position:relative" title="Benachrichtigungen">
        <i class="ti ti-bell"></i>
        <span style="position:absolute;top:6px;right:6px;width:7px;height:7px;background:var(--accent);border-radius:50%;border:1.5px solid var(--bg-surface)"></span>
      </button>
      <div class="topbar-user" @click="showMenu=!showMenu" ref="menuRef">
        <div class="avatar" style="width:28px;height:28px;font-size:11px">{{ initials }}</div>
        <span class="topbar-username">{{ displayName }}</span>
        <i class="ti ti-chevron-down" style="font-size:13px;color:var(--text-muted)"></i>
        <div v-if="showMenu" class="topbar-menu">
          <div class="topbar-menu-item" @click="navigateTo('/settings')">
            <i class="ti ti-settings"></i> Einstellungen
          </div>
          <div class="topbar-menu-divider"></div>
          <div class="topbar-menu-item danger" @click="logout">
            <i class="ti ti-logout"></i> Abmelden
          </div>
        </div>
      </div>
      <button class="accent-btn">
        <i class="ti ti-plus"></i> Neu
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { signOut, getCurrentUser } from 'aws-amplify/auth'

const route  = useRoute()
const router = useRouter()

const titles: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/analytics':  'Analytics',
  '/crm':        'CRM',
  '/projects':   'Projekte',
  '/finance':    'Finanzen',
  '/contracts':  'Verträge',
  '/projects':   'Projekte',
  '/hr':         'HR',
  '/support':    'Support',
  '/settings':   'Einstellungen',
}
const title = computed(() => titles[route.path] || 'Plexora')

const showMenu   = ref(false)
const displayName = ref('User')
const initials   = ref('U')

onMounted(async () => {
  try {
    const user = await getCurrentUser()
    const email = user.signInDetails?.loginId || user.username || ''
    displayName.value = email.split('@')[0] || 'User'
    initials.value = displayName.value.slice(0,2).toUpperCase()
  } catch {}

  document.addEventListener('click', (e) => {
    if (!(e.target as Element).closest('.topbar-user')) {
      showMenu.value = false
    }
  })
})

async function logout() {
  await signOut()
  router.push('/login')
}
</script>
