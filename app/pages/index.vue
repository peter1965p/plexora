<template>
  <div class="lp">
    <!-- NAV -->
    <nav class="lp-nav">
      <div class="lp-wrap" style="display:flex;align-items:center;justify-content:space-between">
        <div class="lp-logo">Plexo<span>ra</span></div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <NuxtLink v-for="p in navPages" :key="p.slug" :to="`/p/${p.slug}`" style="text-decoration:none">
            <button class="lp-btn-ghost" style="font-size:13px">{{ p.navLabel || p.title }}</button>
          </NuxtLink>
          <NuxtLink to="/impressum" style="text-decoration:none">
            <button class="lp-btn-ghost" style="font-size:13px">{{ t.nav.impressum }}</button>
          </NuxtLink>
          <NuxtLink to="/datenschutz" style="text-decoration:none">
            <button class="lp-btn-ghost" style="font-size:13px">{{ t.nav.datenschutz }}</button>
          </NuxtLink>
          <NuxtLink to="/agb" style="text-decoration:none">
            <button class="lp-btn-ghost" style="font-size:13px">{{ t.nav.agb }}</button>
          </NuxtLink>
          <!-- Language Toggle -->
          <div class="lang-toggle">
            <button :class="['lang-btn', { active: lang === 'de' }]" @click="setLang('de')">🇩🇪</button>
            <button :class="['lang-btn', { active: lang === 'en' }]" @click="setLang('en')">🇬🇧</button>
          </div>
          <button class="lp-btn-ghost" @click="navigateTo('/login')">{{ t.nav.login }}</button>
          <button class="lp-btn-demo" @click="startDemo" :disabled="demoLoading">
            {{ demoLoading ? '...' : t.nav.demo }}
          </button>
          <button class="lp-btn" @click="scrollTo('#pricing')">{{ t.nav.pricing }}</button>
        </div>
      </div>
    </nav>

    <!-- HERO -->
    <section class="lp-hero">
      <canvas ref="networkRef" class="lp-network"></canvas>
      <div class="lp-wrap lp-hero-inner">
        <div class="lp-eyebrow">Business Platform</div>
        <h1 class="lp-h1">
          <span class="lp-h1-line">
            <span
              v-for="(ch, i) in h1aChars" :key="`${lang}-a-${i}`"
              class="lp-letter lp-letter-white lp-letter-up"
              :style="{ animationDelay: (i * 0.045) + 's' }"
            >{{ ch === ' ' ? ' ' : ch }}</span>
          </span>
          <br />
          <span class="lp-h1-line">
            <span
              v-for="(ch, i) in h1bChars" :key="`${lang}-b-${i}`"
              class="lp-letter lp-letter-orange lp-letter-down"
              :style="{ animationDelay: (0.35 + i * 0.045) + 's' }"
            >{{ ch === ' ' ? ' ' : ch }}</span>
          </span>
        </h1>
        <p class="lp-sub">
          <span class="lp-sub-line">
            <span class="lp-sub-half lp-fly-left">{{ t.hero.subL1a }}</span>{{ ' ' }}<span class="lp-sub-half lp-fly-right">{{ t.hero.subL1b }}</span>
          </span>
          <br />
          <span class="lp-sub-line">
            <span class="lp-sub-half lp-fly-left">{{ t.hero.subL2a }}</span>{{ ' ' }}<span class="lp-sub-half lp-fly-right">{{ t.hero.subL2b }}</span>
          </span>
        </p>
        <div class="lp-ctas">
          <button class="lp-btn lp-btn-lg" @click="startDemo" :disabled="demoLoading">
            {{ demoLoading ? t.hero.ctaLoading : t.hero.ctaDemo }}
          </button>
          <button class="lp-btn-ghost lp-btn-lg" @click="scrollTo('#pricing')">
            {{ t.hero.ctaPricing }}
          </button>
        </div>
        <div class="lp-demo-hint">
          <i class="ti ti-user-circle"></i>
          {{ t.hero.demoHint }} <strong>demo@plexora.eu</strong> · <strong>Demo1234!</strong>
        </div>
      </div>
    </section>

    <!-- MODULE GRID -->
    <section class="lp-wrap lp-modules-section" id="modules">
      <div class="lp-section-label">{{ t.modules.label }}</div>
      <div class="lp-modules-grid">
        <div
          v-for="mod in modules"
          :key="mod.key"
          class="lp-mod"
          :class="{ active: mod.on }"
          @click="mod.on = !mod.on"
        >
          <i class="ti lp-mod-icon" :class="mod.icon"></i>
          <div class="lp-mod-name">{{ mod.name }}</div>
          <div class="lp-mod-desc">{{ mod.desc }}</div>
          <span v-if="mod.on" class="lp-mod-badge">{{ t.modules.active }}</span>
        </div>
      </div>
    </section>

    <!-- SAVINGS -->
    <section class="lp-wrap" id="savings">
      <div class="lp-savings">
        <div class="lp-savings-label">{{ t.savings.label }}</div>
        <div class="lp-savings-row">
          <div class="lp-savings-num">{{ formatNum(savings) }} €</div>
          <div class="lp-savings-unit">
            {{ t.savings.unit }}<br /><span>{{ t.savings.per }}</span>
          </div>
        </div>
        <div class="lp-savings-sub">
          {{ t.savings.instead }} <strong>{{ formatNum(oldCost) }} €</strong> {{ t.savings.for }}
          <strong>{{ formatNum(newCost) }} €</strong> {{ t.savings.with }}
        </div>
        <div class="lp-slider-row">
          <label>{{ t.savings.users }}</label>
          <input type="range" min="5" max="200" step="5" v-model="users" />
          <span>{{ users }}</span>
        </div>
      </div>
    </section>

    <!-- COMPARE -->
    <section class="lp-wrap lp-compare-section">
      <h2 class="lp-section-title">{{ t.compare.heading }}</h2>
      <div class="lp-compare-grid">
        <div class="lp-ccard">
          <div class="lp-ccard-tag">{{ t.compare.oldTag }}</div>
          <div class="lp-ccard-name">{{ t.compare.oldName }}</div>
          <div class="lp-ccard-price">8–12 <span>{{ t.compare.oldPriceUnit }}</span></div>
          <div class="lp-ccard-note">{{ t.compare.oldNote }}</div>
          <ul class="lp-ccard-items">
            <li v-for="item in t.compare.oldItems" :key="item"><i class="ti ti-x lp-cross"></i>{{ item }}</li>
          </ul>
        </div>
        <div class="lp-ccard lp-ccard-featured">
          <div class="lp-ccard-tag">{{ t.compare.newTag }}</div>
          <div class="lp-ccard-name">Plexora</div>
          <div class="lp-ccard-price lp-price-accent">1 <span>{{ t.compare.newPriceUnit }}</span></div>
          <div class="lp-ccard-note">{{ t.compare.newNote }}</div>
          <ul class="lp-ccard-items">
            <li v-for="item in t.compare.newItems" :key="item"><i class="ti ti-check lp-tick"></i>{{ item }}</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- TESTIMONIALS SLIDER -->
    <section class="lp-wrap lp-testi-section">
      <div class="lp-section-label" style="text-align:center;margin-bottom:8px">{{ t.testi.label }}</div>
      <div class="lp-testi-slider">
        <div class="lp-testi-track" :style="{ transform: `translateX(-${testiIdx * 100}%)` }">
          <div class="lp-testi-slide" v-for="(tst, i) in t.testi.items" :key="i">
            <div class="lp-testi-stars">★★★★★</div>
            <div class="lp-testi-quote">„{{ tst.quote }}"</div>
            <div class="lp-testi-author"><strong>{{ tst.name }}</strong> · {{ tst.role }}</div>
          </div>
        </div>
        <div class="lp-testi-dots">
          <button
            v-for="(_, i) in t.testi.items"
            :key="i"
            class="lp-testi-dot"
            :class="{ active: i === testiIdx }"
            @click="testiIdx = i"
          />
        </div>
      </div>
    </section>

    <!-- PRICING -->
    <section class="lp-wrap lp-pricing-section" id="pricing">
      <div class="lp-section-label">{{ t.pricing.label }}</div>
      <h2 class="lp-section-title" style="text-align:center;margin-bottom:8px">{{ t.pricing.heading }}</h2>
      <p style="text-align:center;font-size:14px;color:#8b8fa8;margin-bottom:40px">{{ t.pricing.sub }}</p>
      <div class="lp-pricing-grid">

        <!-- Starter -->
        <div class="lp-pcard">
          <div class="lp-pcard-tier">Starter</div>
          <div class="lp-pcard-price">49 <span>€ / {{ t.pricing.month }}</span></div>
          <div style="font-size:11px;color:#545870;margin-bottom:2px">{{ t.pricing.vat }}</div>
          <div class="lp-pcard-note">{{ t.pricing.starter.note }}</div>
          <ul class="lp-pcard-items">
            <li v-for="item in t.pricing.starter.items" :key="item"><i class="ti ti-check lp-tick"></i>{{ item }}</li>
          </ul>
          <button class="lp-pcard-btn lp-pcard-btn-ghost" @click="navigateTo('/kaufen')"><span>{{ t.pricing.cta }}</span></button>
        </div>

        <!-- Pro -->
        <div class="lp-pcard lp-pcard-featured">
          <div class="lp-pcard-popular">{{ t.pricing.popular }}</div>
          <div class="lp-pcard-tier">Pro</div>
          <div class="lp-pcard-price">149 <span>€ / {{ t.pricing.month }}</span></div>
          <div style="font-size:11px;color:#545870;margin-bottom:2px">{{ t.pricing.vat }}</div>
          <div class="lp-pcard-note">{{ t.pricing.pro.note }}</div>
          <ul class="lp-pcard-items">
            <li v-for="item in t.pricing.pro.items" :key="item"><i class="ti ti-check lp-tick"></i>{{ item }}</li>
          </ul>
          <button class="lp-pcard-btn" @click="navigateTo('/kaufen')"><span>{{ t.pricing.cta }}</span></button>
        </div>

        <!-- Enterprise -->
        <div class="lp-pcard">
          <div class="lp-pcard-tier">Enterprise</div>
          <div class="lp-pcard-price">299 <span>€ / {{ t.pricing.month }}</span></div>
          <div style="font-size:11px;color:#545870;margin-bottom:2px">{{ t.pricing.vat }}</div>
          <div class="lp-pcard-note">{{ t.pricing.enterprise.note }}</div>
          <ul class="lp-pcard-items">
            <li v-for="item in t.pricing.enterprise.items" :key="item"><i class="ti ti-check lp-tick"></i>{{ item }}</li>
          </ul>
          <button class="lp-pcard-btn lp-pcard-btn-ghost" @click="navigateTo('/kaufen')"><span>{{ t.pricing.cta }}</span></button>
        </div>

      </div>
    </section>

    <!-- BRANCHEN-PAKETE -->
    <section class="lp-wrap lp-branchen-section" id="branchen">
      <div class="lp-branchen-panel">
        <div class="lp-section-label">{{ t.branchen.label }}</div>
        <h2 class="lp-section-title" style="text-align:center;margin-bottom:8px">{{ t.branchen.heading }}</h2>
        <p style="text-align:center;font-size:14px;color:#8b8fa8;margin-bottom:40px;max-width:520px;margin-left:auto;margin-right:auto">{{ t.branchen.sub }}</p>
        <div class="lp-branchen-grid">
          <div class="lp-bcard" v-for="pkg in t.branchen.items" :key="pkg.key">
            <div class="lp-bcard-icon"><i class="ti" :class="pkg.icon"></i></div>
            <div class="lp-bcard-name">{{ pkg.name }}</div>
            <div class="lp-bcard-desc">{{ pkg.desc }}</div>
            <div class="lp-bcard-features">
              <span v-for="f in pkg.features" :key="f" class="lp-bcard-chip">{{ f }}</span>
            </div>
            <div class="lp-bcard-footer">
              <div class="lp-bcard-price">{{ pkg.price }} <span>€ / {{ t.pricing.month }}</span></div>
              <button class="lp-bcard-btn" @click="navigateTo('/kaufen')">{{ t.branchen.cta }}</button>
            </div>
          </div>
        </div>
        <div class="lp-branchen-note"><i class="ti ti-info-circle"></i> {{ t.branchen.note }}</div>
      </div>
    </section>

    <!-- FOOTER CTA -->
    <section class="lp-wrap lp-footer-cta">
      <h2 class="lp-h2">{{ t.footerCta.heading }}</h2>
      <p>{{ t.footerCta.sub }}</p>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <button class="lp-btn lp-btn-lg" @click="startDemo" :disabled="demoLoading">
          {{ demoLoading ? t.footerCta.ctaLoading : t.footerCta.ctaDemo }}
        </button>
        <button class="lp-btn-ghost lp-btn-lg" @click="scrollTo('#pricing')">{{ t.footerCta.ctaPricing }}</button>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="lp-footer">
      <div class="lp-wrap lp-footer-inner">

        <div class="lp-footer-left">
          <div class="lp-logo" style="margin-bottom:8px">Plexo<span>ra</span></div>
          <div class="lp-footer-tagline">{{ t.footer.tagline }}</div>
        </div>

        <div class="lp-footer-center">
          <div class="lp-footer-links">
            <NuxtLink to="/impressum" class="lp-footer-link">{{ t.nav.impressum }}</NuxtLink>
            <NuxtLink to="/datenschutz" class="lp-footer-link">{{ t.nav.datenschutz }}</NuxtLink>
            <NuxtLink to="/agb" class="lp-footer-link">{{ t.nav.agb }}</NuxtLink>
            <NuxtLink to="/kaufen" class="lp-footer-link">{{ t.nav.pricing }}</NuxtLink>
          </div>
        </div>

        <div class="lp-footer-right">
          <!-- Language Switcher -->
          <div class="lang-toggle" style="margin-bottom:12px">
            <button :class="['lang-btn', { active: lang === 'de' }]" @click="setLang('de')">🇩🇪</button>
            <button :class="['lang-btn', { active: lang === 'en' }]" @click="setLang('en')">🇬🇧</button>
          </div>
          <!-- Made In -->
          <div class="lp-made-by" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <span>Plexora | Idee und Entwicklung mit</span>
            <span class="lp-heart">❤️</span>
            <span>aus der Vulkaneifel</span>
          </div>
          <div class="lp-footer-copy">© {{ new Date().getFullYear() }} by Peter Päffgen</div>
        </div>

      </div>
    </footer>

  </div>
  <CookieBanner />
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

