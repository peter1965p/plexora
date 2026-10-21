import { isDemoAccount } from './mailGuard'
import type { AuthUser } from './verifyAuth'

// Das öffentlich bekannte Demo-Konto (demo@plexora.eu bzw. Cognito-Gruppe "demo") darf Einstellungen nicht ändern.
// Erkannt wird es am verifizierten Token, nie an einem Wert aus dem Request (der frühere demoGuard prüfte body.userId und war damit wirkungslos).
export function assertNotDemo(auth: Pick<AuthUser, 'email' | 'groups'>, message = 'Im Demo-Zugang nicht verfügbar – bitte ein eigenes Konto anlegen.') {
  if ((auth as any).demoSandbox) return                    // Demo-Sandkasten: die Erlaubnisliste (server/middleware/demo.ts) hat diesen Schreibzugriff freigegeben
  if (isDemoAccount(auth)) throw createError({ statusCode: 403, message })
}
