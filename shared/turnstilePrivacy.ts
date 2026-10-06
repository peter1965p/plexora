// Absatz für die Datenschutzerklärung zu Cloudflare Turnstile (Standardtext, Einfügen-Button im Tab "Bot-Schutz",
// Ergänzung des gespeicherten Textes). Die Überschrift dient auch als Marker, ob der Absatz schon enthalten ist.
export const TURNSTILE_PRIVACY_HEADING = '## Schutz vor Spam (Cloudflare Turnstile)'

export const TURNSTILE_PRIVACY_TEXT = `${TURNSTILE_PRIVACY_HEADING}

Zum Schutz unserer Formulare (Kontakt-, Lead- und Terminformulare) vor automatisierten Eingaben und Spam setzen wir den Dienst **Cloudflare Turnstile** der Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, USA, ein. Beim Aufruf eines geschützten Formulars wird ein Skript von Cloudflare geladen. Dabei werden technische Daten wie IP-Adresse, Browser- und Geräteinformationen sowie Merkmale zur Interaktion mit der Seite verarbeitet, um zu prüfen, ob die Eingabe von einem Menschen stammt. Die Verarbeitung erfolgt auf Grundlage unseres berechtigten Interesses an einem wirksamen Schutz vor Missbrauch und Spam (Art. 6 Abs. 1 lit. f DSGVO). Cloudflare ist nach dem EU-US Data Privacy Framework zertifiziert. Weitere Informationen finden Sie in der Datenschutzerklärung von Cloudflare unter https://www.cloudflare.com/privacypolicy/.`

export function hasTurnstilePrivacy(content: string): boolean {
  return (content || '').includes(TURNSTILE_PRIVACY_HEADING)
}

// Hängt den Absatz an, falls er noch fehlt (idempotent)
export function withTurnstilePrivacy(content: string): string {
  if (hasTurnstilePrivacy(content)) return content
  return `${(content || '').replace(/\s+$/, '')}\n\n${TURNSTILE_PRIVACY_TEXT}\n`
}
