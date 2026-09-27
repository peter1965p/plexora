import { requireAuth } from '../../utils/verifyAuth'
import { getTenantByEmail, readAiProviders } from '../../utils/ai/keys'
import { AI_PROVIDER_LABELS } from '../../utils/ai/providers'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const item = await getTenantByEmail(auth.email)
  if (!item) return { providers: {}, defaultProvider: '', labels: AI_PROVIDER_LABELS }

  return {
    providers: readAiProviders(item),
    defaultProvider: item.aiDefaultProvider || '',
    labels: AI_PROVIDER_LABELS,
  }
})
