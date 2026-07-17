import { requireAuth } from '../../../../utils/verifyAuth'
import { resolveUserId } from '../../../../utils/tenant'
import { GetCommand, QueryCommand, UpdateCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { compileNewsletterHtml } from '../../../../utils/newsletterHtml'
import { Resend } from 'resend'
import { randomUUID } from 'crypto'

const BATCH_SIZE = 100

// Versendet eine Kampagne über die Resend-Batch-API (statt Sync-Loop wie beim alten
// Marketing-Modul). Idempotent/fortsetzbar: bereits erfolgreich versendete Empfänger
// (erkennbar an ihrer plexora-newsletter-sends-Zeile) werden bei einem erneuten
// Aufruf übersprungen — ein Netzwerkfehler oder Lambda-Timeout mitten im Versand
// bedeutet also nur "Route nochmal aufrufen", nicht "alles nochmal von vorn".
export default defineEventHandler(async (event) => {
  const auth       = requireAuth(event)
  const tenantId   = await resolveUserId(auth.email)
  const campaignId = getRouterParam(event, 'id') || ''
  const dynamo     = getDynamoClient()

  const campaignRes = await dynamo.send(new GetCommand({
    TableName: 'plexora-newsletter-campaigns',
    Key: { tenantId, campaignId },
  }))
  const campaign = campaignRes.Item
  if (!campaign) throw createError({ statusCode: 404, message: 'Kampagne nicht gefunden' })
  if (campaign.status === 'sent') return { success: true, alreadySent: true }

  // Schutz gegen doppeltes Auslösen (z.B. Doppelklick) — nur EIN Aufruf darf den
  // Status von etwas-anderem auf 'sending' drehen; ein zweiter, gleichzeitiger
  // Aufruf bricht hier sauber ab statt denselben Batch doppelt zu verschicken.
  if (campaign.status !== 'sending') {
    try {
      await dynamo.send(new UpdateCommand({
        TableName: 'plexora-newsletter-campaigns',
        Key: { tenantId, campaignId },
        ConditionExpression: '#s <> :sending',
        UpdateExpression: 'SET #s = :sending',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':sending': 'sending' },
      }))
    } catch (err: any) {
      if (err.name === 'ConditionalCheckFailedException') return { success: true, alreadyInProgress: true }
      throw err
    }
  }

  const [settingsRes, brandingRes] = await Promise.all([
    dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'newsletter', scope: tenantId } })),
    dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'branding', scope: tenantId } })),
  ])
  const senderSettings = settingsRes.Item || { senderName: '', replyTo: '', impressum: '' }
  const branding       = brandingRes.Item || { brandName: 'Plexora' }
  const apiBase         = useRuntimeConfig().public.apiBase as string
  const fromName        = senderSettings.senderName ? `${senderSettings.senderName} via Plexora` : 'Plexora Newsletter'

  // Alle bestätigten Subscriber laden (paginiert), optional nach Tag gefiltert
  const tagFilter: string = campaign.segmentFilter?.tag || ''
  const allSubscribers: any[] = []
  let subscriberCursor: Record<string, any> | undefined
  do {
    const filterParts = ['#status = :confirmed']
    const names: Record<string, string> = { '#status': 'status' }
    const values: Record<string, any> = { ':t': tenantId, ':confirmed': 'confirmed' }
    if (tagFilter) {
      filterParts.push('contains(tags, :tag)')
      values[':tag'] = tagFilter
    }
    const page = await dynamo.send(new QueryCommand({
      TableName: 'plexora-newsletter-subscribers',
      KeyConditionExpression: 'tenantId = :t',
      FilterExpression: filterParts.join(' AND '),
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ExclusiveStartKey: subscriberCursor,
    }))
    allSubscribers.push(...(page.Items || []))
    subscriberCursor = page.LastEvaluatedKey
  } while (subscriberCursor)

  // Bereits versendete (aus einem vorherigen, abgebrochenen Lauf) ermitteln
  const alreadySent = new Set<string>()
  let sendsCursor: Record<string, any> | undefined
  do {
    const page = await dynamo.send(new QueryCommand({
      TableName: 'plexora-newsletter-sends',
      KeyConditionExpression: 'campaignId = :c',
      ExpressionAttributeValues: { ':c': campaignId },
      ExclusiveStartKey: sendsCursor,
    }))
    for (const item of page.Items || []) {
      if (item.status === 'sent') alreadySent.add(item.subscriberId)
    }
    sendsCursor = page.LastEvaluatedKey
  } while (sendsCursor)

  const pending = allSubscribers.filter(s => !alreadySent.has(s.subscriberId))

  await dynamo.send(new UpdateCommand({
    TableName: 'plexora-newsletter-campaigns',
    Key: { tenantId, campaignId },
    UpdateExpression: 'SET stats.recipientCount = :rc',
    ExpressionAttributeValues: { ':rc': allSubscribers.length },
  }))

  let sentCount = alreadySent.size
  let failedCount = 0

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const chunk = pending.slice(i, i + BATCH_SIZE)
    const chunkMeta = chunk.map(sub => {
      const trackingToken = randomUUID()
      const html = compileNewsletterHtml({
        bodyHtml: campaign.bodyHtml || '',
        header:   { companyName: branding.brandName },
        footer:   { impressum: senderSettings.impressum || '', unsubscribeUrl: `${apiBase}/api/public/newsletter/unsubscribe/${sub.unsubscribeToken}` },
        apiBase,
        trackingToken,
      })
      return { sub, trackingToken, html }
    })

    const resend = new Resend(useRuntimeConfig().resendApiKey as string)
    let results: { index: number; failed: boolean }[] = chunkMeta.map((_, idx) => ({ index: idx, failed: false }))
    try {
      const res = await resend.batch.send(
        chunkMeta.map(({ sub, html }) => ({
          from:    `${fromName} <newsletter@plexora.eu>`,
          to:      sub.email,
          replyTo: senderSettings.replyTo || undefined,
          subject: campaign.subject || campaign.name,
          html,
          headers: {
            'List-Unsubscribe': `<${apiBase}/api/public/newsletter/unsubscribe/${sub.unsubscribeToken}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
          tags: [
            { name: 'campaignId',   value: campaignId },
            { name: 'subscriberId', value: sub.subscriberId },
            { name: 'source',       value: 'newsletter' },
          ],
        })),
        { batchValidation: 'permissive' },
      )
      const errIdx = new Set(((res.data as any)?.errors || []).map((e: any) => e.index))
      results = chunkMeta.map((_, idx) => ({ index: idx, failed: errIdx.has(idx) }))
    } catch (err) {
      console.error('Newsletter-Batch-Versand fehlgeschlagen:', err)
      results = chunkMeta.map((_, idx) => ({ index: idx, failed: true }))
    }

    const now = new Date().toISOString()
    const putRequests = chunkMeta.map(({ sub, trackingToken }, idx) => ({
      PutRequest: {
        Item: {
          campaignId,
          subscriberId: sub.subscriberId,
          tenantId,
          email: sub.email,
          status: results[idx].failed ? 'failed' : 'sent',
          sentAt: now,
          trackingToken,
        },
      },
    }))
    for (let j = 0; j < putRequests.length; j += 25) {
      await dynamo.send(new BatchWriteCommand({
        RequestItems: { 'plexora-newsletter-sends': putRequests.slice(j, j + 25) },
      }))
    }

    sentCount   += results.filter(r => !r.failed).length
    failedCount += results.filter(r => r.failed).length
  }

  await dynamo.send(new UpdateCommand({
    TableName: 'plexora-newsletter-campaigns',
    Key: { tenantId, campaignId },
    UpdateExpression: 'SET #s = :sent, sentAt = :now, stats.sentCount = :sc, stats.deliveredCount = :sc',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':sent': 'sent', ':now': new Date().toISOString(), ':sc': sentCount },
  }))

  return { success: true, sentCount, failedCount, recipientCount: allSubscribers.length }
})
