import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { type, data } = body || {}

  if (!type || !data) return { ok: true }

  // Tags come as array [{name, value}] from Resend
  const tags = Array.isArray(data.tags)
    ? Object.fromEntries(data.tags.map((t: any) => [t.name, t.value]))
    : (data.tags || {})

  const campaignId = tags.campaignId
  const dynamo = getDynamoClient()
  const now    = new Date().toISOString()

  // Newsletter-Sends laufen über eine eigene Tabelle/Key-Form ({campaignId,
  // subscriberId} statt {campaignId, contactId}) — Open/Click werden dafür über
  // einen eigenen Tracking-Pixel/Redirect erfasst (server/api/public/newsletter/
  // track/*), nur Bounce/Complaint kommen zwingend über Resends Webhook, da es
  // dafür keine clientseitige Alternative gibt.
  if (tags.source === 'newsletter') {
    const subscriberId = tags.subscriberId
    if (!campaignId || !subscriberId) return { ok: true }
    if (type === 'email.bounced' || type === 'email.complained') {
      const sendRes = await dynamo.send(new UpdateCommand({
        TableName: 'plexora-newsletter-sends',
        Key: { campaignId, subscriberId },
        UpdateExpression: 'SET #s = :s',
        ExpressionAttributeNames:  { '#s': 'status' },
        ExpressionAttributeValues: { ':s': type === 'email.complained' ? 'complained' : 'bounced' },
        ReturnValues: 'ALL_NEW',
      })).catch(() => null)
      const tenantId = sendRes?.Attributes?.tenantId
      const email    = sendRes?.Attributes?.email
      if (tenantId) {
        await dynamo.send(new UpdateCommand({
          TableName: 'plexora-newsletter-campaigns',
          Key: { tenantId, campaignId },
          UpdateExpression: `ADD stats.${type === 'email.complained' ? 'complaintCount' : 'bounceCount'} :one`,
          ExpressionAttributeValues: { ':one': 1 },
        })).catch(() => {})
      }
      // Bei einem echten Bounce (nicht nur Complaint) den Subscriber selbst auch als
      // bounced markieren, damit künftige Kampagnen ihn nicht erneut anschreiben.
      // Die Sende-Zeile trägt die E-Mail redundant mit, damit hier direkt über den
      // echten Subscriber-Key ({tenantId, email}) aktualisiert werden kann, statt
      // einen Scan über subscriberId zu brauchen.
      if (tenantId && email && type === 'email.bounced') {
        await dynamo.send(new UpdateCommand({
          TableName: 'plexora-newsletter-subscribers',
          Key: { tenantId, email },
          UpdateExpression: 'SET #s = :s, bouncedAt = :now, bounceReason = :r',
          ExpressionAttributeNames:  { '#s': 'status' },
          ExpressionAttributeValues: { ':s': 'bounced', ':now': now, ':r': data.reason || type },
        })).catch(() => {})
      }
    }
    return { ok: true }
  }

  const contactId  = tags.contactId
  if (!campaignId || !contactId) return { ok: true }

  if (type === 'email.opened') {
    await dynamo.send(new UpdateCommand({
      TableName: 'plexora-email-sends',
      Key: { campaignId, contactId },
      UpdateExpression: 'SET #s = :s, openedAt = if_not_exists(openedAt, :t)',
      ConditionExpression: '#s = :sent',
      ExpressionAttributeNames:  { '#s': 'status' },
      ExpressionAttributeValues: { ':s': 'opened', ':t': now, ':sent': 'sent' },
    })).catch(() => {})
  } else if (type === 'email.clicked') {
    await dynamo.send(new UpdateCommand({
      TableName: 'plexora-email-sends',
      Key: { campaignId, contactId },
      UpdateExpression: 'SET #s = :s, clickedAt = if_not_exists(clickedAt, :t), openedAt = if_not_exists(openedAt, :t)',
      ExpressionAttributeNames:  { '#s': 'status' },
      ExpressionAttributeValues: { ':s': 'clicked', ':t': now },
    })).catch(() => {})
  } else if (type === 'email.bounced' || type === 'email.complained') {
    await dynamo.send(new UpdateCommand({
      TableName: 'plexora-email-sends',
      Key: { campaignId, contactId },
      UpdateExpression: 'SET #s = :s',
      ExpressionAttributeNames:  { '#s': 'status' },
      ExpressionAttributeValues: { ':s': type === 'email.complained' ? 'complained' : 'bounced' },
    })).catch(() => {})
  }

  return { ok: true }
})
