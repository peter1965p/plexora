import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireAuth } from '../../utils/verifyAuth'
import { getTenantByEmail, maskKey } from '../../utils/ai/keys'
import { encryptSecret } from '../../utils/crypto'
import { AI_PROVIDERS, type AiProvider } from '../../utils/ai/providers'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  if (auth.email === 'demo@plexora.eu') throw createError({ statusCode: 403, message: 'Demo-Account kann keine Keys hinterlegen' })

  const body = await readBody(event)
  const item = await getTenantByEmail(auth.email)
  if (!item) throw createError({ statusCode: 404, message: 'Nexora-Record nicht gefunden' })

  const dynamo = getDynamoClient()

  // Nur den Standard-Anbieter setzen, kein Key-Update.
  if (body?.defaultProvider !== undefined) {
    const dp = String(body.defaultProvider)
    if (dp && !AI_PROVIDERS.includes(dp as AiProvider)) throw createError({ statusCode: 400, message: 'Ungültiger Anbieter' })
    await dynamo.send(new UpdateCommand({
      TableName: 'plexora-nexora',
      Key: { tenantId: item.tenantId },
      UpdateExpression: 'SET aiDefaultProvider = :dp',
      ExpressionAttributeValues: { ':dp': dp },
    }))
    return { ok: true }
  }

  const provider = body?.provider as AiProvider
  if (!AI_PROVIDERS.includes(provider)) throw createError({ statusCode: 400, message: 'Ungültiger Anbieter' })

  if (body?.remove) {
    const remaining = { ...(item.aiProviders || {}) }
    delete remaining[provider]
    await dynamo.send(new UpdateCommand({
      TableName: 'plexora-nexora',
      Key: { tenantId: item.tenantId },
      UpdateExpression: provider === 'anthropic'
        ? 'SET aiProviders = :ap REMOVE anthropicApiKeyEncrypted, anthropicApiKeyMasked'
        : 'SET aiProviders = :ap',
      ExpressionAttributeValues: { ':ap': remaining },
    }))
    return { ok: true }
  }

  // enabled-Toggle ohne neuen Key (z.B. temporär deaktivieren ohne den Key zu löschen)
  if (body?.enabled !== undefined && !body?.apiKey) {
    const existing = item.aiProviders?.[provider]
    if (!existing?.encrypted) throw createError({ statusCode: 400, message: 'Kein Key für diesen Anbieter hinterlegt' })
    await dynamo.send(new UpdateCommand({
      TableName: 'plexora-nexora',
      Key: { tenantId: item.tenantId },
      UpdateExpression: 'SET aiProviders.#p.enabled = :en',
      ExpressionAttributeNames: { '#p': provider },
      ExpressionAttributeValues: { ':en': !!body.enabled },
    }))
    return { ok: true }
  }

  const apiKey = String(body?.apiKey || '').trim()
  if (!apiKey) throw createError({ statusCode: 400, message: 'apiKey erforderlich' })

  const entry = { encrypted: encryptSecret(apiKey), masked: maskKey(provider, apiKey), enabled: true }
  const existingProviders = item.aiProviders || {}

  await dynamo.send(new UpdateCommand({
    TableName: 'plexora-nexora',
    Key: { tenantId: item.tenantId },
    // Legacy-Einzelfeld gleich mit aufräumen, wenn wir gerade den Anthropic-Key neu setzen.
    UpdateExpression: provider === 'anthropic'
      ? 'SET aiProviders = :ap REMOVE anthropicApiKeyEncrypted, anthropicApiKeyMasked'
      : 'SET aiProviders = :ap',
    ExpressionAttributeValues: { ':ap': { ...existingProviders, [provider]: entry } },
  }))

  return { ok: true, masked: entry.masked }
})
