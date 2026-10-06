// Cloudflare Turnstile im Browser (framework-frei, damit auch die frei gestalteten Kampagnen-Templates es nutzen können).
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let scriptPromise: Promise<any> | null = null

export function loadTurnstile(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('nur im Browser'))
  if ((window as any).turnstile) return Promise.resolve((window as any).turnstile)
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = SCRIPT_URL; s.async = true; s.defer = true
      s.onload = () => resolve((window as any).turnstile)
      s.onerror = () => { scriptPromise = null; reject(new Error('Turnstile-Skript konnte nicht geladen werden')) }
      document.head.appendChild(s)
    })
  }
  return scriptPromise
}

export interface TurnstileHandle { reset(): void; remove(): void }
export interface TurnstileConfig { siteKey: string; mode?: string; theme?: 'light' | 'dark' | 'auto' }

// Hell/Dunkel passend zum Hintergrund der Seite wählen (nicht nach dem Betriebssystem):
// erster nicht-transparenter Hintergrund nach oben, Helligkeit nach Standard-Formel. Ohne Fund: dunkel nur, wenn das System es verlangt.
function detectTheme(el: HTMLElement): 'light' | 'dark' {
  for (let n: HTMLElement | null = el; n; n = n.parentElement) {
    const m = getComputedStyle(n).backgroundColor.match(/rgba?\(([^)]+)\)/)
    if (!m) continue
    const [r, g, b, a = '1'] = m[1].split(',').map(v => parseFloat(v))
    if (Number(a) < 0.5) continue
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5 ? 'dark' : 'light'
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// Zeigt das Widget in `el`. `onToken('')` meldet, dass das Token abgelaufen/ungültig ist.
export async function mountTurnstile(el: HTMLElement, cfg: TurnstileConfig, onToken: (token: string) => void): Promise<TurnstileHandle> {
  const ts = await loadTurnstile()
  // Cloudflare erlaubt kein echt transparentes Widget: Rahmen leicht durchscheinend, damit es auf hellen und dunklen Seiten nicht klotzt
  el.style.opacity = '0.78'
  el.style.borderRadius = '6px'
  el.style.transition = 'opacity .2s'
  el.style.display = 'inline-block'
  el.onmouseenter = () => { el.style.opacity = '1' }
  el.onmouseleave = () => { el.style.opacity = '0.78' }
  const id = ts.render(el, {
    theme: cfg.theme && cfg.theme !== 'auto' ? cfg.theme : detectTheme(el),
    sitekey: cfg.siteKey,
    language: 'de',
    // "Invisible": das Widget erscheint nur, wenn Cloudflare eine Interaktion verlangt
    appearance: cfg.mode === 'invisible' ? 'interaction-only' : 'always',
    callback: (t: string) => onToken(t),
    'expired-callback': () => onToken(''),
    'error-callback': () => onToken(''),
  })
  return {
    reset() { onToken(''); try { ts.reset(id) } catch { /* Widget bereits entfernt */ } },
    remove() { try { ts.remove(id) } catch { /* ignorieren */ } },
  }
}
