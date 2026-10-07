import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { invalidateTenantCache } from '../../utils/tenant'
import { requireAuth } from '../../utils/verifyAuth'
import { isDemoAccount } from '../../utils/mailGuard'
import { sameEmail, inviteExpired, hasOwnWorkspace, OWN_WORKSPACE_MESSAGE } from '../../utils/teamInvite'

// Einladung annehmen. Anmeldung ist Pflicht: nur das Konto mit der eingeladenen (und verifizierten) E-Mail-Adresse darf annehmen.
// Die Adresse kommt aus dem Token, nie aus dem Body. Hat das Konto schon einen eigenen Arbeitsbereich, wird abgelehnt statt stillschweigend ersetzt.
export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  if (!auth.email) throw createError({ statusCode: 401, message: 'Anmeldung erforderlich' })
  if (isDemoAccount(auth)) throw createError({ statusCode: 403, message: 'Im Demo-Zugang können keine Einladungen angenommen werden.' })

  const body = (await readBody(event)) || {}
  const token = typeof body.token === 'string' ? body.token : ''
  if (!token) throw createError({ statusCode: 400, message: 'Einladungs-Token fehlt' })

  const dynamo = getDynamoClient()
  const res = await dynamo.send(new ScanCommand({
    TableName: 'plexora-team-members',
    FilterExpression: 'inviteToken = :t AND #s = :invited',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':t': token, ':invited': 'invited' },
  }))
  const invite = res.Items?.[0]
  if (!invite) throw createError({ statusCode: 404, message: 'Einladung nicht gefunden, bereits verwendet oder zurückgezogen' })

  if (!sameEmail(invite.memberEmail, auth.email)) throw createError({ statusCode: 403, message: 'Diese Einladung wurde für eine andere E-Mail-Adresse ausgestellt. Bitte melde dich mit der eingeladenen Adresse an.' })
  if (auth.emailVerified !== true) throw createError({ statusCode: 403, message: 'Deine E-Mail-Adresse ist noch nicht bestätigt. Bitte bestätige sie und versuche es erneut.' })
  if (inviteExpired(invite.invitedAt)) throw createError({ statusCode: 410, message: 'Die Einladung ist abgelaufen (7 Tage gültig). Bitte lass dir eine neue schicken.' })
  if (await hasOwnWorkspace(auth.email)) throw createError({ statusCode: 409, message: OWN_WORKSPACE_MESSAGE })

  try {
    await dynamo.send(new UpdateCommand({
      TableName: 'plexora-team-members',
      Key: { tenantId: invite.tenantId, memberEmail: invite.memberEmail },
      UpdateExpression: 'SET #s = :active, joinedAt = :now, inviteToken = :empty',
      // Einmalig nutzbar: zwei gleichzeitige Annahmen können nicht beide gewinnen
      ConditionExpression: '#s = :invited AND inviteToken = :t',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':active': 'active', ':invited': 'invited', ':t': token, ':now': new Date().toISOString(), ':empty': '' },
    }))
  } catch (e: any) {
    if (e?.name === 'ConditionalCheckFailedException') throw createError({ statusCode: 409, message: 'Die Einladung wurde bereits verwendet oder zurückgezogen.' })
    throw e
  }

  invalidateTenantCache(invite.memberEmail)
  invalidateTenantCache(auth.email)
  return { success: true, tenantId: invite.tenantId }
})
