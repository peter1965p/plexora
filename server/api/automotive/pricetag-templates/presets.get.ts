import { PRICETAG_PRESETS } from '../../../utils/pricetagPresets'
import { requireAuth } from '../../../utils/verifyAuth'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  return { presets: PRICETAG_PRESETS }
})
