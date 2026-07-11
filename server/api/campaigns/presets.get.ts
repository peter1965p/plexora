import { LEAD_PRESETS } from '../../utils/campaignPresets/lead'
import { JOB_PRESETS } from '../../utils/campaignPresets/job'

export default defineEventHandler(async (event) => {
  const { type } = getQuery(event)
  return { presets: type === 'job' ? JOB_PRESETS : LEAD_PRESETS }
})
