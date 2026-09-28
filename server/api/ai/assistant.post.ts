import { requireAuth } from '../../utils/verifyAuth'
import { getTenantByEmail, pickProvider } from '../../utils/ai/keys'
import { chatOnce } from '../../utils/ai/providers'
import { logAiUsage } from '../../utils/ai/usage'
import { buildBusinessSnapshot } from '../../utils/ai/snapshot'
import { ACTIONS } from '../../utils/ai/actions'

const SYSTEM_PROMPT = (snapshot: string) => `Du bist "Plexi", der Plexora-Assistent — ein hilfreicher Business-Copilot im
Backend einer Firma. Du antwortest kurz, konkret und auf Deutsch. Du hast Lesezugriff
auf eine Momentaufnahme der Geschäftsdaten (siehe unten) — sie kann leicht
veraltet sein.

Du kannst über die dir zur Verfügung gestellten Tools Aktionen VORSCHLAGEN
(z.B. eine Rechnung oder einen Kontakt anlegen). Die Aktion wird NIE sofort
ausgeführt — der Nutzer sieht danach immer erst eine Bestätigung und muss
explizit zustimmen. Rufe ein Tool nur auf, wenn der Nutzer erkennbar genau
das möchte, und frage vorher kurz nach fehlenden Pflichtangaben (z.B. Betrag,
Kundenname), statt sie zu erfinden.

${snapshot}`

const TOOLS = Object.values(ACTIONS).map(a => ({ name: a.name, description: a.description, parameters: a.parameters }))

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
      tools: TOOLS,
    })

    logAiUsage({
      tenantId: item.tenantId, provider, model,
      inputTokens: result.inputTokens, outputTokens: result.outputTokens,
      feature: 'backend-assistant',
    })

    const call = result.toolCalls?.[0]
    const action = call && ACTIONS[call.name]
      ? { id: call.id, name: call.name, label: ACTIONS[call.name].label, args: call.args }
      : undefined

    return { text: result.text, action }
  } catch (e: any) {
    throw createError({ statusCode: 502, message: e?.message || 'KI-Anfrage fehlgeschlagen' })
  }
})
