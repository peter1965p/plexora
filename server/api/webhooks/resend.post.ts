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
  const contactId  = tags.contactId
  if (!campaignId || !contactId) return { ok: true }

  const dynamo = getDynamoClient()
  const now    = new Date().toISOString()

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
