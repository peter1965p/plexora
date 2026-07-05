import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const email = getQuery(event).email as string | undefined
  if (!email) throw createError({ statusCode: 400, message: 'email erforderlich' })

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

  const redirectUri = `${config.public.apiBase}/api/termine/google-callback`
  const params = new URLSearchParams({
    client_id: config.googleClientId as string,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.events',
    access_type: 'offline',
    prompt: 'consent',
    state: tenantId,
  })

  return sendRedirect(event, `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
})
