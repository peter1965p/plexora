import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  })

  const tenantId = getRouterParam(event, 'tenantId') || ''
  const dynamo   = getDynamoClient()

  const res = await dynamo.send(new GetCommand({
    TableName: 'plexora-nexora',
    Key: { tenantId },
  }))

  if (!res.Item || res.Item.status !== 'active' || !res.Item.termineEnabled) {
    throw createError({ statusCode: 404, message: 'Termine nicht aktiviert' })
  }

  const typesRes = await dynamo.send(new QueryCommand({
    TableName: 'plexora-termine-types',
    KeyConditionExpression: 'tenantId = :t',
    ExpressionAttributeValues: { ':t': tenantId },
  }))

  const types = (typesRes.Items || [])
    .filter(t => t.active)
    .map(t => ({ typeId: t.typeId, name: t.name, durationMinutes: t.durationMinutes }))

  return {
    title:    res.Item.termineTitle || 'Termine',
    timezone: res.Item.termineTimezone || 'Europe/Berlin',
    types,
  }
})
