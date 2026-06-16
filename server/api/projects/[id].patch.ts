import { UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id')
  const body      = await readBody(event)
  const client    = getDynamoClient()

  const scan = await client.send(new ScanCommand({
    TableName: 'plexora-projects',
    FilterExpression: 'projectId = :id',
    ExpressionAttributeValues: { ':id': projectId }
  }))

  const existing = scan.Items?.[0]
  if (!existing) throw createError({ statusCode: 404, message: 'Projekt nicht gefunden' })

  await client.send(new UpdateCommand({
    TableName: 'plexora-projects',
    Key: { userId: existing.userId, projectId },
    UpdateExpression: 'SET #nm = :nm, description = :desc, companyId = :coid, contactId = :ctid, team = :tm, deadline = :dl, progress = :pg, #st = :st, priority = :pr, notes = :no',
    ExpressionAttributeNames: { '#nm': 'name', '#st': 'status' },
    ExpressionAttributeValues: {
      ':nm':   body.name,
      ':desc': body.description || '',
      ':coid': body.companyId || '',
      ':ctid': body.contactId || '',
      ':tm':   body.team || '',
      ':dl':   body.deadline || '',
      ':pg':   body.progress ?? existing.progress ?? 0,
      ':st':   body.status || 'active',
      ':pr':   body.priority || 'medium',
      ':no':   body.notes || '',
    }
  }))

  return { success: true }
})
