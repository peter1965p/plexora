import { trackVisit } from '../utils/analyticsTracker'

const PUBLIC_PAGES = ['/', '/kaufen', '/login', '/impressum', '/datenschutz', '/agb']

export default defineEventHandler((event) => {
  const method = getMethod(event)
  const path   = getRequestURL(event).pathname

  if (method !== 'GET') return
  if (!PUBLIC_PAGES.includes(path)) return

  const ua       = getHeader(event, 'user-agent') || ''
  const referrer = getHeader(event, 'referer') || ''
  const ip       = getHeader(event, 'cf-connecting-ip')
    || getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
    || ''

  trackVisit({ path, ua, referrer, ip })
})
