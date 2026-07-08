import { INVOICE_PRESETS } from '../../utils/invoicePresets'

export default defineEventHandler(async () => {
  return { presets: INVOICE_PRESETS }
})
