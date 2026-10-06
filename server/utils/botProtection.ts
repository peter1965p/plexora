import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'
import { decryptSecret } from './crypto'

export const BOT_SETTING_ID = 'bot-protection'
export const WIDGET_MODES = ['managed', 'invisible'] as const
export type WidgetMode = typeof WIDGET_MODES[number]

// Seiten der Plattform selbst; die Domain des Mandanten und eigene Einträge kommen dazu
export const DEFAULT_HOSTNAMES = ['app.plexora.eu', 'www.plexora.eu', 'plexora.eu']

export interface BotSettings {
  enabled: boolean
  siteKey: string
  secretEncrypted: string
  secretMasked: string
  mode: WidgetMode
  contactProtection: boolean
  hostnames: string[]
}

export const EMPTY_BOT_SETTINGS: BotSettings = {
  enabled: false, siteKey: '', secretEncrypted: '', secretMasked: '', mode: 'managed', contactProtection: false, hostnames: [],
}

// Cloudflare-Sitekeys beginnen mit 0x…, die Testschlüssel mit 1x/2x/3x…
export const SITE_KEY_RE = /^[0-9]x[A-Za-z0-9_-]{10,60}$/
export const HOSTNAME_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/

export function maskSecret(secret: string): string {
  return `${'•'.repeat(8)}${secret.slice(-4)}`
}

// Einstellungen des Inhabers (Scope = aufgelöste Inhaber-Kennung, wie bei Branding)
export async function getBotSettings(ownerScope: string): Promise<BotSettings> {
  if (!ownerScope) return { ...EMPTY_BOT_SETTINGS }
  const res = await getDynamoClient().send(new GetCommand({
    TableName: 'plexora-settings', Key: { settingId: BOT_SETTING_ID, scope: ownerScope },
  }))
  const it = res.Item
  if (!it) return { ...EMPTY_BOT_SETTINGS }
  return {
    enabled: it.enabled === true,
    siteKey: String(it.siteKey || ''),
    secretEncrypted: String(it.secretEncrypted || ''),
    secretMasked: String(it.secretMasked || ''),
    mode: it.mode === 'invisible' ? 'invisible' : 'managed',
    contactProtection: it.contactProtection === true,
    hostnames: Array.isArray(it.hostnames) ? it.hostnames.map(String) : [],
  }
}

export function hasKeys(s: BotSettings): boolean {
  return !!s.siteKey && !!s.secretEncrypted
}

export function readSecret(s: BotSettings): string {
  return decryptSecret(s.secretEncrypted)
}

// Was nach außen geht: nie das Secret, nur die maskierte Form
export function describeForOwner(s: BotSettings) {
  return {
    enabled: s.enabled, siteKey: s.siteKey, secretConfigured: !!s.secretEncrypted, secretMasked: s.secretMasked,
    mode: s.mode, contactProtection: s.contactProtection, hostnames: s.hostnames, defaultHostnames: DEFAULT_HOSTNAMES,
  }
}

// Anzahl Kampagnen des Inhabers mit aktivem Bot-Schutz
export async function countProtectedCampaigns(ownerScope: string): Promise<number> {
  const res = await getDynamoClient().send(new QueryCommand({
    TableName: 'plexora-marketing',
    KeyConditionExpression: 'userId = :u',
    FilterExpression: 'turnstileEnabled = :t',
    ExpressionAttributeValues: { ':u': ownerScope, ':t': true },
    Select: 'COUNT',
  }))
  return res.Count || 0
}
