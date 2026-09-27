import { requireAuth } from '../../utils/verifyAuth'
import { chatOnce, AI_PROVIDERS, type AiProvider } from '../../utils/ai/providers'

// Löst den alten, Anthropic-only /api/settings/claude-test Endpoint ab.
export default defineEventHandler(async (event) => {
  requireAuth(event)
  const body = await readBody(event)
  const provider = body?.provider as AiProvider
  const apiKey = String(body?.apiKey || '').trim()

  if (!AI_PROVIDERS.includes(provider)) return { ok: false, error: 'Ungültiger Anbieter' }
  if (!apiKey) return { ok: false, error: 'Kein API-Key angegeben' }

  try {
    await chatOnce(provider, { apiKey, maxTokens: 1, messages: [{ role: 'user', content: 'Hi' }] })
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Verbindung fehlgeschlagen' }
  }
})
