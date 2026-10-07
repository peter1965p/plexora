import { createHash } from 'crypto'
import { GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getDynamoClient } from './dynamodb'
import { resolveUserId } from './tenant'
import { requireAuth, type AuthUser } from './verifyAuth'
import { resolveInviteConfig, logoUrlForFile, isLogoUrl, LOGO_PREFIX, type InviteMailConfig } from '../../shared/mailTemplate'

// Ablage der Mail-Vorlagen: eine Konfiguration je Mandant in plexora-settings (settingId "mail-template-invite", scope = Mandanten-ID).
// Der Mandant kommt IMMER aus dem Anmelde-Token, nie aus Body, Query oder Pfad.
export const INVITE_SETTING = 'mail-template-invite'
export const BUCKET = 'plexora-files'
export const LOGO_UPLOADS_PER_HOUR = 10
export const TEST_MAILS_PER_HOUR = 5

/** Mandanten-Schlüssel im Dateipfad des Logos (kein Klartext der E-Mail-Adresse in der öffentlichen Adresse) */
export const tenantKey = (tenantId: string) => createHash('sha256').update(`plexora-mail-logo:${String(tenantId).trim().toLowerCase()}`).digest('hex').slice(0, 16)
/** Gehört diese Datei zu diesem Mandanten? (Präfix mit dem eigenen Schlüssel) */
export const ownsLogoFile = (tenantId: string, file: unknown) => typeof file === 'string' && file.startsWith(`${LOGO_PREFIX}/${tenantKey(tenantId)}/`)

/** Nur der Inhaber des Mandanten (Mandanten-ID = eigene E-Mail) darf Vorlagen ansehen und ändern. */
export async function requireOwnerContext(event: any): Promise<{ auth: AuthUser; tenantId: string }> {
  const auth = requireAuth(event)
  if (!auth.email) throw createError({ statusCode: 401, message: 'Anmeldung erforderlich' })
  const tenantId = await resolveUserId(auth.email)
  if (String(tenantId).toLowerCase() !== auth.email.toLowerCase()) throw createError({ statusCode: 403, message: 'Nur der Inhaber des Kontos kann E-Mail-Vorlagen ändern.' })
  return { auth, tenantId }
}

export async function loadStoredInvite(tenantId: string): Promise<any | null> {
  const r = await getDynamoClient().send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: INVITE_SETTING, scope: tenantId } }))
  return r.Item?.config ?? null
}
/** Fehlt die Konfiguration oder ist sie beschädigt (oder die Datenbank nicht erreichbar), gilt der Standard: die Einladung bricht nie ab. */
export async function loadInviteConfig(tenantId: string): Promise<InviteMailConfig> {
  try { return resolveInviteConfig(await loadStoredInvite(tenantId)) } catch (e) { console.error('[mail-template] Konfiguration nicht lesbar, Standard wird verwendet', (e as Error)?.message); return resolveInviteConfig(null) }
}
export async function saveInviteConfig(tenantId: string, config: InviteMailConfig, by: string) {
  await getDynamoClient().send(new PutCommand({ TableName: 'plexora-settings', Item: { settingId: INVITE_SETTING, scope: tenantId, config, updated: new Date().toISOString(), updatedBy: by } }))
}
export async function deleteInviteConfig(tenantId: string) {
  await getDynamoClient().send(new DeleteCommand({ TableName: 'plexora-settings', Key: { settingId: INVITE_SETTING, scope: tenantId } }))
}

/** Welche Logo-Adresse gilt für diese Konfiguration? Eigene Datei (nur mit eigenem Präfix) oder das Branding-Logo (nur wenn es auf unserem Bucket liegt). Sonst leer. */
export async function resolveInviteLogoUrl(tenantId: string, cfg: InviteMailConfig): Promise<string> {
  try {
    if (cfg.logo.mode === 'custom') return ownsLogoFile(tenantId, cfg.logo.file) ? logoUrlForFile(cfg.logo.file) : ''
    if (cfg.logo.mode === 'branding') {
      const r = await getDynamoClient().send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'branding', scope: tenantId } }))
      const u = r.Item?.logoUrl
      return isLogoUrl(u) ? u : ''
    }
  } catch {}
  return ''
}

const s3 = () => new S3Client({ region: 'eu-central-1' })
export async function putLogoObject(key: string, data: Buffer, contentType: string) {
  // Fester Content-Type, lange Zwischenspeicherung (die Adresse ändert sich bei jedem neuen Logo), kein Originalname
  await s3().send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: data, ContentType: contentType, CacheControl: 'public, max-age=31536000, immutable', ContentDisposition: 'inline' }))
}
export async function deleteLogoObject(tenantId: string, file: string) {
  if (!file || !ownsLogoFile(tenantId, file)) return          // nie eine fremde oder unbekannte Datei löschen
  try { await s3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: file })) } catch (e) { console.error('[mail-template] altes Logo konnte nicht gelöscht werden', (e as Error)?.message) }
}
