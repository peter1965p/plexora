import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { resolveUserId, invalidateTenantCache } from '../../utils/tenant'
import { randomUUID } from 'crypto'
import { Resend } from 'resend'

export default defineEventHandler(async (event) => {
  const { inviterEmail, inviteeEmail, role = 'member' } = await readBody(event)
  if (!inviterEmail || !inviteeEmail) throw createError({ statusCode: 400, message: 'inviterEmail + inviteeEmail erforderlich' })

  const tenantId = await resolveUserId(inviterEmail)
  const dynamo   = getDynamoClient()

  // Prüfen ob schon Mitglied
  const existing = await dynamo.send(new GetCommand({
    TableName: 'plexora-team-members',
    Key: { tenantId, memberEmail: inviteeEmail },
  }))
  if (existing.Item) throw createError({ statusCode: 409, message: 'Bereits eingeladen oder Mitglied' })

  const token = randomUUID()
  await dynamo.send(new PutCommand({
    TableName: 'plexora-team-members',
    Item: {
      tenantId,
      memberEmail: inviteeEmail,
      role,
      status: 'invited',
      inviteToken: token,
      invitedAt: new Date().toISOString(),
      joinedAt: '',
    },
  }))

  invalidateTenantCache(inviteeEmail)

  const config  = useRuntimeConfig()
  const resend  = new Resend(config.resendApiKey as string)
  const appUrl  = 'https://app.plexora.eu'

  await resend.emails.send({
    from: 'team@plexora.eu',
    to: inviteeEmail,
    subject: 'Du wurdest zu Plexora eingeladen',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
        <h2 style="margin-bottom:8px">Einladung zu Plexora</h2>
        <p style="color:#666">${inviterEmail} hat dich eingeladen, dem Team auf Plexora beizutreten.</p>
        <a href="${appUrl}/invite?token=${token}" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#6C3FE8;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Einladung annehmen
        </a>
        <p style="margin-top:32px;color:#999;font-size:12px">Dieser Link ist einmalig gültig. Falls du diese E-Mail nicht erwartet hast, ignoriere sie einfach.</p>
      </div>
    `,
  })

  return { success: true }
})
