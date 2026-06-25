<template>
  <header class="topbar">
    <div class="topbar-title">{{ title }}</div>
    <div class="topbar-actions">
      <AppIdleTimer />
      <button class="icon-btn" title="Suche"><i class="ti ti-search"></i></button>
      <div style="position:relative">
        <button class="icon-btn" style="position:relative" title="Benachrichtigungen" @click="showNotifications=!showNotifications">
          <i class="ti ti-bell"></i>
          <span v-if="unreadCount > 0" style="position:absolute;top:4px;right:4px;min-width:16px;height:16px;background:#E05C5C;border-radius:50%;border:1.5px solid var(--bg-surface);font-size:10px;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center;padding:0 3px">
            {{ unreadCount }}
          </span>
        </button>

        <!-- Notifications Dropdown -->
        <div v-if="showNotifications" style="position:absolute;top:44px;right:0;width:360px;background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.4);z-index:999;overflow:hidden">
          <div style="padding:14px 16px;border-bottom:0.5px solid var(--border);display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:700;font-size:14px">Benachrichtigungen</span>
            <button v-if="notifications.length" class="icon-btn" style="font-size:11px;padding:2px 8px;height:auto" @click="markAllRead">Alle gelesen</button>
          </div>
          <div style="max-height:380px;overflow-y:auto">
            <div v-if="!notifications.length" style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">
              <i class="ti ti-bell-off" style="font-size:24px;display:block;margin-bottom:8px"></i>
              Keine neuen Benachrichtigungen
            </div>
            <div v-for="n in notifications" :key="n.notificationId"
              style="padding:14px 16px;border-bottom:0.5px solid var(--border);cursor:pointer;transition:background .1s"
              :style="n.type === 'inkasso_warning' ? 'border-left:3px solid #E05C5C' : 'border-left:3px solid var(--accent)'"
              @click="markRead(n)">
              <div style="font-size:13px;font-weight:600;margin-bottom:4px">{{ n.title }}</div>
              <div style="font-size:12px;color:var(--text-muted);line-height:1.4">{{ n.message }}</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:6px">{{ new Date(n.created).toLocaleString('de-DE') }}</div>
            </div>
          </div>
        </div>
      </div>
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
      <div style="position:relative" ref="quickRef">
        <button class="accent-btn" @click="showQuick = !showQuick">
          <i class="ti ti-plus"></i> Neu
        </button>
        <div v-if="showQuick" style="position:absolute;top:44px;right:0;width:220px;background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.4);z-index:999;overflow:hidden;padding:6px">
          <div style="padding:8px 12px 4px;font-size:10px;font-weight:700;color:var(--text-muted);letter-spacing:0.08em">SCHNELL ERSTELLEN</div>
          <div v-for="item in quickItems" :key="item.label"
            @click="quickNav(item)"
            style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;cursor:pointer;transition:background .1s;font-size:13px"
            onmouseover="this.style.background='var(--bg-hover)'"
            onmouseout="this.style.background='transparent'">
            <i class="ti" :class="item.icon" style="font-size:16px;color:var(--accent);width:18px;text-align:center"></i>
            <span>{{ item.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { signOut, getCurrentUser } from 'aws-amplify/auth'

const route  = useRoute()
const router = useRouter()

const titles: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/crm':        'CRM',
  '/projects':   'Projekte',
  '/lead':        'Lead-Landingpage',
  '/finance':    'Finanzen',
  '/contracts':  'Verträge',
  '/hr':         'HR',
  '/support':    'Support',
  '/marketing':   'Marketing',
  '/shop-admin':  'Shop',
  '/pagebuilder': 'Pagebuilder',
  '/forms':       'Formulare',
  '/analytics':   'Analytics',
  '/settings':    'Einstellungen',
}
const title = computed(() => titles[route.path] || 'Plexora')

const showMenu   = ref(false)
const showQuick  = ref(false)
const quickRef   = ref<HTMLElement | null>(null)
const displayName = ref('User')
const initials   = ref('U')

const quickItems = [
  { label: 'Neuer Kontakt',   icon: 'ti-user-plus',      path: '/crm',       query: 'new=contact' },
  { label: 'Neuer Deal',      icon: 'ti-briefcase',      path: '/crm',       query: 'new=deal'    },
  { label: 'Neue Rechnung',   icon: 'ti-receipt',        path: '/finance',   query: 'new=1'       },
  { label: 'Neues Projekt',   icon: 'ti-layout-kanban',  path: '/projects',  query: 'new=1'       },
  { label: 'Neues Ticket',    icon: 'ti-headset',        path: '/support',   query: 'new=1'       },
  { label: 'Neuer Mitarbeiter', icon: 'ti-id-badge',     path: '/hr',        query: 'new=1'       },
  { label: 'Neue Kampagne',   icon: 'ti-speakerphone',   path: '/marketing', query: 'new=1'       },
]

function quickNav(item: typeof quickItems[0]) {
  showQuick.value = false
  router.push(`${item.path}?${item.query}`)
}

onMounted(async () => {
  try {
    const user = await getCurrentUser()
    const email = user.signInDetails?.loginId || user.username || ''
    displayName.value = email.split('@')[0] || 'User'
    initials.value = displayName.value.slice(0,2).toUpperCase()
  } catch {}

  document.addEventListener('click', (e) => {
    if (!(e.target as Element).closest('.topbar-user')) showMenu.value = false
    if (quickRef.value && !(e.target as Element).closest(quickRef.value as any)) showQuick.value = false
  })
})

async function logout() {
  try {
    await signOut()
    router.push('/login')
  } catch {
    router.push('/')
  }
}

// ── Notifications ─────────────────────────────────────────────────────────────
const showNotifications = ref(false)
const notifications     = ref<any[]>([])
const userId            = ref('demo-user')

const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)

async function loadNotifications() {
  try {
    const { useAuthUser } = await import('~/composables/useAuth')
    const u = await useAuthUser()
    userId.value = u.userId
    const res = await $fetch(useApiUrl(`/api/notifications?userId=${u.userId}`)) as any
    notifications.value = res.notifications || []
  } catch {}
}

async function markRead(n: any) {
  try {
    await $fetch(useApiUrl(`/api/notifications/${n.notificationId}`), {
      method: 'PATCH',
      body: { userId: userId.value }
    })
    notifications.value = notifications.value.filter(x => x.notificationId !== n.notificationId)
    if (n.invoiceId) navigateTo('/finance')
  } catch {}
  showNotifications.value = false
}

async function markAllRead() {
  for (const n of notifications.value) {
    try {
      await $fetch(useApiUrl(`/api/notifications/${n.notificationId}`), {
        method: 'PATCH',
        body: { userId: userId.value }
      })
    } catch {}
  }
  notifications.value = []
  showNotifications.value = false
}

// Alle 60 Sekunden neu laden
onMounted(() => {
  loadNotifications()
  setInterval(loadNotifications, 60000)
})

// Klick außerhalb schließt Dropdown
onMounted(() => {
  document.addEventListener('click', (e) => {
    if (!(e.target as Element).closest('.ti-bell') && !(e.target as Element).closest('[title="Benachrichtigungen"]')) {
      showNotifications.value = false
    }
  })
})
</script>