// ── i18n ────────────────────────────────────────────────────────────────────
const lang = ref<'de'|'en'>('de')

function setLang(l: 'de'|'en') {
  lang.value = l
  if (typeof localStorage !== 'undefined') localStorage.setItem('plexora-lang', l)
}

onMounted(() => {
  const saved = localStorage.getItem('plexora-lang') as 'de'|'en' | null
  if (saved === 'de' || saved === 'en') lang.value = saved
})

const i18n = {
  de: {
    nav: { impressum: 'Impressum', datenschutz: 'Datenschutz', agb: 'AGB', login: 'Anmelden', demo: 'Demo starten ↗', pricing: 'Preise' },
    hero: {
      h1a: 'Eine Lizenz.',
      h1b: 'Alles drin.',
      subL1a: 'Warum 100+', subL1b: 'Lizenzen zahlen,',
      subL2a: 'wenn es die', subL2b: 'eine für alles gibt?',
      ctaDemo: 'Demo ausprobieren ↗',
      ctaLoading: 'Wird geladen...',
      ctaPricing: 'Preise ansehen',
      demoHint: 'Demo-Zugang:',
    },
    modules: { label: 'Klicken Sie ein Modul an', active: 'Aktiv' },
    savings: {
      label: 'Ihre monatliche Ersparnis',
      unit: '/ Monat',
      per: 'gegenüber Einzeltools',
      instead: 'Statt',
      for: 'für Einzellizenzen zahlen Sie nur',
      with: 'mit Plexora',
      users: 'Nutzer',
    },
    compare: {
      heading: 'Plexora vs. der Tool-Zoo',
      oldTag: 'Bisherige Lösung',
      oldName: 'Einzeltools',
      oldPriceUnit: 'Tools',
      oldNote: 'Jedes mit eigener Lizenz & Login',
      oldItems: ['Daten über mehrere Systeme verteilt','Integrationen brechen regelmäßig','Separate Verträge & Rechnungen','Kein einheitliches Reporting'],
      newTag: 'Empfohlen',
      newPriceUnit: 'Plattform',
      newNote: 'Eine Lizenz, alle Module inklusive',
      newItems: ['Alle Daten zentral & verknüpft','Module greifen nahtlos ineinander','Ein Vertrag, eine Rechnung','Unternehmensweites Dashboard'],
    },
    testi: {
      label: 'Das sagen unsere Kunden',
      items: [
        { quote: 'Wir haben Salesforce, Jira, Personio und Lexoffice gekündigt. Plexora macht das alles – und unsere Buchhalterin musste sich nur einmal neu einarbeiten.', name: 'Markus T.', role: 'CTO · Münchner SaaS-Startup, 60 Mitarbeiter' },
        { quote: 'Endlich ein Tool, das nicht nach 3 Klicks überfordert. Das CRM und die Rechnungsstellung allein haben uns schon 300 € pro Monat an anderen Abos gespart.', name: 'Sandra K.', role: 'Geschäftsführerin · Marketingagentur, Berlin' },
        { quote: 'Wir nutzen Plexora für Projektmanagement und HR. Besonders die öffentlichen Jobseiten sind ein Hammer-Feature – haben sofort Bewerbungen bekommen.', name: 'Tobias M.', role: 'Gründer · E-Commerce Startup, Hamburg' },
        { quote: 'Support antwortet schnell, die App läuft stabil und wir hatten in 3 Monaten null Downtimes. Für 149 € im Monat absolut unschlagbar.', name: 'Lena F.', role: 'Operations Lead · IT-Dienstleister, München' },
        { quote: 'Als Freelancer brauche ich kein Enterprise-Monster. Plexora Starter ist perfekt – CRM, Rechnungen, Tickets. Alles was ich brauche, nichts was ich nicht brauche.', name: 'Jonas R.', role: 'Freelance Developer · Köln' },
      ],
    },
    pricing: {
      label: 'Transparente Preise',
      heading: 'Wählen Sie Ihr Paket',
      sub: 'Monatlich kündbar. Keine Einrichtungsgebühr. Keine versteckten Kosten.',
      month: 'Monat',
      vat: 'zzgl. MwSt.',
      popular: 'Beliebteste Wahl',
      cta: 'Jetzt starten',
      starter: { note: 'Für Freelancer & Einzelunternehmer', items: ['CRM & Kontaktverwaltung','Finanzen & Rechnungen','Projekte & Aufgaben','Marketing & Kampagnen','Formulare & Support-Tickets','Unternehmens-Webseite'] },
      pro:     { note: 'Für wachsende Teams',               items: ['Alles aus Starter','HR, Zeiterfassung & Urlaub','Verträge & Kunden-Portal','Shop & Bestellungen','Analytics & Lead-Kampagnen'] },
      enterprise: { note: 'Für größere Unternehmen',        items: ['Alles aus Pro','White-Label & eigenes Branding','UTM-Tracking & QR-Codes','API-Zugang & Integrationen','Prioritäts-Support & SLA'] },
    },
    branchen: {
      label: 'Für deine Branche',
      heading: 'Branchen-Pakete als Erweiterung',
      sub: 'Zusätzliche Module für Automotive, Gastronomie und Immobilien — buchbar zu jedem Plan.',
      cta: 'Paket wählen',
      note: 'Verfügbar im Modul-Store nach dem Kauf einer Lizenz — kein Extra-Vertrag nötig.',
      items: [
        { key: 'automotive', name: 'Automotive', icon: 'ti-car', price: 59, desc: 'Fahrzeugverwaltung, Probefahrten und Werkstatt-Aufträge — alles in einem Modul.', features: ['Fahrzeug-DB', 'Probefahrten', 'TÜV-Erinnerungen'] },
        { key: 'gastro', name: 'Gastronomie', icon: 'ti-tools-kitchen-2', price: 59, desc: 'Tischreservierung, Speisekarte und Bestellmanagement für dein Restaurant.', features: ['Tisch-Reservierung', 'Speisekarte', 'Bestellmanagement'] },
        { key: 'immobilien', name: 'Immobilien', icon: 'ti-home', price: 59, desc: 'Objekt-Verwaltung, Besichtigungen und Mieter-CRM für deine Hausverwaltung.', features: ['Objekt-Verwaltung', 'Besichtigungen', 'Mieter-CRM'] },
      ],
    },
    footerCta: {
      heading: 'Überzeugen Sie sich selbst.',
      sub: 'Demo-Zugang sofort verfügbar — kein Account nötig.',
      ctaDemo: 'Demo starten ↗',
      ctaLoading: 'Wird geladen...',
      ctaPricing: 'Preise ansehen',
    },
    footer: {
      tagline: 'Die All-in-One Business Plattform für KMU.',
    },
  },
  en: {
    nav: { impressum: 'Legal Notice', datenschutz: 'Privacy Policy', agb: 'Terms', login: 'Sign In', demo: 'Start Demo ↗', pricing: 'Pricing' },
    hero: {
      h1a: 'One License.',
      h1b: 'Everything Included.',
      subL1a: 'Why pay for', subL1b: '100+ tools',
      subL2a: 'when one', subL2b: 'covers everything?',
      ctaDemo: 'Try the Demo ↗',
      ctaLoading: 'Loading...',
      ctaPricing: 'View Pricing',
      demoHint: 'Demo access:',
    },
    modules: { label: 'Click a module to activate', active: 'Active' },
    savings: {
      label: 'Your monthly savings',
      unit: '/ month',
      per: 'compared to individual tools',
      instead: 'Instead of',
      for: 'for single licenses, you only pay',
      with: 'with Plexora',
      users: 'Users',
    },
    compare: {
      heading: 'Plexora vs. the Tool Jungle',
      oldTag: 'Current Setup',
      oldName: 'Individual Tools',
      oldPriceUnit: 'Tools',
      oldNote: 'Each with its own license & login',
      oldItems: ['Data scattered across systems','Integrations break regularly','Separate contracts & invoices','No unified reporting'],
      newTag: 'Recommended',
      newPriceUnit: 'Platform',
      newNote: 'One license, all modules included',
      newItems: ['All data central & connected','Modules work seamlessly together','One contract, one invoice','Company-wide dashboard'],
    },
    testi: {
      label: 'What our customers say',
      items: [
        { quote: 'We cancelled Salesforce, Jira, Personio and Lexoffice. Plexora does it all — and our accountant only had to learn one tool.', name: 'Markus T.', role: 'CTO · Munich SaaS Startup, 60 employees' },
        { quote: 'Finally a tool that doesn\'t overwhelm you after 3 clicks. CRM and invoicing alone have saved us €300/month in subscriptions.', name: 'Sandra K.', role: 'CEO · Marketing Agency, Berlin' },
        { quote: 'We use Plexora for project management and HR. The public job pages are a killer feature — got applications immediately.', name: 'Tobias M.', role: 'Founder · E-Commerce Startup, Hamburg' },
        { quote: 'Support responds fast, the app runs stable and we had zero downtime in 3 months. Absolutely unbeatable for €149/month.', name: 'Lena F.', role: 'Operations Lead · IT Services, Munich' },
        { quote: 'As a freelancer I don\'t need an enterprise monster. Plexora Starter is perfect — CRM, invoices, tickets. Everything I need, nothing I don\'t.', name: 'Jonas R.', role: 'Freelance Developer · Cologne' },
      ],
    },
    pricing: {
      label: 'Transparent Pricing',
      heading: 'Choose Your Plan',
      sub: 'Cancel anytime. No setup fee. No hidden costs.',
      month: 'month',
      vat: 'excl. VAT',
      popular: 'Most Popular',
      cta: 'Get Started',
      starter: { note: 'For freelancers & solo businesses', items: ['CRM & Contact Management','Finance & Invoicing','Projects & Tasks','Marketing & Campaigns','Forms & Support Tickets','Company Website'] },
      pro:     { note: 'For growing teams',                items: ['Everything in Starter','HR, Time Tracking & Leave','Contracts & Client Portal','Shop & Page Builder','Analytics & Lead Campaigns'] },
      enterprise: { note: 'For larger organizations',     items: ['Everything in Pro','White-Label & Custom Branding','UTM Tracking & QR Codes','API Access & Integrations','Priority Support & SLA'] },
    },
    branchen: {
      label: 'For Your Industry',
      heading: 'Industry Packages as Add-ons',
      sub: 'Extra modules for Automotive, Restaurants and Real Estate — available with any plan.',
      cta: 'Choose Package',
      note: 'Available in the Module Store after purchasing a license — no extra contract needed.',
      items: [
        { key: 'automotive', name: 'Automotive', icon: 'ti-car', price: 59, desc: 'Vehicle inventory, test drives and workshop orders — all in one module.', features: ['Vehicle DB', 'Test Drives', 'Inspection Reminders'] },
        { key: 'gastro', name: 'Restaurants', icon: 'ti-tools-kitchen-2', price: 59, desc: 'Table reservations, menu management and order handling for your restaurant.', features: ['Table Booking', 'Menu', 'Order Management'] },
        { key: 'immobilien', name: 'Real Estate', icon: 'ti-home', price: 59, desc: 'Property management, viewings and tenant CRM for your portfolio.', features: ['Property Mgmt', 'Viewings', 'Tenant CRM'] },
      ],
    },
    footerCta: {
      heading: 'See it for yourself.',
      sub: 'Demo access available instantly — no account needed.',
      ctaDemo: 'Start Demo ↗',
      ctaLoading: 'Loading...',
      ctaPricing: 'View Pricing',
    },
    footer: {
      tagline: 'The all-in-one business platform for SMEs.',
    },
  },
}

