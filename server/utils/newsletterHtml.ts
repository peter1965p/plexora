// Baut aus dem TipTap-Body (bereits HTML mit Inline-Styles für Bilder/Buttons,
// siehe app/components/newsletter/extensions/) + Header + Pflicht-Footer ein
// Tabellen-basiertes, möglichst Outlook-verträgliches Newsletter-HTML.
// Kein MJML/vollständiges Outlook-VML — bewusster Kompromiss für die Projektgröße,
// siehe Plan. Reines Text-Markup (h1/p/ul/blockquote) bekommt sein Styling über
// einen <head><style>-Block, der in den meisten modernen Clients (Gmail, Apple Mail,
// Outlook.com, mobile Clients) funktioniert, nur klassisches Outlook-Desktop
// ignoriert ihn (Inhalt bleibt lesbar, nur unstyled).

function escapeHtml(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export interface NewsletterHtmlOptions {
  bodyHtml: string
  header?: { logoUrl?: string; companyName?: string }
  footer: { impressum: string; unsubscribeUrl: string }
  apiBase: string
  trackingToken?: string
}

export function compileNewsletterHtml(opts: NewsletterHtmlOptions): string {
  let body = opts.bodyHtml

  if (opts.trackingToken) {
    const token = opts.trackingToken
    body = body.replace(/<a\s+([^>]*?)href="([^"]+)"([^>]*)>/gi, (match, before, href, after) => {
      if (href.startsWith('mailto:') || href.includes('/track/click/')) return match
      const wrapped = `${opts.apiBase}/api/public/newsletter/track/click/${token}?url=${encodeURIComponent(href)}`
      return `<a ${before}href="${wrapped}"${after}>`
    })
  }

  // Bewusst ohne .gif-Endung in der URL — Nitros dateibasiertes Routing würde die
  // Endung sonst als Teil des [token]-Parameters mitfangen. Der Content-Type-Header
  // in der track/open-Route macht die Endung für E-Mail-Clients ohnehin überflüssig.
  const pixel = opts.trackingToken
    ? `<img src="${opts.apiBase}/api/public/newsletter/track/open/${opts.trackingToken}" width="1" height="1" style="display:none" alt="" />`
    : ''

  const headerHtml = opts.header?.logoUrl
    ? `<tr><td style="padding:28px 32px 20px;text-align:center"><img src="${opts.header.logoUrl}" alt="${escapeHtml(opts.header.companyName || '')}" style="max-height:40px;max-width:200px" /></td></tr>`
    : opts.header?.companyName
    ? `<tr><td style="padding:28px 32px 20px;text-align:center;font-size:18px;font-weight:800;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif">${escapeHtml(opts.header.companyName)}</td></tr>`
    : ''

  const footerHtml = `
    <tr><td style="padding:24px 32px 32px;border-top:1px solid #e5e5e5;font-size:12px;color:#888888;line-height:1.6;font-family:Arial,Helvetica,sans-serif">
      ${escapeHtml(opts.footer.impressum).replace(/\n/g, '<br>')}
      <br><br>
      <a href="${opts.footer.unsubscribeUrl}" style="color:#888888;text-decoration:underline">Newsletter abbestellen</a>
    </td></tr>`

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  h1,h2,h3 { font-family:Arial,Helvetica,sans-serif; color:#1a1a1a; margin:0 0 12px; line-height:1.3; }
  h1 { font-size:24px; } h2 { font-size:19px; } h3 { font-size:16px; }
  p { margin:0 0 14px; }
  ul,ol { margin:0 0 14px; padding-left:22px; }
  li { margin-bottom:4px; }
  blockquote { border-left:3px solid #EA580C; padding-left:14px; margin:0 0 14px; color:#666666; }
  a { color:#EA580C; }
</style>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5">
    <tr><td align="center" style="padding:24px 12px">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden">
        ${headerHtml}
        <tr><td style="padding:8px 32px 32px;font-size:15px;line-height:1.65;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif">
          ${body}
        </td></tr>
        ${footerHtml}
      </table>
    </td></tr>
  </table>
  ${pixel}
</body></html>`
}
