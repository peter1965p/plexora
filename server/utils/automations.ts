import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'
import { Resend } from 'resend'
import { lookup } from 'dns/promises'
import { isIP } from 'net'

// Schlankes Automatisierungs-Fundament: "Wenn [Trigger], dann [Aktion]" — bewusst ohne
// Bedingungen/Verzweigungen/Mehrstufigkeit. Die Webhook-Aktion macht Plexora sofort mit
// Zapier/Make/ActiveCampaign & Co. kompatibel, ohne dass wir jede dieser Integrationen
// selbst bauen müssten — Facebook-Anbindung, Funnel-Schritte etc. setzen später hier auf.

export type AutomationTrigger = 'new_lead' | 'form_submitted'
export type AutomationAction = 'webhook' | 'email'

function fillPlaceholders(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(data[key] ?? ''))
}

// SSRF-Schutz: Webhook-URLs kommen vom Tenant selbst, der Server ruft sie serverseitig
// (also aus dem AWS-Lambda-Netzwerk) auf. Ohne Prüfung könnte jemand auf interne
// Adressen zielen (z.B. 169.254.169.254 = AWS Metadata-Endpunkt mit Credentials).
function isPrivateIp(ip: string): boolean {
  if (ip === '169.254.169.254') return true // AWS/Cloud Metadata-Endpunkt
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number)
    if (a === 127) return true // loopback
    if (a === 10) return true // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12
    if (a === 192 && b === 168) return true // 192.168.0.0/16
    if (a === 169 && b === 254) return true // link-local
    if (a === 0) return true
  }
  if (isIP(ip) === 6) {
    const lower = ip.toLowerCase()
    if (lower === '::1') return true // loopback
    if (lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) return true // link-local/ULA
  }
  return false
}

async function assertSafeWebhookUrl(rawUrl: string) {
  const url = new URL(rawUrl)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Nur http/https erlaubt')
  if (url.hostname === 'localhost') throw new Error('Interne Adresse nicht erlaubt')
  const { address } = await lookup(url.hostname)
  if (isPrivateIp(address)) throw new Error('Interne/private Adresse nicht erlaubt')
}

async function runAction(automation: any, data: Record<string, any>) {
  if (automation.action === 'webhook' && automation.webhookUrl) {
    await assertSafeWebhookUrl(automation.webhookUrl)
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
