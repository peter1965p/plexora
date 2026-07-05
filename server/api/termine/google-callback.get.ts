import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { encryptSecret } from '../../utils/crypto'

const FRONTEND_URL = 'https://www.plexora.eu/termine'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = query.code as string | undefined
  const tenantId = query.state as string | undefined

  if (!code || !tenantId) {
    return sendRedirect(event, `${FRONTEND_URL}?google=error`)
  }

  const config = useRuntimeConfig()
  const redirectUri = `${config.public.apiBase}/api/termine/google-callback`

  try {
    const tokenRes = await $fetch<any>('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: {
        code,
        client_id: config.googleClientId as string,
        client_secret: config.googleClientSecret as string,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      },
    })

    const accessToken = tokenRes.access_token as string
    const refreshToken = tokenRes.refresh_token as string
    if (!refreshToken) {
      // Google gibt nur beim allerersten Consent (mit prompt=consent) einen refresh_token zurück.
      return sendRedirect(event, `${FRONTEND_URL}?google=error`)
    }

    const userInfo = await $fetch<any>('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    await getDynamoClient().send(new UpdateCommand({
      TableName: 'plexora-nexora',
      Key: { tenantId },
      UpdateExpression: 'SET googleConnected = :c, googleEmail = :e, googleRefreshTokenEncrypted = :t',
      ExpressionAttributeValues: {
        ':c': true,
        ':e': userInfo?.email || '',
        ':t': encryptSecret(refreshToken),
      },
    }))

    return sendRedirect(event, `${FRONTEND_URL}?google=connected`)
  } catch (e) {
    console.error('Google OAuth callback failed', e)
    return sendRedirect(event, `${FRONTEND_URL}?google=error`)
  }
})
