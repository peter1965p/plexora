import { flat, kitContext, kitList } from '../../../../utils/branchKitStore'

// Liste eines Branchen-Baukasten-Pakets (z. B. /api/branchen/fitness/mitglieder), neueste zuerst
export default defineEventHandler(async (event) => {
  const { tenantId, pkg, entity } = await kitContext(event, false)
  const rows = (await kitList(tenantId, pkg.key, entity.key)).map(flat).sort((a, b) => String(b.created).localeCompare(String(a.created)))
  return { records: rows }
})
