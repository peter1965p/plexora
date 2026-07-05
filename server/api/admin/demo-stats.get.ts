import { getDemoStats } from '../../utils/demoTracker'
import { requireAdmin } from '../../utils/verifyAuth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  return getDemoStats()
})
