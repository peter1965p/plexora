import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const email  = getHeader(event, 'x-user-email') || ''
  if (!email) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const dynamo = getDynamoClient()
  const res    = await dynamo.send(new ScanCommand({
    TableName:        'plexora-nexora',
    FilterExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
  }))

  const item = res.Items?.[0]
  if (!item) return { nexora: null }

  return {
    nexora: {
      tenantId:       item.tenantId,
      apiKey:         item.apiKey,
      companyName:    item.companyName    || '',
      subdomain:      item.subdomain      || '',
      customDomain:   item.customDomain   || '',
      status:         item.status,
      config:         item.config         || {},
      createdAt:      item.createdAt,
      hero:           item.hero           || {},
      about:          item.about          || {},
      services:       item.services       || [],
      contactInfo:    item.contactInfo    || {},
      pages:          item.pages          || [],
      theme:          item.theme          || 'midnight',
      footer:         item.footer         || {},
      logoUrl:        item.logoUrl        || '',
      faviconUrl:     item.faviconUrl     || '',
      heroBackground: item.heroBackground || 'grid',
      heroTitleSize:  item.heroTitleSize  || 'lg',
      heroGradient:   item.heroGradient   || { from: '#fb923c', via: '#ea580c', to: '#431407' },
      servicesLayout: item.servicesLayout || 'auto',
      stackEnabled:   item.stackEnabled   ?? true,
      stackItems:     item.stackItems     || [],
      stackTitle:     item.stackTitle     || 'TECH STACK',
      stackLegend:    item.stackLegend    || {},
      clientsEnabled: item.clientsEnabled ?? false,
      clientsItems:   item.clientsItems   || [],
      clientsTitle:   item.clientsTitle   || 'REFERENZEN',
      githubEnabled:  item.githubEnabled  ?? false,
      githubPat:      item.githubPat      || '',
      githubRepos:    item.githubRepos    || [],
      githubTitle:    item.githubTitle    || 'PROJEKTE',
      githubShowForks: item.githubShowForks ?? false,
    }
  }
})
