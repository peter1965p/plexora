import { requireOwnerContext, loadStoredInvite, saveInviteConfig, deleteLogoObject } from '../../../utils/mailTemplateStore'
import { assertNotDemo } from '../../../utils/demoPolicy'
import { resolveInviteConfig } from '../../../../shared/mailTemplate'

// Eigenes Logo entfernen: Datei im Bucket wird gelöscht, die Vorlage zeigt danach kein Logo. Gelöscht wird nur die im EIGENEN Mandanten gespeicherte Datei.
export default defineEventHandler(async (event) => {
  const { auth, tenantId } = await requireOwnerContext(event)
  assertNotDemo(auth, 'Im Demo-Zugang sind Änderungen deaktiviert.')
  const prev = resolveInviteConfig(await loadStoredInvite(tenantId).catch(() => null))
  if (!prev.logo.file) return { success: true }
  await saveInviteConfig(tenantId, { ...prev, logo: { ...prev.logo, mode: prev.logo.mode === 'custom' ? 'none' : prev.logo.mode, file: '', w: 0, h: 0 } }, auth.email)
  await deleteLogoObject(tenantId, prev.logo.file)
  return { success: true }
})
