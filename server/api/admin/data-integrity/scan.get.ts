import { requireAdmin } from '../../../utils/verifyAuth'
import { scanForLegacyIds } from '../../../utils/dataIntegrity'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  return await scanForLegacyIds()
})
