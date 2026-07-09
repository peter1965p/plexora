// Client-seitige Kopie der Platzhalter-Logik aus server/utils/invoiceTemplate.ts + epcQr.ts,
// damit die Live-Vorschau im Editor ohne Server-Roundtrip läuft (kein Puppeteer im Client-Bundle).
// Platzhalter-Namen/Struktur MÜSSEN mit der Server-Version synchron bleiben.
import Handlebars from 'handlebars'
import QRCode from 'qrcode'

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

function buildEpcPayload(name: string, iban: string, bic: string, amount: number, reference: string): string {
  const lines = [
    'BCD', '002', '1', 'SCT',
    (bic || '').replace(/\s/g, '').toUpperCase().slice(0, 11),
    (name || '').slice(0, 70),
    iban.replace(/\s/g, '').toUpperCase(),
    `EUR${Math.max(0, amount).toFixed(2)}`,
    '', '', (reference || '').slice(0, 140), '',
  ]
  while (lines.length && lines[lines.length - 1] === '') lines.pop()
  return lines.join('\n')
}

export function getSampleInvoice() {
  return {
    invoiceId: 'sample-0000',
    number: 'INV-2026-0042',
    client: 'Musterfirma GmbH',
    clientAddress: 'Beispielstraße 12\n12345 Musterstadt',
    clientEmail: 'buchhaltung@musterfirma.de',
    clientId: 'sample-client-id',
    amount: 1240,
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    created: new Date().toISOString(),
    items: [
      { description: 'Beratungsleistung — Konzeption', qty: 8, price: 95 },
      { description: 'Umsetzung & Projektmanagement',  qty: 4, price: 110 },
    ],
  }
}

export async function buildTemplateDataClient(invoice: any, branding: any = {}, company: any = {}, invoiceSettings: any = {}) {
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
  if (company?.iban) {
    try {
      const payload = buildEpcPayload(company.legalName || brandName, company.iban, company.bic, brutto, invNum)
      qrCode = await QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', margin: 1, width: 240 })
    } catch { /* ungültige IBAN in der Vorschau ignorieren */ }
  }

  let qrCodeOnline = ''
  try {
    qrCodeOnline = await QRCode.toDataURL(zahllink, { errorCorrectionLevel: 'M', margin: 1, width: 240 })
  } catch { /* Vorschau trotzdem ohne Online-QR anzeigen */ }

  return {
    firma: {
      name: company?.legalName || brandName, strasse: company?.street || '', plz_ort: company?.zipCity || '',
      email: company?.email || '', telefon: company?.phone || '', ustid: company?.vatId || '',
      iban: company?.iban || '', bic: company?.bic || '', bankname: company?.bankName || '',
      zahlungshinweis: company?.paymentNote || '',
    },
    kunde: { name: invoice.client || '–', adresse: invoice.clientAddress || '', email: invoice.clientEmail || '' },
    rechnung: {
      nummer: invNum,
      datum: new Date(invoice.created || Date.now()).toLocaleDateString('de-DE'),
      faelligkeit: invoice.dueDate || '–',
      kundennummer: String(invoice.clientId || '').slice(0, 8).toUpperCase() || '–',
    },
    positionen: new Handlebars.SafeString(renderPositionenTabelle(items)),
    positionenListe: items.map((item: any) => ({
      beschreibung: item.description || 'Dienstleistung', menge: item.qty ?? 1,
      einzelpreis: eur(item.price ?? 0), gesamt: eur((item.qty ?? 1) * (item.price ?? 0)),
    })),
    summe: {
      netto: eur(netto),
      mwst: invoiceSettings?.smallBusiness ? '–' : eur(mwst),
      mwst_satz: invoiceSettings?.smallBusiness ? '§19 UStG' : `${vatRate}%`,
      brutto: eur(brutto),
      kleinunternehmer: !!invoiceSettings?.smallBusiness,
    },
    branding: { logo: branding?.logoUrl || '', farbe: accent, firmenname: brandName, slogan: branding?.brandTagline || '' },
    qr_code: qrCode,
    qr_code_online: qrCodeOnline,
    zahllink,
  }
}

export function renderInvoiceHtmlClient(templateHtml: string, data: any): string {
  try {
    const compiled = Handlebars.compile(templateHtml, { noEscape: false })
    return compiled(data)
  } catch (e: any) {
    return `<pre style="color:#dc2626;padding:20px;font-family:monospace;white-space:pre-wrap">Template-Fehler:\n${e?.message || e}</pre>`
  }
}
