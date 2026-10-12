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
