import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { invalidateTenantCache } from '../../utils/tenant'

export default defineEventHandler(async (event) => {
  const { token, email } = await readBody(event)
  if (!token || !email) throw createError({ statusCode: 400, message: 'token + email erforderlich' })

  const dynamo = getDynamoClient()

  const res = await dynamo.send(new ScanCommand({
    TableName: 'plexora-team-members',
    FilterExpression: 'inviteToken = :t AND #s = :invited',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':t': token, ':invited': 'invited' },
  }))

  const invite = res.Items?.[0]
  if (!invite) throw createError({ statusCode: 404, message: 'Einladung nicht gefunden oder bereits verwendet' })

  if (invite.memberEmail !== email) throw createError({ statusCode: 403, message: 'E-Mail stimmt nicht überein' })

  await dynamo.send(new UpdateCommand({
    TableName: 'plexora-team-members',
    Key: { tenantId: invite.tenantId, memberEmail: email },
    UpdateExpression: 'SET #s = :active, joinedAt = :now, inviteToken = :empty',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':active': 'active',
      ':now': new Date().toISOString(),
      ':empty': '',
    },
  }))

  invalidateTenantCache(email)
  return { success: true, tenantId: invite.tenantId }
})
