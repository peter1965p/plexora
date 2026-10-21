import { getSeoStats } from '../../utils/analyticsTracker'
import { requireAdminOrDemoRead } from '../../utils/demoRead'

export default defineEventHandler(async (event) => {
  const { demo } = requireAdminOrDemoRead(event)
  const stats: any = await getSeoStats()
  return demo ? { ...stats, recentIps: [] } : stats          // Demo-Konto: keine Besucher-IP-Adressen
})
