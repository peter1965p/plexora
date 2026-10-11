import Handlebars from 'handlebars'
import { buildTemplateData, renderInvoicePdf } from './invoiceTemplate'
import { APP_ORIGIN } from './quoteStore'

// PDF des Angebots: eigene, schlichte Vorlage (nicht die Rechnungs-Vorlagen des Mandanten, die "Rechnung", Zahlungs-QR und Fälligkeit enthalten).
// Die Daten (Absender, Kunde, Positionen, Summen, Farbe/Logo) kommen aus derselben Quelle wie bei Rechnungen; Texte werden maskiert (Handlebars).
export const QUOTE_TEMPLATE = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><style>
@page { size: A4; margin: 0 } * { box-sizing: border-box } body { margin: 0; font-family: Helvetica, Arial, sans-serif; color: #1a1a1a; font-size: 10pt }
.page { padding: 52pt 64pt 45pt } .head { display: flex; justify-content: space-between; align-items: flex-start }
.logo { max-height: 42pt; max-width: 170pt; display: block; margin-bottom: 6pt } .brand { font-size: 24pt; font-weight: 700; color: {{branding.farbe}}; margin: 0 }
.slogan { font-size: 9pt; color: #888; margin: 3pt 0 0 } .doc { font-size: 22pt; font-weight: 700; text-align: right; margin: 0 } .meta { font-size: 9pt; color: #555; text-align: right; margin: 4pt 0 0 }
.line { height: 2pt; background: {{branding.farbe}}; margin: 12pt 0 } .sender { font-size: 7.5pt; color: #888; margin-bottom: 14pt }
.to { font-size: 11pt; font-weight: 700; margin: 0 0 3pt } .to p { margin: 0 0 3pt; font-size: 10pt; font-weight: 400; color: #555; white-space: pre-line }
h2 { font-size: 14pt; margin: 22pt 0 6pt } .intro { white-space: pre-line; color: #333; margin: 0 0 14pt }
table { width: 100%; border-collapse: collapse } th { text-align: left; font-size: 8.5pt; text-transform: uppercase; color: #666; border-bottom: 1.5pt solid {{branding.farbe}}; padding: 5pt 4pt }
td { padding: 6pt 4pt; border-bottom: .5pt solid #ddd; vertical-align: top } .r { text-align: right; white-space: nowrap }
.sum { width: 220pt; margin: 12pt 0 0 auto } .sum div { display: flex; justify-content: space-between; padding: 3pt 0 } .sum .t { font-weight: 700; font-size: 12pt; border-top: 1.5pt solid #1a1a1a; margin-top: 4pt; padding-top: 6pt }
.valid { margin-top: 18pt; padding: 9pt 12pt; background: #f4f4f7; border-left: 3pt solid {{branding.farbe}} } .note { white-space: pre-line; margin-top: 12pt; color: #555 } .foot { margin-top: 20pt; font-size: 8.5pt; color: #888 }
</style></head><body><div class="page">
<div class="head"><div>{{#if branding.logo}}<img class="logo" src="{{branding.logo}}" alt="">{{/if}}<p class="brand">{{branding.firmenname}}</p>{{#if branding.slogan}}<p class="slogan">{{branding.slogan}}</p>{{/if}}</div>
<div><p class="doc">Angebot</p><p class="meta">Nr. {{rechnung.nummer}} · {{rechnung.datum}}</p><p class="meta">Gültig bis {{angebot.gueltigBis}}</p></div></div>
<div class="line"></div>
<div class="sender">{{firma.name}}{{#if firma.strasse}} · {{firma.strasse}}{{/if}}{{#if firma.plz_ort}} · {{firma.plz_ort}}{{/if}}</div>
<div class="to">{{kunde.name}}{{#if kunde.adresse}}<p>{{kunde.adresse}}</p>{{/if}}</div>
{{#if angebot.titel}}<h2>{{angebot.titel}}</h2>{{else}}<h2>Ihr Angebot</h2>{{/if}}
{{#if angebot.einleitung}}<p class="intro">{{angebot.einleitung}}</p>{{/if}}
<table><thead><tr><th>Position</th><th class="r">Menge</th><th class="r">Einzelpreis</th><th class="r">Gesamt</th></tr></thead><tbody>
{{#each positionenListe}}<tr><td>{{beschreibung}}</td><td class="r">{{menge}}</td><td class="r">{{einzelpreis}}</td><td class="r">{{gesamt}}</td></tr>{{/each}}
</tbody></table>
<div class="sum"><div><span>Netto</span><span>{{summe.netto}}</span></div><div><span>{{#if summe.kleinunternehmer}}Umsatzsteuer{{else}}MwSt {{summe.mwst_satz}}{{/if}}</span><span>{{summe.mwst}}</span></div><div class="t"><span>Gesamt</span><span>{{summe.brutto}}</span></div></div>
{{#if summe.kleinunternehmer}}<p class="note">Gemäß §19 UStG wird keine Umsatzsteuer berechnet.</p>{{/if}}
<div class="valid">Dieses Angebot ist gültig bis <strong>{{angebot.gueltigBis}}</strong>.{{#if angebot.annahmelink}} Online annehmen: {{angebot.annahmelink}}{{/if}}</div>
{{#if angebot.hinweis}}<p class="note">{{angebot.hinweis}}</p>{{/if}}
<div class="foot">{{firma.name}}{{#if firma.email}} · {{firma.email}}{{/if}}{{#if firma.telefon}} · {{firma.telefon}}{{/if}}{{#if firma.ustid}} · USt-IdNr. {{firma.ustid}}{{/if}}</div>
</div></body></html>`

export async function quoteHtml(quote: any, ctx: { branding: any; company: any; invoiceSettings: any }, acceptLink = ''): Promise<string> {
  const data: any = await buildTemplateData(
    { number: quote.number, created: quote.created, items: quote.items, amount: quote.net, client: quote.client, clientEmail: quote.clientEmail, clientAddress: quote.clientAddress, invoiceId: quote.quoteId },
    ctx.branding, ctx.company, { vatRate: quote.vatRate ?? ctx.invoiceSettings.vatRate, smallBusiness: quote.smallBusiness ?? ctx.invoiceSettings.smallBusiness }, { sepaEnabled: false, stripeEnabled: false },
  )
  data.angebot = { titel: quote.title || '', einleitung: quote.intro || '', hinweis: quote.note || '', gueltigBis: new Date(quote.validUntil + 'T00:00:00').toLocaleDateString('de-DE'), annahmelink: acceptLink }
  return Handlebars.compile(QUOTE_TEMPLATE)(data)
}
export async function renderQuotePdf(quote: any, ctx: { branding: any; company: any; invoiceSettings: any }, acceptLink = ''): Promise<Buffer> {
  return renderInvoicePdf(await quoteHtml(quote, ctx, acceptLink))
}
export const acceptUrl = (ref: string) => `${APP_ORIGIN}/angebot/${ref}`
