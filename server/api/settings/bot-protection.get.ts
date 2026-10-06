import { requireAuth } from '../../utils/verifyAuth'
import { resolveUserId } from '../../utils/tenant'
import { getBotSettings, describeForOwner, countProtectedCampaigns } from '../../utils/botProtection'

// Lesen: jedes Mitglied des Mandanten; das Secret verlässt den Server nie, nur die maskierte Form.
export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const scope = await resolveUserId(auth.email)
  const settings = await getBotSettings(scope)
  return { ...describeForOwner(settings), protectedCampaigns: await countProtectedCampaigns(scope) }
})
