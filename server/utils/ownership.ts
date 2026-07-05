import { resolveUserId } from './tenant'

export async function assertOwner(event: any, existing: { userId?: string }) {
  const callerId = await resolveUserId(event.context.auth?.email || 'demo-user')
  if (existing.userId !== callerId) {
    throw createError({ statusCode: 403, message: 'Kein Zugriff auf diesen Datensatz' })
  }
}
