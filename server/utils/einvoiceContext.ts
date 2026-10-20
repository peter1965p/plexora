import { GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'
import { resolveUserId } from './tenant'
import { requireAuth } from './verifyAuth'
import { getPresetHtml } from './invoicePresets'
import { fromRecord, validateEInvoice, type EInvoice, type EProblem, type EProfile } from '../../shared/einvoice'

// Gemeinsam für die E-Rechnungs-Routen: die Rechnung des eigenen Mandanten laden (nur der Aussteller), dazu Firmen- und Rechnungseinstellungen.
export interface InvoiceBundle { invoice: any; tenantUserId: string; company: any; invoiceSettings: any; branding: any; paymentPrefs: any; templateHtml: string; model: EInvoice }

async function setting(id: string, scope: string): Promise<any> {
  try { return (await getDynamoClient().send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: id, scope } }))).Item || {} } catch { return {} }
}

export async function loadIssuerInvoice(event: any): Promise<InvoiceBundle> {
  const invoiceId = getRouterParam(event, 'id')
  const tenantUserId = await resolveUserId(requireAuth(event).email)
  const scan = await getDynamoClient().send(new ScanCommand({ TableName: 'plexora-finance', FilterExpression: 'invoiceId = :id AND userId = :u', ExpressionAttributeValues: { ':id': invoiceId, ':u': tenantUserId } }))
  const invoice = scan.Items?.[0]
  if (!invoice) throw createError({ statusCode: 404, message: 'Rechnung nicht gefunden' })
  const [company, inv, branding, pay] = await Promise.all([setting('company', tenantUserId), setting('invoice', tenantUserId), setting('branding', tenantUserId), setting('invoice-payment', tenantUserId)])
  const invoiceSettings = { vatRate: 19, smallBusiness: false, priceDisplay: 'netto', ...inv }
  let templateHtml = getPresetHtml('standard')
  try { const t = await getDynamoClient().send(new GetCommand({ TableName: 'plexora-invoice-templates', Key: { userId: tenantUserId } })); if (t.Item?.html) templateHtml = t.Item.html } catch { /* Standard-Vorlage */ }
  return { invoice, tenantUserId, company, invoiceSettings, templateHtml,
    branding: { brandName: 'Plexora', brandTagline: 'Business Platform', primaryColor: '#EA580C', ...branding }, paymentPrefs: { sepaEnabled: true, stripeEnabled: true, ...pay },
    model: fromRecord(invoice, company, invoiceSettings) }
}

export const errorsOf = (p: EProblem[]) => p.filter(x => x.level === 'error')
/** Wirft 422 mit der Liste der fehlenden Pflichtangaben, wenn das Dokument sonst ungültig wäre */
export function assertValidFor(model: EInvoice, profile: EProfile) {
  const errs = errorsOf(validateEInvoice(model, profile))
  if (errs.length) throw createError({ statusCode: 422, message: 'Die E-Rechnung ist noch nicht vollständig: ' + errs.map(e => e.message).join(' '), data: { problems: errs } })
}
