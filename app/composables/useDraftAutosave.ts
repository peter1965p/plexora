import { DraftAutosaver, type DraftApi, type DraftCandidate, type DraftData, type DraftStatus } from '~/utils/draftAutosave'

interface Options {
  formType: string
  /** reaktives Formular-Objekt */
  form: Record<string, any>
  /** erlaubte Felder (Whitelist) */
  fields: readonly string[]
  /** optional: wie ein Entwurf ins Formular übernommen wird (Standard: Object.assign) */
  applyData?: (data: DraftData) => void
  debounceMs?: number
}

const hhmm = (ms: number) => new Date(ms).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

function safeStorage() {
  try { return typeof localStorage !== 'undefined' ? localStorage : null } catch { return null }
}

/**
 * Wiederverwendbarer Entwurfs-Autosave für Formulare.
 * Speichert 3 s nach der letzten Änderung, beim Verlassen der Seite und kurz vor Session-Ablauf
 * (Ereignis 'plx:session-expiring' aus useIdleTimer) auf dem Server; zusätzlich lokal als Netz.
 */
export function useDraftAutosave(opts: Options) {
  const status = ref<DraftStatus>('idle')
  const savedAt = ref<number | null>(null)
  const candidate = ref<DraftCandidate | null>(null)
  let saver: DraftAutosaver | null = null
  let cachedAuth: Record<string, string> = {}
  let listening = false

  async function authHeaders() {
    const { useAuthHeader } = await import('~/composables/useAuth')
    cachedAuth = await useAuthHeader()
    return cachedAuth
  }

  const api: DraftApi = {
    async get(type) {
      const res = await $fetch<{ draft: { data: DraftData; clientUpdatedAt: number } | null }>(
        useApiUrl(`/api/drafts/${type}`), { headers: await authHeaders() })
      return res.draft ? { data: res.draft.data, clientUpdatedAt: res.draft.clientUpdatedAt } : null
    },
    async put(type, body, o) {
      // Beim Verlassen der Seite ist kein async Token-Abruf mehr möglich: zuletzt bekannter Header, keepalive
      const headers = o?.keepalive ? cachedAuth : await authHeaders()
      const res = await fetch(useApiUrl(`/api/drafts/${type}`), {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive: !!o?.keepalive,
      })
      if (!res.ok) throw new Error(`Entwurf speichern fehlgeschlagen (${res.status})`)
    },
    async del(type) {
      await $fetch(useApiUrl(`/api/drafts/${type}`), { method: 'DELETE', headers: await authHeaders() })
    },
  }

  const onLeave = () => { void saver?.flush({ keepalive: true }) }
  const onHidden = () => { if (document.visibilityState === 'hidden') onLeave() }

  function listen(on: boolean) {
    if (typeof window === 'undefined' || on === listening) return
    listening = on
    const fn = on ? 'addEventListener' : 'removeEventListener'
    window[fn]('pagehide', onLeave)
    window[fn]('plx:session-expiring', onLeave)
    document[fn]('visibilitychange', onHidden)
  }

  /** Beim Öffnen eines NEUEN Formulars aufrufen (nicht beim Bearbeiten) */
  async function begin() {
    saver?.stop()
    const { useAuthUser } = await import('~/composables/useAuth')
    const user = await useAuthUser()
    saver = new DraftAutosaver({
      formType: opts.formType,
      fields: [...opts.fields],
      userKey: user.userId || 'anon',
      debounceMs: opts.debounceMs,
      getData: () => opts.form,
      applyData: opts.applyData ?? (d => Object.assign(opts.form, d)),
      api,
      storage: safeStorage(),
      onStatus: (s, at) => { status.value = s; savedAt.value = at },
    })
    listen(true)
    candidate.value = await saver.begin()
  }

  watch(() => opts.form, () => saver?.touch(), { deep: true })

  function restore() { saver?.restore(); candidate.value = saver?.candidate ?? null }
  async function discard() { await saver?.discard(); candidate.value = null }
  async function clear() { listen(false); await saver?.clear(); candidate.value = null }
  function stop() { listen(false); saver?.stop(); candidate.value = null; status.value = 'idle' }
  function flush() { return saver?.flush() }

  onBeforeUnmount(() => { listen(false); saver?.stop() })

  const statusText = computed(() => {
    if (status.value === 'saving') return 'Speichern…'
    if (status.value === 'offline') return 'Offline – lokal gesichert'
    if (status.value === 'saved' && savedAt.value) return `Entwurf gespeichert ${hhmm(savedAt.value)}`
    return ''
  })
  const candidateTime = computed(() => (candidate.value ? hhmm(candidate.value.at) : ''))

  return { status, statusText, savedAt, candidate, candidateTime, begin, restore, discard, clear, stop, flush }
}
