import { STANDARD_LEAD_HTML } from './standard'
import { MODERN_LEAD_HTML } from './modern'
import { MINIMAL_LEAD_HTML } from './minimal'

export interface CampaignPreset {
  key: string
  label: string
  description: string
  html: string
}

export const LEAD_PRESETS: CampaignPreset[] = [
  { key: 'standard', label: 'Standard', description: 'Das bisherige Plexora-Lead-Layout — 1:1 nachgebaut.', html: STANDARD_LEAD_HTML },
  { key: 'modern',   label: 'Modern',   description: 'Helles, zentriertes Layout mit großer Karte.', html: MODERN_LEAD_HTML },
  { key: 'minimal',  label: 'Minimal',  description: 'Eine Spalte, viel Weißraum, dünne Linien.', html: MINIMAL_LEAD_HTML },
]

export function getLeadPresetHtml(key: string): string {
  return LEAD_PRESETS.find(p => p.key === key)?.html || STANDARD_LEAD_HTML
}
