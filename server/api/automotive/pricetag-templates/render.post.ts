import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { renderVehiclePriceTagPdf, getSampleVehicle } from '../../../utils/vehiclePriceTagTemplate'
import { requireAuth } from '../../../utils/verifyAuth'
import { resolveUserId } from '../../../utils/tenant'

export default defineEventHandler(async (event) => {
  // Puppeteer-Rendering ist teuer (CPU/Memory) — nur für angemeldete Nutzer, sonst Missbrauchs-/Kostenrisiko.
  const { email } = requireAuth(event)
  const body = await readBody(event)
  const contentHtml = String(body.contentHtml ?? '')

  const dynamo = getDynamoClient()
  const tenantUserId = await resolveUserId(email)

  let branding = { brandName: 'Plexora', logoUrl: '', primaryColor: '#EA580C' }
  try {
    const bs = await dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'branding', scope: tenantUserId } }))
    if (bs.Item) branding = { ...branding, ...bs.Item }
  } catch {}

  let company: any = {}
  try {
    const cs = await dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'company', scope: tenantUserId } }))
    if (cs.Item) company = cs.Item
  } catch {}

  const pdfBuffer = await renderVehiclePriceTagPdf(
    {
      presetKey:   body.presetKey   || 'klassisch',
      contentHtml,
      pageFormat:  body.pageFormat  || 'A5',
      orientation: body.orientation || 'portrait',
    },
    getSampleVehicle(),
    branding,
    company,
  )

  setHeader(event, 'Content-Type', 'application/pdf')
  return pdfBuffer
})