const t = computed(() => i18n[lang.value])
const h1aChars = computed(() => t.value.hero.h1a.split(''))
const h1bChars = computed(() => t.value.hero.h1b.split(''))

const moduleData = {
  de: [
    { key: 'crm',       name: 'CRM',       icon: 'ti-users',         desc: 'Kontakte, Pipelines, Deals',        on: true,  cost: 45 },
    { key: 'projects',  name: 'Projekte',   icon: 'ti-layout-kanban', desc: 'Kanban, Meilensteine, Teams',       on: true,  cost: 35 },
    { key: 'finance',   name: 'Finanzen',   icon: 'ti-receipt',       desc: 'Rechnungen, Ausgaben, Berichte',    on: true,  cost: 55 },
    { key: 'hr',        name: 'HR',         icon: 'ti-id-badge',      desc: 'Mitarbeiter, Urlaub, Zeiterfassung',on: false, cost: 40 },
    { key: 'support',   name: 'Support',    icon: 'ti-headset',       desc: 'Tickets, SLA, Kunden-Portal',       on: false, cost: 30 },
    { key: 'analytics', name: 'Analytics',  icon: 'ti-chart-dots',    desc: 'Dashboards, KPIs, Exports',         on: false, cost: 25 },
  ],
  en: [
    { key: 'crm',       name: 'CRM',        icon: 'ti-users',         desc: 'Contacts, Pipelines, Deals',       on: true,  cost: 45 },
    { key: 'projects',  name: 'Projects',   icon: 'ti-layout-kanban', desc: 'Kanban, Milestones, Teams',        on: true,  cost: 35 },
    { key: 'finance',   name: 'Finance',    icon: 'ti-receipt',       desc: 'Invoices, Expenses, Reports',      on: true,  cost: 55 },
    { key: 'hr',        name: 'HR',         icon: 'ti-id-badge',      desc: 'Employees, Leave, Time Tracking',  on: false, cost: 40 },
    { key: 'support',   name: 'Support',    icon: 'ti-headset',       desc: 'Tickets, SLA, Client Portal',      on: false, cost: 30 },
    { key: 'analytics', name: 'Analytics',  icon: 'ti-chart-dots',    desc: 'Dashboards, KPIs, Exports',        on: false, cost: 25 },
  ],
}

