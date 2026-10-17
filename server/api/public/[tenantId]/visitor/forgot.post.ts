import { createHash } from 'node:crypto'
import { enforcePublicRateLimit, checkRateLimit } from '../../../../utils/rateLimit'
import { visitorIsProtected, verifyBotToken } from '../../../../utils/botGuard'
import { loadSite, siteCommentsMode, siteOrigin, getAccount, createToken, sendVisitorMail } from '../../../../utils/siteVisitor'
import { normalizeEmail, validEmail } from '../../../../../shared/siteVisitors'

// Passwort vergessen: schickt einen Link (eine Stunde gültig), falls es ein bestätigtes Konto gibt. Die Antwort ist immer gleich.
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' })
  await enforcePublicRateLimit(event, 'visitor-forgot')
  const tenantId = String(getRouterParam(event, 'tenantId') || '')
  const site = await loadSite(tenantId)
  const body: any = await readBody(event).catch(() => ({}))
  const guard = await visitorIsProtected(String(site.email || ''))
  if (guard.protected && siteCommentsMode(site) !== 'off') await verifyBotToken(event, guard.ownerScope, body?.turnstileToken, site.customDomain)
  const email = normalizeEmail(body?.email)
  const answer = { ok: true, message: 'Wenn es zu dieser Adresse ein Konto gibt, haben wir dir eine E-Mail mit einem Link zum Zurücksetzen geschickt.' }
  if (!validEmail(email) || siteCommentsMode(site) === 'off') return answer
  if (!(await checkRateLimit('visitor-forgot:email', createHash('sha256').update(tenantId + email).digest('hex').slice(0, 32), 3, 3600))) return answer
  const acct = await getAccount(tenantId, email)
  if (!acct?.verified) return answer
  const token = await createToken(tenantId, 'reset', email)
  await sendVisitorMail(site, email, `Passwort zurücksetzen bei ${site.companyName || 'uns'}`, 'Du hast angefordert, dein Passwort zurückzusetzen. Der Link ist eine Stunde gültig.', 'Neues Passwort festlegen', `${siteOrigin(site)}/konto/passwort?t=${tenantId}&token=${token}`)
  return answer
})
