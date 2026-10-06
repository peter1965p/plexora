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
export interface TurnstileConfig { siteKey: string; mode?: string }

// Zeigt das Widget in `el`. `onToken('')` meldet, dass das Token abgelaufen/ungültig ist.
export async function mountTurnstile(el: HTMLElement, cfg: TurnstileConfig, onToken: (token: string) => void): Promise<TurnstileHandle> {
  const ts = await loadTurnstile()
  const id = ts.render(el, {
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
