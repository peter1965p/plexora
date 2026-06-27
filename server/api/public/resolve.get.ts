import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

// Angular liest window.location.hostname und schickt es hierher
// Matcher: erst customDomain (eigene Domain), dann subdomain (*.nexora.de)
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=60',
  })

  const q = getQuery(event)
  const host      = (q.host      as string || '').toLowerCase().trim()
  const subdomain = (q.subdomain as string || '').toLowerCase().trim()

  if (!host && !subdomain) throw createError({ statusCode: 400, message: 'host or subdomain required' })

  const dynamo = getDynamoClient()

  // 1. Custom Domain match (eigene Domain des Kunden)
  if (host) {
    const byDomain = await dynamo.send(new ScanCommand({
      TableName:        'plexora-nexora',
      FilterExpression: 'customDomain = :h AND #st = :active',
      ExpressionAttributeNames:  { '#st': 'status' },
      ExpressionAttributeValues: { ':h': host, ':active': 'active' },
    }))
    if (byDomain.Items?.[0]) return { tenantId: byDomain.Items[0].tenantId }
  }

  // 2. Subdomain match (*.nexora.de)
  const lookupSub = subdomain || host.replace('.nexora.de', '')
  const bySub = await dynamo.send(new ScanCommand({
    TableName:        'plexora-nexora',
    FilterExpression: 'subdomain = :s AND #st = :active',
    ExpressionAttributeNames:  { '#st': 'status' },
    ExpressionAttributeValues: { ':s': lookupSub, ':active': 'active' },
  }))

  const item = bySub.Items?.[0]
  if (!item) throw createError({ statusCode: 404, message: 'Domain nicht gefunden' })

  return { tenantId: item.tenantId }
})
