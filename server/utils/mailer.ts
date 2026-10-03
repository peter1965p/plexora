import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'
import { Resend } from 'resend'
import { randomUUID } from 'crypto'
import { notifySystem } from './notifications'

export interface MailInput {
  userId: string
  kind: 'automation' | 'booking_confirmation' | 'booking_cancelled' | 'internal'
  from: string
  to: string
  subject: string
  html?: string
  text?: string
}

// Zentraler Versand: Resend meldet Fehler als Rückgabewert statt als Exception —
// deshalb wird das Ergebnis geprüft und jeder Versand im Protokoll festgehalten.
export async function sendMail(input: MailInput): Promise<'sent' | 'failed'> {
  const resend = new Resend(useRuntimeConfig().resendApiKey as string)
  let status: 'sent' | 'failed' = 'sent'
  let error = ''
  try {
    const res = await resend.emails.send({
      from: input.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    })
    if (res.error) {
      status = 'failed'
      error = res.error.message || 'Unbekannter Fehler'
    }
  } catch (e: any) {
    status = 'failed'
    error = String(e?.message || e).slice(0, 300)
  }

  try {
    await getDynamoClient().send(new PutCommand({
      TableName: 'plexora-mail-log',
      Item: {
        userId: input.userId,
        mailId: randomUUID(),
        kind: input.kind,
        to: input.to,
        subject: input.subject,
        status,
        error,
        preview: (input.text || input.html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 600),
        created: new Date().toISOString(),
      },
    }))
  } catch {}

  if (status === 'failed') {
    await notifySystem({
      userId: input.userId,
      type: 'mail_failed',
      title: 'E-Mail konnte nicht gesendet werden',
      message: `An ${input.to}: „${input.subject}“${error ? ` – ${error}` : ''}`,
      level: 'error',
      link: '/marketing?tab=protokoll',
    })
  }

  return status
}
