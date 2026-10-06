import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { buildLeadTemplateData, renderCampaignHtml } from '../../server/utils/campaignTemplate'
import { buildLeadTemplateDataClient, renderCampaignHtmlClient } from '../../app/utils/campaignTemplateClient'
import { LEAD_PRESETS } from '../../server/utils/campaignPresets/lead'

const FORM = { formId: 'f1', title: 'Anfrage', submitLabel: 'Senden', fields: [{ id: '1', type: 'text', label: 'Name', required: true }] }
const std = LEAD_PRESETS.find((p: any) => p.key === 'standard' || p.id === 'standard') || LEAD_PRESETS[0]
const html = (c: any, f = FORM) => renderCampaignHtml((std as any).html || (std as any).template || (std as any).templateHtml, buildLeadTemplateData(c, f, {}))
const htmlClient = (c: any, f = FORM) => renderCampaignHtmlClient((std as any).html || (std as any).template || (std as any).templateHtml, buildLeadTemplateDataClient(c, f, {}))

describe('Keine festen Texte mehr in den vier Dateien (alles kommt aus shared/leadDecor.ts)', () => {
  const FILES = ['app/pages/lead/[slug].vue', 'server/utils/campaignTemplate.ts', 'app/utils/campaignTemplateClient.ts', 'server/utils/campaignPresets/lead/standard.ts']
  const BANNED = [/100\s?%\s?kostenlos/i, /SSL gesichert/i, /Antwort in 24\s?h/i, /Keine Weitergabe an Dritte/i, /Deine Daten sind sicher/i, /Deine Daten werden vertraulich/i, /Anfrage 100/i]
  for (const f of FILES) it(f, () => { const src = readFileSync(f, 'utf8'); for (const b of BANNED) expect(src, `${f}: ${b}`).not.toMatch(b) })
  it('die Standardtexte stehen genau in shared/leadDecor.ts', () => {
    const src = readFileSync('shared/leadDecor.ts', 'utf8')
    expect(src).toContain('Anfrage 100 % kostenlos'); expect(src).toContain('SSL gesichert'); expect(src).toContain('Antwort in 24 h'); expect(src).toContain('Deine Daten werden vertraulich behandelt.')
  })
})

describe('Freigestalt-Template: Vertrauenspunkte und Datenschutzzeile', () => {
  it('ohne gespeicherte Werte: Standardpunkte und Standard-Datenschutzzeile', () => {
    const out = html({ headline: 'H' })
    for (const t of ['Anfrage 100 % kostenlos', 'SSL gesichert', 'Antwort in 24 h', 'Deine Daten werden vertraulich behandelt.']) expect(out, t).toContain(t)
    expect(out).toContain('ti-shield-check')
  })
  it('eigene Punkte und eigener Text; ausgeschaltete Punkte und eine ausgeschaltete Datenschutzzeile erscheinen nicht', () => {
    const out = html({ trustItems: [{ icon: 'star', text: 'Persönliche Beratung', on: true }, { icon: 'lock', text: 'Versteckt', on: false }], privacyLine: { on: true, text: 'Eigener Datenschutzhinweis' } })
    expect(out).toContain('Persönliche Beratung'); expect(out).toContain('ti-star'); expect(out).not.toContain('Versteckt'); expect(out).not.toContain('SSL gesichert'); expect(out).toContain('Eigener Datenschutzhinweis')
    expect(html({ privacyLine: { on: false, text: 'x' } })).not.toContain('<div class="plx-privacy">')
    expect(html({ trustItems: [] })).not.toContain('<div class="lp-trust-item">')
  })
  it('XSS: script, onerror und Anführungszeichen werden maskiert, Icons nur aus der Liste', () => {
    const out = html({ trustItems: [{ icon: '"><script>1</script>', text: '<script>alert(1)</script>' }, { icon: 'star', text: '<img src=x onerror=alert(1)>' }], privacyLine: { on: true, text: '"><svg onload=alert(1)>' } })
    expect(out).not.toMatch(/<script>alert|<img src=x|<svg onload|onerror=alert/i); expect(out).toContain('&lt;script&gt;')
  })
  it('Server- und Client-Version erzeugen dieselben Bausteine (Vorschau = echte Seite)', () => {
    for (const c of [{}, { trustItems: [{ icon: 'heart', text: 'A & B', on: true }], privacyLine: { on: true, text: 'Hinweis' } }, { trustItems: [], privacyLine: { on: false, text: '' } }]) {
      const seg = (h: string) => (h.match(/<div class="lp-trust">[\s\S]*?<\/div>\s*<\/div>|<div class="plx-privacy">[\s\S]*?<\/div>/g) || []).join('|')
      expect(seg(htmlClient(c))).toBe(seg(html(c)))
    }
  })
  it('Overlays gelten im Template-Pfad nicht: die Template-Daten enthalten keine Overlays', () => {
    const d: any = buildLeadTemplateData({ overlays: [{ shape: 'star' }] }, FORM, {})
    expect(JSON.stringify(d)).not.toContain('overlays'); expect(html({ overlays: [{ shape: 'star', text: 'X' }] })).not.toContain('lo-layer')
  })
})
