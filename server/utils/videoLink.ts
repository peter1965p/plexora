import { randomBytes } from 'node:crypto'
import { escapeText } from '../../shared/mailTemplate'

// Eigener Videoraum je Buchung über Jitsi Meet: nur eine Adresse, keine Anbindung, kein Konto. Der lange Zufallsteil ist der einzige "Schlüssel".
export const jitsiLink = () => `https://meet.jit.si/Plexora-${randomBytes(10).toString('hex')}`

/** Der Link, den ein Video-Termin hat: erst der eigene Raum (Jitsi), dann Google Meet */
export const bookingVideoLink = (b: any): string => String(b?.videoLink || b?.googleMeetLink || '')

const SAFE_LINK = /^https:\/\/[^\s"'<>]+$/
const linkHtml = (label: string, url: string) => SAFE_LINK.test(url) ? `${label}: <a href="${escapeText(url)}">${escapeText(url)}</a>` : ''

/** Zeile "wie findet der Termin statt" für Bestätigung und Erinnerung (Telefon / Videolink der Buchung / fester Standardlink / Hinweis) */
export function videoDetailsHtml(b: any, tenant: any): string {
  if (b?.channel === 'phone') return `Wir rufen dich unter ${escapeText(b.customerPhone)} an.`
  const own = bookingVideoLink(b)
  return (own && linkHtml(b.videoLink ? 'Video-Gespräch' : 'Video-Gespräch über Google Meet', own))
    || (tenant?.videoFallbackLink && linkHtml('Video-Gespräch', String(tenant.videoFallbackLink)))
    || 'Den Video-Link erhältst du separat.'
}

/** Bekommt eine Video-Buchung einen eigenen Jitsi-Raum? Ja, wenn der Inhaber es eingeschaltet hat; ohne Entscheidung (Einstellung nie gesetzt) nur, wenn es sonst keinen Link gäbe (kein Google, kein Standardlink). Ausdrücklich aus bleibt aus. */
export function wantsJitsi(tenant: any): boolean {
  if (tenant?.videoAutoJitsi === true) return true
  if (tenant?.videoAutoJitsi === false) return false
  return !(tenant?.googleConnected && tenant?.googleRefreshTokenEncrypted) && !tenant?.videoFallbackLink
}
