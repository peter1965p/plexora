import { requireAuth } from '../../utils/verifyAuth'
import { getTenantByEmail, resolveProviderKey } from '../../utils/ai/keys'
import { listModels, AI_PROVIDERS, type AiProvider } from '../../utils/ai/providers'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const body = await readBody(event)
  const provider = body?.provider as AiProvider
  if (!AI_PROVIDERS.includes(provider)) return { models: [] }

  let apiKey = String(body?.apiKey || '').trim()
  if (!apiKey) {
    const item = await getTenantByEmail(auth.email)
    if (item) apiKey = await resolveProviderKey(item.tenantId, provider)
  }
  if (!apiKey) return { models: [] }

  try {
    const models = await listModels(provider, apiKey)
    return { models }
  } catch (e: any) {
    return { models: [], error: e?.message || 'Modelle konnten nicht geladen werden' }
  }
})
