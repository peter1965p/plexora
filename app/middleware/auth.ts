// Direkt nach einer Google-Anmeldung sind die Tokens oft noch nicht vollständig gespeichert.
// Deshalb wird die Sitzung kurz erneut geprüft, bevor auf den Login umgeleitet wird.
async function waitForSession(fetchAuthSession: any, attempts = 6) {
  for (let i = 0; i < attempts; i++) {
    try {
      const session = await fetchAuthSession({ forceRefresh: false })
      if (session.tokens?.idToken) return session
    } catch {}
    await new Promise(r => setTimeout(r, 500))
  }
  return null
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  try {
    const { fetchAuthSession } = await import('aws-amplify/auth')
    const session = await waitForSession(fetchAuthSession)
    if (!session) return navigateTo('/login')
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
