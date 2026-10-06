// Welche Präfixe im Bucket plexora-files öffentlich lesbar sind (Bilder der Seiten, Kampagnen, Shops usw.). Alles andere ist privat.
// Dieselbe Liste steht in scripts/aws/secure-bucket.sh (Bucket-Policy); tests/security/s3-policy.test.ts erzwingt, dass beide übereinstimmen.
export const PUBLIC_S3_PREFIXES = ['automotive', 'avatars', 'blog', 'branding', 'campaigns', 'marketing', 'newsletter', 'nexora', 'plugins', 'products', 'public', 'termine'] as const

export const UPLOAD_MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' }
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

/** Erlaubter Schlüssel: beginnt mit einem öffentlichen Präfix, keine Pfadtricks, vernünftige Länge. */
export function isAllowedKey(key: unknown): key is string {
  if (typeof key !== 'string' || key.length < 3 || key.length > 300) return false
  if (key.startsWith('/') || key.includes('..') || key.includes('\\') || /[\u0000-\u001f]/.test(key)) return false
  const top = key.split('/')[0]
  return (PUBLIC_S3_PREFIXES as readonly string[]).includes(top) && key.includes('/')
}

/** Präfix aus dem Request: erlaubtes Präfix (auch mit Unterordnern) mit abschließendem Schrägstrich, z. B. "marketing/" oder "nexora/clients/". */
export function normalizePrefix(prefix: unknown): string | null {
  const p = typeof prefix === 'string' ? prefix : ''
  // erlaubt Unterordner wie "nexora/clients/", aber nur unterhalb eines öffentlichen Präfixes
  if (!/^[a-z0-9-]+(\/[a-z0-9_-]+)*\/$/.test(p)) return null
  return (PUBLIC_S3_PREFIXES as readonly string[]).includes(p.split('/')[0]) ? p : null
}

/** Dateiname ohne Pfad und Sonderzeichen; Endung muss ein erlaubtes Bildformat sein, sonst null. */
export function safeFileName(name: unknown): string | null {
  if (typeof name !== 'string') return null
  const base = name.split(/[\\/]/).pop() || ''
  const clean = base.normalize('NFKD').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^\.+/, '').slice(0, 120)
  const ext = clean.split('.').pop()?.toLowerCase() || ''
  return clean.includes('.') && ext in UPLOAD_MIME ? clean : null
}
