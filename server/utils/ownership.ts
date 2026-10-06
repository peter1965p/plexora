import { resolveUserId } from './tenant'
import { requireAuth } from './verifyAuth'

export async function assertOwner(event: any, existing: { userId?: string }) {
  // Anmeldung ist Pflicht (401); der Besitzer wird nur aus dem verifizierten Token bestimmt
  const auth = requireAuth(event)
  if (!auth.email) throw createError({ statusCode: 401, message: 'Anmeldung erforderlich' })
  const callerId = await resolveUserId(auth.email)
  if (existing.userId !== callerId) {
    throw createError({ statusCode: 403, message: 'Kein Zugriff auf diesen Datensatz' })
  }
}
