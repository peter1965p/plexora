import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { requireTenantId } from '../../../../utils/auth'
import { renderInvoicePdf } from '../../../../utils/invoiceTemplate'

function esc(s: any) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const baustelleId = getRouterParam(event, 'id') || ''
  const dynamo = getDynamoClient()

  const baustelleRes = await dynamo.send(new GetCommand({ TableName: 'plexora-handwerk-baustellen', Key: { tenantId, baustelleId } }))
  const baustelle = baustelleRes.Item
  if (!baustelle) throw createError({ statusCode: 404, message: 'Baustelle nicht gefunden' })

  const aufmassRes = await dynamo.send(new QueryCommand({
    TableName: 'plexora-handwerk-aufmasse',
    KeyConditionExpression: 'tenantId = :t',
    ExpressionAttributeValues: { ':t': tenantId },
  }))
  const aufmasse = (aufmassRes.Items || []).filter((a: any) => a.baustelleId === baustelleId)

  let companyName = 'Plexora'
  try {
    const nexoraRes = await dynamo.send(new GetCommand({ TableName: 'plexora-nexora', Key: { tenantId } }))
    if (nexoraRes.Item?.companyName) companyName = nexoraRes.Item.companyName
  } catch {}

  const rows = aufmasse.flatMap((a: any) => {
    const measurements = Array.isArray(a.measurements) ? a.measurements : []
    if (!measurements.length) {
      return [`<tr><td colspan="6" style="padding:8px;color:#888">${esc(a.bereich || 'Aufmaß')} — keine Maße erfasst</td></tr>`]
    }
    return measurements.map((m: any) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee">${esc(a.bereich)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${esc(m.label)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${esc(m.width)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${esc(m.height)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${esc(m.qty)} ${esc(m.unit)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${esc(m.note)}</td>
      </tr>`)
  }).join('')

  const html = `
    <html><head><meta charset="utf-8"></head>
    <body style="font-family:sans-serif;color:#222;padding:40px;max-width:800px;margin:0 auto">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px">
        <div>
          <div style="font-size:22px;font-weight:900;color:#EA580C">Auftragszettel</div>
          <div style="font-size:13px;color:#888;margin-top:4px">${esc(companyName)}</div>
        </div>
        <div style="text-align:right;font-size:12px;color:#888">
          Erstellt am ${new Date().toLocaleDateString('de-DE')}
        </div>
      </div>

      <div style="background:#f8f8f8;border-radius:10px;padding:16px 20px;margin-bottom:28px">
        <div style="font-weight:700;font-size:15px;margin-bottom:6px">${esc(baustelle.customerName)}</div>
        <div style="font-size:13px;color:#555">${esc(baustelle.address)}</div>
        <div style="font-size:13px;color:#555;margin-top:6px">${esc(baustelle.description)}</div>
        <div style="font-size:12px;color:#888;margin-top:8px">Status: ${esc(baustelle.status)}${baustelle.startDate ? ` · Start: ${esc(baustelle.startDate)}` : ''}${baustelle.endDate ? ` · Ende: ${esc(baustelle.endDate)}` : ''}</div>
      </div>

      <div style="font-weight:700;font-size:14px;margin-bottom:10px">Aufmaß</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="text-align:left;color:#888;text-transform:uppercase;font-size:10px">
            <th style="padding:8px">Bereich</th><th style="padding:8px">Position</th>
            <th style="padding:8px;text-align:right">Breite</th><th style="padding:8px;text-align:right">Höhe</th>
            <th style="padding:8px;text-align:right">Menge</th><th style="padding:8px">Notiz</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="6" style="padding:8px;color:#888">Kein Aufmaß erfasst</td></tr>'}</tbody>
      </table>

      ${baustelle.notes ? `<div style="margin-top:28px;font-size:13px;color:#555"><strong>Notizen:</strong> ${esc(baustelle.notes)}</div>` : ''}
    </body></html>
  `

  const pdfBuffer = await renderInvoicePdf(html)
  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `attachment; filename="Auftragszettel-${baustelleId.slice(0,8)}.pdf"`)
  return pdfBuffer
})
