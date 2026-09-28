import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { pickProvider } from '../../../utils/ai/keys'
import { chatOnce } from '../../../utils/ai/providers'
import { logAiUsage } from '../../../utils/ai/usage'

const DAILY_LIMIT = 200
const MAX_HISTORY = 6
const MAX_MSG_LEN = 500

// Öffentlicher Chat-Endpunkt für das Plexi-Widget auf Nexora-Tenant-Websites.
// Kein requireAuth — Website-Besucher sind nicht bei Plexora eingeloggt. Schutz gegen
// Kosten-Missbrauch daher über ein festes Tageslimit pro Tenant statt über Auth.
export default defineEventHandler(async (event) => {
  const tenantId = getRouterParam(event, 'tenantId') || ''
  const body = await readBody(event)

  const messages = (Array.isArray(body?.messages) ? body.messages : [])
    .slice(-MAX_HISTORY)
    .filter((m: any) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string')
    .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, MAX_MSG_LEN) }))

  if (!messages.length) throw createError({ statusCode: 400, message: 'messages erforderlich' })

  const dynamo = getDynamoClient()
  const tenantRes = await dynamo.send(new GetCommand({ TableName: 'plexora-nexora', Key: { tenantId } }))
  const item = tenantRes.Item
  if (!item || item.status !== 'active') throw createError({ statusCode: 404, message: 'Tenant nicht gefunden' })
  if (!item.plexiEnabled) throw createError({ statusCode: 403, message: 'Plexi ist für diese Website nicht aktiviert' })

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const usageRes = await dynamo.send(new QueryCommand({
    TableName: 'plexora-ai-usage',
    KeyConditionExpression: 'tenantId = :t AND #ts > :since',
    FilterExpression: 'feature = :f',
    ExpressionAttributeNames: { '#ts': 'ts' },
    ExpressionAttributeValues: { ':t': tenantId, ':since': since, ':f': 'plexi-public' },
  }))
  if ((usageRes.Items?.length || 0) >= DAILY_LIMIT) {
    throw createError({ statusCode: 429, message: 'Tageslimit für Plexi erreicht. Bitte morgen erneut versuchen.' })
  }

  const picked = await pickProvider(item)
  if (!picked) throw createError({ statusCode: 503, message: 'Plexi ist momentan nicht verfügbar.' })
  const { provider, apiKey } = picked
  const model = AI_PROVIDER_DEFAULT_MODELS[provider]

  const services = (item.services || []).map((s: any) => `- ${s.title}: ${s.description}`).join('\n')
  const contact = item.contactInfo || {}
  const system = `Du bist "Plexi", der KI-Assistent auf der Website von "${item.companyName || 'diesem Unternehmen'}".
Antworte kurz, freundlich und auf Deutsch, ausschließlich auf Basis der folgenden Informationen. Wenn du etwas nicht
weißt, sag das ehrlich und verweise auf das Kontaktformular. Erfinde keine Preise, Öffnungszeiten oder Fakten, die
hier nicht stehen.

Über das Unternehmen: ${item.about?.text || 'keine Angabe'}
Leistungen:
${services || 'keine hinterlegt'}
Kontakt: ${contact.email || ''} ${contact.phone || ''} ${contact.address || ''}`.trim()

  try {
    const result = await chatOnce(provider, { apiKey, model, system, messages, maxTokens: 300 })

    logAiUsage({
      tenantId, provider, model,
      inputTokens: result.inputTokens, outputTokens: result.outputTokens,
      feature: 'plexi-public',
    })

    return { text: result.text }
  } catch (e: any) {
    throw createError({ statusCode: 502, message: 'Plexi konnte gerade nicht antworten.' })
  }
})
