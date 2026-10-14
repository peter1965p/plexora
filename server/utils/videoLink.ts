import { randomBytes } from 'node:crypto'
import { escapeText } from '../../shared/mailTemplate'

// Eigener Videoraum je Buchung über Jitsi Meet: nur eine Adresse, keine Anbindung, kein Konto. Der lange Zufallsteil ist der einzige "Schlüssel".
export const DEFAULT_JITSI_HOST = 'meet.jit.si'
const HOST_RE = /^(?=.{4,100}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/
/** Prüft einen eigenen Jitsi-Server (nur Hostname, ohne https://, Pfad oder Port). Leer = Standard. Wirft bei ungültiger Eingabe. */
export function parseJitsiHost(raw: unknown): string {
  const h = String(raw ?? '').trim().toLowerCase()
  if (!h) return ''
  if (!HOST_RE.test(h)) throw new Error('Bitte nur den Servernamen angeben, z. B. meet.beispiel.de (ohne https:// und ohne Pfad).')
  return h
}
/** Gespeicherter Server des Mandanten; bei jedem Zweifel der Standard (nie ein ungeprüfter Wert in einer Mail) */
export function jitsiHostOf(tenant: any): string { try { return parseJitsiHost(tenant?.jitsiHost) || DEFAULT_JITSI_HOST } catch { return DEFAULT_JITSI_HOST } }
export const jitsiLink = (host: string = DEFAULT_JITSI_HOST) => `https://${host}/Plexora-${randomBytes(10).toString('hex')}`

/** Der Link, den ein Video-Termin hat: der eigene Raum (Jitsi); ältere Buchungen können noch einen früheren Meet-Link tragen (wird weiter angezeigt) */
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

/** Bekommt eine Video-Buchung einen eigenen Jitsi-Raum? Standard: ja. Nein, wenn der Inhaber es ausdrücklich ausgeschaltet hat, oder (ohne ausdrückliche Wahl) wenn er einen festen Standardlink hinterlegt hat. */
export function wantsJitsi(tenant: any): boolean {
  if (tenant?.videoAutoJitsi === true) return true
  if (tenant?.videoAutoJitsi === false) return false
  return !tenant?.videoFallbackLink
}
