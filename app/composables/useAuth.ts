import { getCurrentUser } from 'aws-amplify/auth'

export async function useAuthUser() {
  if (import.meta.server) return { userId: 'demo-user', email: '' }
  try {
    const user = await getCurrentUser()
    return {
      userId: user.userId,
      email:  user.signInDetails?.loginId || ''
    }
  } catch {
    return { userId: 'demo-user', email: '' }
  }
}
