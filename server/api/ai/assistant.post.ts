import { requireAuth } from '../../utils/verifyAuth'
import { getTenantByEmail, pickProvider } from '../../utils/ai/keys'
import { chatOnce } from '../../utils/ai/providers'
import { logAiUsage } from '../../utils/ai/usage'
import { buildBusinessSnapshot } from '../../utils/ai/snapshot'

const SYSTEM_PROMPT = (snapshot: string) => `Du bist "Plexi", der Plexora-Assistent — ein hilfreicher Business-Copilot im
Backend einer Firma. Du antwortest kurz, konkret und auf Deutsch. Du hast Lesezugriff
auf eine Momentaufnahme der Geschäftsdaten (siehe unten) — sie kann leicht
veraltet sein. Du kannst aktuell noch keine Aktionen ausführen (keine
Rechnungen erstellen, keine Daten ändern) — weise freundlich darauf hin, falls
danach gefragt wird, und schlage vor, wo man das im Backend selbst macht.

${snapshot}`

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const body = await readBody(event)

  const messages = body?.messages
  if (!Array.isArray(messages) || !messages.length) {
    throw createError({ statusCode: 400, message: 'messages erforderlich' })
  }

  const item = await getTenantByEmail(auth.email)
  if (!item) throw createError({ statusCode: 404, message: 'Nexora-Record nicht gefunden' })

  const picked = await pickProvider(item, body?.provider)
  if (!picked) throw createError({ statusCode: 400, message: 'Kein KI-Anbieter konfiguriert. Bitte in den Einstellungen unter "Plexora AI" einen API-Key hinterlegen.' })
  const { provider, apiKey, model } = picked

  const { text: snapshotText } = await buildBusinessSnapshot(event)

  try {
    const result = await chatOnce(provider, {
      apiKey, model,
      system: SYSTEM_PROMPT(snapshotText),
      messages,
      maxTokens: 500,
    })

    logAiUsage({
      tenantId: item.tenantId, provider, model,
      inputTokens: result.inputTokens, outputTokens: result.outputTokens,
      feature: 'backend-assistant',
    })

    return { text: result.text }
  } catch (e: any) {
    throw createError({ statusCode: 502, message: e?.message || 'KI-Anfrage fehlgeschlagen' })
  }
})
