import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { resolveUserId } from '../../../utils/tenant'
import { requireAuth } from '../../../utils/verifyAuth'
import { assertNotDemo } from '../../../utils/demoPolicy'
import { applyScheduleChanges, GanttError, isIsoDate, type GanttTask } from '../../../../shared/gantt'

// Projektplan ändern: Termine, Fortschritt, Meilenstein, Vorgänger, Zuständige. Es werden ausschließlich diese Plan-Felder übernommen (nie Titel, Status oder andere Felder aus dem Body).
// Nachfolger rücken automatisch nach hinten; Kreise und unmögliche Daten werden abgelehnt. "rev" schützt vor gleichzeitigem Überschreiben (409, wenn der Plan zwischenzeitlich geändert wurde).
const today = () => new Date().toISOString().slice(0, 10)
export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  assertNotDemo(auth, 'Im Demo-Zugang nicht möglich.')
  if (!auth.email) throw createError({ statusCode: 401, message: 'Anmeldung erforderlich' })
  const tenantId = await resolveUserId(auth.email)
  const projectId = String(getRouterParam(event, 'id') || '')
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) throw createError({ statusCode: 404, message: 'Projekt nicht gefunden' })
  const body: any = await readBody(event).catch(() => ({}))
  if (!Array.isArray(body?.changes) || body.changes.length === 0 || body.changes.length > 200) throw createError({ statusCode: 400, message: 'Keine Änderungen angegeben.' })

  const db = getDynamoClient()
  const project = (await db.send(new GetCommand({ TableName: 'plexora-projects', Key: { userId: tenantId, projectId } }))).Item
  if (!project) throw createError({ statusCode: 404, message: 'Projekt nicht gefunden' })
  const rev = Number(project.scheduleRev || 0)
  if (body.rev !== undefined && Number(body.rev) !== rev) throw createError({ statusCode: 409, message: 'Der Plan wurde zwischenzeitlich geändert. Bitte neu laden.' })

  const original: any[] = Array.isArray(project.tasks) ? project.tasks : []
  // Vorgänge ohne gültige Daten bekommen einen Beginn (heute) und Ende = Beginn, damit die Planung rechnen kann
  const planTasks: GanttTask[] = original.map(t => { const start = isIsoDate(t.startDate) ? t.startDate : today(); return { taskId: t.taskId, title: t.title, startDate: start, endDate: isIsoDate(t.endDate) && t.endDate >= start ? t.endDate : start, progress: Number(t.progress) || 0, milestone: t.milestone === true, predecessors: Array.isArray(t.predecessors) ? t.predecessors : [], assignee: t.assignee, status: t.status } })
  const changes = body.changes.map((c: any) => ({ taskId: String(c?.taskId || ''), ...(c?.startDate !== undefined ? { startDate: c.startDate } : {}), ...(c?.endDate !== undefined ? { endDate: c.endDate } : {}), ...(c?.progress !== undefined ? { progress: c.progress } : {}), ...(c?.milestone !== undefined ? { milestone: c.milestone } : {}), ...(c?.predecessors !== undefined ? { predecessors: c.predecessors } : {}), ...(c?.assignee !== undefined ? { assignee: c.assignee } : {}) }))
  let next: GanttTask[]
  try { next = applyScheduleChanges(planTasks, changes) } catch (e: any) { if (e instanceof GanttError) throw createError({ statusCode: 422, message: e.message }); throw e }

  const byId = new Map(next.map(t => [t.taskId, t]))
  const tasks = original.map(t => { const n = byId.get(t.taskId)!; return { ...t, startDate: n.startDate, endDate: n.endDate, progress: n.progress ?? 0, milestone: n.milestone === true, predecessors: n.predecessors || [], assignee: n.assignee ?? t.assignee ?? '', status: n.status ?? t.status } })
  try {
    await db.send(new UpdateCommand({
      TableName: 'plexora-projects', Key: { userId: tenantId, projectId },
      UpdateExpression: 'SET tasks = :tasks, scheduleRev = :next',
      ConditionExpression: 'scheduleRev = :rev OR (attribute_not_exists(scheduleRev) AND :rev = :zero)',
      ExpressionAttributeValues: { ':tasks': tasks, ':next': rev + 1, ':rev': rev, ':zero': 0 },
    }))
  } catch (e: any) {
    if (e?.name === 'ConditionalCheckFailedException') throw createError({ statusCode: 409, message: 'Der Plan wurde zwischenzeitlich geändert. Bitte neu laden.' })
    throw e
  }
  return { success: true, tasks, rev: rev + 1 }
})