const moduleState = reactive({ de: moduleData.de.map(m => ({ ...m })), en: moduleData.en.map(m => ({ ...m })) })
const modules = computed(() => moduleState[lang.value])

useSeoMeta({
  title: 'Eine Lizenz. Alles drin.',
  description: 'Plexora ist die All-in-One Business Plattform für Teams: CRM, Projekte, Finanzen, HR, Support, Marketing und Shop — alles in einer Lizenz.',
  ogTitle: 'Plexora — Eine Lizenz. Alles drin.',
  ogDescription: 'Warum 100+ Lizenzen zahlen, wenn es die eine für alles gibt? CRM, Finanzen, HR, Projekte und mehr — ab 49 € / Monat.',
  ogImage: 'https://www.plexora.eu/og-image.png',
  ogUrl: 'https://www.plexora.eu',
  ogType: 'website',
  ogSiteName: 'Plexora',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Plexora — Eine Lizenz. Alles drin.',
  twitterDescription: 'CRM, Finanzen, HR, Projekte und mehr — alles in einer Business-Lizenz. Demo sofort verfügbar.',
  twitterImage: 'https://www.plexora.eu/og-image.png',
  robots: 'index, follow',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://www.plexora.eu' }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Plexora',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: 'https://www.plexora.eu',
        description: 'All-in-One Business Plattform: CRM, Projekte, Finanzen, HR, Support, Marketing und Shop in einer Lizenz.',
        offers: { '@type': 'Offer', price: '49', priceCurrency: 'EUR' },
        provider: { '@type': 'Organization', name: 'Plexora', url: 'https://www.plexora.eu' },
      }),
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'Was kostet Plexora?', acceptedAnswer: { '@type': 'Answer', text: 'Starter 49 €/Monat, Pro 149 €/Monat, Enterprise 299 €/Monat — alle Module inklusive, keine versteckten Kosten.' } },
          { '@type': 'Question', name: 'Welche Tools ersetzt Plexora?', acceptedAnswer: { '@type': 'Answer', text: 'Plexora ersetzt HubSpot oder Salesforce (CRM), Asana oder Monday (Projekte), Lexoffice (Rechnungen), Personio (HR), Zendesk (Support), Mailchimp (Marketing) und mehr.' } },
          { '@type': 'Question', name: 'Gibt es eine kostenlose Demo?', acceptedAnswer: { '@type': 'Answer', text: 'Ja. Auf app.plexora.eu kann sofort ohne Registrierung eine Demo gestartet werden — kein Account, keine Kreditkarte nötig.' } },
          { '@type': 'Question', name: 'Ist Plexora DSGVO-konform?', acceptedAnswer: { '@type': 'Answer', text: 'Ja. Alle Daten werden in europäischen Rechenzentren gespeichert und verarbeitet.' } },
        ],
      }),
    },
  ],
})

