import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth'

export async function useAuthUser() {
  if (import.meta.server) return { userId: 'demo-user', email: '', role: 'admins' }
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
      email:  user.signInDetails?.loginId || '',
      role,
      groups,
    }
  } catch {
    return { userId: 'demo-user', email: '', role: 'admins', groups: [] }
  }
}
