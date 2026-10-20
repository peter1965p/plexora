import { incomingContext, readIncoming, checkIncoming, summary } from '../../../utils/einvoiceIncoming'

// Eine eingegangene E-Rechnung (XML oder ZUGFeRD-PDF) lesen und prüfen, ohne sie zu speichern (Vorschau)
export default defineEventHandler(async (event) => {
  await incomingContext(event, false)
  const { parsed, source } = await readIncoming(await readBody(event).catch(() => ({})))
  return { source, invoice: summary(parsed), hints: checkIncoming(parsed) }
})
