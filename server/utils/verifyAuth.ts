import { CognitoJwtVerifier } from 'aws-jwt-verify'

export interface AuthUser {
  userId: string
  email: string
  groups: string[]
}

let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null

function getVerifier() {
  if (!verifier) {
    const config = useRuntimeConfig()
    verifier = CognitoJwtVerifier.create({
      userPoolId: config.public.awsUserPoolId as string,
      tokenUse:   'id',
      clientId:   config.public.awsClientId as string,
    })
  }
  return verifier
}

export async function verifyBearerToken(event: any): Promise<AuthUser | null> {
  const header = getHeader(event, 'authorization') || ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  if (!match) return null

  try {
    const payload = await getVerifier().verify(match[1])
    return {
      userId: payload.sub,
      email:  (payload.email as string) || '',
      groups: (payload['cognito:groups'] as string[]) || [],
    }
  } catch {
    return null
  }
}

export function requireAuth(event: any): AuthUser {
  const auth = event.context.auth as AuthUser | undefined
  if (!auth) throw createError({ statusCode: 401, message: 'Anmeldung erforderlich' })
  return auth
}

export function requireAdmin(event: any): AuthUser {
  const auth = requireAuth(event)
  if (!auth.groups.includes('admins')) {
    throw createError({ statusCode: 403, message: 'Nur für Admins' })
  }
  return auth
}