const users = ref(25)
const demoLoading = ref(false)

const activeCost = computed(() => modules.value.filter(m => m.on).reduce((s, m) => s + m.cost, 0))
const oldCost    = computed(() => Math.round((users.value * activeCost.value * 0.85) / 10) * 10)
const newCost    = computed(() => Math.round((users.value * 49) / 10) * 10)
const savings    = computed(() => Math.max(0, oldCost.value - newCost.value))
const formatNum  = (n: number) => n.toLocaleString('de-DE')

function scrollTo(selector: string) {
  document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth' })
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

async function startDemo() {
  demoLoading.value = true
  try {
    const { signIn, signOut, getCurrentUser } = await import('aws-amplify/auth')
    try {
      const current = await withTimeout(getCurrentUser(), 8000)
      if (current.username !== 'demo-plexora') {
        await withTimeout(signOut(), 8000)
        await withTimeout(signIn({ username: 'demo@plexora.eu', password: 'Demo1234!' }), 8000)
      }
    } catch {
      await withTimeout(signIn({ username: 'demo@plexora.eu', password: 'Demo1234!' }), 8000)
    }
    await navigateTo('/dashboard')
  } catch {
    await navigateTo('/login')
  } finally {
    demoLoading.value = false
  }
}

const networkRef = ref<HTMLCanvasElement | null>(null)

onMounted(() => {
  const canvas = networkRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
  resize()
  window.addEventListener('resize', resize)

  const ORANGE: [number, number, number] = [234, 88, 12]
  const BLUE:   [number, number, number] = [56, 189, 248]

  const nodes = Array.from({ length: 55 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    r: Math.random() * 1.5 + 0.5,
    c: Math.random() < 0.6 ? ORANGE : BLUE,
  }))

  const MAX_DIST = 160
  let raf: number

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy
      if (n.x < 0 || n.x > canvas.width)  n.vx *= -1
      if (n.y < 0 || n.y > canvas.height) n.vy *= -1
    }
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y
        const d = Math.sqrt(dx*dx + dy*dy)
        if (d < MAX_DIST) {
          const [r1,g1,b1] = nodes[i].c, [r2,g2,b2] = nodes[j].c
          const r = Math.round((r1+r2)/2), g = Math.round((g1+g2)/2), b = Math.round((b1+b2)/2)
          ctx.strokeStyle = `rgba(${r},${g},${b},${(1 - d/MAX_DIST) * 0.25})`
          ctx.lineWidth = 0.6
          ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke()
        }
      }
    }
    for (const n of nodes) {
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI*2)
      ctx.fillStyle = `rgba(${n.c[0]},${n.c[1]},${n.c[2]},0.55)`; ctx.fill()
    }
    raf = requestAnimationFrame(draw)
  }
  draw()
  onUnmounted(() => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) })
})

