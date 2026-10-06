import { LEAD_PRESETS } from '../../utils/campaignPresets/lead'
import { JOB_PRESETS } from '../../utils/campaignPresets/job'
import { requireAuth } from '../../utils/verifyAuth'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const { type } = getQuery(event)
  return { presets: type === 'job' ? JOB_PRESETS : LEAD_PRESETS }
})
