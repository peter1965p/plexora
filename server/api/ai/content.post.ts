import { requireAuth } from '../../utils/verifyAuth'
import { getTenantByEmail, pickProvider } from '../../utils/ai/keys'
import { chatOnce } from '../../utils/ai/providers'
import { logAiUsage } from '../../utils/ai/usage'

// Content-Generierung für Nexora-Websites: Blog-Beiträge und Leistungsbeschreibungen.
// Antwortet immer als JSON-Objekt, das der Aufrufer direkt in seine Felder übernimmt.
export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const body = await readBody(event)

  const type = body?.type as 'blog' | 'service'
  const topic = String(body?.topic || '').trim()
  if (!topic) throw createError({ statusCode: 400, message: 'topic erforderlich' })
  if (type !== 'blog' && type !== 'service') throw createError({ statusCode: 400, message: 'type muss "blog" oder "service" sein' })

  const item = await getTenantByEmail(auth.email)
  if (!item) throw createError({ statusCode: 404, message: 'Nexora-Record nicht gefunden' })

  const picked = await pickProvider(item, body?.provider)
  if (!picked) throw createError({ statusCode: 400, message: 'Kein KI-Anbieter konfiguriert. Bitte in den Einstellungen unter "Plexora AI" einen API-Key hinterlegen.' })
  const { provider, apiKey, model } = picked

  const companyName = item.companyName || ''
  const prompt = type === 'blog'
    ? `Schreibe einen Blog-Beitrag auf Deutsch für die Firma "${companyName}" zum Thema: "${topic}".
Antworte NUR mit validem JSON, keine Markdown-Codeblöcke, kein Vorgeplänkel:
{"excerpt": "1-2 Sätze Kurzbeschreibung", "content": "<p>...</p><p>...</p>"}
Der Content muss reines HTML sein (nur <p>, <h2>, <ul>/<li>, <strong> Tags), 300-500 Wörter, gut strukturiert mit 2-3 Zwischenüberschriften.`
    : `Schreibe eine Leistungsbeschreibung auf Deutsch für die Firma "${companyName}" zur Leistung: "${topic}".
Antworte NUR mit validem JSON, keine Markdown-Codeblöcke, kein Vorgeplänkel:
{"description": "1-2 prägnante Sätze, max. 160 Zeichen", "features": ["Feature 1", "Feature 2", "Feature 3"]}`

  try {
    const result = await chatOnce(provider, {
      apiKey, model,
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 800,
    })

    logAiUsage({
      tenantId: item.tenantId, provider, model,
      inputTokens: result.inputTokens, outputTokens: result.outputTokens,
      feature: 'nexora-content',
    })

    const cleaned = result.text.trim().replace(/^```json\s*|\s*```$/g, '')
    const parsed = JSON.parse(cleaned)
    return { ok: true, data: parsed }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'KI-Anfrage fehlgeschlagen oder Antwort nicht als JSON lesbar' }
  }
})
