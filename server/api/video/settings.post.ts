import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { parseJitsiHost } from '../../utils/videoLink'
import { requireTenantId } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const body = await readBody(event)
  const link = String(body?.videoFallbackLink || '').trim()
  if (link && !/^https?:\/\//i.test(link)) throw createError({ statusCode: 400, message: 'Bitte eine vollständige Adresse mit https:// angeben' })
  let host: string | undefined
  if (body?.jitsiHost !== undefined) { try { host = parseJitsiHost(body.jitsiHost) } catch (e: any) { throw createError({ statusCode: 400, message: e.message }) } }
  await getDynamoClient().send(new UpdateCommand({
    TableName: 'plexora-nexora',
    Key: { tenantId },
    UpdateExpression: 'SET videoFallbackLink = :l' + (typeof body?.videoAutoJitsi === 'boolean' ? ', videoAutoJitsi = :j' : '') + (host !== undefined ? ', jitsiHost = :h' : ''),
    ExpressionAttributeValues: { ':l': link, ...(typeof body?.videoAutoJitsi === 'boolean' ? { ':j': body.videoAutoJitsi } : {}), ...(host !== undefined ? { ':h': host } : {}) },
  }))
  return { success: true }
})
