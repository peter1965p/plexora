export function demoGuard(userId: string | undefined) {
  if (!userId || userId === 'demo-user') {
    throw createError({ statusCode: 403, message: 'Im Demo-Modus nicht verfügbar — bitte registrieren.' })
  }
}
