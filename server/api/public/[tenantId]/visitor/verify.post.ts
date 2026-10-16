import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { enforcePublicRateLimit } from '../../../../utils/rateLimit'
import { loadSite, consumeToken, getAccount, createSession, acctKey, VISITORS_TABLE } from '../../../../utils/siteVisitor'

// E-Mail-Adresse bestätigen (Link aus der Mail): der Token gilt genau einmal und 24 Stunden; danach ist der Besucher angemeldet.
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' })
  await enforcePublicRateLimit(event, 'visitor-verify')
  const tenantId = String(getRouterParam(event, 'tenantId') || '')
  await loadSite(tenantId)
  const body: any = await readBody(event).catch(() => ({}))
  const email = await consumeToken(tenantId, body?.token, 'verify')
  const acct = email ? await getAccount(tenantId, email) : undefined
  if (!email || !acct) throw createError({ statusCode: 400, message: 'Der Link ist ungültig oder abgelaufen. Bitte lege dein Konto neu an.' })
  await getDynamoClient().send(new UpdateCommand({ TableName: VISITORS_TABLE, Key: acctKey(tenantId, email), UpdateExpression: 'SET verified = :v', ExpressionAttributeValues: { ':v': true }, ConditionExpression: 'attribute_exists(sk)' }))
  return { ok: true, name: acct.name, token: await createSession(tenantId, email, Number(acct.sessVer || 1)) }
})
