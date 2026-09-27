import { requireAuth } from '../../utils/verifyAuth'
import { getTenantByEmail, pickProvider } from '../../utils/ai/keys'
import { chatOnce, AI_PROVIDER_DEFAULT_MODELS } from '../../utils/ai/providers'
import { logAiUsage } from '../../utils/ai/usage'
import { buildBusinessSnapshot } from '../../utils/ai/snapshot'

const PROMPT = (snapshot: string) => `Du bist ein Business-Analyst. Hier ist eine Momentaufnahme der Geschäftsdaten
einer Firma:

${snapshot}

Schreibe eine kurze Analyse auf Deutsch (max. 120 Wörter): 1-2 Sätze Einschätzung
der aktuellen Lage, danach 3 konkrete, umsetzbare Handlungsempfehlungen als
Aufzählung. Kein Vorgeplänkel, direkt einsteigen.`

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const body = await readBody(event).catch(() => ({}))

  const item = await getTenantByEmail(auth.email)
  if (!item) throw createError({ statusCode: 404, message: 'Nexora-Record nicht gefunden' })

  const picked = await pickProvider(item, body?.provider)
  if (!picked) throw createError({ statusCode: 400, message: 'Kein KI-Anbieter konfiguriert. Bitte in den Einstellungen unter "Plexora AI" einen API-Key hinterlegen.' })
  const { provider, apiKey } = picked
  const model = AI_PROVIDER_DEFAULT_MODELS[provider]

  const { summary, text: snapshotText } = await buildBusinessSnapshot(event)

  try {
    const result = await chatOnce(provider, {
      apiKey, model,
      messages: [{ role: 'user', content: PROMPT(snapshotText) }],
      maxTokens: 400,
    })

    logAiUsage({
      tenantId: item.tenantId, provider, model,
      inputTokens: result.inputTokens, outputTokens: result.outputTokens,
      feature: 'insights',
    })

    return { text: result.text, summary }
  } catch (e: any) {
    throw createError({ statusCode: 502, message: e?.message || 'KI-Anfrage fehlgeschlagen' })
  }
})
