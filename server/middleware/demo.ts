import { findPublicRule } from '../utils/routePolicy'
import { isDemoAccount } from '../utils/mailGuard'
import { isDemoWriteAllowed, isSafeMethod, markDemoWrite } from '../utils/demoSandbox'

// Das öffentlich bekannte Demo-Konto darf in ausgewählten Bereichen ausprobieren (Erlaubnisliste in demoSandbox.ts); alles andere Schreibende ist gesperrt.
// Läuft nach der Anmeldung (auth.ts). Für erlaubte Schreibzugriffe wird die Anfrage als "Sandkasten" gekennzeichnet (dann gelten die einzelnen assertNotDemo-Sperren nicht) und als "verändert" vermerkt,
// damit das Konto beim Abmelden, beim nächsten Start oder nach Leerlauf zurückgesetzt wird.
export default defineEventHandler(async (event) => {
  const path = (event.path || '').split('?')[0]
  if (!path.startsWith('/api/')) return
  const method = (event.method || 'GET').toUpperCase()
  if (isSafeMethod(method)) return
  if (findPublicRule(path, method)) return
  const auth = event.context.auth
  if (!auth || !isDemoAccount(auth)) return
  if (!isDemoWriteAllowed(method, path)) throw createError({ statusCode: 403, message: 'Im Demo-Zugang nicht möglich: Das hat Außenwirkung oder betrifft die Sicherheit. Du kannst es dir ansehen, aber nicht ändern.' })
  auth.demoSandbox = true
  if (path !== '/api/demo/reset' && path !== '/api/demo/lease') await markDemoWrite(auth.email)
})
