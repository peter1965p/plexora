import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { getSiteStats } from '../../utils/siteAnalyticsTracker'

// Tenant-Auflösung bewusst identisch zu server/api/nexora/my.get.ts (E-Mail-Scan auf
// plexora-nexora) — nicht requireTenantId()/resolveUserId(), damit dieses Dashboard
// garantiert denselben tenantId zeigt wie die restlichen Website-Einstellungen desselben
// Logins (Team-Mitglieder-Mismatch-Risiko sonst, siehe Identity-Bridge-Problematik).
export default defineEventHandler(async (event) => {
  const email = event.context.auth?.email || ''
  if (!email) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const dynamo = getDynamoClient()
  const res = await dynamo.send(new ScanCommand({
    TableName: 'plexora-nexora',
    FilterExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
  }))

  const item = res.Items?.[0]
  if (!item) return { stats: null }

  return { stats: await getSiteStats(item.tenantId) }
})
