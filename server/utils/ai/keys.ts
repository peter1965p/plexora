import { GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../dynamodb'
import { decryptSecret } from '../crypto'
import { AI_PROVIDERS, AI_PROVIDER_DEFAULT_MODELS, type AiProvider } from './providers'

const MASK_PREFIX: Record<AiProvider, string> = {
  anthropic: 'sk-ant-', openai: 'sk-', groq: 'gsk_', gemini: '',
}

export function maskKey(provider: AiProvider, key: string): string {
  return `${MASK_PREFIX[provider]}${'•'.repeat(8)}${key.slice(-4)}`
}

export async function getTenantByEmail(email: string) {
  const dynamo = getDynamoClient()
  const res = await dynamo.send(new ScanCommand({
    TableName: 'plexora-nexora',
    FilterExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
  }))
  return res.Items?.[0] || null
}

// Liest die konfigurierten Provider eines Tenants, inkl. Rückwärtskompatibilität
// zum alten Einzelfeld anthropicApiKeyEncrypted/-Masked aus der Marketing-Funktion.
export function readAiProviders(item: Record<string, any>): Record<AiProvider, { configured: boolean; masked: string; enabled: boolean; model: string }> {
  const stored = item.aiProviders || {}
  const result = {} as Record<AiProvider, { configured: boolean; masked: string; enabled: boolean; model: string }>
  for (const p of AI_PROVIDERS) {
    const model = stored[p]?.model || AI_PROVIDER_DEFAULT_MODELS[p]
    if (stored[p]?.encrypted) {
      result[p] = { configured: true, masked: stored[p].masked || '', enabled: stored[p].enabled !== false, model }
    } else if (p === 'anthropic' && item.anthropicApiKeyEncrypted) {
      result[p] = { configured: true, masked: item.anthropicApiKeyMasked || '', enabled: true, model }
    } else {
      result[p] = { configured: false, masked: '', enabled: false, model }
    }
  }
  return result
}

export async function resolveProviderKey(tenantId: string, provider: AiProvider): Promise<string> {
  const dynamo = getDynamoClient()
  const res = await dynamo.send(new GetCommand({ TableName: 'plexora-nexora', Key: { tenantId } }))
  const item = res.Item
  if (!item) return ''
  const encrypted = item.aiProviders?.[provider]?.encrypted
  if (encrypted) return decryptSecret(encrypted)
  if (provider === 'anthropic' && item.anthropicApiKeyEncrypted) return decryptSecret(item.anthropicApiKeyEncrypted)
  return ''
}

// Wählt für einen Tenant den zu nutzenden Anbieter: explizit angefragter Anbieter,
// sonst der hinterlegte Standard, sonst der erste konfigurierte & aktive.
// Zentral genutzt von allen Plexora-AI-Features (Chat, Assistent, Insights, Content).
export async function pickProvider(item: Record<string, any>, requested?: string): Promise<{ provider: AiProvider; apiKey: string; model: string } | null> {
  const providers = readAiProviders(item)

  let provider: AiProvider | undefined
  if (requested) {
    if (!AI_PROVIDERS.includes(requested as AiProvider)) return null
    provider = requested as AiProvider
  } else {
    const def = item.aiDefaultProvider as AiProvider | undefined
    provider = (def && providers[def]?.configured && providers[def].enabled)
      ? def
      : AI_PROVIDERS.find(p => providers[p].configured && providers[p].enabled)
  }
  if (!provider || !providers[provider].enabled) return null

  const apiKey = await resolveProviderKey(item.tenantId, provider)
  if (!apiKey) return null

  return { provider, apiKey, model: providers[provider].model }
}
