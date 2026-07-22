import { UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'
import { detectBot, detectBrowser, detectOS, isPublicIp, geoLookup } from './analyticsTracker'

const TABLE = 'plexora-site-analytics'

// Traffic-Tracking für Tenant-Websites (nexora-nuxt, z.B. paeffgen-it.de) — analog zu
// server/utils/analyticsTracker.ts (Plexoras eigene Marketingseite), aber pro Tenant
// partitioniert (Key {tenantId, rowKey}), damit das Auslesen eine günstige Query statt
// eines Full-Table-Scans ist. Bot-/UA-/Geo-Erkennung wird 1:1 wiederverwendet, nicht dupliziert.
export function trackSiteVisit(opts: {
  tenantId: string
  path: string
  ua: string
  referrer: string
  ip: string
  country?: string
  city?: string
}): void {
  const { tenantId, path, ua, referrer, ip } = opts
  if (!tenantId || !isPublicIp(ip)) return

  const run = async () => {
    let country = opts.country || ''
    let city    = opts.city    || ''
    if (!country) {
      const geo = await geoLookup(ip)
      country   = geo.country
      city      = geo.city
    }
    await doTrack({ tenantId, path, ua, referrer, country, city })
  }
  run().catch(() => {})
}

async function doTrack(opts: {
  tenantId: string; path: string; ua: string; referrer: string; country: string; city: string
}): Promise<void> {
  const { tenantId, path, ua, referrer, country, city } = opts
  const today   = new Date().toISOString().slice(0, 10)
  const botName = detectBot(ua)
  const isBot   = !!botName
  const client  = getDynamoClient()

  const typeKey   = isBot ? 'bot' : 'human'
  const refLabel  = referrer ? referrer.replace(/^https?:\/\//, '').split('/')[0].slice(0, 50) : 'direct'
  const pageLabel = path.split('?')[0].slice(0, 80) || '/'
  const dayKey    = `day-${today}`
  const browserLabel = !isBot ? detectBrowser(ua) : null
  const osLabel       = !isBot ? detectOS(ua)      : null
  const countryCode   = country?.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2) || ''
  const cityLabel     = city?.slice(0, 50) || ''

  client.send(new UpdateCommand({
    TableName: TABLE,
    Key: { tenantId, rowKey: 'total' },
    UpdateExpression: 'ADD #h :v',
    ExpressionAttributeNames: { '#h': typeKey },
    ExpressionAttributeValues: { ':v': 1 },
  })).catch(() => {})

  const trackDay = async () => {
    await client.send(new UpdateCommand({
      TableName: TABLE,
      Key: { tenantId, rowKey: dayKey },
      UpdateExpression: 'SET #p = if_not_exists(#p, :em), #r = if_not_exists(#r, :em), #br = if_not_exists(#br, :em), #os = if_not_exists(#os, :em), #co = if_not_exists(#co, :em), #ci = if_not_exists(#ci, :em), #d = if_not_exists(#d, :d)',
      ExpressionAttributeNames: { '#p': 'pages', '#r': 'refs', '#br': 'browsers', '#os': 'oss', '#co': 'countries', '#ci': 'cities', '#d': 'date' },
      ExpressionAttributeValues: { ':em': {}, ':d': today },
    }))

    const names: Record<string, string> = { '#t': typeKey, '#p': 'pages', '#pg': pageLabel, '#r': 'refs', '#rf': refLabel }
    let expr = 'ADD #t :one, #p.#pg :one, #r.#rf :one'

    if (browserLabel) { names['#br'] = 'browsers'; names['#brl'] = browserLabel; expr += ', #br.#brl :one' }
    if (osLabel)       { names['#os'] = 'oss';      names['#osl'] = osLabel;      expr += ', #os.#osl :one' }
    if (countryCode)   { names['#co'] = 'countries'; names['#col'] = countryCode; expr += ', #co.#col :one' }
    if (cityLabel)     { names['#ci'] = 'cities';    names['#cil'] = cityLabel;   expr += ', #ci.#cil :one' }

    await client.send(new UpdateCommand({
      TableName: TABLE,
      Key: { tenantId, rowKey: dayKey },
      UpdateExpression: expr,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: { ':one': 1 },
    }))
  }
  trackDay().catch(() => {})

  if (isBot && botName) {
    const botLabel = botName.replace(/[^a-zA-Z0-9 ()]/g, '')
    client.send(new UpdateCommand({
      TableName: TABLE,
      Key: { tenantId, rowKey: 'bots' },
      UpdateExpression: 'ADD #b :one',
      ExpressionAttributeNames: { '#b': botLabel },
      ExpressionAttributeValues: { ':one': 1 },
    })).catch(() => {})
  }
}

export async function getSiteStats(tenantId: string) {
  const client = getDynamoClient()
  const today  = new Date().toISOString().slice(0, 10)

  const res   = await client.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'tenantId = :t',
    ExpressionAttributeValues: { ':t': tenantId },
  }))
  const items = res.Items || []

  const totals     = items.find(i => i.rowKey === 'total') || {}
  const humanTotal = totals.human || 0
  const botTotal   = totals.bot   || 0

  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i))
    const key  = `day-${d.toISOString().slice(0, 10)}`
    const item = items.find(x => x.rowKey === key) || {}
    return { date: d.toISOString().slice(0, 10), human: item.human || 0, bot: item.bot || 0 }
  })

  const pagesMap: Record<string, number> = {}
  const refsMap:  Record<string, number> = {}
  const countriesMap: Record<string, number> = {}
  const citiesMap:    Record<string, number> = {}

  for (const item of items) {
    if (typeof item.rowKey === 'string' && item.rowKey.startsWith('day-')) {
      for (const [k, v] of Object.entries(item.pages     || {})) pagesMap[k]     = (pagesMap[k]     || 0) + (v as number)
      for (const [k, v] of Object.entries(item.refs      || {})) refsMap[k]      = (refsMap[k]      || 0) + (v as number)
      for (const [k, v] of Object.entries(item.countries || {})) countriesMap[k] = (countriesMap[k] || 0) + (v as number)
      for (const [k, v] of Object.entries(item.cities    || {})) citiesMap[k]    = (citiesMap[k]    || 0) + (v as number)
    }
  }

  const sort = (m: Record<string, number>, n: number) => Object.entries(m).sort(([, a], [, b]) => b - a).slice(0, n)

  const todayItem = items.find(i => i.rowKey === `day-${today}`) || {}

  return {
    humanTotal, botTotal,
    todayHuman: todayItem.human || 0,
    todayBot:   todayItem.bot   || 0,
    days,
    topPages:     sort(pagesMap, 10).map(([path, count]) => ({ path, count })),
    topRefs:      sort(refsMap, 10).map(([ref, count]) => ({ ref, count })),
    topCountries: sort(countriesMap, 15).map(([code, count]) => ({ code, count })),
    topCities:    sort(citiesMap, 10).map(([city, count]) => ({ city, count })),
  }
}
