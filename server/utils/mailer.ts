import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'
import { Resend } from 'resend'
import { randomUUID } from 'crypto'
import { notifySystem } from './notifications'
import { mailBlockReason, MAIL_BLOCK_TEXT } from './mailPolicy'
import { logPreview } from '../../shared/logMask'
import { reserveMail } from './mailQuota'

export interface MailInput {
  userId: string
  kind: 'automation' | 'booking_confirmation' | 'booking_cancelled' | 'internal' | 'team_invite'
  from: string
  to: string
  subject: string
  html?: string
  text?: string
}

// Zentraler Versand: Resend meldet Fehler als Rückgabewert statt als Exception —
// deshalb wird das Ergebnis geprüft und jeder Versand im Protokoll festgehalten.
export async function sendMail(input: MailInput): Promise<'sent' | 'failed' | 'skipped'> {
  // Feste Ausschlussregel: Demo-/Beispiel-/gesperrte Mandanten lösen nie eine Mail aus (nur Protokolleintrag, kein Resend-Aufruf)
  const blocked = mailBlockReason(input.userId)
  if (blocked) {
    try {
      await getDynamoClient().send(new PutCommand({
        TableName: 'plexora-mail-log',
        Item: { userId: input.userId, mailId: randomUUID(), kind: input.kind, to: '(nicht gesendet)', subject: input.subject, status: 'skipped', error: MAIL_BLOCK_TEXT[blocked], preview: '', created: new Date().toISOString() },
      }))
    } catch {}
    console.warn(`[mail] übersprungen (${blocked}) kind=${input.kind}`)
    return 'skipped'
  }
  // Tageslimit je Mandant (Tarif). Interne Sicherheitsmeldungen an den Inhaber (Sicherung) werden nie begrenzt.
  if (input.kind !== 'internal') {
    const q = await reserveMail({ tenantId: input.userId, pool: 'system', recipients: [input.to], what: input.kind })
    if (!q.ok) {
      try {
        await getDynamoClient().send(new PutCommand({
          TableName: 'plexora-mail-log',
          Item: { userId: input.userId, mailId: randomUUID(), kind: input.kind, to: input.to, subject: input.subject, status: 'skipped', error: q.message || 'Mail-Limit erreicht', preview: '', created: new Date().toISOString() },
        }))
      } catch {}
      return 'skipped'
    }
  }
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
        // Das Protokoll ist für alle Konten des Mandanten lesbar: nie Links mit Pfad/Token im Klartext, bei Einladungen gar keine Vorschau
        preview: logPreview(input.kind, input.text || input.html || ''),
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
