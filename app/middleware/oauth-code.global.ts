// Google-Login: Cognito schickt den Code manchmal auf die Startseite statt auf /auth/callback.
// Diese globale Middleware reicht Code und State an die Callback-Seite weiter, dort wird die Anmeldung abgeschlossen.
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return
  if (to.query.code && to.query.state && !to.path.startsWith('/auth/callback')) {
    return navigateTo({ path: '/auth/callback', query: to.query }, { replace: true })
  }
})
