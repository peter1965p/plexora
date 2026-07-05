import { getSeoStats } from '../../utils/analyticsTracker'
import { requireAdmin } from '../../utils/verifyAuth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  return getSeoStats()
})
