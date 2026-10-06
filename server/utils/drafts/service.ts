import { DraftError, getSchema, sanitizeDraft } from './schema'
import type { DraftRecord, DraftRepository } from './repository'

export const DRAFT_TTL_DAYS = 30
const DAY_S = 86400

/**
 * Besitzer-Schlüssel ausschließlich aus Token-Daten (Tenant-Scope + Nutzer-ID).
 * Es gibt bewusst keinen Weg, einen Besitzer über Pfad oder Body anzugeben.
 */
export function ownerKey(tenantScope: string, userSub: string): string {
  if (!tenantScope || !userSub) throw new DraftError(401, 'Anmeldung erforderlich')
  return `${tenantScope}#${userSub}`
}

export interface DraftView {
  formType: string
  status: 'draft'
  name: string
  data: Record<string, unknown>
  clientUpdatedAt: number
  updatedAt: string
}

function toView(r: DraftRecord): DraftView {
  return { formType: r.formType, status: r.status, name: r.name, data: r.data, clientUpdatedAt: r.clientUpdatedAt, updatedAt: r.updatedAt }
}

export async function getDraft(repo: DraftRepository, owner: string, formType: string, nowMs = Date.now()): Promise<DraftView | null> {
  getSchema(formType)
  const rec = await repo.get(owner, formType)
  // DynamoDB-TTL löscht verzögert (bis zu 48 h), deshalb abgelaufene Einträge hier ignorieren
  if (!rec || rec.expiresAt * 1000 <= nowMs) return null
  return toView(rec)
}

export async function saveDraft(
  repo: DraftRepository,
  owner: string,
  formType: string,
  body: { data?: unknown; clientUpdatedAt?: unknown },
  nowMs = Date.now(),
): Promise<DraftView> {
  const schema = getSchema(formType)
  const data = sanitizeDraft(formType, body?.data)
  const nameRaw = data[schema.nameField]
  const name = typeof nameRaw === 'string' && nameRaw.trim() ? nameRaw.trim() : 'Unbenannt'
  const cu = Number(body?.clientUpdatedAt)
  const clientUpdatedAt = Number.isFinite(cu) && cu > 0 ? Math.min(cu, nowMs + 60_000) : nowMs
  const record: DraftRecord = {
    owner,
    formType,
    status: 'draft',
    name,
    data,
    clientUpdatedAt,
    updatedAt: new Date(nowMs).toISOString(),
    expiresAt: Math.floor(nowMs / 1000) + DRAFT_TTL_DAYS * DAY_S,
  }
  await repo.put(record)
  return toView(record)
}

export async function deleteDraft(repo: DraftRepository, owner: string, formType: string): Promise<void> {
  getSchema(formType)
  await repo.delete(owner, formType)
}
