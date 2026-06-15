export type ThemeVars = Record<string, string>

export interface Theme {
  userId: string
  themeId: string
  name: string
  vars: ThemeVars
  created: string
}

export const DARK_VARS: ThemeVars = {
  '--bg-base': '#0a0e1a',
  '--bg-surface': '#13182a',
  '--bg-elevated': '#1c2338',
  '--bg-hover': '#232942',
  '--text-primary': '#f0eef9',
  '--text-secondary': '#8b8fa8',
  '--text-muted': '#545870',
  '--accent': '#6c3fe8',
  '--accent-2': '#00d4b4',
  '--accent-rgb': '108, 63, 232',
  '--border': 'rgba(255, 255, 255, 0.07)',
  '--border-accent': 'rgba(108, 63, 232, 0.25)',
}

export const LIGHT_VARS: ThemeVars = {
  '--bg-base': '#f4f3fa',
  '--bg-surface': '#ffffff',
  '--bg-elevated': '#f0eef9',
  '--bg-hover': '#e8e6f5',
  '--text-primary': '#0a0e1a',
  '--text-secondary': '#5a5e78',
  '--text-muted': '#9a9eb8',
  '--accent': '#6c3fe8',
  '--accent-2': '#00d4b4',
  '--accent-rgb': '108, 63, 232',
  '--border': 'rgba(0, 0, 0, 0.08)',
  '--border-accent': 'rgba(108, 63, 232, 0.2)',
}

export function hexToRgbString(hex: string): string {
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return `${r}, ${g}, ${b}`
}

export function rgbaToHexAlpha(value: string): { hex: string; alpha: number } {
  const m = value.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\)/)
  if (!m) return { hex: '#ffffff', alpha: 1 }
  const r = Math.round(parseFloat(m[1]))
  const g = Math.round(parseFloat(m[2]))
  const b = Math.round(parseFloat(m[3]))
  const a = m[4] !== undefined ? parseFloat(m[4]) : 1
  const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
  return { hex, alpha: a }
}

export function hexAlphaToRgba(hex: string, alpha: number): string {
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
