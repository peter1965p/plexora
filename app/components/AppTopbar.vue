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
            <span v-if="notifications.length" style="display:flex;gap:6px">
              <button class="icon-btn" style="font-size:11px;padding:2px 8px;height:auto" @click="markAllRead">Alle gelesen</button>
              <button class="icon-btn" style="font-size:11px;padding:2px 8px;height:auto;color:#E05C5C" @click="deleteAll">Alle löschen</button>
            </span>
          </div>
          <div style="max-height:380px;overflow-y:auto">
            <div v-if="!notifications.length" style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">
              <i class="ti ti-bell-off" style="font-size:24px;display:block;margin-bottom:8px"></i>
              Keine neuen Benachrichtigungen
            </div>
            <div v-for="n in notifications" :key="n.notificationId"
              style="padding:14px 16px;border-bottom:0.5px solid var(--border);cursor:pointer;transition:background .1s"
              :style="[notifyStyle(n), n.read ? 'opacity:.55' : '']"
              @click="markRead(n)">
              <div style="font-size:13px;font-weight:600;margin-bottom:4px;display:flex;align-items:center;gap:6px">
                <i class="ti" :class="notifyIcon(n)" :style="{ color: notifyColor(n) }"></i>
                <span style="flex:1">{{ n.title }}</span>
                <button class="icon-btn" title="Löschen" style="width:24px;height:24px;flex-shrink:0" @click.stop="deleteNotification(n)"><i class="ti ti-trash" style="font-size:13px"></i></button>
              </div>
              <div style="font-size:12px;color:var(--text-muted);line-height:1.4">{{ n.message }}</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:6px">{{ new Date(n.created).toLocaleString('de-DE') }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="topbar-user" @click="showMenu=!showMenu" ref="menuRef">
        <img v-if="avatarUrl" :src="avatarUrl" class="avatar" style="width:28px;height:28px;object-fit:cover" referrerpolicy="no-referrer" @error="avatarUrl = ''" />
        <div v-else class="avatar" style="width:28px;height:28px;font-size:11px">{{ initials }}</div>
        <span class="topbar-username">{{ displayName }}</span>
        <i class="ti ti-chevron-down" style="font-size:13px;color:var(--text-muted)"></i>
        <div v-if="showMenu" class="topbar-menu">
          <div class="topbar-menu-item" @click="navigateTo('/profile')">
            <i class="ti ti-user-circle"></i> Profil
          </div>
          <div class="topbar-menu-item" @click="navigateTo('/settings')">
            <i class="ti ti-settings"></i> {{ t.menuSettings }}
          </div>
          <div class="topbar-menu-divider"></div>
          <div class="topbar-menu-item danger" @click="logout">
            <i class="ti ti-logout"></i> {{ t.menuLogout }}
          </div>
        </div>
      </div>
      <div style="position:relative" ref="quickRef">
        <button class="accent-btn" @click="showQuick = !showQuick">
          <i class="ti ti-plus"></i> Neu
        </button>
        <div v-if="showQuick" style="position:absolute;top:44px;right:0;width:220px;background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.4);z-index:999;overflow:hidden;padding:6px">
          <div style="padding:8px 12px 4px;font-size:10px;font-weight:700;color:var(--text-muted);letter-spacing:0.08em">{{ lang === 'en' ? 'QUICK CREATE' : 'SCHNELL ERSTELLEN' }}</div>
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

    <!-- Splash: Erinnerung an einen anstehenden Termin -->
    <Teleport to="body">
      <div v-if="splashQueue.length" class="termin-splash-overlay" @click.self="dismissSplash">
        <div class="termin-splash-card">
          <div class="termin-splash-icon"><i class="ti ti-calendar-event"></i></div>
          <div class="termin-splash-kicker">{{ splashQueue[0].title }}</div>
          <div class="termin-splash-message">{{ splashQueue[0].message }}</div>
          <button class="accent-btn" style="margin-top:20px;width:100%;justify-content:center" @click="dismissSplash">Verstanden</button>
        </div>
      </div>
    </Teleport>
  </header>
</template>

<script setup lang="ts">
import { signOut, getCurrentUser } from 'aws-amplify/auth'

const route  = useRoute()
const router = useRouter()
const { t, lang } = useLang()

const title = computed(() => t.value.pageTitles[route.path] || 'Plexora')

const showMenu   = ref(false)
const showQuick  = ref(false)
const quickRef   = ref<HTMLElement | null>(null)
const displayName = ref('User')
const initials   = ref('U')
const avatarUrl  = ref('')

const quickItems = computed(() => t.value.quick)

function quickNav(item: typeof quickItems.value[0]) {
  showQuick.value = false
  router.push(`${item.path}?${item.query}`)
}

