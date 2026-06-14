<template>
  <div style="min-height:100vh;background:var(--bg-base)">
    <!-- Navbar -->
    <nav style="background:var(--bg-surface);border-bottom:0.5px solid var(--border);padding:0 32px;height:64px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100">
      <NuxtLink to="/" style="text-decoration:none">
        <span class="logo-text" style="font-size:22px">{{ brandFirst }}<span class="logo-accent">{{ brandLast }}</span></span>
      </NuxtLink>
      <div style="display:flex;align-items:center;gap:8px">
        <NuxtLink v-for="p in navPages" :key="p.slug" :to="`/p/${p.slug}`" style="text-decoration:none">
          <button style="padding:6px 16px;border-radius:8px;border:none;background:none;color:var(--text-muted);cursor:pointer;font-size:13px;font-weight:500;transition:color 0.15s"
            @mouseenter="e => e.currentTarget.style.color='var(--text-primary)'"
            @mouseleave="e => e.currentTarget.style.color='var(--text-muted)'">
            {{ p.navLabel || p.title }}
          </button>
        </NuxtLink>
        <NuxtLink to="/impressum" style="text-decoration:none">
          <button style="padding:6px 16px;border-radius:8px;border:none;background:none;color:var(--text-muted);cursor:pointer;font-size:13px;font-weight:500;transition:color 0.15s"
            @mouseenter="e => e.currentTarget.style.color='var(--text-primary)'"
            @mouseleave="e => e.currentTarget.style.color='var(--text-muted)'">
            Impressum
          </button>
        </NuxtLink>
        <NuxtLink to="/datenschutz" style="text-decoration:none">
          <button style="padding:6px 16px;border-radius:8px;border:none;background:none;color:var(--accent);cursor:pointer;font-size:13px;font-weight:600">
            Datenschutz
          </button>
        </NuxtLink>
        <NuxtLink to="/shop">
          <button class="accent-btn" style="height:36px">Shop</button>
        </NuxtLink>
        <NuxtLink to="/login">
          <button style="padding:6px 16px;border-radius:8px;border:0.5px solid var(--border);background:none;color:var(--text-muted);cursor:pointer;font-size:13px">Anmelden</button>
        </NuxtLink>
      </div>
    </nav>

    <!-- Content -->
    <div style="max-width:760px;margin:0 auto;padding:60px 24px 100px">
      <h1 style="font-size:36px;font-weight:800;margin:0 0 8px">Datenschutzerklärung</h1>
      <p style="font-size:13px;color:var(--text-muted);margin:0 0 40px">Stand: {{ today }}</p>

      <section style="margin-bottom:32px">
        <h2 style="font-size:18px;font-weight:700;margin:0 0 12px">1. Verantwortlicher</h2>
        <p style="font-size:14px;line-height:1.8;color:var(--text-muted);margin:0">
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

      <section style="margin-bottom:32px">
        <h2 style="font-size:18px;font-weight:700;margin:0 0 12px">2. Allgemeines zur Datenverarbeitung</h2>
        <p style="font-size:14px;line-height:1.8;color:var(--text-muted);margin:0">
          Wir verarbeiten personenbezogene Daten unserer Nutzer grundsätzlich nur, soweit dies zur Bereitstellung einer funktionsfähigen Website sowie unserer Inhalte und Leistungen erforderlich ist. Die Verarbeitung erfolgt regelmäßig nur nach Einwilligung des Nutzers oder auf Grundlage gesetzlicher Erlaubnistatbestände (Art. 6 Abs. 1 DSGVO).
        </p>
      </section>

      <section style="margin-bottom:32px">
        <h2 style="font-size:18px;font-weight:700;margin:0 0 12px">3. Hosting und technische Bereitstellung</h2>
        <p style="font-size:14px;line-height:1.8;color:var(--text-muted);margin:0">
          Diese Website wird über die Infrastruktur von <strong>Cloudflare, Inc.</strong> (Content-Auslieferung) sowie <strong>Amazon Web Services (AWS), Region eu-central-1 (Frankfurt)</strong> für Datenbank- und Anwendungsdienste betrieben. Beim Aufruf der Website werden technisch notwendige Informationen (z. B. IP-Adresse, Browsertyp, Zugriffszeit) automatisch durch diese Anbieter verarbeitet, um die Website auszuliefern und gegen Angriffe abzusichern. Eine Auswertung erfolgt nicht zu Marketingzwecken.
        </p>
      </section>

      <section style="margin-bottom:32px">
        <h2 style="font-size:18px;font-weight:700;margin:0 0 12px">4. Benutzerkonto &amp; Authentifizierung</h2>
        <p style="font-size:14px;line-height:1.8;color:var(--text-muted);margin:0">
          Für die Registrierung und Anmeldung nutzen wir <strong>Amazon Cognito</strong> (AWS, eu-central-1). Dabei werden E-Mail-Adresse und ein verschlüsseltes Passwort gespeichert. Die Verarbeitung erfolgt zur Vertragserfüllung bzw. Durchführung vorvertraglicher Maßnahmen (Art. 6 Abs. 1 lit. b DSGVO).
        </p>
      </section>

      <section style="margin-bottom:32px">
        <h2 style="font-size:18px;font-weight:700;margin:0 0 12px">5. Bestellung &amp; digitale Produkte</h2>
        <p style="font-size:14px;line-height:1.8;color:var(--text-muted);margin:0">
          Über unseren Shop bieten wir digitale Produkte (Software) an, die nach erfolgreicher Zahlung zum Download bereitgestellt werden. Es erfolgt kein Versand physischer Waren. Im Rahmen der Bestellung verarbeiten wir die hierfür notwendigen Daten (z. B. Name, E-Mail-Adresse, Bestellinhalt) zur Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO).
        </p>
      </section>

      <section style="margin-bottom:32px">
        <h2 style="font-size:18px;font-weight:700;margin:0 0 12px">6. Zahlungsabwicklung</h2>
        <p style="font-size:14px;line-height:1.8;color:var(--text-muted);margin:0">
          Für die Abwicklung von Zahlungen setzen wir den Zahlungsdienstleister <strong>Stripe Payments Europe, Ltd.</strong> ein. Im Bestellprozess stehen Ihnen je nach Verfügbarkeit verschiedene Zahlungsarten zur Verfügung, unter anderem <strong>Kreditkarte</strong> (Visa, Mastercard, American Express u. a.) sowie <strong>SEPA-Lastschrift</strong>. Bei Zahlung per Kreditkarte werden die hierfür notwendigen Kartendaten direkt an Stripe übermittelt und nicht von uns gespeichert. Bei Zahlung per SEPA-Lastschrift übermitteln Sie uns ein Mandat zum Einzug von Zahlungen von Ihrem angegebenen Konto; Stripe verarbeitet hierfür Ihre Bankverbindung (IBAN). Die für die jeweilige Zahlungsabwicklung notwendigen Daten (z. B. Name, Zahlungsinformationen) werden an Stripe übermittelt. Die Verarbeitung erfolgt zur Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO). Weitere Informationen finden Sie in der Datenschutzerklärung von Stripe.
        </p>
      </section>

      <section style="margin-bottom:32px">
        <h2 style="font-size:18px;font-weight:700;margin:0 0 12px">7. Kontaktaufnahme &amp; Formulare</h2>
        <p style="font-size:14px;line-height:1.8;color:var(--text-muted);margin:0">
          Bei Kontaktaufnahme über Formulare auf dieser Website werden die von Ihnen angegebenen Daten zur Bearbeitung Ihrer Anfrage gespeichert und verarbeitet (Art. 6 Abs. 1 lit. b, f DSGVO). Eine Weitergabe an Dritte erfolgt nicht, sofern dies nicht zur Bearbeitung erforderlich ist.
        </p>
      </section>

      <section style="margin-bottom:32px">
        <h2 style="font-size:18px;font-weight:700;margin:0 0 12px">8. Cookies</h2>
        <p style="font-size:14px;line-height:1.8;color:var(--text-muted);margin:0">
          Diese Website verwendet technisch notwendige Cookies bzw. lokale Speicherfunktionen (z. B. zur Aufrechterhaltung des Login-Status). Diese sind für den Betrieb der Plattform erforderlich und können nicht deaktiviert werden, ohne die Funktionalität einzuschränken (Art. 6 Abs. 1 lit. f DSGVO).
        </p>
      </section>

      <section style="margin-bottom:32px">
        <h2 style="font-size:18px;font-weight:700;margin:0 0 12px">9. Ihre Rechte</h2>
        <p style="font-size:14px;line-height:1.8;color:var(--text-muted);margin:0">
          Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch gegen die Verarbeitung Ihrer personenbezogenen Daten. Zudem haben Sie das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die Verarbeitung Ihrer personenbezogenen Daten zu beschweren.
        </p>
      </section>

      <section>
        <h2 style="font-size:18px;font-weight:700;margin:0 0 12px">10. Änderungen dieser Datenschutzerklärung</h2>
        <p style="font-size:14px;line-height:1.8;color:var(--text-muted);margin:0">
          Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen rechtlichen Anforderungen entspricht oder um Änderungen unserer Leistungen umzusetzen.
        </p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const { branding, loadBranding } = useBranding()
const brandFirst = computed(() => branding.value.brandName.slice(0, -1))
const brandLast  = computed(() => branding.value.brandName.slice(-1))
onMounted(() => loadBranding())

const today = new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })

const company = reactive({
  legalName: '', representedBy: '', street: '', zipCity: '', country: 'Deutschland',
  email: '', phone: '', vatId: '', register: '', registerCourt: ''
})

const { data } = await useFetch(useApiUrl('/api/settings/company'))
if ((data.value as any)?.company) Object.assign(company, (data.value as any).company)

const { data: pagesData } = await useFetch(useApiUrl('/api/pages'))
const navPages = computed(() =>
  ((pagesData.value as any)?.pages || [])
    .filter((p: any) => p.inNav && p.status === 'published' && !['impressum','datenschutz','agb'].includes(p.slug))
    .sort((a: any, b: any) => a.navLabel?.localeCompare(b.navLabel))
)
</script>
