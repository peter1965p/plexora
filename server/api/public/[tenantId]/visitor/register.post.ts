import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { createHash } from 'node:crypto'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { enforcePublicRateLimit, checkRateLimit } from '../../../../utils/rateLimit'
import { loadSite, siteCommentsMode, siteOrigin, getAccount, hashPassword, createToken, sendVisitorMail, VISITORS_TABLE } from '../../../../utils/siteVisitor'
import { parseRegistration, VisitorError } from '../../../../../shared/siteVisitors'

// Konto für Kommentare anlegen. Die Antwort ist immer dieselbe (auch wenn die Adresse schon registriert ist), damit niemand Adressen ausprobieren kann.
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' })
  await enforcePublicRateLimit(event, 'visitor-register')
  const tenantId = String(getRouterParam(event, 'tenantId') || '')
  const site = await loadSite(tenantId)
  if (siteCommentsMode(site) === 'off') throw createError({ statusCode: 403, message: 'Kommentare sind auf dieser Webseite nicht aktiviert.' })
  let reg
  try { reg = parseRegistration(await readBody(event).catch(() => ({}))) } catch (e) { if (e instanceof VisitorError) throw createError({ statusCode: 400, message: e.message }); throw e }
  const answer = { ok: true, message: 'Fast geschafft: Wir haben dir eine E-Mail mit einem Bestätigungslink geschickt. Bitte öffne sie, um dein Konto zu aktivieren.' }
  // höchstens 3 Bestätigungsmails je Adresse und Stunde (sonst wäre die Funktion ein Mail-Schleuder für fremde Adressen)
  if (!(await checkRateLimit('visitor-register:email', createHash('sha256').update(tenantId + reg.email).digest('hex').slice(0, 32), 3, 3600))) return answer
  const existing = await getAccount(tenantId, reg.email)
  if (existing?.verified) return answer
  await getDynamoClient().send(new PutCommand({ TableName: VISITORS_TABLE, Item: { tenantId, sk: `acct#${reg.email}`, email: reg.email, name: reg.name, passwordHash: await hashPassword(reg.password), verified: false, sessVer: 1, created: new Date().toISOString() } }))
  const token = await createToken(tenantId, 'verify', reg.email)
  await sendVisitorMail(site, reg.email, `Bitte bestätige dein Konto bei ${site.companyName || 'uns'}`, `Hallo ${reg.name}, schön, dass du kommentieren möchtest. Bitte bestätige deine E-Mail-Adresse (der Link ist 24 Stunden gültig).`, 'Konto bestätigen', `${siteOrigin(site)}/konto/bestaetigen?t=${tenantId}&token=${token}`)
  return answer
})
