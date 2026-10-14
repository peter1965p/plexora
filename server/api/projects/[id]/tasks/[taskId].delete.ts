import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { resolveUserId } from '../../../../utils/tenant'
import { requireAuth } from '../../../../utils/verifyAuth'
import { assertNotDemo } from '../../../../utils/demoPolicy'

// Vorgang oder Meilenstein löschen; er wird auch aus den Vorgängerlisten der anderen Vorgänge entfernt.
export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  assertNotDemo(auth, 'Im Demo-Zugang nicht möglich.')
  if (!auth.email) throw createError({ statusCode: 401, message: 'Anmeldung erforderlich' })
  const tenantId = await resolveUserId(auth.email)
  const projectId = String(getRouterParam(event, 'id') || ''), taskId = String(getRouterParam(event, 'taskId') || '')
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) throw createError({ statusCode: 404, message: 'Projekt nicht gefunden' })
  const db = getDynamoClient()
  const project = (await db.send(new GetCommand({ TableName: 'plexora-projects', Key: { userId: tenantId, projectId } }))).Item
  if (!project) throw createError({ statusCode: 404, message: 'Projekt nicht gefunden' })
  const tasks: any[] = Array.isArray(project.tasks) ? project.tasks : []
  if (!tasks.some(t => t.taskId === taskId)) throw createError({ statusCode: 404, message: 'Vorgang nicht gefunden' })
  const next = tasks.filter(t => t.taskId !== taskId).map(t => (Array.isArray(t.predecessors) && t.predecessors.includes(taskId) ? { ...t, predecessors: t.predecessors.filter((p: string) => p !== taskId) } : t))
  await db.send(new UpdateCommand({ TableName: 'plexora-projects', Key: { userId: tenantId, projectId }, UpdateExpression: 'SET tasks = :t, scheduleRev = if_not_exists(scheduleRev, :z) + :one', ExpressionAttributeValues: { ':t': next, ':z': 0, ':one': 1 }, ConditionExpression: 'attribute_exists(projectId)' }))
  return { success: true }
})
