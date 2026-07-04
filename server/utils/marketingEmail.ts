import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'
import { decryptSecret } from './crypto'

export async function resolveAnthropicApiKey(tenantId: string, fallbackKey: string): Promise<string> {
  try {
    const dynamo = getDynamoClient()
    const res = await dynamo.send(new GetCommand({ TableName: 'plexora-nexora', Key: { tenantId } }))
    const encrypted = res.Item?.anthropicApiKeyEncrypted
    if (encrypted) return decryptSecret(encrypted)
  } catch {}
  return fallbackKey
}

export function replacePlaceholders(text: string, contact: { firstName?: string; lastName?: string; company?: string }): string {
  const firstName = contact.firstName || ''
  const lastName  = contact.lastName  || ''
  const fullName  = `${firstName} ${lastName}`.trim()
  return text
    .replaceAll('{{vorname}}',  firstName)
    .replaceAll('{{nachname}}', lastName)
    .replaceAll('{{name}}',     fullName)
    .replaceAll('{{firma}}',    contact.company || '')
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function textToHtmlParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p>${escapeHtml(p).replaceAll('\n', '<br>')}</p>`)
    .join('\n')
}

export async function generateEmailContent({ apiKey, campaignTopic, contactName, contactCompany, tone }: {
  apiKey: string
  campaignTopic: string
  contactName: string
  contactCompany?: string
  tone: string
}): Promise<string> {
  if (!apiKey) {
    return `<p>Hallo${contactName ? ' ' + contactName.split(' ')[0] : ''},</p>
<p>wir möchten Sie auf unser aktuelles Angebot aufmerksam machen: <strong>${campaignTopic}</strong>.</p>
<p>Nehmen Sie jetzt unverbindlich Kontakt mit uns auf!</p>`
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Du bist ein Marketing-Assistent. Schreibe eine kurze Marketing-E-Mail auf Deutsch.
Thema: ${campaignTopic}
Empfänger: ${contactName || 'Interessent'}${contactCompany ? ', ' + contactCompany : ''}
Ton: ${tone}
Max. 80 Wörter. Nur HTML-Absätze (<p> Tags). Beginne mit "Hallo${contactName ? ' ' + contactName.split(' ')[0] : ''},"`,
        }],
      }),
    })
    const data = await res.json() as any
    return data.content?.[0]?.text || ''
  } catch {
    return `<p>Hallo${contactName ? ' ' + contactName.split(' ')[0] : ''},</p><p>wir freuen uns, Ihnen unser Angebot zu <strong>${campaignTopic}</strong> vorstellen zu dürfen.</p>`
  }
}

export function buildEmailHtml({ emailBody, accent, campaignName }: {
  contactName?: string
  firstName?: string
  emailBody: string
  accent: string
  campaignName: string
}): string {
  return `<!DOCTYPE html>
<html lang="de">
<body style="font-family:Arial,sans-serif;background:#f5f5f7;margin:0;padding:20px">
  <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
    <div style="background:${accent};padding:28px 36px">
      <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.3px">${campaignName}</div>
    </div>
    <div style="padding:28px 36px;color:#333;font-size:15px;line-height:1.75">
      ${emailBody}
      <div style="margin-top:28px">
        <a href="https://app.plexora.eu"
           style="background:${accent};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block">
          Jetzt anfragen →
        </a>
      </div>
    </div>
    <div style="padding:16px 36px;border-top:1px solid #eee;font-size:11px;color:#aaa">
      Sie erhalten diese E-Mail, weil Sie sich für unser Angebot interessiert haben.
      Um sich abzumelden, antworten Sie mit "Abmelden".
    </div>
  </div>
</body>
</html>`
}
