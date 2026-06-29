import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const email = getHeader(event, 'x-user-email') || ''
  if (!email) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body   = await readBody(event)
  const dynamo = getDynamoClient()

  const res  = await dynamo.send(new ScanCommand({
    TableName:        'plexora-nexora',
    FilterExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
  }))

  const item = res.Items?.[0]
  if (!item) throw createError({ statusCode: 404, message: 'Nexora Tenant nicht gefunden' })

  await dynamo.send(new UpdateCommand({
    TableName:  'plexora-nexora',
    Key:        { tenantId: item.tenantId },
    UpdateExpression: 'SET companyName = :cn, subdomain = :sd, customDomain = :cd, config = :cfg, services = :svc, hero = :hero, about = :about, contactInfo = :ci, pages = :pg, theme = :th, footer = :ft, logoUrl = :logo, faviconUrl = :fav, heroBackground = :hbg, heroGradient = :hgr, servicesLayout = :sl, updatedAt = :u',
    ExpressionAttributeValues: {
      ':cn':   body.companyName     ?? item.companyName     ?? '',
      ':sd':   body.subdomain       ?? item.subdomain       ?? '',
      ':cd':   body.customDomain    ?? item.customDomain    ?? '',
      ':cfg':  { ...(item.config    || {}), ...(body.config || {}) },
      ':svc':  body.services        ?? item.services        ?? [],
      ':hero': body.hero            ?? item.hero            ?? {},
      ':about':body.about           ?? item.about           ?? {},
      ':ci':   body.contactInfo     ?? item.contactInfo     ?? {},
      ':pg':   body.pages           ?? item.pages           ?? [],
      ':th':   body.theme           ?? item.theme           ?? 'midnight',
      ':ft':   body.footer          ?? item.footer          ?? {},
      ':logo': body.logoUrl         ?? item.logoUrl         ?? '',
      ':fav':  body.faviconUrl      ?? item.faviconUrl      ?? '',
      ':hbg':  body.heroBackground  ?? item.heroBackground  ?? 'grid',
      ':hgr':  body.heroGradient    ?? item.heroGradient    ?? { from: '#fb923c', via: '#ea580c', to: '#431407' },
      ':sl':   body.servicesLayout  ?? item.servicesLayout  ?? 'auto',
      ':u':    new Date().toISOString(),
    }
  }))

  return { success: true }
})
