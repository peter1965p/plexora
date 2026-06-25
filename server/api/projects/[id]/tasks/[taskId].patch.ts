import { ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id')
  const taskId    = getRouterParam(event, 'taskId')
  const body      = await readBody(event)
  const client    = getDynamoClient()

  const scan = await client.send(new ScanCommand({
    TableName: 'plexora-projects',
    FilterExpression: 'projectId = :id',
    ExpressionAttributeValues: { ':id': projectId },
  }))
  const project = scan.Items?.[0]
  if (!project) throw createError({ statusCode: 404 })

  const tasks = (project.tasks || []) as any[]
  const idx   = tasks.findIndex((t: any) => t.taskId === taskId)
  if (idx < 0) throw createError({ statusCode: 404, message: 'Task nicht gefunden' })

  if (body.action === 'add_subtask') {
    tasks[idx].subtasks = [...(tasks[idx].subtasks || []), { id: randomUUID(), text: body.text, done: false }]
  } else if (body.action === 'toggle_subtask') {
    tasks[idx].subtasks = (tasks[idx].subtasks || []).map((s: any) => s.id === body.subtaskId ? { ...s, done: !s.done } : s)
  } else if (body.action === 'add_comment') {
    tasks[idx].comments = [...(tasks[idx].comments || []), { id: randomUUID(), author: body.author || 'Team', text: body.text, created: new Date().toISOString() }]
  } else if (body.action === 'log_time') {
    tasks[idx].loggedHours = (tasks[idx].loggedHours || 0) + Number(body.hours)
  } else {
    // generic field update
    Object.assign(tasks[idx], { ...body, action: undefined })
  }

  await client.send(new PutCommand({ TableName: 'plexora-projects', Item: { ...project, tasks } }))
  return { success: true, task: tasks[idx] }
})
