import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=60',
  })

  const tenantId = getRouterParam(event, 'tenantId') || ''
  const dynamo   = getDynamoClient()

  const res = await dynamo.send(new GetCommand({
    TableName: 'plexora-nexora',
    Key: { tenantId },
  }))

  if (!res.Item || res.Item.status !== 'active') {
    throw createError({ statusCode: 404, message: 'Tenant not found' })
  }

  return {
    tenantId:       res.Item.tenantId,
    companyName:    res.Item.companyName    || '',
    subdomain:      res.Item.subdomain      || '',
    config:         res.Item.config         || {},
    logoUrl:        res.Item.logoUrl        || '',
    faviconUrl:     res.Item.faviconUrl     || '',
    heroBackground: res.Item.heroBackground || 'grid',
    heroTitleSize:  res.Item.heroTitleSize  || 'lg',
    heroGradient:   res.Item.heroGradient   || { from: '#fb923c', via: '#ea580c', to: '#431407' },
    servicesLayout: res.Item.servicesLayout || 'auto',
    heroMediaType:  res.Item.heroMediaType  || 'code',
    heroImageUrl:   res.Item.heroImageUrl   || '',
  }
})
