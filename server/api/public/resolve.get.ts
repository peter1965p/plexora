import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

// nexora-nuxt liest window.location.hostname und schickt es hierher.
// Kunden-Websites laufen immer auf der eigenen Domain (CNAME auf nexora-nuxt.pages.dev) —
// es gibt keine nexora.de-Subdomain-Plattform.
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=60',
  })

  const q    = getQuery(event)
  const host = (q.host as string || '').toLowerCase().trim()

  if (!host) throw createError({ statusCode: 400, message: 'host required' })

  const dynamo = getDynamoClient()
  const res = await dynamo.send(new ScanCommand({
    TableName:        'plexora-nexora',
    FilterExpression: 'customDomain = :h AND #st = :active',
    ExpressionAttributeNames:  { '#st': 'status' },
    ExpressionAttributeValues: { ':h': host, ':active': 'active' },
  }))

  const item = res.Items?.[0]
  if (!item) throw createError({ statusCode: 404, message: 'Domain nicht gefunden' })

  return { tenantId: item.tenantId }
})
