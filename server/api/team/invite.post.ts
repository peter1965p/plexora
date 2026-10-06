import { PutCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { resolveUserId, invalidateTenantCache } from '../../utils/tenant'
import { requireMailSender, validRecipient } from '../../utils/mailGuard'
import { sendMail } from '../../utils/mailer'
import { randomUUID } from 'crypto'

const ALLOWED_ROLES = ['member', 'admin']

export default defineEventHandler(async (event) => {
  // Anmeldung Pflicht (401), Demo-Konto gesperrt (403): die Route versendet Mails über die Plattform-Domain
  const auth = requireMailSender(event)
  const inviterEmail = auth.email

  const body = (await readBody(event)) || {}
  const inviteeEmail = validRecipient(body.inviteeEmail)
  if (!inviteeEmail) throw createError({ statusCode: 400, message: 'Bitte eine gültige E-Mail-Adresse angeben.' })
  const role = body.role === undefined ? 'member' : body.role
  if (!ALLOWED_ROLES.includes(role)) throw createError({ statusCode: 400, message: 'Ungültige Rolle.' })

  // Besitzerprüfung: nur der Inhaber des Kontos lädt ein. Ein eingeladenes Mitglied sieht alle Daten des Inhabers
  // und darf daher nicht selbst weitere Personen hereinholen.
  const tenantId = await resolveUserId(inviterEmail)
  if (tenantId !== inviterEmail) throw createError({ statusCode: 403, message: 'Nur der Inhaber des Kontos kann Mitglieder einladen.' })
  if (inviteeEmail.toLowerCase() === inviterEmail.toLowerCase()) throw createError({ statusCode: 400, message: 'Du kannst dich nicht selbst einladen.' })

  const dynamo = getDynamoClient()

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

  const appUrl = 'https://app.plexora.eu'
  const status = await sendMail({
    userId: tenantId,
    kind: 'internal',
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

  if (status === 'failed') {
    // Die Einladung ist ohne Mail nutzlos: wieder entfernen, damit der Inhaber es erneut versuchen kann
    await dynamo.send(new DeleteCommand({ TableName: 'plexora-team-members', Key: { tenantId, memberEmail: inviteeEmail } }))
    invalidateTenantCache(inviteeEmail)
    throw createError({ statusCode: 502, message: 'Die Einladungs-Mail konnte nicht gesendet werden. Bitte später erneut versuchen.' })
  }

  return { success: true }
})
