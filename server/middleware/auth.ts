import { verifyBearerToken } from '../utils/verifyAuth'

// Pfade, die weiterhin ganz ohne Anmeldung erreichbar bleiben (öffentliche Buchungsseiten,
// Webhooks mit eigener Signaturprüfung, Zahlungs-/Bewerbungs-Links mit UUID-Secret etc.)
const PUBLIC_PREFIXES = [
  '/api/public/',
  '/api/webhooks/',
  '/api/licenses/checkout',
  '/api/licenses/validate',
  '/api/pay/',
  '/api/support/portal/',
  '/api/jobs/',
]

// Nur der Formular-Submit selbst ist öffentlich (Endkunden füllen Formulare ohne
// Login aus) — alle anderen /api/forms/*-Routen (Liste, Bearbeiten, Löschen,
// Submissions einsehen) sind tenant-geschützt, daher kein Prefix-Eintrag dafür.
const PUBLIC_PATTERNS = [
  /^\/api\/forms\/[^/]+\/submit$/,
]

export default defineEventHandler(async (event) => {
  const path = event.path || ''
  if (!path.startsWith('/api/')) return
  if (PUBLIC_PREFIXES.some(p => path.startsWith(p))) return
  if (PUBLIC_PATTERNS.some(r => r.test(path))) return

  const auth = await verifyBearerToken(event)
  if (auth) event.context.auth = auth

  // Etappenweiser Rollout: erst wenn das Frontend überall echte Tokens mitschickt,
  // wird hier hart durchgesetzt. Einzelne Routen (aws/*, licenses, admin/*) erzwingen
  // Auth schon jetzt selbst über requireAuth()/requireAdmin(), unabhängig von diesem Flag.
  const enforce = useRuntimeConfig().authEnforce === 'true' || useRuntimeConfig().authEnforce === true
  if (enforce && !auth) {
    throw createError({ statusCode: 401, message: 'Anmeldung erforderlich' })
  }
})
