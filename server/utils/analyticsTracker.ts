import { UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'

const TABLE = 'plexora-meta'

// ── Bot detection ──────────────────────────────────────────────────────────────
const BOT_PATTERNS: Record<string, string> = {
  googlebot:           'Googlebot',
  'google-inspection': 'Google Inspection',
  adsbot:              'Google AdsBot',
  bingbot:             'Bingbot',
  bingpreview:         'Bing Preview',
  duckduckbot:         'DuckDuckBot',
  yandexbot:           'YandexBot',
  baiduspider:         'BaiduSpider',
  ahrefsbot:           'AhrefsBot',
  semrushbot:          'SemrushBot',
  mj12bot:             'Majestic',
  dotbot:              'DotBot',
  rogerbot:            'Moz',
  exabot:              'ExaBot',
  gptbot:              'GPTBot (OpenAI)',
  perplexitybot:       'PerplexityBot',
  claudebot:           'ClaudeBot (Anthropic)',
  'anthropic-ai':      'Anthropic',
  'meta-externalagent':'Meta AI',
  facebookexternalhit: 'Facebook',
  twitterbot:          'Twitterbot',
  linkedinbot:         'LinkedInBot',
  slurp:               'Yahoo Slurp',
  'archive.org_bot':   'Archive.org',
  ia_archiver:         'Wayback Machine',
  screaming:           'Screaming Frog',
  'sogou':             'Sogou',
  proximic:            'Proximic',
  brandwatch:          'Brandwatch',
}

export function detectBot(ua: string): string | null {
  const lower = ua.toLowerCase()
  for (const [pattern, name] of Object.entries(BOT_PATTERNS)) {
    if (lower.includes(pattern)) return name
  }
  return null
}

export function detectBrowser(ua: string): string {
  if (!ua) return 'Unknown'
  if (/SamsungBrowser/i.test(ua)) return 'Samsung Browser'
  if (/OPR\//i.test(ua))          return 'Opera'
  if (/Edg\//i.test(ua))          return 'Edge'
  if (/Chrome\//i.test(ua))       return 'Chrome'
  if (/Firefox\//i.test(ua))      return 'Firefox'
  if (/Safari\//i.test(ua))       return 'Safari'
  if (/MSIE|Trident/i.test(ua))   return 'IE'
  return 'Other'
}

export function detectOS(ua: string): string {
  if (!ua) return 'Unknown'
  if (/iPhone|iPad/i.test(ua))  return 'iOS'
  if (/Android/i.test(ua))      return 'Android'
  if (/Windows NT/i.test(ua))   return 'Windows'
  if (/Mac OS X/i.test(ua))     return 'macOS'
  if (/CrOS/i.test(ua))         return 'ChromeOS'
  if (/Linux/i.test(ua))        return 'Linux'
  return 'Other'
}

// ── IP Geolocation (fallback when no Cloudflare headers) ──────────────────────
function isPublicIp(ip: string): boolean {
  if (!ip) return false
  if (ip.startsWith('127.') || ip.startsWith('::1')) return false
  if (ip.startsWith('10.')) return false
  if (ip.startsWith('192.168.')) return false
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return false
  return true
}

async function geoLookup(ip: string): Promise<{ country: string; city: string }> {
  try {
    const ctrl  = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 3000)
    const res   = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode,city`, { signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) return { country: '', city: '' }
    const data = await res.json() as any
    return { country: data.countryCode || '', city: data.city || '' }
  } catch {
    return { country: '', city: '' }
  }
}

// ── Track a visit ──────────────────────────────────────────────────────────────
export function trackVisit(opts: {
  path: string
  ua: string
  referrer: string
  ip: string
  country?: string
  city?: string
}): void {
  const { path, ua, referrer, ip } = opts

  const run = async () => {
    // Use Cloudflare headers if available; otherwise geo-lookup
    let country = opts.country || ''
    let city    = opts.city    || ''
    if (!country && isPublicIp(ip)) {
      const geo = await geoLookup(ip)
      country   = geo.country
      city      = geo.city
    }

    await doTrack({ path, ua, referrer, ip, country, city })
  }
  run().catch(() => {})
}

async function doTrack(opts: {
  path: string; ua: string; referrer: string; ip: string; country: string; city: string
}): Promise<void> {
  const { path, ua, referrer, ip, country, city } = opts
  const today = new Date().toISOString().slice(0, 10)
  const botName = detectBot(ua)
  const isBot   = !!botName
  const client  = getDynamoClient()

  const typeKey    = isBot ? 'bot' : 'human'
  const botLabel   = botName ? botName.replace(/[^a-zA-Z0-9 ()]/g, '') : ''
  const refLabel   = referrer
    ? referrer.replace(/^https?:\/\//, '').split('/')[0].slice(0, 50)
    : 'direct'
  const pageLabel    = path.split('?')[0].slice(0, 80) || '/'
  const dayKey       = `analytics-day-${today}`
  const browserLabel = !isBot ? detectBrowser(ua)                           : null
  const osLabel      = !isBot ? detectOS(ua)                                 : null
  const countryCode  = country?.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2) || ''
  const cityLabel    = city?.slice(0, 50) || ''

  // ── Total counters ──────────────────────────────────────────────────────────
  client.send(new UpdateCommand({
    TableName: TABLE,
    Key: { pk: 'analytics-total' },
    UpdateExpression: 'ADD #h :v',
    ExpressionAttributeNames: { '#h': typeKey },
    ExpressionAttributeValues: { ':v': 1 },
  })).catch(() => {})

  // ── Daily counters — two-step: init maps, then atomic ADD ──────────────────
  const trackDay = async () => {
    await client.send(new UpdateCommand({
      TableName: TABLE,
      Key: { pk: dayKey },
      UpdateExpression: 'SET #p = if_not_exists(#p, :em), #r = if_not_exists(#r, :em), #br = if_not_exists(#br, :em), #os = if_not_exists(#os, :em), #co = if_not_exists(#co, :em), #ci = if_not_exists(#ci, :em), #d = if_not_exists(#d, :d)',
      ExpressionAttributeNames: { '#p': 'pages', '#r': 'refs', '#br': 'browsers', '#os': 'oss', '#co': 'countries', '#ci': 'cities', '#d': 'date' },
      ExpressionAttributeValues: { ':em': {}, ':d': today },
    }))

    const names: Record<string, string> = {
      '#t': typeKey, '#p': 'pages', '#pg': pageLabel, '#r': 'refs', '#rf': refLabel,
    }
    let expr = 'ADD #t :one, #p.#pg :one, #r.#rf :one'
    const vals: Record<string, any> = { ':one': 1 }

    if (browserLabel) {
      names['#br'] = 'browsers'; names['#brl'] = browserLabel
      expr += ', #br.#brl :one'
    }
    if (osLabel) {
      names['#os'] = 'oss'; names['#osl'] = osLabel
      expr += ', #os.#osl :one'
    }
    if (countryCode) {
      names['#co'] = 'countries'; names['#col'] = countryCode
      expr += ', #co.#col :one'
    }
    if (cityLabel) {
      names['#ci'] = 'cities'; names['#cil'] = cityLabel
      expr += ', #ci.#cil :one'
    }

    await client.send(new UpdateCommand({
      TableName: TABLE,
      Key: { pk: dayKey },
      UpdateExpression: expr,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: vals,
    }))
  }
  trackDay().catch(() => {})

  // ── Recent IPs (admin-only, last 100) ──────────────────────────────────────
  if (!isBot && ip) {
    const ts  = new Date().toISOString()
    const entry = `${ts}|${ip}|${countryCode}|${cityLabel}|${pageLabel}`
    client.send(new UpdateCommand({
      TableName: TABLE,
      Key: { pk: 'analytics-ips' },
      UpdateExpression: 'SET #l = list_append(if_not_exists(#l, :em), :new)',
      ExpressionAttributeNames: { '#l': 'log' },
      ExpressionAttributeValues: { ':em': [], ':new': [entry] },
    })).catch(() => {})
  }

  // ── Bot breakdown ───────────────────────────────────────────────────────────
  if (isBot && botLabel) {
    client.send(new UpdateCommand({
      TableName: TABLE,
      Key: { pk: 'analytics-bots' },
      UpdateExpression: 'ADD #b :one',
      ExpressionAttributeNames: { '#b': botLabel },
      ExpressionAttributeValues: { ':one': 1 },
    })).catch(() => {})
  }
}

// ── Query analytics ────────────────────────────────────────────────────────────
export async function getSeoStats() {
  const client = getDynamoClient()
  const today  = new Date().toISOString().slice(0, 10)

  const res   = await client.send(new ScanCommand({ TableName: TABLE }))
  const items = res.Items || []

  const totals     = items.find(i => i.pk === 'analytics-total') || {}
  const humanTotal = totals.human || 0
  const botTotal   = totals.bot   || 0

  const botBreakdown = items.find(i => i.pk === 'analytics-bots') || {}
  const bots = Object.entries(botBreakdown)
    .filter(([k]) => k !== 'pk')
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 15)
    .map(([name, count]) => ({ name, count: count as number }))

  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i))
    const key  = `analytics-day-${d.toISOString().slice(0, 10)}`
    const item = items.find(x => x.pk === key) || {}
    return { date: d.toISOString().slice(0, 10), human: item.human || 0, bot: item.bot || 0 }
  })

  const pagesMap:    Record<string, number> = {}
  const refsMap:     Record<string, number> = {}
  const browsersMap: Record<string, number> = {}
  const ossMap:      Record<string, number> = {}
  const countriesMap:Record<string, number> = {}
  const citiesMap:   Record<string, number> = {}

  for (const item of items) {
    if (typeof item.pk === 'string' && item.pk.startsWith('analytics-day-')) {
      for (const [k, v] of Object.entries(item.pages     || {})) pagesMap[k]     = (pagesMap[k]     || 0) + (v as number)
      for (const [k, v] of Object.entries(item.refs      || {})) refsMap[k]      = (refsMap[k]      || 0) + (v as number)
      for (const [k, v] of Object.entries(item.browsers  || {})) browsersMap[k]  = (browsersMap[k]  || 0) + (v as number)
      for (const [k, v] of Object.entries(item.oss       || {})) ossMap[k]       = (ossMap[k]       || 0) + (v as number)
      for (const [k, v] of Object.entries(item.countries || {})) countriesMap[k] = (countriesMap[k] || 0) + (v as number)
      for (const [k, v] of Object.entries(item.cities    || {})) citiesMap[k]    = (citiesMap[k]    || 0) + (v as number)
    }
  }

  const sort = (m: Record<string, number>, n: number) =>
    Object.entries(m).sort(([,a],[,b]) => b-a).slice(0, n)

  const topPages     = sort(pagesMap,     10).map(([path,    count]) => ({ path,    count }))
  const topRefs      = sort(refsMap,      10).map(([ref,     count]) => ({ ref,     count }))
  const topBrowsers  = sort(browsersMap,   8).map(([name,    count]) => ({ name,    count }))
  const topOss       = sort(ossMap,        8).map(([name,    count]) => ({ name,    count }))
  const topCountries = sort(countriesMap, 15).map(([code,    count]) => ({ code,    count }))
  const topCities    = sort(citiesMap,    10).map(([city,    count]) => ({ city,    count }))

  const ipLog = items.find(i => i.pk === 'analytics-ips')
  const recentIps = ((ipLog?.log || []) as string[])
    .slice(-100)
    .reverse()
    .map((e: string) => {
      const [ts, ip, country, city, page] = e.split('|')
      return { ts, ip, country, city, page }
    })

  const todayItem = items.find(i => i.pk === `analytics-day-${today}`) || {}

  return {
    humanTotal, botTotal,
    todayHuman: todayItem.human || 0,
    todayBot:   todayItem.bot   || 0,
    days, bots, topPages, topRefs,
    topBrowsers, topOss, topCountries, topCities, recentIps,
  }
}
