import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { requireTenantId } from '../../../../utils/auth'
import { renderInvoicePdf } from '../../../../utils/invoiceTemplate'

function esc(s: any) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const rezeptId = getRouterParam(event, 'id') || ''
  const dynamo = getDynamoClient()

  const rezeptRes = await dynamo.send(new GetCommand({ TableName: 'plexora-praxis-rezepte', Key: { tenantId, rezeptId } }))
  const rezept = rezeptRes.Item
  if (!rezept) throw createError({ statusCode: 404, message: 'Rezept nicht gefunden' })

  let patient: any = null
  if (rezept.patientId) {
    const pRes = await dynamo.send(new GetCommand({ TableName: 'plexora-praxis-patienten', Key: { tenantId, patientId: rezept.patientId } }))
    patient = pRes.Item
  }

  let companyName = 'Plexora'
  try {
    const nexoraRes = await dynamo.send(new GetCommand({ TableName: 'plexora-nexora', Key: { tenantId } }))
    if (nexoraRes.Item?.companyName) companyName = nexoraRes.Item.companyName
  } catch {}

  const html = `
    <html><head><meta charset="utf-8"></head>
    <body style="font-family:sans-serif;color:#222;padding:40px;max-width:700px;margin:0 auto">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px">
        <div>
          <div style="font-size:22px;font-weight:900;color:#EA580C">Rezept</div>
          <div style="font-size:13px;color:#888;margin-top:4px">${esc(companyName)}</div>
        </div>
        <div style="text-align:right;font-size:12px;color:#888">
          Ausgestellt am ${new Date(rezept.issuedAt).toLocaleDateString('de-DE')}
        </div>
      </div>

      <div style="background:#f8f8f8;border-radius:10px;padding:16px 20px;margin-bottom:28px">
        <div style="font-weight:700;font-size:15px">${esc(patient?.name || 'Unbekannter Patient')}</div>
        ${patient?.birthDate ? `<div style="font-size:12px;color:#888;margin-top:4px">geb. ${esc(patient.birthDate)}</div>` : ''}
      </div>

      <div style="font-size:14px;line-height:1.7;white-space:pre-wrap">${esc(rezept.text)}</div>

      <div style="margin-top:60px;font-size:12px;color:#888;border-top:1px solid #eee;padding-top:16px">
        Interne Dokumentation — kein eRezept, keine Apotheken-Anbindung.
      </div>
    </body></html>
  `

  const pdfBuffer = await renderInvoicePdf(html)
  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `attachment; filename="Rezept-${rezeptId.slice(0,8)}.pdf"`)
  return pdfBuffer
})
