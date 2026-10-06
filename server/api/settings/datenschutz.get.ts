import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { TURNSTILE_PRIVACY_TEXT } from '../../../shared/turnstilePrivacy'

const DEFAULT_CONTENT = `## 2. Allgemeines zur Datenverarbeitung

Wir verarbeiten personenbezogene Daten unserer Nutzer grundsätzlich nur, soweit dies zur Bereitstellung einer funktionsfähigen Website sowie unserer Inhalte und Leistungen erforderlich ist. Die Verarbeitung erfolgt regelmäßig nur nach Einwilligung des Nutzers oder auf Grundlage gesetzlicher Erlaubnistatbestände (Art. 6 Abs. 1 DSGVO).

## 3. Hosting und technische Bereitstellung

Diese Website wird über die Infrastruktur von **Cloudflare, Inc.** (Content-Auslieferung) sowie **Amazon Web Services (AWS), Region eu-central-1 (Frankfurt)** für Datenbank- und Anwendungsdienste betrieben. Beim Aufruf der Website werden technisch notwendige Informationen (z. B. IP-Adresse, Browsertyp, Zugriffszeit) automatisch durch diese Anbieter verarbeitet, um die Website auszuliefern und gegen Angriffe abzusichern. Eine Auswertung erfolgt nicht zu Marketingzwecken.

## 4. Benutzerkonto & Authentifizierung

Für die Registrierung und Anmeldung nutzen wir **Amazon Cognito** (AWS, eu-central-1). Dabei werden E-Mail-Adresse und ein verschlüsseltes Passwort gespeichert. Die Verarbeitung erfolgt zur Vertragserfüllung bzw. Durchführung vorvertraglicher Maßnahmen (Art. 6 Abs. 1 lit. b DSGVO).

## 5. Bestellung & digitale Produkte

Über unseren Shop bieten wir digitale Produkte (Software) an, die nach erfolgreicher Zahlung zum Download bereitgestellt werden. Es erfolgt kein Versand physischer Waren. Im Rahmen der Bestellung verarbeiten wir die hierfür notwendigen Daten (z. B. Name, E-Mail-Adresse, Bestellinhalt) zur Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO).

## 6. Zahlungsabwicklung

Für die Abwicklung von Zahlungen setzen wir den Zahlungsdienstleister **Stripe Payments Europe, Ltd.** ein. Im Bestellprozess stehen Ihnen je nach Verfügbarkeit verschiedene Zahlungsarten zur Verfügung, unter anderem **Kreditkarte** (Visa, Mastercard, American Express u. a.) sowie **SEPA-Lastschrift**. Bei Zahlung per Kreditkarte werden die hierfür notwendigen Kartendaten direkt an Stripe übermittelt und nicht von uns gespeichert. Bei Zahlung per SEPA-Lastschrift übermitteln Sie uns ein Mandat zum Einzug von Zahlungen von Ihrem angegebenen Konto; Stripe verarbeitet hierfür Ihre Bankverbindung (IBAN). Die Verarbeitung erfolgt zur Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO).

## 7. Kontaktaufnahme & Formulare

Bei Kontaktaufnahme über Formulare auf dieser Website werden die von Ihnen angegebenen Daten zur Bearbeitung Ihrer Anfrage gespeichert und verarbeitet (Art. 6 Abs. 1 lit. b, f DSGVO). Eine Weitergabe an Dritte erfolgt nicht, sofern dies nicht zur Bearbeitung erforderlich ist.

## 8. Cookies

Diese Website verwendet technisch notwendige Cookies bzw. lokale Speicherfunktionen (z. B. zur Aufrechterhaltung des Login-Status). Diese sind für den Betrieb der Plattform erforderlich und können nicht deaktiviert werden, ohne die Funktionalität einzuschränken (Art. 6 Abs. 1 lit. f DSGVO).

## 9. Ihre Rechte

Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch gegen die Verarbeitung Ihrer personenbezogenen Daten. Zudem haben Sie das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die Verarbeitung Ihrer personenbezogenen Daten zu beschweren.

## 10. Änderungen dieser Datenschutzerklärung

Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen rechtlichen Anforderungen entspricht oder um Änderungen unserer Leistungen umzusetzen.
`

// Standardtext inkl. Turnstile-Absatz (vor dem Abschnitt Cookies)
const DEFAULT_WITH_TURNSTILE = DEFAULT_CONTENT.replace('## 8. Cookies', `${TURNSTILE_PRIVACY_TEXT}\n\n## 8. Cookies`)

export default defineEventHandler(async () => {
  const client = getDynamoClient()
  try {
    const result = await client.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'datenschutz', scope: 'global' }
    }))
    return { datenschutz: result.Item || { content: DEFAULT_WITH_TURNSTILE, updated: null } }
  } catch {
    return { datenschutz: { content: DEFAULT_WITH_TURNSTILE, updated: null } }
  }
})
