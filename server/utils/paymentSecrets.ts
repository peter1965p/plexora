import { encryptSecret, decryptSecret } from './crypto'

// Zahlungs-Schlüssel (Stripe, PayPal, Mollie, eigenes Gateway) stehen in plexora-settings (payment/global) und werden mit
// encryptSecret (AES-256-GCM, NUXT_ENCRYPTION_KEY) abgelegt. Frühere Klartext-Werte bleiben lesbar, bis die Migration
// (scripts/security/encrypt-payment-secrets.mjs) sie verschlüsselt hat.
export const PAYMENT_SECRET_FIELDS = ['stripeSecretKey', 'stripeWebhookSecret', 'paypalSecret', 'mollieApiKey', 'customApiKey'] as const

// Format von encryptSecret: iv (12 Byte) : Auth-Tag (16 Byte) : Chiffrat, jeweils hex
export const ENCRYPTED_RE = /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/

export const isEncryptedSecret = (v: unknown): boolean => typeof v === 'string' && ENCRYPTED_RE.test(v)

/** Klartext des Schlüssels: entschlüsselt, wenn verschlüsselt abgelegt; Altwerte im Klartext werden unverändert geliefert. */
export function revealSecret(stored: unknown): string {
  if (typeof stored !== 'string' || !stored) return ''
  return isEncryptedSecret(stored) ? decryptSecret(stored) : stored
}

/** Zum Speichern: Klartext wird verschlüsselt, bereits Verschlüsseltes bleibt (nie doppelt), leer bleibt leer. */
export function sealSecret(value: unknown): string {
  if (typeof value !== 'string' || !value) return ''
  return isEncryptedSecret(value) ? value : encryptSecret(value)
}
