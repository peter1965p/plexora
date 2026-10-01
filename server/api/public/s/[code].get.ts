import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

// Löst einen Kurzlink auf — öffentlich, kein Auth. Respektiert den Service-Schalter des
// Tenants: ist der URL-Shortener deaktiviert, hört auch ein bereits verteilter Link auf,
// zu funktionieren (bewusst "fail closed", passend zu "ist der Service aktiv").
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' })

  const shortCode = getRouterParam(event, 'code') || ''
  const dynamo = getDynamoClient()

  const res = await dynamo.send(new GetCommand({ TableName: 'plexora-shortlinks', Key: { shortCode } }))
  const item = res.Item
  if (!item) throw createError({ statusCode: 404, message: 'Link nicht gefunden' })

  const settingsRes = await dynamo.send(new GetCommand({
    TableName: 'plexora-settings', Key: { settingId: 'shortener', scope: item.userId },
  })).catch(() => null)
  if (!settingsRes?.Item?.enabled) {
    throw createError({ statusCode: 404, message: 'Link nicht verfügbar' })
  }

  dynamo.send(new UpdateCommand({
    TableName: 'plexora-shortlinks',
    Key: { shortCode },
    UpdateExpression: 'ADD clicks :one',
    ExpressionAttributeValues: { ':one': 1 },
  })).catch(() => {})

  return { targetUrl: item.targetUrl }
})
