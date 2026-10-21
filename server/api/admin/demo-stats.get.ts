import { getDemoStats } from '../../utils/demoTracker'
import { requireAdminOrDemoRead } from '../../utils/demoRead'

export default defineEventHandler(async (event) => {
  requireAdminOrDemoRead(event)
  return getDemoStats()
})
