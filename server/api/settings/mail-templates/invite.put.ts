import { requireOwnerContext, loadStoredInvite, saveInviteConfig, resolveInviteLogoUrl } from '../../../utils/mailTemplateStore'
import { assertNotDemo } from '../../../utils/demoPolicy'
import { validateInviteConfig, contrastWarnings } from '../../../../shared/mailTemplate'

// Speichert die Vorlage "Einladung" (nur Inhaber, Demo-Konto 403). Strenge Prüfung mit verständlicher Meldung; Logo-Datei und Maße kommen nur aus der gespeicherten Konfiguration.
export default defineEventHandler(async (event) => {
  const { auth, tenantId } = await requireOwnerContext(event)
  assertNotDemo(auth, 'Im Demo-Zugang können E-Mail-Vorlagen nicht geändert werden.')
  const body = await readBody(event)
  const existing = await loadStoredInvite(tenantId).catch(() => null)
  const v = validateInviteConfig(body, existing)
  if (!v.ok) throw createError({ statusCode: 400, message: v.error, data: { field: v.field } })
  await saveInviteConfig(tenantId, v.value, auth.email)
  return { config: v.value, warnings: contrastWarnings(v.value), logoPreviewUrl: await resolveInviteLogoUrl(tenantId, v.value) }
})
