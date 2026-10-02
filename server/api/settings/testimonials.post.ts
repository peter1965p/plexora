import { requireAdmin } from '../../utils/verifyAuth'
import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readBody(event)
  const items = Array.isArray(body?.items) ? body.items.map((i: any) => ({
    quote:   String(i.quote || '').trim(),
    quoteEn: String(i.quoteEn || '').trim(),
    name:    String(i.name || '').trim(),
    role:    String(i.role || '').trim(),
    roleEn:  String(i.roleEn || '').trim(),
  })).filter((i: any) => i.quote && i.name) : []

  const dynamo = getDynamoClient()
  await dynamo.send(new UpdateCommand({
    TableName: 'plexora-settings',
    Key: { settingId: 'testimonials', scope: 'global' },
    UpdateExpression: 'SET items = :i, updated = :u',
    ExpressionAttributeValues: { ':i': items, ':u': new Date().toISOString() },
  }))
  return { success: true, items }
})
