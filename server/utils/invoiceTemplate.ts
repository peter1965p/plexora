import Handlebars from 'handlebars'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import QRCode from 'qrcode'
import { buildEpcQrDataUri } from './epcQr'

const eur = (n: number) => `€ ${(Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const esc = (s: any) => Handlebars.Utils.escapeExpression(String(s ?? ''))

function renderPositionenTabelle(items: Array<{ description?: string; qty?: number; price?: number }>): string {
  const rows = items.map((item, idx) => {
    const qty   = item.qty ?? 1
    const price = item.price ?? 0
    const total = qty * price
    return `<tr>
      <td class="pos-nr">${idx + 1}</td>
      <td class="pos-beschreibung">${esc(item.description || 'Dienstleistung')}</td>
      <td class="pos-menge">${esc(qty)}</td>
      <td class="pos-einzelpreis">${esc(eur(price))}</td>
      <td class="pos-gesamt">${esc(eur(total))}</td>
    </tr>`
  }).join('\n')
  return `<table class="positionen-tabelle">
    <thead><tr><th>Pos</th><th>Beschreibung</th><th>Menge</th><th>Einzelpreis</th><th>Gesamt</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`
}

export interface InvoiceTemplateData {
  firma: { name: string; strasse: string; plz_ort: string; email: string; telefon: string; ustid: string; iban: string; bic: string; bankname: string; zahlungshinweis: string }
  kunde: { name: string; adresse: string; email: string }
  rechnung: { nummer: string; datum: string; faelligkeit: string; kundennummer: string }
  positionen: Handlebars.SafeString
  positionenListe: Array<{ beschreibung: string; menge: number; einzelpreis: string; gesamt: string }>
  summe: { netto: string; mwst: string; mwst_satz: string; brutto: string; kleinunternehmer: boolean }
  branding: { logo: string; farbe: string; firmenname: string; slogan: string }
  qr_code: string
  qr_code_online: string
  zahllink: string
}

// Baut das Platzhalter-Datenschema aus Rechnung + Settings — Vertrag zwischen Presets,
// dem Platzhalter-Referenz-Panel im Editor und dieser Render-Pipeline.
export async function buildTemplateData(
  invoice: any,
  branding: any = {},
  company: any = {},
  invoiceSettings: any = {},
  paymentPrefs: { sepaEnabled?: boolean; stripeEnabled?: boolean } = {},
): Promise<InvoiceTemplateData> {
  const sepaEnabled   = paymentPrefs.sepaEnabled   !== false
  const stripeEnabled = paymentPrefs.stripeEnabled !== false
  const brandName = branding?.brandName || company?.legalName || 'Plexora'
  const accent     = branding?.primaryColor || branding?.accentColor || '#EA580C'
  const invNum     = invoice.number || `INV-${String(invoice.invoiceId || '').slice(0, 8).toUpperCase()}`

  const items = invoice.items?.length ? invoice.items : [{ description: invoice.description || 'Dienstleistung', qty: 1, price: invoice.amount }]

  const netto   = Number(invoice.amount) || 0
  const vatRate = invoiceSettings?.vatRate ?? 19
  const mwst    = invoiceSettings?.smallBusiness ? 0 : Math.round(netto * (vatRate / 100) * 100) / 100
  const brutto  = netto + mwst

  const zahllink = `https://app.plexora.eu/pay/${invoice.invoiceId}`

  let qrCode = ''
  if (sepaEnabled && company?.iban) {
    try {
      qrCode = await buildEpcQrDataUri({
        name:      company.legalName || brandName,
        iban:      company.iban,
        bic:       company.bic,
        amount:    brutto,
        reference: invNum,
      })
    } catch { /* fehlerhafte IBAN o.ä. — Rechnung trotzdem ohne QR-Code ausliefern */ }
  }

  // Zweiter QR-Code: einfacher Link-QR zur Online-Zahlungsseite (Stripe-Checkout dahinter),
  // unabhängig von hinterlegter IBAN — nur wenn der Tenant Stripe als Zahlweg aktiviert hat.
  let qrCodeOnline = ''
  if (stripeEnabled) {
    try {
      qrCodeOnline = await QRCode.toDataURL(zahllink, { errorCorrectionLevel: 'M', margin: 1, width: 240 })
    } catch { /* Rechnung trotzdem ohne Online-QR ausliefern */ }
  }

  return {
    firma: {
      name:            company?.legalName || brandName,
      strasse:         company?.street || '',
      plz_ort:         company?.zipCity || '',
      email:           company?.email || '',
      telefon:         company?.phone || '',
      ustid:           company?.vatId || '',
      iban:            company?.iban || '',
      bic:             company?.bic || '',
      bankname:        company?.bankName || '',
      zahlungshinweis: company?.paymentNote || '',
    },
    kunde: {
      name:    invoice.client || '–',
      adresse: invoice.clientAddress || '',
      email:   invoice.clientEmail || '',
    },
    rechnung: {
      nummer:       invNum,
      datum:        new Date(invoice.created || Date.now()).toLocaleDateString('de-DE'),
      faelligkeit:  invoice.dueDate || '–',
      kundennummer: String(invoice.clientId || '').slice(0, 8).toUpperCase() || '–',
    },
    positionen: new Handlebars.SafeString(renderPositionenTabelle(items)),
    positionenListe: items.map((item: any) => ({
      beschreibung: item.description || 'Dienstleistung',
      menge:        item.qty ?? 1,
      einzelpreis:  eur(item.price ?? 0),
      gesamt:       eur((item.qty ?? 1) * (item.price ?? 0)),
    })),
    summe: {
      netto:            eur(netto),
      mwst:             invoiceSettings?.smallBusiness ? '–' : eur(mwst),
      mwst_satz:        invoiceSettings?.smallBusiness ? '§19 UStG' : `${vatRate}%`,
      brutto:           eur(brutto),
      kleinunternehmer: !!invoiceSettings?.smallBusiness,
    },
    branding: {
      logo:        branding?.logoUrl || '',
      farbe:       accent,
      firmenname:  brandName,
      slogan:      branding?.brandTagline || '',
    },
    qr_code: qrCode,
    qr_code_online: qrCodeOnline,
    zahllink,
  }
}

