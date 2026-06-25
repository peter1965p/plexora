import { signOut } from 'aws-amplify/auth'

const WARNING_THRESHOLD = 60 // Sekunden, ab denen Badge+Modal warnen
const ACTIVITY_THROTTLE_MS = 1000

export function useIdleTimer() {
  const enabled = ref(true)
  const timeoutSeconds = ref(5 * 60)
  const remainingSeconds = ref(5 * 60)

  const showWarning = computed(() =>
    enabled.value && remainingSeconds.value <= WARNING_THRESHOLD && remainingSeconds.value > 0
  )

  let interval: ReturnType<typeof setInterval> | null = null
  let lastActivity = 0

  const sessionUrl = useApiUrl('/api/settings/session')

  function reset() {
    remainingSeconds.value = timeoutSeconds.value
  }

  function tick() {
    if (!enabled.value) return
    if (remainingSeconds.value > 0) remainingSeconds.value--
    if (remainingSeconds.value === 0) doLogout()
  }

  async function doLogout() {
    if (interval) clearInterval(interval)
    let isRealUser = false
    try { await signOut(); isRealUser = true } catch {}
    if (typeof window !== 'undefined') {
      window.location.href = isRealUser ? '/login?reason=idle' : '/'
    }
  }

  function handleActivity() {
    if (!enabled.value) return
    const now = Date.now()
    if (now - lastActivity < ACTIVITY_THROTTLE_MS) return
    lastActivity = now
    reset()
  }

  function stayLoggedIn() {
    reset()
  }

  function formatTime(s: number): string {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']

  onMounted(async () => {
    try {
      const res = await $fetch<{ session: { timeoutMinutes: number } }>(sessionUrl)
      const mins = res?.session?.timeoutMinutes ?? 5
      if (mins <= 0) { enabled.value = false; return }
      timeoutSeconds.value = mins * 60
    } catch {
      timeoutSeconds.value = 5 * 60
    }
    reset()
    interval = setInterval(tick, 1000)
    for (const name of events) window.addEventListener(name, handleActivity)
  })

  onUnmounted(() => {
    if (interval) clearInterval(interval)
    for (const name of events) window.removeEventListener(name, handleActivity)
  })

  return { enabled, remainingSeconds, showWarning, stayLoggedIn, formatTime }
}
