import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../dynamodb'
import type { AiProvider } from './providers'

// Fire-and-forget Nutzungs-Log — Basis für spätere Kosten-/Insights-Auswertung.
// Ein Logging-Fehler darf eine erfolgreiche KI-Antwort niemals zum Scheitern bringen.
export async function logAiUsage(args: {
  tenantId: string; provider: AiProvider; model: string
  inputTokens: number; outputTokens: number; feature: string
}) {
  try {
    const dynamo = getDynamoClient()
    await dynamo.send(new PutCommand({
      TableName: 'plexora-ai-usage',
      Item: { ...args, ts: new Date().toISOString() },
    }))
  } catch { /* Logging ist best-effort */ }
}
