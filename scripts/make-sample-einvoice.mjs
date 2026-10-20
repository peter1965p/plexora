// Erzeugt die Beispiel-E-Rechnungen für die Startseite (public/beispiele/): XRechnung (XML), ZUGFeRD (PDF mit eingebetteter XML) und die XML daraus.
// Aufruf: npx vite-node scripts/make-sample-einvoice.mjs   (braucht einen lokalen Chrome/Brave: BROWSER=/usr/bin/brave)
import { mkdirSync, writeFileSync } from 'node:fs'
import puppeteer from 'puppeteer-core'
import { fromRecord, toCii, validateEInvoice } from '../shared/einvoice'
import { SAMPLE_COMPANY, SAMPLE_SETTINGS, SAMPLE_RECORD, SAMPLE_FILES } from '../shared/einvoiceSample'
import { buildTemplateData, renderInvoiceHtml } from '../server/utils/invoiceTemplate'
import { getPresetHtml } from '../server/utils/invoicePresets'
import { embedZugferd } from '../server/utils/zugferd'

const model = fromRecord(SAMPLE_RECORD, SAMPLE_COMPANY, SAMPLE_SETTINGS)
for (const p of ['xrechnung', 'zugferd']) { const errs = validateEInvoice(model, p).filter(e => e.level === 'error'); if (errs.length) throw new Error(p + ': ' + errs.map(e => e.message).join(' ')) }
const dir = 'public/beispiele'; mkdirSync(dir, { recursive: true })
writeFileSync(`${dir}/${SAMPLE_FILES.xrechnung}`, toCii(model, 'xrechnung'))
writeFileSync(`${dir}/${SAMPLE_FILES.zugferdXml}`, toCii(model, 'zugferd'))
const data = await buildTemplateData(SAMPLE_RECORD, { brandName: 'Beispiel Software', primaryColor: '#EA580C' }, SAMPLE_COMPANY, SAMPLE_SETTINGS, { sepaEnabled: true, stripeEnabled: false })
const html = renderInvoiceHtml(getPresetHtml('standard'), data)
const browser = await puppeteer.launch({ executablePath: process.env.BROWSER || '/usr/bin/brave', headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage(); await page.setContent(html, { waitUntil: 'networkidle0' })
const pdf = await page.pdf({ format: 'A4', printBackground: true }); await browser.close()
writeFileSync(`${dir}/${SAMPLE_FILES.zugferd}`, await embedZugferd(pdf, toCii(model, 'zugferd'), `Beispiel-Rechnung ${model.number}`))
console.log('fertig')
