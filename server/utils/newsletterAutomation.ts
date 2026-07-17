import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'
import { compileNewsletterHtml } from './newsletterHtml'
import { Resend } from 'resend'

// Gemeinsamer Versand-Baustein für automatisierte Einzel-Mails (Willkommens-Mail,
// verzögerte Follow-ups, Kampagnen-Erinnerungen) — genutzt vom Confirm-Hook (sofort)
// und vom täglichen Cron-Sweep. Kein Batch nötig, da automatisierte Mails immer
// einzeln bei Eintreten der Bedingung verschickt werden, nicht in großer Stückzahl
// gleichzeitig wie ein Kampagnen-Versand.
export async function sendAutomationEmail(
  tenantId: string,
  subscriber: { email: string; unsubscribeToken: string },
  templateId: string,
): Promise<boolean> {
  const dynamo = getDynamoClient()
  const [templateRes, settingsRes, brandingRes] = await Promise.all([
    dynamo.send(new GetCommand({ TableName: 'plexora-newsletter-templates', Key: { tenantId, templateId } })),
    dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'newsletter', scope: tenantId } })),
    dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'branding', scope: tenantId } })),
  ])
  const template = templateRes.Item
  if (!template) return false

  const senderSettings = settingsRes.Item || { senderName: '', replyTo: '', impressum: '' }
  const branding        = brandingRes.Item || { brandName: 'Plexora' }
  const apiBase          = useRuntimeConfig().public.apiBase as string
  const fromName          = senderSettings.senderName ? `${senderSettings.senderName} via Plexora` : 'Plexora Newsletter'

  const html = compileNewsletterHtml({
    bodyHtml: template.bodyHtml || '',
    header:   { companyName: branding.brandName },
    footer:   { impressum: senderSettings.impressum || '', unsubscribeUrl: `${apiBase}/api/public/newsletter/unsubscribe/${subscriber.unsubscribeToken}` },
    apiBase,
  })

  try {
    const resend = new Resend(useRuntimeConfig().resendApiKey as string)
    await resend.emails.send({
      from:    `${fromName} <newsletter@plexora.eu>`,
      to:      subscriber.email,
      replyTo: senderSettings.replyTo || undefined,
      subject: template.name || 'Neuigkeiten',
      html,
      headers: {
        'List-Unsubscribe': `<${apiBase}/api/public/newsletter/unsubscribe/${subscriber.unsubscribeToken}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    })
    return true
  } catch (err) {
    console.error('Automation-Mail fehlgeschlagen:', err)
    return false
  }
}