onMounted(async () => {
  try {
    await getCurrentUser()
    // Bei Google-Login weicht user.signInDetails/username vom Cognito-Alias ab
    // (rohe Verknüpfungs-ID statt E-Mail) — der 'email'-Claim im ID-Token stimmt
    // dagegen unabhängig vom Login-Weg immer.
    const { fetchAuthSession } = await import('aws-amplify/auth')
    const session = await fetchAuthSession()
    const email = (session.tokens?.idToken?.payload?.email as string) || ''
    displayName.value = email.split('@')[0] || 'User'
    initials.value = displayName.value.slice(0,2).toUpperCase()

    // Avatar-Priorität: eigener Upload (Profil-Seite) > Google-Profilbild (Cognito
    // 'picture'-Attribut) > Initialen als Fallback bei Passwort-Login.
    const picture = session.tokens?.idToken?.payload?.picture as string | undefined
    if (picture) avatarUrl.value = picture

    const { useAuthHeader } = await import('~/composables/useAuth')
    const profile = await $fetch(useApiUrl('/api/settings/account'), { headers: await useAuthHeader() }) as any
    if (profile?.profile?.avatarUrl) avatarUrl.value = profile.profile.avatarUrl
  } catch {}

  document.addEventListener('click', (e) => {
    if (!(e.target as Element).closest('.topbar-user')) showMenu.value = false
    if (quickRef.value && !quickRef.value.contains(e.target as Node)) showQuick.value = false
  })
})

async function logout() {
  try { await signOut() } catch {}
  await router.push('/login')
  router.go(0)
}

// ── Notifications ─────────────────────────────────────────────────────────────
const showNotifications = ref(false)
const notifications     = ref<any[]>([])
const userId            = ref('demo-user')

const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)

async function loadNotifications() {
  try {
    const { useAuthUser, useAuthHeader } = await import('~/composables/useAuth')
    const u = await useAuthUser()
    userId.value = u.userId
    const res = await $fetch(useApiUrl(`/api/notifications?userId=${u.userId}`), { headers: await useAuthHeader() }) as any
    notifications.value = res.notifications || []
    // Neue, ungelesene Terminerinnerungen einmal pro Sitzung als Splash anzeigen
    for (const n of notifications.value) {
      if (n.type === 'termin_reminder' && !n.read && !shownSplashIds.has(n.notificationId)) {
        shownSplashIds.add(n.notificationId)
        splashQueue.value.push(n)
      }
    }
  } catch {}
}

const splashQueue    = ref<any[]>([])
const shownSplashIds = new Set<string>()

function notifyColor(n: any) {
  if (n.level === 'error' || n.type === 'inkasso_warning') return '#E05C5C'
  if (n.level === 'warning') return '#E0A030'
  return 'var(--accent)'
}
function notifyStyle(n: any) {
  return `border-left:3px solid ${notifyColor(n)}`
}
function notifyIcon(n: any) {
  if (n.type === 'mail_failed') return 'ti-mail-x'
  if (n.type === 'google_auth_failed') return 'ti-plug-off'
  if (n.type === 'termin_booked') return 'ti-calendar-plus'
  if (n.type === 'termin_reminder') return 'ti-calendar-event'
  if (n.type === 'inkasso_warning') return 'ti-alert-triangle'
  return 'ti-bell'
}

async function dismissSplash() {
  const n = splashQueue.value.shift()
  if (!n) return
  // Nur als gelesen markieren, nicht zur Zielseite navigieren
  try {
    await $fetch(useApiUrl(`/api/notifications/${n.notificationId}`), { method: 'PATCH', headers: await authHeaders() })
    n.read = true
  } catch {}
}

async function authHeaders() {
  const { useAuthHeader } = await import('~/composables/useAuth')
  return await useAuthHeader()
}

async function markRead(n: any) {
  try {
    await $fetch(useApiUrl(`/api/notifications/${n.notificationId}`), { method: 'PATCH', headers: await authHeaders() })
    n.read = true
    if (n.invoiceId) navigateTo('/finance')
    else if (n.link) navigateTo(n.link)
  } catch {}
  showNotifications.value = false
}

async function markAllRead() {
  const headers = await authHeaders()
  for (const n of notifications.value) {
    try {
      await $fetch(useApiUrl(`/api/notifications/${n.notificationId}`), { method: 'PATCH', headers })
      n.read = true
    } catch {}
  }
}

async function deleteNotification(n: any) {
  try {
    await $fetch(useApiUrl(`/api/notifications/${n.notificationId}`), { method: 'DELETE', headers: await authHeaders() })
    notifications.value = notifications.value.filter(x => x.notificationId !== n.notificationId)
  } catch {}
}

async function deleteAll() {
  const headers = await authHeaders()
  for (const n of [...notifications.value]) {
    try {
      await $fetch(useApiUrl(`/api/notifications/${n.notificationId}`), { method: 'DELETE', headers })
      notifications.value = notifications.value.filter(x => x.notificationId !== n.notificationId)
    } catch {}
  }
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
<style scoped>
.termin-splash-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 12, 20, 0.45);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 16px;
}
.termin-splash-card {
  width: 100%;
  max-width: 360px;
  background: var(--bg-elevated);
  border: 0.5px solid var(--border);
  border-radius: 18px;
  box-shadow: 0 30px 60px -10px rgba(0, 0, 0, 0.5);
  padding: 28px 24px 24px;
  text-align: center;
  animation: termin-splash-in .25s ease-out;
}
.termin-splash-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 14px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
}
.termin-splash-kicker {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--accent);
  margin-bottom: 6px;
}
.termin-splash-message {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
}
@keyframes termin-splash-in {
  from { opacity: 0; transform: translateY(12px) scale(0.97); }
  to   { opacity: 1; transform: none; }
}
</style>
