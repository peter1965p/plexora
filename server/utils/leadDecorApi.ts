import { requireAuth } from './verifyAuth'
import { assertNotDemo } from './demoPolicy'
import { validateTrustItems, validatePrivacyLine, validateOverlays, resolveTrustItems, resolvePrivacyLine, resolveOverlays } from '../../shared/leadDecor'

export const DECOR_FIELDS = ['trustItems', 'privacyLine', 'overlays'] as const

/**
 * Liest die Editor-Felder aus dem Request (nur die, die mitgeschickt wurden), prüft sie streng (400 mit verständlicher Meldung)
 * und gibt bereinigte Werte zurück. Das Demo-Konto bekommt 403, sobald eines der Felder vorkommt.
 */
export function parseDecorInput(event: any, body: any): { trustItems?: any[]; privacyLine?: any; overlays?: any[] } {
  const present = DECOR_FIELDS.filter(f => body && body[f] !== undefined)
  if (!present.length) return {}
  assertNotDemo(requireAuth(event), 'Im Demo-Zugang können Vertrauenspunkte und Overlays nicht gespeichert werden.')
  const out: Record<string, any> = {}
  const check = (field: string, v: { ok: true; value: any } | { ok: false; error: string }) => { if (!v.ok) throw createError({ statusCode: 400, message: v.error }); out[field] = v.value }
  if (body.trustItems !== undefined) check('trustItems', validateTrustItems(body.trustItems))
  if (body.privacyLine !== undefined) check('privacyLine', validatePrivacyLine(body.privacyLine))
  if (body.overlays !== undefined) check('overlays', validateOverlays(body.overlays))
  return out
}

/** Öffentliche Ausgabe: immer bereinigt und mit Standardwerten für fehlende Felder – auch wenn eine Datenbankzeile manipuliert wäre. */
export function publicDecor(campaign: any) {
  return { trustItems: resolveTrustItems(campaign?.trustItems), privacyLine: resolvePrivacyLine(campaign?.privacyLine), overlays: resolveOverlays(campaign?.overlays) }
}
