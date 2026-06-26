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

// ── Track a visit ──────────────────────────────────────────────────────────────
export function trackVisit(opts: {
  path: string
  ua: string
  referrer: string
  ip: string
}): void {
  const { path, ua, referrer } = opts
  const today = new Date().toISOString().slice(0, 10)
  const botName = detectBot(ua)
  const isBot = !!botName
  const client = getDynamoClient()

  const typeKey  = isBot ? 'bot' : 'human'
  const botLabel = botName ? botName.replace(/[^a-zA-Z0-9 ()]/g, '') : ''
  const refLabel = referrer
    ? referrer.replace(/^https?:\/\//, '').split('/')[0].slice(0, 50)
    : 'direct'
  const pageLabel = path.split('?')[0].slice(0, 80) || '/'
  const dayKey    = `analytics-day-${today}`

  // ── Total counters (top-level ADD — always safe) ────────────────────────────
  client.send(new UpdateCommand({
    TableName: TABLE,
    Key: { pk: 'analytics-total' },
    UpdateExpression: 'ADD #h :v',
    ExpressionAttributeNames: { '#h': typeKey },
    ExpressionAttributeValues: { ':v': 1 },
  })).catch(() => {})

  // ── Daily counters — two-step to avoid nested-ADD-on-missing-map failure ────
  // DynamoDB's ADD on a nested path (pages./) fails when the parent map doesn't
  // exist yet. Step 1 ensures the maps are initialised; step 2 then atomically
  // increments the nested counters (ADD on existing map keys is safe & atomic).
  const trackDay = async () => {
    await client.send(new UpdateCommand({
      TableName: TABLE,
      Key: { pk: dayKey },
      UpdateExpression: 'SET #p = if_not_exists(#p, :em), #r = if_not_exists(#r, :em), #d = if_not_exists(#d, :d)',
      ExpressionAttributeNames: { '#p': 'pages', '#r': 'refs', '#d': 'date' },
      ExpressionAttributeValues: { ':em': {}, ':d': today },
    }))
    await client.send(new UpdateCommand({
      TableName: TABLE,
      Key: { pk: dayKey },
      UpdateExpression: 'ADD #t :one, #p.#pg :one, #r.#rf :one',
      ExpressionAttributeNames: {
        '#t':  typeKey,
        '#p':  'pages',
        '#pg': pageLabel,
        '#r':  'refs',
        '#rf': refLabel,
      },
      ExpressionAttributeValues: { ':one': 1 },
    }))
  }
  trackDay().catch(() => {})

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
  const today = new Date().toISOString().slice(0, 10)

  const res = await client.send(new ScanCommand({ TableName: TABLE }))
  const items = res.Items || []

  // Totals
  const totals = items.find(i => i.pk === 'analytics-total') || {}
  const humanTotal = totals.human || 0
  const botTotal   = totals.bot   || 0

  // Bot breakdown
  const botBreakdown = items.find(i => i.pk === 'analytics-bots') || {}
  const bots = Object.entries(botBreakdown)
    .filter(([k]) => k !== 'pk')
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 15)
    .map(([name, count]) => ({ name, count: count as number }))

  // Last 30 days
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i))
    const key = `analytics-day-${d.toISOString().slice(0, 10)}`
    const item = items.find(x => x.pk === key) || {}
    return {
      date:  d.toISOString().slice(0, 10),
      human: item.human || 0,
      bot:   item.bot   || 0,
    }
  })

  // Top pages (aggregate across all days)
  const pagesMap: Record<string, number> = {}
  const refsMap:  Record<string, number> = {}
  for (const item of items) {
    if (typeof item.pk === 'string' && item.pk.startsWith('analytics-day-')) {
      for (const [pg, cnt] of Object.entries(item.pages || {})) {
        pagesMap[pg] = (pagesMap[pg] || 0) + (cnt as number)
      }
      for (const [rf, cnt] of Object.entries(item.refs || {})) {
        refsMap[rf] = (refsMap[rf] || 0) + (cnt as number)
      }
    }
  }

  const topPages = Object.entries(pagesMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }))

  const topRefs = Object.entries(refsMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([ref, count]) => ({ ref, count }))

  // Today detail
  const todayItem = items.find(i => i.pk === `analytics-day-${today}`) || {}

  return {
    humanTotal, botTotal,
    todayHuman: todayItem.human || 0,
    todayBot:   todayItem.bot   || 0,
    days, bots, topPages, topRefs,
  }
}
