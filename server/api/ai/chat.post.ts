import { requireAuth } from '../../utils/verifyAuth'
import { getTenantByEmail, resolveProviderKey, readAiProviders } from '../../utils/ai/keys'
import { chatOnce, AI_PROVIDERS, AI_PROVIDER_DEFAULT_MODELS, type AiProvider } from '../../utils/ai/providers'
import { logAiUsage } from '../../utils/ai/usage'

// Zentraler Einstiegspunkt für alle künftigen Plexora-AI-Features (Assistent,
// Insights, Content-Generierung) — sie kennen nur diese eine Route, nicht die
// einzelnen Anbieter.
export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const body = await readBody(event)

  const messages = body?.messages
  if (!Array.isArray(messages) || !messages.length) {
    throw createError({ statusCode: 400, message: 'messages erforderlich' })
  }

  const item = await getTenantByEmail(auth.email)
  if (!item) throw createError({ statusCode: 404, message: 'Nexora-Record nicht gefunden' })

  const providers = readAiProviders(item)
  let provider = body?.provider as AiProvider | undefined
  if (provider && !AI_PROVIDERS.includes(provider)) throw createError({ statusCode: 400, message: 'Ungültiger Anbieter' })
  if (!provider) {
    const fallbackDefault = item.aiDefaultProvider as AiProvider | undefined
    provider = (fallbackDefault && providers[fallbackDefault]?.configured && providers[fallbackDefault].enabled)
      ? fallbackDefault
      : AI_PROVIDERS.find(p => providers[p].configured && providers[p].enabled)
  }
  if (!provider) throw createError({ statusCode: 400, message: 'Kein KI-Anbieter konfiguriert. Bitte in den Einstellungen unter "Plexora AI" einen API-Key hinterlegen.' })
  if (!providers[provider].enabled) throw createError({ statusCode: 400, message: `Anbieter "${provider}" ist deaktiviert.` })

  const apiKey = await resolveProviderKey(item.tenantId, provider)
  if (!apiKey) throw createError({ statusCode: 400, message: `Kein API-Key für "${provider}" hinterlegt.` })

  const model = body?.model || AI_PROVIDER_DEFAULT_MODELS[provider]

  try {
    const result = await chatOnce(provider, {
      apiKey, model,
      system: body?.system,
      messages,
      maxTokens: body?.maxTokens,
    })

    logAiUsage({
      tenantId: item.tenantId, provider, model,
      inputTokens: result.inputTokens, outputTokens: result.outputTokens,
      feature: String(body?.feature || 'unknown'),
    })

    return { text: result.text, provider, model, usage: { inputTokens: result.inputTokens, outputTokens: result.outputTokens } }
  } catch (e: any) {
    throw createError({ statusCode: 502, message: e?.message || 'KI-Anfrage fehlgeschlagen' })
  }
})
