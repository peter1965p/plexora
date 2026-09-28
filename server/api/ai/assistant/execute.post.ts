import { requireAuth } from '../../../utils/verifyAuth'
import { ACTIONS, executeAction } from '../../../utils/ai/actions'

// Führt eine von Plexi vorgeschlagene Aktion WIRKLICH aus — wird ausschließlich
// nach expliziter Bestätigung durch den Nutzer im Chat-Widget aufgerufen.
export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  if (auth.email === 'demo@plexora.eu') throw createError({ statusCode: 403, message: 'Demo-Account kann keine Aktionen ausführen' })

  const body = await readBody(event)
  const name = String(body?.name || '')
  if (!ACTIONS[name]) throw createError({ statusCode: 400, message: 'Unbekannte Aktion' })

  try {
    const result = await executeAction(name, body?.args, auth.email)
    return { ok: true, message: result.message }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Aktion fehlgeschlagen' }
  }
})
