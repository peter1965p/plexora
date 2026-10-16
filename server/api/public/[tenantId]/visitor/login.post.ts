import { createHash } from 'node:crypto'
import { enforcePublicRateLimit, checkRateLimit } from '../../../../utils/rateLimit'
import { loadSite, getAccount, verifyPassword, createSession } from '../../../../utils/siteVisitor'
import { normalizeEmail } from '../../../../../shared/siteVisitors'

// Anmelden. Eine Fehlermeldung für alles (falsches Passwort, unbekannte Adresse, nicht bestätigt): so verrät die Antwort nichts über Konten. Drosselung je Adresse.
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' })
  await enforcePublicRateLimit(event, 'visitor-login')
  const tenantId = String(getRouterParam(event, 'tenantId') || '')
  await loadSite(tenantId)
  const body: any = await readBody(event).catch(() => ({}))
  const email = normalizeEmail(body?.email), password = typeof body?.password === 'string' ? body.password.slice(0, 200) : ''
  const bad = createError({ statusCode: 401, message: 'E-Mail oder Passwort stimmt nicht (oder das Konto ist noch nicht bestätigt).' })
  if (!email || !password) throw bad
  if (!(await checkRateLimit('visitor-login:email', createHash('sha256').update(tenantId + email).digest('hex').slice(0, 32), 10, 900))) throw createError({ statusCode: 429, message: 'Zu viele Versuche. Bitte warte ein paar Minuten.' })
  const acct = await getAccount(tenantId, email)
  const ok = await verifyPassword(password, acct?.passwordHash)          // läuft auch ohne Konto (gleicher Aufwand)
  if (!acct || !ok || !acct.verified) throw bad
  return { ok: true, name: acct.name, token: await createSession(tenantId, email, Number(acct.sessVer || 1)) }
})