const { data: pagesData } = await useFetch(useApiUrl('/api/pages'))
const navPages = computed(() =>
  ((pagesData.value as any)?.pages || [])
    .filter((p: any) => p.inNav && p.status === 'published' && !['impressum','datenschutz','agb'].includes(p.slug))
    .sort((a: any, b: any) => (a.navLabel || '').localeCompare(b.navLabel || ''))
)

const testiIdx = ref(0)
let testiTimer: ReturnType<typeof setInterval>
onMounted(() => { testiTimer = setInterval(() => { testiIdx.value = (testiIdx.value + 1) % t.value.testi.items.length }, 5000) })
onUnmounted(() => clearInterval(testiTimer))
</script>

<style scoped>
@import url("https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css");

.lp {
  background: #0b0f1d;
  background-image:
    radial-gradient(ellipse 70% 45% at 50% -5%, rgba(234,88,12,0.14) 0%, transparent 70%),
    radial-gradient(ellipse 60% 40% at 92% 10%, rgba(56,189,248,0.11) 0%, transparent 70%),
    radial-gradient(ellipse 50% 35% at 5% 60%, rgba(56,189,248,0.06) 0%, transparent 70%),
    linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
  background-size: 100% 100%, 100% 100%, 100% 100%, 52px 52px, 52px 52px;
  color: #f0eef9;
  font-family: "Exo 2", sans-serif;
  min-height: 100vh;
}

