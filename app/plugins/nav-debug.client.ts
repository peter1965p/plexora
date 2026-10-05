// Temporäre Diagnose für unerwartete Weiterleitungen (z. B. F5 im Dashboard -> Startseite).
// Nur aktiv, wenn einmal /…?plxdebug=1 aufgerufen wurde (ausschalten: ?plxdebug=0).
export default defineNuxtPlugin((nuxtApp) => {
  const KEY = 'plx_navlog'
  try {
    const q = new URLSearchParams(window.location.search).get('plxdebug')
    if (q === '1') localStorage.setItem('plx_debug', '1')
    if (q === '0') { localStorage.removeItem('plx_debug'); localStorage.removeItem(KEY) }
    if (localStorage.getItem('plx_debug') !== '1') return
  } catch { return }

  const read = (): any[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
  const record = (type: string, detail = '', withStack = false) => {
    const log = read()
    log.push({
      t: new Date().toISOString().slice(11, 23),
      type, url: location.pathname + location.search.slice(0, 40), detail,
      stack: withStack ? String(new Error().stack || '').split('\n').slice(2, 6).map(s => s.trim().replace(/https?:\/\/[^/]+/, '')).join(' | ') : '',
    })
    try { localStorage.setItem(KEY, JSON.stringify(log.slice(-40))) } catch {}
  }
  ;(window as any).__plxLog = record

  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  record('boot', `load=${nav?.type || '?'} ref=${(document.referrer || '').replace(/https?:\/\/[^/]+/, '') || '-'}`)

  const origPush = history.pushState.bind(history)
  const origReplace = history.replaceState.bind(history)
  history.pushState = (...a: any[]) => { record('pushState', String(a[2] ?? ''), true); return (origPush as any)(...a) }
  history.replaceState = (...a: any[]) => { record('replaceState', String(a[2] ?? ''), true); return (origReplace as any)(...a) }
  window.addEventListener('pagehide', () => record('pagehide', 'Seite wird verlassen/neu geladen'))

  const router = useRouter()
  router.beforeEach((to, from) => { record('route', `${from.fullPath.slice(0, 30)} -> ${to.fullPath.slice(0, 30)}`) })

  // Verursacher: jeder Aufruf von router.push/replace mit vollem Aufrufort (Dateiname:Zeile)
  const callerStack = () => String(new Error().stack || '').split('\n').slice(3, 12)
    .map(l => l.trim().replace(/https?:\/\/[^/]+\/_nuxt\//, '').replace(/^at /, '')).join(' | ')
  for (const fn of ['push', 'replace'] as const) {
    const orig = (router as any)[fn].bind(router)
    ;(router as any)[fn] = (...a: any[]) => {
      const target = typeof a[0] === 'string' ? a[0] : JSON.stringify(a[0])
      record(`CALL router.${fn}`, String(target).slice(0, 60))
      const log = read(); if (log.length) { log[log.length - 1].stack = callerStack(); try { localStorage.setItem(KEY, JSON.stringify(log)) } catch {} }
      return orig(...a)
    }
  }

  // Tastendruck und Seite verlassen
  window.addEventListener('keydown', (e) => { if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r')) record('KEY', e.key) }, true)
  window.addEventListener('beforeunload', () => record('beforeunload', ''))
  document.addEventListener('visibilitychange', () => record('visibility', document.visibilityState))

  // Anzeige: Kasten mit dem Protokoll, sobald die Seite geladen ist
  nuxtApp.hook('app:mounted', () => {
    const box = document.createElement('div')
    box.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:2147483647;max-width:min(760px,96vw);max-height:60vh;overflow:auto;background:#111;color:#9f9;font:11px/1.4 monospace;padding:8px;border:1px solid #9f9;border-radius:6px;white-space:pre-wrap'
    const render = () => {
      box.textContent = 'NAV-DEBUG (schliessen: Klick)\n' + read().slice(-25).map(e => `${e.t} ${e.type} ${e.url} ${e.detail}${e.stack ? '\n    ' + e.stack : ''}`).join('\n')
    }
    render()
    box.addEventListener('click', () => box.remove())
    document.body.appendChild(box)
    setInterval(render, 2000)
  })
})
