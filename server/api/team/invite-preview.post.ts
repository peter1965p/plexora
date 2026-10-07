import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireAuth } from '../../utils/verifyAuth'
import { sameEmail, inviteExpired, inviteExpiresAt, hasOwnWorkspace } from '../../utils/teamInvite'

// Vorschau für die Annahmeseite: wer lädt ein, bis wann gilt es, und kann dieses Konto die Einladung überhaupt annehmen?
// Nur mit Anmeldung, und nur für das Konto mit der eingeladenen Adresse (sonst gibt die Route nichts preis). Der Token kommt im Body, nicht in der URL.
export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  if (!auth.email) throw createError({ statusCode: 401, message: 'Anmeldung erforderlich' })
  const body = (await readBody(event)) || {}
  const token = typeof body.token === 'string' ? body.token : ''
  if (!token) throw createError({ statusCode: 400, message: 'Einladungs-Token fehlt' })

  const res = await getDynamoClient().send(new ScanCommand({
    TableName: 'plexora-team-members',
    FilterExpression: 'inviteToken = :t AND #s = :invited',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':t': token, ':invited': 'invited' },
  }))
  const invite = res.Items?.[0]
  if (!invite) throw createError({ statusCode: 404, message: 'Einladung nicht gefunden, bereits verwendet oder zurückgezogen' })
  if (!sameEmail(invite.memberEmail, auth.email)) throw createError({ statusCode: 403, message: 'Diese Einladung wurde für eine andere E-Mail-Adresse ausgestellt. Bitte melde dich mit der eingeladenen Adresse an.' })

  const expired = inviteExpired(invite.invitedAt)
  return {
    inviter: String(invite.tenantId || ''),
    role: invite.role === 'admin' ? 'admin' : 'member',
    expiresAt: inviteExpiresAt(invite.invitedAt),
    expired,
    emailVerified: auth.emailVerified === true,
    hasOwnWorkspace: expired ? false : await hasOwnWorkspace(auth.email),
  }
})
