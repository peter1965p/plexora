import { resolveUserId } from '../../utils/tenant'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const body   = await readBody(event)
  const client = getDynamoClient()

  const project = {
    userId: await resolveUserId(event.context.auth?.email || 'demo-user'),
    projectId:   randomUUID(),
    name:        body.name,
    description: body.description || '',
    companyId:   body.companyId || '',
    contactId:   body.contactId || '',
    team:        body.team || '',
    deadline:    body.deadline || '',
    progress:    body.progress ?? 0,
    status:      body.status || 'active',
    priority:    body.priority || 'medium',
    notes:       body.notes || '',
    created:     new Date().toISOString(),
  }

  await client.send(new PutCommand({ TableName: 'plexora-projects', Item: project }))
  return { success: true, project }
})
