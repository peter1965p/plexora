import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'
import { Resend } from 'resend'

// Schlankes Automatisierungs-Fundament: "Wenn [Trigger], dann [Aktion]" — bewusst ohne
// Bedingungen/Verzweigungen/Mehrstufigkeit. Die Webhook-Aktion macht Plexora sofort mit
// Zapier/Make/ActiveCampaign & Co. kompatibel, ohne dass wir jede dieser Integrationen
// selbst bauen müssten — Facebook-Anbindung, Funnel-Schritte etc. setzen später hier auf.

export type AutomationTrigger = 'new_lead' | 'form_submitted'
export type AutomationAction = 'webhook' | 'email'

function fillPlaceholders(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(data[key] ?? ''))
}

async function runAction(automation: any, data: Record<string, any>) {
  if (automation.action === 'webhook' && automation.webhookUrl) {
    await fetch(automation.webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ trigger: automation.trigger, data, firedAt: new Date().toISOString() }),
    })
    return
  }
  if (automation.action === 'email' && automation.emailTo) {
    const resend = new Resend(useRuntimeConfig().resendApiKey as string)
    const subject = fillPlaceholders(automation.emailSubject || 'Automatisierung ausgelöst', data)
    const body = Object.entries(data).map(([k, v]) => `${k}: ${v}`).join('\n')
    await resend.emails.send({
      from: 'Plexora Automatisierung <automation@plexora.eu>',
      to: automation.emailTo,
      subject,
      text: body,
    })
  }
}

// Fire-and-forget — eine Automatisierung darf den eigentlichen Vorgang (Lead anlegen,
// Formular speichern) niemals verzögern oder zum Scheitern bringen.
export async function fireAutomations(userId: string, trigger: AutomationTrigger, data: Record<string, any>) {
  try {
    const dynamo = getDynamoClient()
    const res = await dynamo.send(new QueryCommand({
      TableName: 'plexora-automations',
      KeyConditionExpression: 'userId = :u',
      FilterExpression: '#t = :t AND enabled = :e',
      ExpressionAttributeNames: { '#t': 'trigger' },
      ExpressionAttributeValues: { ':u': userId, ':t': trigger, ':e': true },
    }))
    for (const automation of res.Items || []) {
      runAction(automation, data).catch(() => {})
    }
  } catch {
    // Automatisierungen sind best-effort — ein Fehler hier darf nie nach außen durchschlagen.
  }
}
