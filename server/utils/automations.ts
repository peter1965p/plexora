import { QueryCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'
import { compileNewsletterHtml } from './newsletterHtml'
import { getTenantByEmail } from './ai/keys'
import { Resend } from 'resend'
import { lookup } from 'dns/promises'
import { isIP } from 'net'

// Schlankes, natives Automatisierungs-Fundament: "Wenn [Trigger], dann [Aktion]" —
// bewusst ohne Bedingungen/Verzweigungen/Mehrstufigkeit. Die Aktionen laufen selbst in
// Plexora (E-Mail-Vorlage versenden, Lead-Status setzen, Termin-Buchungslink) — kein
// Umweg über Zapier/Make/ActiveCampaign. Webhook bleibt nur als Zusatz-Option für Ziele
// außerhalb von Plexora.

export type AutomationTrigger = 'new_lead' | 'form_submitted'
export type AutomationAction = 'send_email_template' | 'set_lead_status' | 'send_booking_link' | 'webhook' | 'email'

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

// Eigene Vorlage (aus dem Newsletter-Editor) an den Lead verschicken — der native
// ActiveCampaign-Ersatz: kein Opt-in/Unsubscribe-Unterbau nötig, da es sich um eine
// Reaktion auf eine Handlung des Leads selbst handelt (Formular abgeschickt), nicht
// um einen Newsletter-Verteiler-Versand.
async function sendTemplateEmail(userId: string, templateId: string, toEmail: string, data: Record<string, any>) {
  const dynamo = getDynamoClient()
  const [templateRes, brandingRes] = await Promise.all([
    dynamo.send(new GetCommand({ TableName: 'plexora-newsletter-templates', Key: { tenantId: userId, templateId } })),
    dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'branding', scope: userId } })),
  ])
  const template = templateRes.Item
  if (!template) return
  const branding = brandingRes.Item || { brandName: 'Plexora' }
  const apiBase  = useRuntimeConfig().public.apiBase as string

  const html = compileNewsletterHtml({
    bodyHtml: fillPlaceholders(template.bodyHtml || '', data),
    header:   { companyName: branding.brandName },
    footer:   { impressum: branding.impressum || '', unsubscribeUrl: '' },
    apiBase,
  })

  const resend = new Resend(useRuntimeConfig().resendApiKey as string)
  await resend.emails.send({
    from:    `${branding.brandName || 'Plexora'} <automation@plexora.eu>`,
    to:      toEmail,
    subject: fillPlaceholders(template.name || 'Nachricht', data),
    html,
  })
}

// Lead-Status direkt im CRM-Kontakt setzen — kein GSI auf E-Mail vorhanden, aber die
// Query bleibt auf die Tenant-Partition beschränkt (kein Full-Table-Scan).
async function setContactLeadStatus(userId: string, email: string, leadStatus: string) {
  const dynamo = getDynamoClient()
  const res = await dynamo.send(new QueryCommand({
    TableName: 'plexora-contacts',
    KeyConditionExpression: 'userId = :u',
    FilterExpression: 'email = :e',
    ExpressionAttributeValues: { ':u': userId, ':e': email },
  }))
  const contact = (res.Items || [])[0]
  if (!contact) return
  await dynamo.send(new UpdateCommand({
    TableName: 'plexora-contacts',
    Key: { userId, contactId: contact.contactId },
    UpdateExpression: 'SET leadStatus = :s',
    ExpressionAttributeValues: { ':s': leadStatus },
  }))
}

// Verlinkt die öffentliche Termine-Buchungsseite der Kunden-Website (Nexora) des
// Tenants — dort läuft bereits die komplette Google-Calendar/Meet-Buchung, hier wird
// sie dem Lead nur direkt nach seiner Anfrage per E-Mail angeboten.
async function sendBookingLink(userId: string, toEmail: string, data: Record<string, any>, appointmentTypeId?: string) {
  const tenant = await getTenantByEmail(userId)
  const domain = tenant?.customDomain
  if (!domain) return
  const bookingUrl = appointmentTypeId
    ? `https://${domain}/termine?type=${encodeURIComponent(appointmentTypeId)}`
    : `https://${domain}/termine`
  const name = data.name || ''
  const companyName = tenant?.companyName || 'uns'

  const resend = new Resend(useRuntimeConfig().resendApiKey as string)
  await resend.emails.send({
    from:    `${companyName} <automation@plexora.eu>`,
    to:      toEmail,
    subject: 'Jetzt Termin vereinbaren',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <p>Hallo ${name || ''},</p>
        <p>vielen Dank für Ihr Interesse! Buchen Sie sich jetzt direkt einen passenden Termin für ein kurzes Video-Gespräch (Google Meet) – ganz unkompliziert, ohne Hin- und Her-Mails:</p>
        <p style="text-align:center;margin:28px 0">
          <a href="${bookingUrl}" style="background:#1c71d8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Jetzt Termin buchen</a>
        </p>
        <p style="font-size:13px;color:#666">Oder Link kopieren: ${bookingUrl}</p>
        <p>Viele Grüße<br>${companyName}</p>
      </div>
    `,
  })
}

async function runAction(userId: string, automation: any, data: Record<string, any>) {
  if (automation.action === 'send_email_template' && automation.templateId && data.email) {
    await sendTemplateEmail(userId, automation.templateId, data.email, data)
    return
  }
  if (automation.action === 'send_booking_link' && data.email) {
    await sendBookingLink(userId, data.email, data, automation.appointmentTypeId)
    return
  }
  if (automation.action === 'set_lead_status' && automation.leadStatus && data.email) {
    await setContactLeadStatus(userId, data.email, automation.leadStatus)
    return
  }
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
      runAction(userId, automation, data).catch(() => {})
    }
  } catch {
    // Automatisierungen sind best-effort — ein Fehler hier darf nie nach außen durchschlagen.
  }
}
