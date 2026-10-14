import { randomBytes, timingSafeEqual } from 'node:crypto'

// Termin-Kalender zum Abonnieren: Link = Mandant + Geheimnis (24 Byte). Das Geheimnis liegt im Mandantendatensatz (termineIcalToken).
export const ICAL_ORIGIN = 'https://app.plexora.eu'
export const newIcalToken = () => randomBytes(24).toString('base64url')
export const termineIcalUrl = (tenantId: string, token: string) => `${ICAL_ORIGIN}/api/public/termine/ical/${tenantId}.${token}.ics`
export const parseIcalRef = (ref: string) => { const m = /^([A-Za-z0-9-]{1,64})\.([A-Za-z0-9_-]{32})\.ics$/.exec(ref); return m ? { tenantId: m[1], token: m[2] } : null }
export const tokenOk = (stored: unknown, given: string) => { if (typeof stored !== 'string' || stored.length !== given.length) return false; return timingSafeEqual(Buffer.from(stored), Buffer.from(given)) }
