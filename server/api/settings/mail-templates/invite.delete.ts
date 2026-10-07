import { requireOwnerContext, loadStoredInvite, deleteInviteConfig, deleteLogoObject } from '../../../utils/mailTemplateStore'
import { assertNotDemo } from '../../../utils/demoPolicy'
import { resolveInviteConfig } from '../../../../shared/mailTemplate'

// "Auf Standard zurücksetzen": Vorlage und eigenes Logo (Datei im Bucket) werden gelöscht. Nur Inhaber, Demo-Konto 403.
export default defineEventHandler(async (event) => {
  const { auth, tenantId } = await requireOwnerContext(event)
  assertNotDemo(auth, 'Im Demo-Zugang können E-Mail-Vorlagen nicht geändert werden.')
  const cfg = resolveInviteConfig(await loadStoredInvite(tenantId).catch(() => null))
  await deleteInviteConfig(tenantId)
  await deleteLogoObject(tenantId, cfg.logo.file)
  return { success: true }
})
