import { requireOwnerContext, loadStoredInvite, resolveInviteLogoUrl } from '../../../utils/mailTemplateStore'
import { getDynamoClient } from '../../../utils/dynamodb'
import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { resolveInviteConfig, contrastWarnings, isLogoUrl, logoUrlForFile } from '../../../../shared/mailTemplate'

// Vorlage "Einladung" des eigenen Mandanten (nur Inhaber). Es wird immer die geprüfte Fassung zurückgegeben, nie die rohe Datenbankzeile.
export default defineEventHandler(async (event) => {
  const { tenantId } = await requireOwnerContext(event)
  const stored = await loadStoredInvite(tenantId).catch(() => null)
  const config = resolveInviteConfig(stored)
  let brandingLogoUrl = ''
  try { const b = await getDynamoClient().send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'branding', scope: tenantId } })); brandingLogoUrl = isLogoUrl(b.Item?.logoUrl) ? b.Item!.logoUrl : '' } catch {}
  return { config, customized: !!stored, customLogoUrl: config.logo.file ? logoUrlForFile(config.logo.file) : '', brandingLogoUrl, logoPreviewUrl: await resolveInviteLogoUrl(tenantId, config), warnings: contrastWarnings(config) }
})
