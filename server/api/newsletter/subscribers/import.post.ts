import { requireAuth } from '../../../utils/verifyAuth'
import { resolveUserId } from '../../../utils/tenant'
import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { buildConfirmEmailHtml } from '../../../utils/newsletterEmail'
import { Resend } from 'resend'
import { randomUUID } from 'crypto'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_ROWS = 5000

// CSV-Import erstellt IMMER nur pending-Subscriber, die sich per Double-Opt-In selbst
// bestätigen müssen — kein Blind-Import ohne Einwilligung, exakt wie im Auftrag verlangt.
export default defineEventHandler(async (event) => {
  const auth     = requireAuth(event)
  const tenantId = await resolveUserId(auth.email)
  const body     = await readBody(event)
  const rows: { email?: string; tags?: string[] }[] = Array.isArray(body?.subscribers) ? body.subscribers : []

  if (!rows.length) throw createError({ statusCode: 400, message: 'Keine Adressen übergeben' })
  if (rows.length > MAX_ROWS) throw createError({ statusCode: 400, message: `Maximal ${MAX_ROWS} Adressen pro Import` })

  const now = new Date().toISOString()
  const seen = new Set<string>()
  const subscribers = []
  for (const r of rows) {
    const email = String(r.email || '').trim().toLowerCase()
    if (!EMAIL_RE.test(email) || seen.has(email)) continue
    seen.add(email)
    subscribers.push({
      tenantId, email,
      subscriberId:     randomUUID(),
      status:            'pending',
      tags:              Array.isArray(r.tags) ? r.tags.slice(0, 20) : [],
      confirmToken:      randomUUID(),
      unsubscribeToken:  randomUUID(),
      consentTimestamp:  now,
      consentIp:         '',
      consentSource:     'csv-import',
      createdAt:         now,
    })
  }

  const dynamo = getDynamoClient()
  for (let i = 0; i < subscribers.length; i += 25) {
    const chunk = subscribers.slice(i, i + 25)
    await dynamo.send(new BatchWriteCommand({
      RequestItems: { 'plexora-newsletter-subscribers': chunk.map(s => ({ PutRequest: { Item: s } })) },
    }))
  }

  const apiBase = useRuntimeConfig().public.apiBase as string
  const resend  = new Resend(useRuntimeConfig().resendApiKey as string)
  for (let i = 0; i < subscribers.length; i += 100) {
    const chunk = subscribers.slice(i, i + 100)
    try {
      await resend.batch.send(chunk.map(s => ({
        from:    'Plexora Newsletter <newsletter@plexora.eu>',
        to:      s.email,
        subject: 'Bitte bestätige deine Newsletter-Anmeldung',
        html:    buildConfirmEmailHtml(`${apiBase}/api/public/newsletter/confirm/${s.confirmToken}`),
      })))
    } catch (err) {
      console.error('CSV-Import: Bestätigungsmail-Batch fehlgeschlagen:', err)
    }
  }

  return { success: true, imported: subscribers.length, skipped: rows.length - subscribers.length }
})
