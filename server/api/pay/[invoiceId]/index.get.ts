import { GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { resolveUserId } from '../../../utils/tenant'

export default defineEventHandler(async (event) => {
  const invoiceId = getRouterParam(event, 'invoiceId')
  const dynamo    = getDynamoClient()

  // Rechnung suchen (ohne userId)
  const scan = await dynamo.send(new ScanCommand({
    TableName: 'plexora-finance',
    FilterExpression: 'invoiceId = :id',
    ExpressionAttributeValues: { ':id': invoiceId }
  }))
  const invoice = scan.Items?.[0]
  if (!invoice) throw createError({ statusCode: 404, message: 'Rechnung nicht gefunden' })

  const tenantUserId = await resolveUserId(invoice.userId)

  // Aktiven Gateway laden (Zugangsdaten bleiben global — ein Plattform-Stripe-Konto für alle)
  const ps = await dynamo.send(new GetCommand({
    TableName: 'plexora-settings',
    Key: { settingId: 'payment', scope: 'global' }
  }))
  const gateway = ps.Item?.activeGateway || 'stripe'

  // Zahlungsweg-Präferenz des ausstellenden Tenants
  let sepaEnabled = true, stripeEnabled = true
  try {
    const pp = await dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'invoice-payment', scope: tenantUserId } }))
    if (pp.Item) {
      sepaEnabled   = pp.Item.sepaEnabled   !== false
      stripeEnabled = pp.Item.stripeEnabled !== false
    }
  } catch {}

  // Branding des ausstellenden Tenants
  let branding: any = { brandName: 'Plexora', brandTagline: 'Business Platform', primaryColor: '#ea580c' }
  try {
    const bs = await dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'branding', scope: tenantUserId } }))
    if (bs.Item) branding = { ...branding, ...bs.Item }
  } catch {}

  return { invoice, gateway: stripeEnabled ? gateway : null, sepaEnabled, stripeEnabled, branding }
})
