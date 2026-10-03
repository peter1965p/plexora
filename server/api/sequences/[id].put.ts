import { requireAuth } from '../../utils/verifyAuth'
import { resolveUserId } from '../../utils/tenant'
import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { validateGraph } from '../../utils/sequences'

export default defineEventHandler(async (event) => {
  const { email } = requireAuth(event)
  if (email === 'demo@plexora.eu') throw createError({ statusCode: 403, message: 'Demo-Account kann keine Sequenzen ändern' })
  const userId = await resolveUserId(email)
  const sequenceId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const dynamo = getDynamoClient()

  const existing = await dynamo.send(new GetCommand({ TableName: 'plexora-sequences', Key: { userId, sequenceId } }))
  if (!existing.Item) throw createError({ statusCode: 404, message: 'Sequenz nicht gefunden' })

  const { graph, trigger } = validateGraph(body?.graph)
  const sequence = {
    ...existing.Item,
    name: String(body?.name || '').trim() || existing.Item.name,
    trigger,
    graph,
    enabled: body?.enabled ?? existing.Item.enabled,
    updated: new Date().toISOString(),
  }
  await dynamo.send(new PutCommand({ TableName: 'plexora-sequences', Item: sequence }))
  return { sequence }
})
