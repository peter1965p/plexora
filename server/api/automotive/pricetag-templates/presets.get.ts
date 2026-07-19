import { PRICETAG_PRESETS } from '../../../utils/pricetagPresets'

export default defineEventHandler(async () => {
  return { presets: PRICETAG_PRESETS }
})
