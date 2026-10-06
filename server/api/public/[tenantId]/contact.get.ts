import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { contactIsProtected, widgetConfig } from '../../../utils/botGuard'

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
    throw createError({ statusCode: 404, message: 'Tenant nicht gefunden' })
  }

  const ci = res.Item.contactInfo || {}
  const guard = await contactIsProtected(String(res.Item.email || ''))
  return {
    botProtection: await widgetConfig(guard.ownerScope, guard.protected),
    email:        ci.email        || '',
    phone:        ci.phone        || '',
    address:      ci.address      || '',
    region:       ci.region       || '',
    availability: ci.availability || '',
    legalName:    ci.legalName    || '',
    vatId:        ci.vatId        || '',
  }
})
