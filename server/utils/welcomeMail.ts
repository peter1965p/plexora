import { escapeText } from '../../shared/mailTemplate'

// Mails rund um das erste Passwort: Willkommen nach dem Kauf, neuer Link, Bestätigung "Passwort festgelegt".
// Alle Texte werden maskiert (Name und Adresse stammen aus Stripe bzw. dem Konto), der Link steht im HTML UND im Klartext-Teil.
// Kein Passwort in der Mail, nie. Der Link trägt das Token im Fragment (#t=…), das weder an Server-Protokolle noch als Referrer weitergegeben wird.
export const APP_ORIGIN = 'https://app.plexora.eu'
export const setPasswordUrl = (token: string) => `${APP_ORIGIN}/set-password#t=${token}`
export interface RenderedMail { subject: string; html: string; text: string }

interface Layout { title: string; paragraphs: string[]; button?: { label: string; url: string }; footer: string }
function layout(l: Layout): { html: string; text: string } {
  const ps = l.paragraphs.map(p => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#1f2937">${escapeText(p)}</p>`).join('')
  const btn = l.button ? `<p style="margin:24px 0"><a href="${escapeText(l.button.url)}" style="display:inline-block;background:#1558c0;color:#ffffff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">${escapeText(l.button.label)}</a></p><p style="margin:0 0 14px;font-size:12px;line-height:1.5;color:#4b5563">Funktioniert der Button nicht? Kopiere diese Adresse in den Browser:<br><a href="${escapeText(l.button.url)}" style="color:#1558c0;word-break:break-all">${escapeText(l.button.url)}</a></p>` : ''
  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:24px;background:#e8f0fc;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif"><div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px"><div style="font-size:20px;font-weight:800;color:#0b3a75;margin-bottom:16px">Plexora</div><h1 style="margin:0 0 18px;font-size:22px;color:#0b3a75">${escapeText(l.title)}</h1>${ps}${btn}<div style="margin-top:22px;padding:14px 16px;background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;font-size:12px;line-height:1.5;color:#1f2937"><strong>Sicherheitshinweis</strong><br>${escapeText(l.footer)}</div></div></body></html>`
  const text = [l.title, '', ...l.paragraphs, ...(l.button ? ['', `${l.button.label}: ${l.button.url}`] : []), '', `Sicherheitshinweis: ${l.footer}`].join('\n')
  return { html, text }
}
const SAFETY = 'Plexora fragt dich nie per E-Mail nach deinem Passwort und schickt es nie mit. Wenn du das nicht erwartet hast, ignoriere diese Mail oder schreibe an billing@plexora.eu.'
const firstName = (n: string) => (String(n || '').trim().split(/\s+/)[0] || '').slice(0, 60)

export function renderWelcomeMail(i: { name: string; tierLabel: string; url: string; minutes: number }): RenderedMail {
  const who = firstName(i.name)
  const m = layout({
    title: 'Willkommen bei Plexora',
    paragraphs: [
      `${who ? `Hallo ${who}, v` : 'V'}ielen Dank für deinen Kauf von Plexora ${i.tierLabel}.`,
      `Mit dem Button legst du dein Passwort fest und meldest dich danach an. Der Link gilt ${i.minutes} Minuten und funktioniert nur einmal.`,
      'Deinen Lizenzschlüssel findest du nach der Anmeldung unter Einstellungen → Lizenzen.',
    ],
    button: { label: 'Passwort festlegen', url: i.url }, footer: SAFETY,
  })
  return { subject: 'Willkommen bei Plexora – lege jetzt dein Passwort fest', ...m }
}
export function renderNewLinkMail(i: { url: string; minutes: number }): RenderedMail {
  const m = layout({ title: 'Neuer Link zum Festlegen deines Passworts', paragraphs: [`Du hast einen neuen Link angefordert. Er gilt ${i.minutes} Minuten und funktioniert nur einmal; frühere Links sind damit ungültig.`], button: { label: 'Passwort festlegen', url: i.url }, footer: SAFETY })
  return { subject: 'Dein neuer Link zum Festlegen des Passworts', ...m }
}
export function renderPasswordSetMail(): RenderedMail {
  const m = layout({ title: 'Dein Passwort wurde festgelegt', paragraphs: ['Du kannst dich jetzt mit deiner E-Mail-Adresse und deinem neuen Passwort anmelden.', 'Warst du das nicht? Dann melde dich bitte sofort bei billing@plexora.eu.'], footer: SAFETY })
  return { subject: 'Dein Plexora-Passwort wurde festgelegt', ...m }
}
