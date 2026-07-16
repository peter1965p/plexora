export function buildConfirmEmailHtml(confirmUrl: string): string {
  return `
    <html><body style="font-family:sans-serif;color:#333;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#EA580C">Fast geschafft!</h2>
      <p>Bitte bestätige deine Anmeldung für den Newsletter mit einem Klick:</p>
      <div style="text-align:center;margin:28px 0">
        <a href="${confirmUrl}" style="background:#ea580c;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">Anmeldung bestätigen</a>
      </div>
      <p style="color:#999;font-size:12px">Falls du dich nicht angemeldet hast, ignoriere diese E-Mail einfach.</p>
    </body></html>`
}
