import { standardTemplate } from './standard'
import { modernTemplate } from './modern'
import { klassischTemplate } from './klassisch'
import { minimalTemplate } from './minimal'
import { farbigTemplate } from './farbig'

export interface InvoicePreset {
  key: string
  label: string
  description: string
  html: string
}

export const INVOICE_PRESETS: InvoicePreset[] = [
  { key: 'standard',  label: 'Standard',  description: 'Das bisherige Plexora-Rechnungsdesign — 1:1 nachgebaut.', html: standardTemplate },
  { key: 'modern',    label: 'Modern',    description: 'Klares Sans-Serif-Layout mit farbigem Badge und viel Weißraum.', html: modernTemplate },
  { key: 'klassisch', label: 'Klassisch', description: 'Seriöses Serif-Layout im traditionellen Geschäftsbrief-Stil.', html: klassischTemplate },
  { key: 'minimal',   label: 'Minimal',   description: 'Reduziert auf das Wesentliche, dünne Linien, viel Luft.', html: minimalTemplate },
  { key: 'farbig',    label: 'Farbig',    description: 'Kräftiges Farbband, Karten-Layout, moderne Akzente.', html: farbigTemplate },
]

export function getPresetHtml(key: string): string {
  return INVOICE_PRESETS.find(p => p.key === key)?.html || standardTemplate
}
