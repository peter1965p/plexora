import { trackVisit } from '../utils/analyticsTracker'
import { clientIp } from '../utils/rateLimit'

const PUBLIC_PAGES = ['/', '/kaufen', '/login', '/impressum', '/datenschutz', '/agb']

export default defineEventHandler((event) => {
  const method = getMethod(event)
  const path   = getRequestURL(event).pathname

  if (method !== 'GET') return
  if (!PUBLIC_PAGES.includes(path)) return

  // Nuxt prefetch-Requests ignorieren (sec-purpose: prefetch oder purpose: prefetch)
  const purpose = getHeader(event, 'sec-purpose') || getHeader(event, 'purpose') || ''
  const secFetchDest = getHeader(event, 'sec-fetch-dest') || ''
  if (purpose.includes('prefetch') || secFetchDest === 'empty') return

  const ua      = getHeader(event, 'user-agent') || ''
  const referrer = getHeader(event, 'referer') || ''
  const fwd     = clientIp(event)                      // letzter X-Forwarded-For-Eintrag: den hängt API Gateway an, der erste ist frei wählbar
  const ip      = getHeader(event, 'cf-connecting-ip')
    || (fwd !== 'unknown' ? fwd : '')
  const country = getHeader(event, 'cf-ipcountry') || ''
  const city    = getHeader(event, 'cf-ipcity')    || ''

  trackVisit({ path, ua, referrer, ip, country, city })
})