export function renderInvoiceHtml(templateHtml: string, data: InvoiceTemplateData): string {
  const compiled = Handlebars.compile(templateHtml, { noEscape: false })
  return compiled(data)
}

let browserPromise: ReturnType<typeof puppeteer.launch> | null = null

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      args:             chromium.args,
      defaultViewport:  chromium.defaultViewport,
      executablePath:   await chromium.executablePath(),
      headless:         true,
    })
  }
  return browserPromise
}

export async function renderInvoicePdf(html: string): Promise<Buffer> {
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({ format: 'A4', printBackground: true })
    return Buffer.from(pdf)
  } finally {
    await page.close()
  }
}

export async function renderInvoiceTemplateToPdf(
  templateHtml: string,
  invoice: any,
  branding: any,
  company: any,
  invoiceSettings: any,
  paymentPrefs?: { sepaEnabled?: boolean; stripeEnabled?: boolean },
): Promise<Buffer> {
  const data = await buildTemplateData(invoice, branding, company, invoiceSettings, paymentPrefs)
  const html = renderInvoiceHtml(templateHtml, data)
  return renderInvoicePdf(html)
}

// Beispiel-Rechnung für die Live-Vorschau im Template-Editor (kein echter DynamoDB-Datensatz)
export function getSampleInvoice() {
  return {
    invoiceId:    'sample-0000',
    number:       'INV-2026-0042',
    client:       'Musterfirma GmbH',
    clientAddress: 'Beispielstraße 12\n12345 Musterstadt',
    clientEmail:  'buchhaltung@musterfirma.de',
    clientId:     'sample-client-id',
    amount:       1240,
    dueDate:      new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    created:      new Date().toISOString(),
    items: [
      { description: 'Beratungsleistung — Konzeption', qty: 8, price: 95 },
      { description: 'Umsetzung & Projektmanagement',  qty: 4, price: 110 },
    ],
  }
}
