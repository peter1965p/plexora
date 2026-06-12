export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  try {
    const { fetchAuthSession } = await import('aws-amplify/auth')
    const session = await fetchAuthSession({ forceRefresh: false })
    const payload = session.tokens?.idToken?.payload
    const groups  = (payload?.['cognito:groups'] as string[]) || []
    const isAdmin    = groups.includes('admins')
    const isCustomer = groups.includes('customers')

    // Kunde versucht Admin-Bereich zu öffnen → Portal
    if (isCustomer && !isAdmin && !to.path.startsWith('/portal')) {
      return navigateTo('/portal')
    }

    // Admin versucht Portal zu öffnen → Dashboard
    if (isAdmin && to.path.startsWith('/portal')) {
      return navigateTo('/dashboard')
    }

  } catch {
    return navigateTo('/login')
  }
})
