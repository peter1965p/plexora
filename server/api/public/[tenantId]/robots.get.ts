import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

const DEFAULT_ROBOTS = 'User-Agent: *\nDisallow:\n'

// Eigener, schlanker Endpunkt statt Anhängen an branding.get.ts — liefert reinen Text,
// damit die Cloudflare Pages Function in nexora-nuxt (functions/robots.txt.ts) die Antwort
// direkt durchreichen kann, ohne JSON parsen zu müssen.
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
    'Content-Type': 'text/plain; charset=utf-8',
  })

  const tenantId = getRouterParam(event, 'tenantId') || ''
  const dynamo   = getDynamoClient()

  const res = await dynamo.send(new GetCommand({
    TableName: 'plexora-nexora',
    Key: { tenantId },
  }))

  if (!res.Item || res.Item.status !== 'active') {
    return DEFAULT_ROBOTS
  }

  return res.Item.robotsTxt || DEFAULT_ROBOTS
})
