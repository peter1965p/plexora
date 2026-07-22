import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { checkRateLimit } from '../../../utils/rateLimit'
import { trackSiteVisit } from '../../../utils/siteAnalyticsTracker'

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Access-Control-Allow-Origin': '*' })

  if (getMethod(event) === 'OPTIONS') {
    setResponseHeaders(event, {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    return ''
  }

  const tenantId = getRouterParam(event, 'tenantId') || ''
  const body     = await readBody(event).catch(() => ({}))
  const path     = String(body?.path || '/').slice(0, 200)
  const referrer = String(body?.referrer || '')

  const ip = getHeader(event, 'cf-connecting-ip')
    || getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
    || ''

  // Grobe Drossel gegen Skript-Missbrauch (eigene aufgeblasene Zahlen) — großzügig,
  // da echte Nutzer beim schnellen Klicken durch die Seite locker über kleinere Limits kämen.
  const ok = await checkRateLimit('pageview-ip', ip, 200, 3600)
  if (!ok) return { success: true }

  const dynamo = getDynamoClient()
  const tenant = await dynamo.send(new GetCommand({ TableName: 'plexora-nexora', Key: { tenantId } }))
  if (!tenant.Item || tenant.Item.status !== 'active') {
    // Kein Fehler nach außen — ein Tracking-Call darf die Kundenseite nie sichtbar stören.
    return { success: true }
  }

  trackSiteVisit({
    tenantId,
    path,
    referrer,
    ua:      getHeader(event, 'user-agent') || '',
    ip,
    country: getHeader(event, 'cf-ipcountry') || '',
    city:    getHeader(event, 'cf-ipcity')    || '',
  })

  return { success: true }
})
