import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { resolveUserId } from '../../utils/tenant'
import { requireAuth } from '../../utils/verifyAuth'
import { inviteExpired, inviteExpiresAt } from '../../utils/teamInvite'

export default defineEventHandler(async (event) => {
  // Anmeldung ist Pflicht; der Mandant kommt nur aus dem Token (der Parameter ?userId= der Oberfläche wird ignoriert)
  const email = requireAuth(event).email || ''
  if (!email) throw createError({ statusCode: 401, message: 'Anmeldung erforderlich' })

  const tenantId = await resolveUserId(email)
  const dynamo = getDynamoClient()

  const res = await dynamo.send(new QueryCommand({
    TableName: 'plexora-team-members',
    KeyConditionExpression: 'tenantId = :t',
    ExpressionAttributeValues: { ':t': tenantId },
  }))

  // Der Einladungs-Token ist ein Geheimnis (er schaltet die Einladung frei) und gehört nicht in die Antwort
  const members = (res.Items || []).map(({ inviteToken, ...rest }: any) => ({ ...rest, invitePending: !!inviteToken && rest.status === 'invited', inviteExpired: rest.status === 'invited' && inviteExpired(rest.invitedAt), inviteExpiresAt: rest.status === 'invited' ? inviteExpiresAt(rest.invitedAt) : null }))
  return { members }
})
