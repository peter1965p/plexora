import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { redeemTicket } from '../../utils/oneTimeTicket'
import { createOAuthState, STATE_COOKIE, STATE_TTL_SECONDS } from '../../utils/oauthState'

// Wird per echter Browser-Navigation aufgerufen (window.location.href, für den Google-Consent-Redirect), daher kommt hier kein Authorization-Header an.
// Statt des Anmeldetokens steht ein kurzlebiger Einmalwert (?ticket=) in der Adresse: er stammt aus einer angemeldeten POST-Anfrage
// (/api/termine/google-auth-start), gilt nur für diesen Vorgang, 60 Sekunden und genau einmal. Ein Anmeldetoken (?token=) wird nicht mehr angenommen.
// Die E-Mail kommt aus dem Einmalwert, nie aus der Adresse (verhindert das Calendar-Hijack über eine erratene fremde E-Mail).
export default defineEventHandler(async (event) => {
  // Die Adresse enthält den Einmalwert: nie an Google oder andere Seiten weitergeben
  setResponseHeader(event, 'Referrer-Policy', 'no-referrer')
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const auth = await redeemTicket(getQuery(event).ticket, 'google-auth')
  if (!auth) throw createError({ statusCode: 401, message: 'Der Link ist abgelaufen oder wurde schon benutzt. Bitte die Verknüpfung in Plexora neu starten.' })
  const email = auth.email

  const config = useRuntimeConfig()
  if (!config.googleClientId || !config.googleClientSecret) {
    throw createError({ statusCode: 500, message: 'Google-Anbindung ist serverseitig noch nicht konfiguriert (NUXT_GOOGLE_CLIENT_ID/SECRET fehlen)' })
  }

  const res = await getDynamoClient().send(new ScanCommand({
    TableName: 'plexora-nexora',
    FilterExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
  }))
  const tenantId = res.Items?.[0]?.tenantId as string | undefined
  if (!tenantId) throw createError({ statusCode: 404, message: 'Tenant nicht gefunden' })

  const { state, nonce } = createOAuthState(tenantId, auth.userId)
  const redirectUri = `${config.public.apiBase}/api/termine/google-callback`
  const params = new URLSearchParams({
    client_id: config.googleClientId as string,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.calendarlist.readonly https://www.googleapis.com/auth/userinfo.email',
    access_type: 'offline',
    prompt: 'consent',
    // Signierter, 10 Minuten gültiger state, gebunden an dieses Browser-Cookie (statt der nackten Mandanten-ID)
    state,
  })
  setCookie(event, STATE_COOKIE, nonce, { httpOnly: true, secure: true, sameSite: 'lax', path: '/api/termine', maxAge: STATE_TTL_SECONDS })

  return sendRedirect(event, `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
})
