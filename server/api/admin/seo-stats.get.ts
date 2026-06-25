import { getSeoStats } from '../../utils/analyticsTracker'

export default defineEventHandler(async () => {
  return getSeoStats()
})
