import { sendMail } from '../mailer'
import { clientIp } from '../rateLimit'

// Jeder Start und jeder Download: Protokollzeile (nur Besitzer, Auftrag, Art – nie Passphrase oder Schlüssel) und Mail an den Inhaber über den bestehenden Mailweg (mailPolicy).
export const ipOf = (event: any) => clientIp(event)
export function auditLog(action: string, fields: { owner: string; jobId: string; kind?: string; ip?: string }) {
  console.log(`[audit] backup ${action} owner=${fields.owner} job=${fields.jobId.slice(0, 8)} kind=${fields.kind ?? '-'} ip=${fields.ip ?? '-'}`)
}
export async function notifyOwner(owner: string, action: 'start' | 'download', jobId: string, kind: string, ip: string) {
  const what = kind === 'full' ? 'Gesamtsicherung' : 'Export deiner Daten'
  const text = action === 'start'
    ? `Für dein Konto wurde soeben eine Sicherung gestartet (${what}, Auftrag ${jobId.slice(0, 8)}, Adresse ${ip}).\n\nWarst du das nicht, ändere bitte sofort dein Passwort und melde dich bei uns.`
    : `Eine Sicherung deines Kontos wurde soeben heruntergeladen (${what}, Auftrag ${jobId.slice(0, 8)}, Adresse ${ip}).\n\nWarst du das nicht, ändere bitte sofort dein Passwort und melde dich bei uns.`
  try { await sendMail({ userId: owner, kind: 'internal', from: 'Plexora Sicherheit <noreply@plexora.eu>', to: owner, subject: action === 'start' ? 'Sicherung gestartet' : 'Sicherung heruntergeladen', text }) } catch { /* Mail ist nachrangig, der Vorgang bleibt im Protokoll */ }
}
