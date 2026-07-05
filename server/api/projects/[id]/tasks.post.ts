import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { assertOwner } from '../../../utils/ownership'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id')
  const body      = await readBody(event)
  const client    = getDynamoClient()

  const scan = await client.send(new ScanCommand({
    TableName: 'plexora-projects',
    FilterExpression: 'projectId = :id',
    ExpressionAttributeValues: { ':id': projectId },
  }))
  const project = scan.Items?.[0]
  if (!project) throw createError({ statusCode: 404 })
  await assertOwner(event, project)

  const task = {
    taskId:         randomUUID(),
    title:          body.title,
    description:    body.description || '',
    assignee:       body.assignee || '',
    startDate:      body.startDate || new Date().toISOString().slice(0, 10),
    endDate:        body.endDate || '',
    status:         body.status || 'todo',
    priority:       body.priority || 'medium',
    estimatedHours: Number(body.estimatedHours) || 0,
    subtasks:       [],
    comments:       [],
    created:        new Date().toISOString(),
  }

  await client.send(new UpdateCommand({
    TableName: 'plexora-projects',
    Key: { userId: project.userId, projectId },
    UpdateExpression: 'SET tasks = list_append(if_not_exists(tasks, :empty), :t)',
    ExpressionAttributeValues: { ':empty': [], ':t': [task] },
  }))
  return { success: true, task }
})
