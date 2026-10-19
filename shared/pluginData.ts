// Regeln für die Datenablage der Zero-Deploy-Plugins (ein JSON-Block je Mandant und Plugin)
export const MAX_PLUGIN_DATA_BYTES = 200_000
export const isPluginKey = (k: unknown): k is string => typeof k === 'string' && /^[a-z0-9][a-z0-9-]{0,39}$/.test(k)
