import { requireAuth } from '../../../utils/verifyAuth'
import { resolveUserId } from '../../../utils/tenant'
import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { randomBytes } from 'crypto'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789' // ohne 0/O/1/I/l — leicht lesbar
function generateCode(len = 6): string {
  const bytes = randomBytes(len)
  let code = ''
  for (let i = 0; i < len; i++) code += ALPHABET[bytes[i] % ALPHABET.length]
  return code
}

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const userId = await resolveUserId(auth.email)
  const body = await readBody(event)
  const targetUrl = String(body?.targetUrl || '').trim()
  if (!/^https?:\/\//i.test(targetUrl)) {
    throw createError({ statusCode: 400, message: 'Gültige targetUrl (http/https) erforderlich' })
  }

  const dynamo = getDynamoClient()

  const settingsRes = await dynamo.send(new GetCommand({
    TableName: 'plexora-settings', Key: { settingId: 'shortener', scope: userId },
  })).catch(() => null)
  if (!settingsRes?.Item?.enabled) {
    throw createError({ statusCode: 400, message: 'URL-Shortener ist nicht aktiviert' })
  }

  // Bestehenden Link für dieselbe Ziel-URL wiederverwenden statt Duplikate anzulegen.
  const existing = await dynamo.send(new QueryCommand({
    TableName: 'plexora-shortlinks',
    IndexName: 'userId-index',
    KeyConditionExpression: 'userId = :u',
    FilterExpression: 'targetUrl = :t',
    ExpressionAttributeValues: { ':u': userId, ':t': targetUrl },
  }))
  if (existing.Items?.length) return { link: existing.Items[0] }

  let shortCode = ''
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateCode()
    const taken = await dynamo.send(new GetCommand({ TableName: 'plexora-shortlinks', Key: { shortCode: candidate } }))
    if (!taken.Item) { shortCode = candidate; break }
  }
  if (!shortCode) throw createError({ statusCode: 500, message: 'Konnte keinen freien Short-Code generieren' })

  const link = {
    shortCode,
    userId,
    targetUrl,
    label: String(body?.label || ''),
    clicks: 0,
    created: new Date().toISOString(),
  }
  await dynamo.send(new PutCommand({ TableName: 'plexora-shortlinks', Item: link }))
  return { link }
})
