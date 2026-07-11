import { STANDARD_JOB_HTML } from './standard'
import { MODERN_JOB_HTML } from './modern'
import { MINIMAL_JOB_HTML } from './minimal'
import type { CampaignPreset } from '../lead/index'

export const JOB_PRESETS: CampaignPreset[] = [
  { key: 'standard', label: 'Standard', description: 'Das bisherige Plexora-Job-Layout — 1:1 nachgebaut.', html: STANDARD_JOB_HTML },
  { key: 'modern',   label: 'Modern',   description: 'Farbiger Hero-Banner, moderne Recruiting-Optik.', html: MODERN_JOB_HTML },
  { key: 'minimal',  label: 'Minimal',  description: 'Eine Spalte, dünne Trennlinien, viel Weißraum.', html: MINIMAL_JOB_HTML },
]

export function getJobPresetHtml(key: string): string {
  return JOB_PRESETS.find(p => p.key === key)?.html || STANDARD_JOB_HTML
}
