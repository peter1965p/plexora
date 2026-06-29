import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=30',
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

  return { services: res.Item.services || [] }
})
