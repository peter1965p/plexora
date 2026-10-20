import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { fromRecord, toCii, validateEInvoice } from '../../shared/einvoice'
import { SAMPLE_COMPANY, SAMPLE_SETTINGS, SAMPLE_RECORD, SAMPLE_FILES } from '../../shared/einvoiceSample'
import { extractEmbeddedXml } from '../../server/utils/zugferd'

// Die Beispiel-Dateien auf der Startseite müssen zum Code passen: neu erzeugt (npx vite-node scripts/make-sample-einvoice.mjs), wenn sich das XML ändert.
describe('Beispiel-E-Rechnung (public/beispiele)', () => {
  const m = fromRecord(SAMPLE_RECORD, SAMPLE_COMPANY, SAMPLE_SETTINGS)
  it('Musterdaten sind vollständig für beide Formate', () => {
    for (const p of ['xrechnung', 'zugferd'] as const) expect(validateEInvoice(m, p).filter(e => e.level === 'error')).toEqual([])
  })
  it('die Dateien gibt es und entsprechen dem aktuellen Code', async () => {
    for (const f of Object.values(SAMPLE_FILES)) expect(existsSync(`public/beispiele/${f}`), f).toBe(true)
    expect(readFileSync(`public/beispiele/${SAMPLE_FILES.xrechnung}`, 'utf8')).toBe(toCii(m, 'xrechnung'))
    expect(readFileSync(`public/beispiele/${SAMPLE_FILES.zugferdXml}`, 'utf8')).toBe(toCii(m, 'zugferd'))
    expect(await extractEmbeddedXml(readFileSync(`public/beispiele/${SAMPLE_FILES.zugferd}`))).toBe(toCii(m, 'zugferd'))
  })
  it('Summe: Positionen und angegebener Betrag stimmen überein', () => {
    expect(SAMPLE_RECORD.items.reduce((s, i) => s + i.qty * i.price, 0)).toBeCloseTo(SAMPLE_RECORD.amount, 2)
  })
  it('Startseite verlinkt die Beispiele', () => {
    const idx = readFileSync('app/pages/index.vue', 'utf8')
    expect(idx).toContain('/beispiele/beispiel-zugferd.pdf'); expect(idx).toContain('/beispiele/beispiel-xrechnung.xml')
  })
})
