<template>
  <div>
    <h1 class="lp-page-title">Datenschutzerklärung</h1>
    <p class="lp-date">Stand: {{ today }}</p>

    <section class="lp-section">
      <h2 class="lp-section-h">1. Verantwortlicher</h2>
      <p class="lp-text">
        Verantwortlich für die Datenverarbeitung auf dieser Website ist:<br /><br />
        {{ company.legalName }}<br />
        <template v-if="company.representedBy">{{ company.representedBy }}<br /></template>
        {{ company.street }}<br />
        {{ company.zipCity }}<br />
        {{ company.country }}<br />
        <template v-if="company.email">E-Mail: {{ company.email }}<br /></template>
        <template v-if="company.phone">Telefon: {{ company.phone }}</template>
      </p>
    </section>

    <section class="lp-section">
      <h2 class="lp-section-h">2. Allgemeines zur Datenverarbeitung</h2>
      <p class="lp-text">
        Wir verarbeiten personenbezogene Daten unserer Nutzer grundsätzlich nur, soweit dies zur Bereitstellung einer funktionsfähigen Website sowie unserer Inhalte und Leistungen erforderlich ist. Die Verarbeitung erfolgt regelmäßig nur nach Einwilligung des Nutzers oder auf Grundlage gesetzlicher Erlaubnistatbestände (Art. 6 Abs. 1 DSGVO).
      </p>
    </section>

    <section class="lp-section">
      <h2 class="lp-section-h">3. Hosting und technische Bereitstellung</h2>
      <p class="lp-text">
        Diese Website wird über die Infrastruktur von <strong style="color:#f0eef9">Cloudflare, Inc.</strong> (Content-Auslieferung) sowie <strong style="color:#f0eef9">Amazon Web Services (AWS), Region eu-central-1 (Frankfurt)</strong> für Datenbank- und Anwendungsdienste betrieben. Beim Aufruf der Website werden technisch notwendige Informationen (z. B. IP-Adresse, Browsertyp, Zugriffszeit) automatisch durch diese Anbieter verarbeitet, um die Website auszuliefern und gegen Angriffe abzusichern. Eine Auswertung erfolgt nicht zu Marketingzwecken.
      </p>
    </section>

    <section class="lp-section">
      <h2 class="lp-section-h">4. Benutzerkonto &amp; Authentifizierung</h2>
      <p class="lp-text">
        Für die Registrierung und Anmeldung nutzen wir <strong style="color:#f0eef9">Amazon Cognito</strong> (AWS, eu-central-1). Dabei werden E-Mail-Adresse und ein verschlüsseltes Passwort gespeichert. Die Verarbeitung erfolgt zur Vertragserfüllung bzw. Durchführung vorvertraglicher Maßnahmen (Art. 6 Abs. 1 lit. b DSGVO).
      </p>
    </section>

    <section class="lp-section">
      <h2 class="lp-section-h">5. Bestellung &amp; digitale Produkte</h2>
      <p class="lp-text">
        Über unseren Shop bieten wir digitale Produkte (Software) an, die nach erfolgreicher Zahlung zum Download bereitgestellt werden. Es erfolgt kein Versand physischer Waren. Im Rahmen der Bestellung verarbeiten wir die hierfür notwendigen Daten (z. B. Name, E-Mail-Adresse, Bestellinhalt) zur Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO).
      </p>
    </section>

    <section class="lp-section">
      <h2 class="lp-section-h">6. Zahlungsabwicklung</h2>
      <p class="lp-text">
        Für die Abwicklung von Zahlungen setzen wir den Zahlungsdienstleister <strong style="color:#f0eef9">Stripe Payments Europe, Ltd.</strong> ein. Im Bestellprozess stehen Ihnen je nach Verfügbarkeit verschiedene Zahlungsarten zur Verfügung, unter anderem <strong style="color:#f0eef9">Kreditkarte</strong> (Visa, Mastercard, American Express u. a.) sowie <strong style="color:#f0eef9">SEPA-Lastschrift</strong>. Bei Zahlung per Kreditkarte werden die hierfür notwendigen Kartendaten direkt an Stripe übermittelt und nicht von uns gespeichert. Bei Zahlung per SEPA-Lastschrift übermitteln Sie uns ein Mandat zum Einzug von Zahlungen von Ihrem angegebenen Konto; Stripe verarbeitet hierfür Ihre Bankverbindung (IBAN). Die Verarbeitung erfolgt zur Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO).
      </p>
    </section>

    <section class="lp-section">
      <h2 class="lp-section-h">7. Kontaktaufnahme &amp; Formulare</h2>
      <p class="lp-text">
        Bei Kontaktaufnahme über Formulare auf dieser Website werden die von Ihnen angegebenen Daten zur Bearbeitung Ihrer Anfrage gespeichert und verarbeitet (Art. 6 Abs. 1 lit. b, f DSGVO). Eine Weitergabe an Dritte erfolgt nicht, sofern dies nicht zur Bearbeitung erforderlich ist.
      </p>
    </section>

    <section class="lp-section">
      <h2 class="lp-section-h">8. Cookies</h2>
      <p class="lp-text">
        Diese Website verwendet technisch notwendige Cookies bzw. lokale Speicherfunktionen (z. B. zur Aufrechterhaltung des Login-Status). Diese sind für den Betrieb der Plattform erforderlich und können nicht deaktiviert werden, ohne die Funktionalität einzuschränken (Art. 6 Abs. 1 lit. f DSGVO).
      </p>
    </section>

    <section class="lp-section">
      <h2 class="lp-section-h">9. Ihre Rechte</h2>
      <p class="lp-text">
        Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch gegen die Verarbeitung Ihrer personenbezogenen Daten. Zudem haben Sie das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die Verarbeitung Ihrer personenbezogenen Daten zu beschweren.
      </p>
    </section>

    <section class="lp-section">
      <h2 class="lp-section-h">10. Änderungen dieser Datenschutzerklärung</h2>
      <p class="lp-text">
        Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen rechtlichen Anforderungen entspricht oder um Änderungen unserer Leistungen umzusetzen.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'lp' })

const today = new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })

const company = reactive({
  legalName: '', representedBy: '', street: '', zipCity: '', country: 'Deutschland',
  email: '', phone: '', vatId: '', register: '', registerCourt: ''
})

const { data } = await useFetch(useApiUrl('/api/settings/company'))
if ((data.value as any)?.company) Object.assign(company, (data.value as any).company)
</script>

<style scoped>
.lp-page-title { font-family: "Space Grotesk", sans-serif; font-size: 36px; font-weight: 800; color: #f0eef9; margin: 0 0 8px; letter-spacing: -0.5px; }
.lp-date { font-size: 13px; color: #545870; margin: 0 0 40px; }
.lp-section { margin-bottom: 32px; }
.lp-section-h { font-family: "Space Grotesk", sans-serif; font-size: 18px; font-weight: 700; color: #f0eef9; margin: 0 0 12px; }
.lp-text { font-size: 14px; line-height: 1.9; color: #8b8fa8; margin: 0; }
</style>
