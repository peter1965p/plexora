import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

// Angular liest window.location.hostname, schickt den Subdomain-Part hierher
// Antwort: tenantId → dann kann das Frontend branding + pages laden
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=60',
  })

  const subdomain = getQuery(event).subdomain as string || ''
  if (!subdomain) throw createError({ statusCode: 400, message: 'subdomain required' })

  const dynamo = getDynamoClient()
  const res    = await dynamo.send(new ScanCommand({
    TableName:        'plexora-nexora',
    FilterExpression: 'subdomain = :s AND #st = :active',
    ExpressionAttributeNames:  { '#st': 'status' },
    ExpressionAttributeValues: { ':s': subdomain, ':active': 'active' },
  }))

  const item = res.Items?.[0]
  if (!item) throw createError({ statusCode: 404, message: 'Subdomain nicht gefunden' })

  return { tenantId: item.tenantId }
})
