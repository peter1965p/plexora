import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { enforcePublicRateLimit } from '../../../../utils/rateLimit'
import { loadSite, consumeToken, getAccount, hashPassword, acctKey, VISITORS_TABLE } from '../../../../utils/siteVisitor'
import { checkPassword, VisitorError } from '../../../../../shared/siteVisitors'

// Neues Passwort mit dem Link aus der Mail festlegen. Der Link gilt genau einmal; alle bisherigen Sitzungen enden (Sitzungsversion +1).
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' })
  await enforcePublicRateLimit(event, 'visitor-reset')
  const tenantId = String(getRouterParam(event, 'tenantId') || '')
  await loadSite(tenantId)
  const body: any = await readBody(event).catch(() => ({}))
  const password = typeof body?.password === 'string' ? body.password : ''
  // Passwort zuerst prüfen: ein zu schwaches Passwort verbraucht den Link nicht
  const pre = typeof body?.token === 'string' ? body.token : ''
  try { checkPassword(password) } catch (e) { if (e instanceof VisitorError) throw createError({ statusCode: 400, message: e.message }); throw e }
  const email = await consumeToken(tenantId, pre, 'reset')
  const acct = email ? await getAccount(tenantId, email) : undefined
  if (!email || !acct) throw createError({ statusCode: 400, message: 'Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.' })
  await getDynamoClient().send(new UpdateCommand({ TableName: VISITORS_TABLE, Key: acctKey(tenantId, email), UpdateExpression: 'SET passwordHash = :h, verified = :v, sessVer = :n REMOVE #t', ExpressionAttributeNames: { '#t': 'ttl' }, ConditionExpression: 'attribute_exists(sk)', ExpressionAttributeValues: { ':h': await hashPassword(password), ':v': true, ':n': Number(acct.sessVer || 1) + 1 } }))
  return { ok: true }
})
