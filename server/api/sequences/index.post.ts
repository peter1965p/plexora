import { requireAuth } from '../../utils/verifyAuth'
import { resolveUserId } from '../../utils/tenant'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { validateGraph } from '../../utils/sequences'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const { email } = requireAuth(event)
  if (email === 'demo@plexora.eu') throw createError({ statusCode: 403, message: 'Demo-Account kann keine Sequenzen anlegen' })
  const userId = await resolveUserId(email)
  const body = await readBody(event)
  const { graph, trigger } = validateGraph(body?.graph)

  const sequence = {
    userId,
    sequenceId: randomUUID(),
    name: String(body?.name || '').trim() || 'Neue Sequenz',
    trigger,
    graph,
    enabled: body?.enabled !== false,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  }
  await getDynamoClient().send(new PutCommand({ TableName: 'plexora-sequences', Item: sequence }))
  return { sequence }
})
