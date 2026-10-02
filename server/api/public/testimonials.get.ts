import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

// Echte Kundenstimmen für die Plexora-Landingpage — global, nicht pro Tenant
// (es gibt nur eine Plexora-Marketingseite). Leer per Default, bis im Admin
// echte Testimonials hinterlegt werden.
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' })
  const dynamo = getDynamoClient()
  try {
    const res = await dynamo.send(new GetCommand({
      TableName: 'plexora-settings', Key: { settingId: 'testimonials', scope: 'global' },
    }))
    return { items: res.Item?.items || [] }
  } catch {
    return { items: [] }
  }
})
