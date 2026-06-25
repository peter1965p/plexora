import { queryByUser, getUserId } from '../../utils/queryByUser'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const items = await queryByUser('plexora-finance', getUserId(event))

  const year  = query.year ? Number(query.year) : new Date().getFullYear()
  const invoices = (items as any[]).filter(i => {
    const d = new Date(i.created || i.dueDate || '')
    return d.getFullYear() === year
  })

  const now     = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`

  const header1 = `"EXTF";510;21;"Buchungsstapel";7;${dateStr};;"RE";"";"";1000;20001;${year}0101;4`
  const header2 = `"Umsatz (ohne Soll/Haben-Kz)";"Soll/Haben-Kennzeichen";"WKZ Umsatz";"Kurs";"Basis-Umsatz";"WKZ Basis-Umsatz";"Konto";"Gegenkonto (ohne BU-Schlüssel)";"BU-Schlüssel";"Belegdatum";"Belegfeld 1";"Belegfeld 2";"Skonto";"Buchungstext"`

  const rows = invoices.map((inv: any) => {
    const amt    = Number(inv.amount) || 0
    const brutto = Math.round(amt * 1.19 * 100) / 100
    const d      = new Date(inv.created || new Date())
    const bdate  = `${String(d.getDate()).padStart(2, '0')}${String(d.getMonth() + 1).padStart(2, '0')}`
    const desc   = (inv.description || inv.client || '').replace(/"/g, '').slice(0, 60)
    const amtStr = brutto.toFixed(2).replace('.', ',')
    return `"${amtStr}";"S";"EUR";;;"";8400;10000;;${bdate};"${inv.number || ''}";;;"${desc}"`
  })

  const csv = [header1, header2, ...rows].join('\r\n')

  setResponseHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="DATEV_Buchungsstapel_${year}.csv"`)
  return csv
})
