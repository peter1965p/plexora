import { GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../dynamodb'
import { resolveUserId } from '../tenant'
import { requireAuth } from '../verifyAuth'
import { DynamoDraftRepository } from './repository'
import { DraftError } from './schema'
import { ownerKey } from './service'

/**
 * Gemeinsamer Einstieg aller Entwurfs-Routen.
 * - Anmeldung wird ausdrücklich erzwungen (401), es gibt keinen demo-user-Rückfall.
 * - Besitzer = Tenant-Scope (aus der Token-E-Mail aufgelöst) + Nutzer-ID aus dem Token.
 * - Pfad und Body werden nie zur Besitzerbestimmung herangezogen.
 */
export async function draftContext(event: any) {
  const auth = requireAuth(event)
  const scope = await resolveUserId(auth.email)
  const owner = ownerKey(scope, auth.userId)
  const repo = new DynamoDraftRepository(getDynamoClient(), { Get: GetCommand, Put: PutCommand, Delete: DeleteCommand })
  return { owner, repo }
}

/** Wandelt Fehler der Entwurfs-Logik in HTTP-Fehler um, andere Fehler bleiben unverändert. */
export function toHttpError(e: unknown): never {
  if (e instanceof DraftError) throw createError({ statusCode: e.statusCode, message: e.message })
  throw e
}

/**
 * Löscht den eigenen Entwurf, ohne den Aufrufer jemals zu stören (z. B. nach dem Anlegen einer Kampagne).
 * Ohne Anmeldung passiert nichts; Fehler werden verschluckt.
 */
export async function deleteOwnDraftQuietly(event: any, formType: string): Promise<void> {
  try {
    const { owner, repo } = await draftContext(event)
    await repo.delete(owner, formType)
  } catch { /* Entwurf läuft nach 30 Tagen ohnehin ab */ }
}
