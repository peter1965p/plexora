import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireTenantId } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const body = await readBody(event)
  const link = String(body?.videoFallbackLink || '').trim()
  if (link && !/^https?:\/\//i.test(link)) throw createError({ statusCode: 400, message: 'Bitte eine vollständige Adresse mit https:// angeben' })
  await getDynamoClient().send(new UpdateCommand({
    TableName: 'plexora-nexora',
    Key: { tenantId },
    UpdateExpression: 'SET videoFallbackLink = :l' + (typeof body?.videoAutoJitsi === 'boolean' ? ', videoAutoJitsi = :j' : ''),
    ExpressionAttributeValues: { ':l': link, ...(typeof body?.videoAutoJitsi === 'boolean' ? { ':j': body.videoAutoJitsi } : {}) },
  }))
  return { success: true }
})
