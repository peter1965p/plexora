import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth'

export async function useAuthUser() {
  if (import.meta.server) return { userId: 'demo-user', email: '', role: 'admins', idToken: '' }
  try {
    const [user, session] = await Promise.all([
      getCurrentUser(),
      fetchAuthSession()
    ])
    const payload = session.tokens?.idToken?.payload
    const groups  = (payload?.['cognito:groups'] as string[]) || []
    const role    = groups.includes('admins') ? 'admins'
                  : groups.includes('customers') ? 'customers'
                  : 'customers'
    return {
      userId: user.userId,
      email:  (payload?.email as string) || user.signInDetails?.loginId || '',
      role,
      groups,
      idToken: session.tokens?.idToken?.toString() || '',
    }
  } catch {
    return { userId: 'demo-user', email: '', role: 'admins', groups: [], idToken: '' }
  }
}

// Liefert den Authorization-Header mit dem echten Cognito-ID-Token für Requests
// an geschützte Routen (aws/*, licenses/*, admin/*, ...).
export async function useAuthHeader(): Promise<Record<string, string>> {
  const { idToken } = await useAuthUser()
  return idToken ? { Authorization: `Bearer ${idToken}` } : {}
}
