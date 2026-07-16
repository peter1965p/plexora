// Kleine, neutrale HTML-Statusseite für die öffentlichen Confirm-/Unsubscribe-Links,
// die per Klick aus einer E-Mail geöffnet werden — kein Frontend-Roundtrip nötig,
// funktioniert unabhängig davon, auf welcher Domain der jeweilige Tenant öffentlich ist.
export function renderNewsletterStatusPage(title: string, message: string, ok = true): string {
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#0d0d14;color:#f0eef9;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh">
  <div style="max-width:420px;padding:40px 32px;text-align:center">
    <div style="font-size:40px;margin-bottom:16px">${ok ? '✅' : '⚠️'}</div>
    <h1 style="font-size:20px;font-weight:800;margin:0 0 12px">${title}</h1>
    <p style="font-size:14px;line-height:1.6;color:#c4c2d4;margin:0">${message}</p>
  </div>
</body></html>`
}
