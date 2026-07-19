import { klassischTemplate } from './klassisch'
import { modernTemplate } from './modern'

export interface PricetagPreset {
  key: string
  label: string
  description: string
  frameHtml: string
  startContentHtml: string
}

// Chip-Markup MUSS exakt zu renderHTML() in
// app/components/automotive/extensions/priceTagTextField.ts / priceTagImageField.ts passen —
// resolvePlaceholderChips() in server/utils/vehiclePriceTagTemplate.ts erkennt Chips
// ausschließlich über die data-pricetag-field-text/-image Marker-Attribute, das visuelle
// Styling hier dient nur der Start-Vorlage und darf abweichen, ohne die Funktion zu brechen.
function textChip(field: string, label: string): string {
  return `<span data-pricetag-field-text="" data-field="${field}" contenteditable="false" style="display:inline-flex;align-items:center;background:#FFF1E9;color:#B84A16;border:1px solid #F3C7A6;border-radius:6px;padding:2px 8px;font-size:12px;font-weight:600;white-space:nowrap;">${label}</span>`
}
function imageChip(field: string, label: string): string {
  return `<div data-pricetag-field-image="" data-field="${field}" contenteditable="false" style="display:flex;align-items:center;justify-content:center;gap:8px;background:#F5F5F7;border:2px dashed #C9C9CE;border-radius:10px;padding:24px;color:#6b6b6b;font-size:13px;font-weight:600;">🖼 ${label}</div>`
}

const defaultStartContent = `
  ${imageChip('fahrzeug.foto', 'Fahrzeugfoto')}
  <ul>
    <li>Kraftstoff: ${textChip('fahrzeug.kraftstoff', 'Kraftstoff')}</li>
    <li>Getriebe: ${textChip('fahrzeug.getriebe', 'Getriebe')}</li>
    <li>Leistung: ${textChip('fahrzeug.leistung', 'Leistung')}</li>
    <li>Farbe: ${textChip('fahrzeug.farbe', 'Farbe')}</li>
  </ul>
  <p></p>
`

export const PRICETAG_PRESETS: PricetagPreset[] = [
  {
    key:         'klassisch',
    label:       'Klassisch',
    description: 'Preis-Badge prominent unter dem Titel, ruhiges Layout mit viel Weißraum.',
    frameHtml:   klassischTemplate,
    startContentHtml: defaultStartContent,
  },
  {
    key:         'modern',
    label:       'Modern',
    description: 'Farbiges Kopfband mit Logo, Preis-Badge unten rechts als Rahmen-Akzent.',
    frameHtml:   modernTemplate,
    startContentHtml: defaultStartContent,
  },
]

export function getPresetFrame(key: string): string {
  return PRICETAG_PRESETS.find(p => p.key === key)?.frameHtml || klassischTemplate
}
