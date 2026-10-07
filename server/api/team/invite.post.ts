import { PutCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { resolveUserId, invalidateTenantCache } from '../../utils/tenant'
import { requireMailSender, validRecipient } from '../../utils/mailGuard'
import { sendMail } from '../../utils/mailer'
import { randomUUID } from 'crypto'
import { checkRateLimit } from '../../utils/rateLimit'
import { inviteExpired, INVITES_PER_DAY, INVITE_TTL_DAYS } from '../../utils/teamInvite'
import { loadInviteConfig, resolveInviteLogoUrl } from '../../utils/mailTemplateStore'
import { renderInviteMail, resolveInviteConfig, APP_ORIGIN } from '../../../shared/mailTemplate'

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
  // Aktive Mitglieder und noch gültige Einladungen bleiben; eine abgelaufene Einladung darf neu verschickt werden (überschreibt die alte)
  if (existing.Item && (existing.Item.status !== 'invited' || !inviteExpired(existing.Item.invitedAt))) throw createError({ statusCode: 409, message: existing.Item.status === 'invited' ? 'Diese Adresse hat noch eine gültige Einladung. Ziehe sie zuerst zurück, wenn du eine neue schicken willst.' : 'Bereits Mitglied' })

  // Höchstens INVITES_PER_DAY Einladungen je Konto und Tag (verhindert, dass die Einladungsmail als Spam-Relay dient). Der Zähler zählt nur Versuche, die bis hierher gültig waren.
  if (!(await checkRateLimit('team-invite:day', tenantId, INVITES_PER_DAY, 86400))) {
    throw createError({ statusCode: 429, message: `Heute wurden schon ${INVITES_PER_DAY} Einladungen verschickt. Bitte versuche es morgen wieder.` })
  }

  const token = randomUUID()
  const invitedAt = new Date()
  await dynamo.send(new PutCommand({
    TableName: 'plexora-team-members',
    Item: {
      tenantId,
      memberEmail: inviteeEmail,
      role,
      status: 'invited',
      inviteToken: token,
      invitedAt: invitedAt.toISOString(),
      joinedAt: '',
    },
  }))

  invalidateTenantCache(inviteeEmail)

  // Mail aus der Vorlage des Mandanten (frei gestaltbar, Standard wenn nichts gespeichert oder beschädigt). Der Link kommt IMMER vom Server:
  // feste Plexora-Domain + der Token dieser Einladung, nie ein Wert aus der Konfiguration.
  const cfg = await loadInviteConfig(tenantId)
  const ctx = {
    inviterName: auth.name || inviterEmail, inviterEmail, inviteeEmail, expiresAt: new Date(invitedAt.getTime() + INVITE_TTL_DAYS * 86_400_000),
    acceptUrl: `${APP_ORIGIN}/invite?token=${token}`, logoUrl: await resolveInviteLogoUrl(tenantId, cfg),
  }
  let mail
  try { mail = renderInviteMail(cfg, ctx) } catch (e) { console.error('[team] Vorlage nicht darstellbar, Standard wird verwendet', (e as Error)?.message); mail = renderInviteMail(resolveInviteConfig(null), { ...ctx, logoUrl: '' }) }
  const status = await sendMail({
    userId: tenantId,
    kind: 'team_invite',
    from: `"${mail.fromName}" <team@plexora.eu>`,      // Absendername "<Einladender> über Plexora", Absenderadresse bleibt die Systemadresse
    to: inviteeEmail,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,                                       // Resend sendet HTML und Klartext als multipart/alternative
  })

  if (status === 'failed') {
    // Die Einladung ist ohne Mail nutzlos: wieder entfernen, damit der Inhaber es erneut versuchen kann
    await dynamo.send(new DeleteCommand({ TableName: 'plexora-team-members', Key: { tenantId, memberEmail: inviteeEmail } }))
    invalidateTenantCache(inviteeEmail)
    throw createError({ statusCode: 502, message: 'Die Einladungs-Mail konnte nicht gesendet werden. Bitte später erneut versuchen.' })
  }

  return { success: true }
})
