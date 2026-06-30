import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

const DEFAULT_ORDER = ['stack', 'clients', 'github', 'services', 'contact']

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
    sectionOrder: res.Item.sectionOrder || DEFAULT_ORDER,
  }
})