/* NETWORK CANVAS */
.lp-network { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
.lp-wrap { max-width: 1440px; margin: 0 auto; padding: 0 48px; }

/* NAV */
.lp-nav {
  border-bottom: 0.5px solid rgba(255,255,255,0.07);
  padding: 20px 0;
  position: sticky; top: 0; z-index: 100;
  background: rgba(10,14,26,0.88);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
.lp-nav .lp-wrap { display: flex; align-items: center; justify-content: space-between; }
.lp-logo { font-family: "Space Grotesk", sans-serif; font-weight: 800; font-size: 22px; letter-spacing: -0.5px; }
.lp-logo span {
  background: linear-gradient(160deg, #ffb347 0%, #ea580c 50%, #c2390a 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}

/* LANGUAGE TOGGLE */
.lang-toggle {
  display: flex; align-items: center;
  background: rgba(255,255,255,0.05);
  border: 0.5px solid rgba(255,255,255,0.12);
  border-radius: 20px; overflow: hidden;
}
.lang-btn {
  padding: 5px 12px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;
  cursor: pointer; border: none; background: transparent; color: #8b8fa8;
  font-family: "Exo 2", sans-serif; transition: all .15s;
}
.lang-btn.active { background: #ea580c; color: #fff; border-radius: 20px; }
.lang-btn:hover:not(.active) { color: #f0eef9; }

/* BUTTONS */
.lp-btn {
  background: #ea580c; color: #fff; font-size: 14px; font-weight: 500;
  padding: 10px 22px; border-radius: 40px; border: none; cursor: pointer;
  font-family: "Exo 2", sans-serif; transition: opacity 0.2s;
}
.lp-btn:hover { opacity: 0.88; }
.lp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.lp-btn-lg { font-size: 15px; padding: 14px 36px; }
.lp-btn-ghost {
  background: transparent; color: #f0eef9; font-size: 14px; font-weight: 500;
  padding: 10px 22px; border-radius: 40px; border: 0.5px solid rgba(240,238,249,0.25);
  cursor: pointer; font-family: "Exo 2", sans-serif; transition: background 0.2s;
}
.lp-btn-ghost:hover { background: rgba(240,238,249,0.06); }
.lp-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
.lp-btn-demo {
  background: rgba(56,189,248,0.12); color: #38bdf8; font-size: 14px; font-weight: 500;
  padding: 10px 22px; border-radius: 40px; border: 0.5px solid rgba(56,189,248,0.35);
  cursor: pointer; font-family: "Exo 2", sans-serif; transition: background 0.2s;
}
.lp-btn-demo:hover { background: rgba(56,189,248,0.2); }
.lp-btn-demo:disabled { opacity: 0.5; cursor: not-allowed; }

/* HERO */
.lp-hero { padding: 96px 0 72px; position: relative; overflow: hidden; }
.lp-hero-inner { text-align: center; position: relative; z-index: 1; }
.lp-eyebrow {
  display: inline-block; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;
  color: #38bdf8; margin-bottom: 24px; font-weight: 500;
}
.lp-h1 {
  font-family: "Roboto", sans-serif; font-size: clamp(48px, 7.5vw, 128px); font-weight: 900;
  line-height: 1.05; letter-spacing: -3px; margin-bottom: 20px;
}
.lp-h1-line { display: inline-block; }
.lp-letter {
  display: inline-block;
  opacity: 0;
  animation-duration: 0.8s;
  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  animation-fill-mode: both;
}
.lp-letter-white {
  background: linear-gradient(160deg, #ffffff 0%, #e0e0e0 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.lp-letter-orange {
  background: linear-gradient(160deg, #ffb347 0%, #ea580c 45%, #c2390a 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.lp-letter-up   { animation-name: lp-fly-up; }
.lp-letter-down { animation-name: lp-fly-down; }
@keyframes lp-fly-up   { from { opacity: 0; transform: translateY(46px); } to { opacity: 1; transform: translateY(0); } }
@keyframes lp-fly-down { from { opacity: 0; transform: translateY(-46px); } to { opacity: 1; transform: translateY(0); } }

.lp-sub { font-size: clamp(15px, 1.4vw, 19px); color: #9a9db8; margin-bottom: 36px; line-height: 1.55; }
.lp-sub-line { display: block; }
.lp-sub-half {
  display: inline-block;
  opacity: 0;
  animation-duration: 0.8s;
  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  animation-fill-mode: both;
  animation-delay: 0.9s;
}
.lp-fly-left  { animation-name: lp-fly-in-left; }
.lp-fly-right { animation-name: lp-fly-in-right; }
@keyframes lp-fly-in-left  { from { opacity: 0; transform: translateX(-70px); } to { opacity: 1; transform: translateX(0); } }
@keyframes lp-fly-in-right { from { opacity: 0; transform: translateX(70px); } to { opacity: 1; transform: translateX(0); } }

.lp-ctas { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 20px; }
.lp-demo-hint {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 12px; color: #8b8fa8; margin-top: 8px;
  background: rgba(255,255,255,0.04); border: 0.5px solid rgba(255,255,255,0.08);
  border-radius: 20px; padding: 6px 16px;
}
.lp-demo-hint strong { color: #f0eef9; }
.lp-demo-hint .ti { color: #38bdf8; }

/* MODULES */
.lp-modules-section { padding: 48px 0; }
.lp-section-label { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #8b8fa8; text-align: center; margin-bottom: 24px; }
.lp-modules-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
.lp-mod {
  background: #13182a; border: 0.5px solid rgba(56,189,248,0.3); border-radius: 16px;
  padding: 22px 20px; cursor: pointer; transition: border-color 0.25s, transform 0.18s, box-shadow 0.25s; position: relative;
}
.lp-mod:hover { border-color: #ea580c; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(234,88,12,0.12); }
.lp-mod.active { border-color: #38bdf8; border-width: 1px; background: rgba(56,189,248,0.05); }
.lp-mod-icon { font-size: 22px; color: #ea580c; margin-bottom: 10px; display: block; }
.lp-mod.active .lp-mod-icon { color: #38bdf8; }
.lp-mod-name { font-family: "Space Grotesk", sans-serif; font-size: 14px; font-weight: 700; margin-bottom: 4px; }
.lp-mod-desc { font-size: 12px; color: #8b8fa8; line-height: 1.5; }
.lp-mod-badge {
  position: absolute; top: 12px; right: 12px; font-size: 9px; letter-spacing: 1px;
  text-transform: uppercase; background: rgba(56,189,248,0.15); color: #38bdf8;
  padding: 2px 8px; border-radius: 20px;
}

/* SAVINGS */
.lp-savings {
  background: linear-gradient(160deg, rgba(56,189,248,0.06), #13182a); border: 0.5px solid rgba(56,189,248,0.25);
  border-radius: 20px; padding: 36px; margin: 0 0 48px; text-align: center;
}
.lp-savings-label { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #8b8fa8; margin-bottom: 16px; }
.lp-savings-row { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 16px; }
.lp-savings-num { font-family: "Space Grotesk", sans-serif; font-size: 48px; font-weight: 800; color: #38bdf8; line-height: 1; }
.lp-savings-unit { font-size: 13px; color: #8b8fa8; text-align: left; line-height: 1.6; }
.lp-savings-sub { font-size: 13px; color: #8b8fa8; margin-bottom: 20px; }
.lp-savings-sub strong { color: #f0eef9; }
.lp-slider-row { display: flex; align-items: center; gap: 12px; max-width: 400px; margin: 0 auto; }
.lp-slider-row label { font-size: 12px; color: #8b8fa8; white-space: nowrap; }
.lp-slider-row input { flex: 1; accent-color: #ea580c; }
.lp-slider-row span { font-size: 13px; font-weight: 500; min-width: 30px; }

/* COMPARE */
.lp-compare-section { padding: 0 0 48px; }
.lp-section-title { font-family: "Space Grotesk", sans-serif; font-size: 28px; font-weight: 800; margin-bottom: 24px; letter-spacing: -0.5px; }
.lp-compare-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.lp-ccard { background: #13182a; border: 0.5px solid rgba(255,255,255,0.07); border-radius: 18px; padding: 28px; }
.lp-ccard-featured { border-color: #ea580c; border-width: 1.5px; background: linear-gradient(160deg, rgba(56,189,248,0.05), #13182a); }
.lp-ccard-tag { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: #8b8fa8; margin-bottom: 8px; }
.lp-ccard-featured .lp-ccard-tag { color: #38bdf8; }
.lp-ccard-name { font-family: "Space Grotesk", sans-serif; font-size: 18px; font-weight: 700; margin-bottom: 6px; }
.lp-ccard-price { font-family: "Space Grotesk", sans-serif; font-size: 32px; font-weight: 800; margin-bottom: 4px; color: #8b8fa8; }
.lp-ccard-price span { font-size: 16px; font-weight: 400; }
.lp-price-accent { color: #ea580c; }
.lp-ccard-note { font-size: 12px; color: #8b8fa8; margin-bottom: 20px; }
.lp-ccard-items { display: flex; flex-direction: column; gap: 10px; list-style: none; }
.lp-ccard-items li { font-size: 13px; color: #8b8fa8; display: flex; align-items: center; gap: 8px; }

/* TESTIMONIALS */
.lp-testi-section { padding: 0 0 56px; }
.lp-testi-slider {
  position: relative; overflow: hidden; border-radius: 20px;
  background: linear-gradient(135deg, rgba(56,189,248,0.08), rgba(234,88,12,0.04));
  border: 0.5px solid rgba(255,255,255,0.07);
}
.lp-testi-track { display: flex; transition: transform 0.5s cubic-bezier(0.4,0,0.2,1); will-change: transform; }
.lp-testi-slide { min-width: 100%; padding: 40px 48px 32px; box-sizing: border-box; }
.lp-testi-stars { font-size: 18px; color: #ea580c; margin-bottom: 16px; letter-spacing: 2px; }
.lp-testi-quote { font-size: 17px; color: #f0eef9; line-height: 1.75; margin-bottom: 20px; font-style: italic; }
.lp-testi-author { font-size: 13px; color: #8b8fa8; }
.lp-testi-author strong { color: #7dd3fc; }
.lp-testi-dots { display: flex; justify-content: center; gap: 8px; padding: 0 0 20px; }
.lp-testi-dot { width: 8px; height: 8px; border-radius: 50%; border: none; cursor: pointer; background: rgba(255,255,255,0.15); transition: background 0.3s, transform 0.3s; }
.lp-testi-dot.active { background: #ea580c; transform: scale(1.3); }

/* PRICING */
.lp-pricing-section { padding: 0 0 64px; }
.lp-pricing-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; }
.lp-pcard {
  background: #13182a; border: 0.5px solid rgba(255,255,255,0.07);
  border-radius: 20px; padding: 32px 26px; display: flex; flex-direction: column; position: relative;
}
.lp-pcard-featured { border-color: #ea580c; border-width: 1.5px; background: linear-gradient(160deg, rgba(56,189,248,0.1), #13182a); }
.lp-pcard-popular {
  position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
  background: #ea580c; color: #fff; font-size: 10px; font-weight: 700;
  letter-spacing: 1px; text-transform: uppercase; padding: 4px 14px; border-radius: 20px; white-space: nowrap;
}
.lp-pcard-tier { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #8b8fa8; margin-bottom: 12px; }
.lp-pcard-featured .lp-pcard-tier { color: #7dd3fc; }
.lp-pcard-price { font-family: "Space Grotesk", sans-serif; font-size: 38px; font-weight: 800; margin-bottom: 4px; line-height: 1; }
.lp-pcard-featured .lp-pcard-price { color: #ea580c; }
.lp-pcard-price span { font-family: "Exo 2", sans-serif; font-size: 14px; font-weight: 400; color: #8b8fa8; }
.lp-pcard-note { font-size: 12px; color: #8b8fa8; margin-bottom: 24px; margin-top: 6px; }
.lp-pcard-items { list-style: none; display: flex; flex-direction: column; gap: 10px; flex: 1; margin-bottom: 24px; }
.lp-pcard-items li { font-size: 13px; color: #c4c2d4; display: flex; align-items: center; gap: 8px; }
.lp-pcard-btn {
  background: #ea580c; color: #fff; font-size: 14px; font-weight: 600;
  padding: 12px; border-radius: 10px; border: none; cursor: pointer;
  font-family: "Exo 2", sans-serif; width: 100%;
  position: relative; overflow: hidden; transition: box-shadow 0.3s, transform 0.2s;
}
.lp-pcard-btn::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(160deg, #ffb347 0%, #ea580c 45%, #ff3d00 80%, #c2390a 100%);
  opacity: 0; transition: opacity 0.35s;
}
.lp-pcard-btn:hover::before { opacity: 1; }
.lp-pcard-btn:hover { box-shadow: 0 0 18px rgba(234,88,12,0.55), 0 0 40px rgba(255,100,0,0.2); transform: translateY(-1px); }
.lp-pcard-btn span, .lp-pcard-btn-ghost span { position: relative; z-index: 1; }
.lp-pcard-btn-ghost {
  background: transparent; color: #f0eef9; border: 0.5px solid rgba(240,238,249,0.2);
  position: relative; overflow: hidden; transition: border-color 0.3s, box-shadow 0.3s, transform 0.2s;
}
.lp-pcard-btn-ghost::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(160deg, rgba(255,179,71,0.15) 0%, rgba(234,88,12,0.2) 50%, rgba(194,57,10,0.15) 100%);
  opacity: 0; transition: opacity 0.35s;
}
.lp-pcard-btn-ghost:hover::before { opacity: 1; }
.lp-pcard-btn-ghost:hover { border-color: rgba(234,88,12,0.5); box-shadow: 0 0 14px rgba(234,88,12,0.2); transform: translateY(-1px); }

.lp-tick { color: #38bdf8; font-size: 15px; }
.lp-cross { color: #545870; font-size: 15px; }

/* BRANCHEN-PAKETE */
.lp-branchen-section { padding: 0 0 64px; }
.lp-branchen-panel {
  max-width: 1120px; margin: 0 auto; position: relative; overflow: hidden;
  background: linear-gradient(160deg, rgba(234,88,12,0.06), #10141f 55%);
  border: 0.5px solid rgba(255,255,255,0.08);
  border-radius: 28px;
  padding: 48px 40px;
}
.lp-branchen-panel::before {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse 60% 50% at 15% 0%, rgba(56,189,248,0.10), transparent 70%);
}
.lp-branchen-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; position: relative; z-index: 1; }
.lp-bcard {
  background: rgba(255,255,255,0.02); border: 0.5px solid rgba(255,255,255,0.08);
  border-radius: 18px; padding: 26px 22px; display: flex; flex-direction: column;
  transition: border-color 0.25s, transform 0.2s, box-shadow 0.25s;
}
.lp-bcard:hover { border-color: rgba(234,88,12,0.45); transform: translateY(-3px); box-shadow: 0 12px 28px rgba(0,0,0,0.35); }
.lp-bcard-icon {
  width: 44px; height: 44px; border-radius: 12px;
  background: rgba(234,88,12,0.12); border: 0.5px solid rgba(234,88,12,0.3);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; color: #ea580c; margin-bottom: 16px;
}
.lp-bcard-name { font-family: "Space Grotesk", sans-serif; font-size: 16px; font-weight: 700; margin-bottom: 6px; }
.lp-bcard-desc { font-size: 12.5px; color: #8b8fa8; line-height: 1.5; margin-bottom: 16px; }
.lp-bcard-features { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px; flex: 1; align-content: flex-start; }
.lp-bcard-chip { font-size: 11px; color: #9a9db8; background: rgba(255,255,255,0.04); border: 0.5px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 3px 9px; }
.lp-bcard-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 16px; border-top: 0.5px solid rgba(255,255,255,0.07); }
.lp-bcard-price { font-family: "Space Grotesk", sans-serif; font-size: 20px; font-weight: 800; color: #f0eef9; }
.lp-bcard-price span { font-family: "Exo 2", sans-serif; font-size: 12px; font-weight: 400; color: #8b8fa8; }
.lp-bcard-btn {
  background: transparent; color: #f0eef9; border: 0.5px solid rgba(240,238,249,0.25);
  border-radius: 20px; padding: 8px 16px; font-size: 12px; font-weight: 600; cursor: pointer;
  font-family: "Exo 2", sans-serif; transition: all 0.2s; white-space: nowrap;
}
.lp-bcard-btn:hover { background: #ea580c; border-color: #ea580c; }
.lp-branchen-note { text-align: center; font-size: 12px; color: #666b85; margin-top: 28px; display: flex; align-items: center; justify-content: center; gap: 6px; }

/* FOOTER CTA */
.lp-footer-cta { text-align: center; padding: 64px 0; border-top: 0.5px solid rgba(255,255,255,0.07); }
.lp-h2 { font-family: "Space Grotesk", sans-serif; font-size: 32px; font-weight: 800; margin-bottom: 12px; letter-spacing: -0.5px; }
.lp-footer-cta p { font-size: 14px; color: #8b8fa8; margin-bottom: 28px; }

/* FOOTER */
.lp-footer {
  border-top: 0.5px solid rgba(255,255,255,0.07);
  background: rgba(5,8,18,0.8);
  padding: 40px 0 32px;
}
.lp-footer-inner {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 32px;
  align-items: start;
}
.lp-footer-tagline {
  font-size: 12px;
  color: #545870;
  line-height: 1.6;
  max-width: 200px;
}
.lp-footer-links {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.lp-footer-link {
  font-size: 13px;
  color: #8b8fa8;
  text-decoration: none;
  transition: color .15s;
}
.lp-footer-link:hover { color: #f0eef9; }
.lp-footer-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}
.lp-made-by {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #8b8fa8;
  text-decoration: none;
  transition: color .15s;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.lp-made-by:hover { color: #f0eef9; }
.lp-heart {
  color: #ea580c;
  font-size: 14px;
  animation: heartbeat 1.8s ease-in-out infinite;
}
@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  15% { transform: scale(1.25); }
  30% { transform: scale(1); }
  45% { transform: scale(1.15); }
}
.lp-footer-copy {
  font-size: 11px;
  color: #333a55;
}

@media (max-width: 900px) {
  .lp-wrap { padding: 0 24px; }
  .lp-branchen-grid { grid-template-columns: 1fr; }
  .lp-branchen-panel { padding: 36px 24px; }
}

@media (max-width: 640px) {
  .lp-wrap { padding: 0 20px; }
  .lp-testi-slide { padding: 28px 24px 24px; }
  .lp-testi-quote { font-size: 14px; }
  .lp-footer-inner { grid-template-columns: 1fr; }
  .lp-footer-right { align-items: flex-start; }
  .lp-modules-grid { grid-template-columns: repeat(2,1fr); }
  .lp-pricing-grid { grid-template-columns: 1fr; }
  .lp-compare-grid { grid-template-columns: 1fr; }
  .lp-branchen-panel { padding: 28px 18px; border-radius: 20px; }
}
</style>
