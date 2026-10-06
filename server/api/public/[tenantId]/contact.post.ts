import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { randomUUID } from 'crypto'
import { enforcePublicRateLimit } from '../../../utils/rateLimit'
import { contactIsProtected, verifyBotToken } from '../../../utils/botGuard'

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Access-Control-Allow-Origin': '*' })

  if (getMethod(event) === 'OPTIONS') {
    setResponseHeaders(event, {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    return ''
  }

  await enforcePublicRateLimit(event, 'contact')

  const tenantId = getRouterParam(event, 'tenantId') || ''
  const body     = await readBody(event)

  if (!body?.email || !body?.name) {
    throw createError({ statusCode: 400, message: 'name und email sind Pflicht' })
  }

  const dynamo = getDynamoClient()

  // Tenant prüfen
  const tenant = await dynamo.send(new GetCommand({
    TableName: 'plexora-nexora',
    Key: { tenantId },
  }))
  if (!tenant.Item || tenant.Item.status !== 'active') {
    throw createError({ statusCode: 404, message: 'Tenant nicht gefunden' })
  }

  // Bot-Schutz für die Kontaktseite: Schalter aus den gespeicherten Einstellungen des Inhabers
  const guard = await contactIsProtected(String(tenant.Item.email || ''))
  if (guard.protected) await verifyBotToken(event, guard.ownerScope, body?.turnstileToken, tenant.Item.customDomain)

  // Name splitten
  const parts     = (body.name as string).trim().split(' ')
  const firstName = parts[0] || body.name
  const lastName  = parts.slice(1).join(' ') || ''

  // Direkt als CRM-Lead anlegen
  const contact = {
    userId:     tenantId,
    contactId:  randomUUID(),
    firstName,
    lastName,
    email:      body.email,
    company:    body.company || '',
    companyId:  '',
    phone:      body.phone   || '',
    message:    body.message || '',
    status:     'lead',
    leadSource: 'nexora_website',
    leadStatus: 'new',
    score:      10,
    customerId: '',
    convertedAt: '',
    accessCount: 0,
    lastAccessedAt: '',
    created:    new Date().toISOString(),
  }

  await dynamo.send(new PutCommand({ TableName: 'plexora-contacts', Item: contact }))

  return { success: true, message: 'Vielen Dank! Wir melden uns in Kürze.' }
})
