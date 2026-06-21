export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  try {
    const { fetchAuthSession } = await import('aws-amplify/auth')
    const session = await fetchAuthSession({ forceRefresh: false })
    const payload = session.tokens?.idToken?.payload
    const groups  = (payload?.['cognito:groups'] as string[]) || []
    const isAdmin    = groups.includes('admins')
    const isCustomer = groups.includes('customers')

    // Nicht eingeloggt → Login
    if (!isAdmin && !isCustomer) return navigateTo('/login')

    // Admin im Portal → Dashboard (Portal ist für Kunden)
    if (isAdmin && to.path.startsWith('/portal')) {
      return navigateTo('/dashboard')
    }

    // Customers haben vollen App-Zugriff — Modul-Sperre via License im Store

  } catch {
    return navigateTo('/login')
  }
})
