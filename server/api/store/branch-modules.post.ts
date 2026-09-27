import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireAdmin } from '../../utils/verifyAuth'

// Neues Modul in der Registry anlegen — das ist der fehlende Baustein, damit
// wirklich niemand mehr Code/CLI anfassen muss, um ein Modul aufzunehmen.
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readBody(event)

  const key = String(body?.key || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
  const name = String(body?.name || '').trim()
  if (!key) throw createError({ statusCode: 400, message: 'Key erforderlich (nur a-z, 0-9, -)' })
  if (!name) throw createError({ statusCode: 400, message: 'Name erforderlich' })

  const dynamo = getDynamoClient()
  const existing = await dynamo.send(new GetCommand({ TableName: 'plexora-plugin-registry', Key: { key } }))
  if (existing.Item) throw createError({ statusCode: 409, message: `Modul mit Key "${key}" existiert schon` })

  const builtin = !!body?.route && !body?.remoteEntryUrl
  if (!builtin && !body?.remoteEntryUrl) {
    throw createError({ statusCode: 400, message: 'Entweder route (eingebautes Modul) oder remoteEntryUrl (Zero-Deploy-Plugin) angeben' })
  }

  const item: Record<string, any> = {
    key,
    name,
    icon: String(body?.icon || 'Puzzle'),
    price: Number(body?.price) || 0,
    desc: String(body?.desc || ''),
    features: Array.isArray(body?.features) ? body.features.filter(Boolean) : [],
    builtin,
  }
  if (builtin) item.route = String(body.route)
  else item.remoteEntryUrl = String(body.remoteEntryUrl)

  await dynamo.send(new PutCommand({ TableName: 'plexora-plugin-registry', Item: item }))
  return { module: item }
})
