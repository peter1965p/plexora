import { requireOwnerContext, loadStoredInvite, resolveInviteLogoUrl, TEST_MAILS_PER_HOUR } from '../../../utils/mailTemplateStore'
import { assertNotDemo } from '../../../utils/demoPolicy'
import { checkRateLimit } from '../../../utils/rateLimit'
import { sendMail } from '../../../utils/mailer'
import { validateInviteConfig, resolveInviteConfig, renderInviteMail } from '../../../../shared/mailTemplate'

const SYSTEM_FROM = 'team@plexora.eu'

// Testmail an die EIGENE Adresse (die Adresse kommt aus dem Token, es gibt kein Empfängerfeld), höchstens 5 pro Stunde.
// Rendert den Entwurf aus dem Editor (streng geprüft) oder die gespeicherte Vorlage. Der Link in der Testmail ist nicht gültig.
export default defineEventHandler(async (event) => {
  const { auth, tenantId } = await requireOwnerContext(event)
  assertNotDemo(auth, 'Im Demo-Zugang ist der E-Mail-Versand deaktiviert.')
  if (!(await checkRateLimit('mail-template-test', tenantId, TEST_MAILS_PER_HOUR, 3600))) throw createError({ statusCode: 429, message: `Höchstens ${TEST_MAILS_PER_HOUR} Testmails pro Stunde.` })

  const body = await readBody(event)
  const existing = await loadStoredInvite(tenantId).catch(() => null)
  let cfg = resolveInviteConfig(existing)
  if (body && typeof body === 'object' && body.config !== undefined) {
    const v = validateInviteConfig(body.config, existing)
    if (!v.ok) throw createError({ statusCode: 400, message: v.error, data: { field: v.field } })
    cfg = v.value
  }
  const logoUrl = await resolveInviteLogoUrl(tenantId, cfg)
  const m = renderInviteMail(cfg, {
    inviterName: auth.name || auth.email, inviterEmail: auth.email, inviteeEmail: auth.email, expiresAt: new Date(Date.now() + 7 * 86_400_000),
    acceptUrl: 'https://app.plexora.eu/invite?token=TESTMAIL-NICHT-GUELTIG', logoUrl,
  })
  const status = await sendMail({ userId: tenantId, kind: 'team_invite', from: `"${m.fromName}" <${SYSTEM_FROM}>`, to: auth.email, subject: `[Test] ${m.subject}`, html: m.html, text: m.text })
  return { status, to: auth.email }
})
