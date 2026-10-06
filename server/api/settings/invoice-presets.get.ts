import { INVOICE_PRESETS } from '../../utils/invoicePresets'
import { requireAuth } from '../../utils/verifyAuth'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  return { presets: INVOICE_PRESETS }
})
