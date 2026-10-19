<template>
  <div :class="['lp', { 'lp-light': isLight }]" :style="customStyle">
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
          <button v-if="!customLook" class="theme-toggle" :title="lang === 'de' ? (theme === 'light' ? 'Dunkles Design' : 'Helles Design') : (theme === 'light' ? 'Dark mode' : 'Light mode')" :aria-label="lang === 'de' ? 'Design wechseln' : 'Switch theme'" @click="toggleTheme">{{ theme === 'light' ? '🌙' : '☀️' }}</button>
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
        <div class="lp-hero-text">
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
          <UserRound :size="14" />
          {{ t.hero.demoHint }} <strong>demo@plexora.eu</strong> · <strong>Demo1234!</strong>
        </div>
        </div>

        <div class="lp-hero-visual">
        <!-- Plexora von innen: fünf Schichten (Bild enthält deutschen Text). Klick öffnet die große Fassung, weil die Beschriftung im Hero klein ist. -->
        <a class="lp-hero-art lp-reveal" href="/img/plexora-von-innen-2400.webp" target="_blank" rel="noopener" :title="t.hero.visualZoom">
          <div class="lp-hero-shot-glow"></div>
          <img src="/img/plexora-von-innen-1280.webp" srcset="/img/plexora-von-innen-1280.webp 1280w, /img/plexora-von-innen-2400.webp 2400w" sizes="(min-width: 1100px) 46vw, 92vw"
            width="1280" height="720" :alt="t.hero.visualAlt" class="lp-hero-art-img" loading="eager" fetchpriority="high" />
        </a>
        </div>
      </div>
    </section>

    <!-- STATS STRIP -->
    <section class="lp-wrap lp-stats-section lp-reveal">
      <div class="lp-stats-row">
        <div class="lp-stat" v-for="(s, i) in statItems" :key="i">
          <div class="lp-stat-num">{{ s.num }}</div>
          <div class="lp-stat-label">{{ s.label }}</div>
        </div>
      </div>
    </section>

    <!-- MODULE GRID (BENTO) -->
    <section class="lp-wrap lp-modules-section lp-reveal" id="modules">
      <div class="lp-section-label">{{ t.modules.label }}</div>
      <div class="lp-modules-grid">
        <div
          v-for="(mod, i) in modules"
          :key="mod.key"
          class="lp-mod"
          :class="{ active: mod.on, 'lp-mod-featured': i === 0 }"
          :style="{ transitionDelay: (i * 0.06) + 's' }"
          @click="mod.on = !mod.on"
        >
          <div class="lp-mod-icon-badge">
            <component :is="mod.icon" :size="i === 0 ? 26 : 20" :stroke-width="1.75" />
          </div>
          <div class="lp-mod-name">{{ mod.name }}</div>
          <div class="lp-mod-desc">{{ mod.desc }}</div>
          <span v-if="mod.on" class="lp-mod-badge">{{ t.modules.active }}</span>
        </div>
      </div>
    </section>

    <!-- HOW IT WORKS -->
    <section class="lp-wrap lp-howit-section lp-reveal">
      <div class="lp-section-label">{{ t.howItWorks.label }}</div>
      <h2 class="lp-section-title" style="text-align:center;margin-bottom:40px">{{ t.howItWorks.heading }}</h2>
      <div class="lp-howit-grid">
        <div class="lp-howit-step" v-for="(step, i) in t.howItWorks.steps" :key="i" :style="{ transitionDelay: (i * 0.1) + 's' }">
          <div class="lp-howit-num">{{ i + 1 }}</div>
          <component :is="[LogIn, SlidersHorizontal, Rocket][i]" :size="22" :stroke-width="1.75" class="lp-howit-icon" />
          <div class="lp-howit-title">{{ step.title }}</div>
          <div class="lp-howit-desc">{{ step.desc }}</div>
        </div>
      </div>
    </section>

    <!-- POWERED BY -->
    <section class="lp-wrap lp-poweredby-section lp-reveal">
      <div class="lp-section-label">{{ t.poweredBy.label }}</div>
      <div class="lp-poweredby-row">
        <div class="lp-poweredby-item" v-for="(item, i) in t.poweredBy.items" :key="i">
          <component :is="[Cloud, CreditCard, ShieldCheck][i]" :size="20" :stroke-width="1.6" />
          <div>
            <div class="lp-poweredby-name">{{ item.name }}</div>
            <div class="lp-poweredby-sub">{{ item.sub }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- SAVINGS -->
    <section class="lp-wrap lp-reveal" id="savings">
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
    <section class="lp-wrap lp-compare-section lp-reveal">
      <h2 class="lp-section-title">{{ t.compare.heading }}</h2>
      <div class="lp-compare-grid">
        <div class="lp-ccard">
          <div class="lp-ccard-tag">{{ t.compare.oldTag }}</div>
          <div class="lp-ccard-name">{{ t.compare.oldName }}</div>
          <div class="lp-ccard-price">8–12 <span>{{ t.compare.oldPriceUnit }}</span></div>
          <div class="lp-ccard-note">{{ t.compare.oldNote }}</div>
          <ul class="lp-ccard-items">
            <li v-for="item in t.compare.oldItems" :key="item"><X :size="15" class="lp-cross" />{{ item }}</li>
          </ul>
        </div>
        <div class="lp-ccard lp-ccard-featured">
          <div class="lp-ccard-tag">{{ t.compare.newTag }}</div>
          <div class="lp-ccard-name">Plexora</div>
          <div class="lp-ccard-price lp-price-accent">1 <span>{{ t.compare.newPriceUnit }}</span></div>
          <div class="lp-ccard-note">{{ t.compare.newNote }}</div>
          <ul class="lp-ccard-items">
            <li v-for="item in t.compare.newItems" :key="item"><Check :size="15" class="lp-tick" />{{ item }}</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- TESTIMONIALS SLIDER -->
    <section v-if="testimonialItems.length" class="lp-wrap lp-testi-section lp-reveal">
      <div class="lp-section-label" style="text-align:center;margin-bottom:8px">{{ t.testi.label }}</div>
      <div class="lp-testi-slider">
        <div class="lp-testi-track" :style="{ transform: `translateX(-${testiIdx * 100}%)` }">
          <div class="lp-testi-slide" v-for="(tst, i) in testimonialItems" :key="i">
            <div class="lp-testi-stars">★★★★★</div>
            <div class="lp-testi-quote">„{{ tst.quote }}"</div>
            <div class="lp-testi-author"><strong>{{ tst.name }}</strong> · {{ tst.role }}</div>
          </div>
        </div>
        <div class="lp-testi-dots">
          <button
            v-for="(_, i) in testimonialItems"
            :key="i"
            class="lp-testi-dot"
            :class="{ active: i === testiIdx }"
            @click="testiIdx = i"
          />
        </div>
      </div>
    </section>

    <!-- PRICING -->
    <section class="lp-wrap lp-pricing-section lp-reveal" id="pricing">
      <div class="lp-section-label">{{ t.pricing.label }}</div>
      <h2 class="lp-section-title" style="text-align:center;margin-bottom:8px">{{ t.pricing.heading }}</h2>
      <p style="text-align:center;font-size:14px;color:var(--muted);margin-bottom:40px">{{ t.pricing.sub }}</p>
      <div class="lp-pricing-grid">

        <!-- Starter -->
        <div class="lp-pcard">
          <div class="lp-pcard-icon-badge"><Rocket :size="20" :stroke-width="1.75" /></div>
          <div class="lp-pcard-tier">Starter</div>
          <div class="lp-pcard-price">49 <span>€ / {{ t.pricing.month }}</span></div>
          <div style="font-size:11px;color:var(--faint);margin-bottom:2px">{{ t.pricing.vat }}</div>
          <div class="lp-pcard-note">{{ t.pricing.starter.note }}</div>
          <ul class="lp-pcard-items">
            <li v-for="item in t.pricing.starter.items" :key="item"><Check :size="15" class="lp-tick" />{{ item }}</li>
          </ul>
          <button class="lp-pcard-btn lp-pcard-btn-ghost" @click="navigateTo('/kaufen')"><span>{{ t.pricing.cta }}</span></button>
        </div>

        <!-- Pro -->
        <div class="lp-pcard lp-pcard-featured">
          <div class="lp-pcard-popular">{{ t.pricing.popular }}</div>
          <div class="lp-pcard-icon-badge lp-pcard-icon-badge-accent"><Zap :size="20" :stroke-width="1.75" /></div>
          <div class="lp-pcard-tier">Pro</div>
          <div class="lp-pcard-price">149 <span>€ / {{ t.pricing.month }}</span></div>
          <div style="font-size:11px;color:var(--faint);margin-bottom:2px">{{ t.pricing.vat }}</div>
          <div class="lp-pcard-note">{{ t.pricing.pro.note }}</div>
          <ul class="lp-pcard-items">
            <li v-for="item in t.pricing.pro.items" :key="item"><Check :size="15" class="lp-tick" />{{ item }}</li>
          </ul>
          <button class="lp-pcard-btn" @click="navigateTo('/kaufen')"><span>{{ t.pricing.cta }}</span></button>
        </div>

        <!-- Enterprise -->
        <div class="lp-pcard">
          <div class="lp-pcard-icon-badge"><Building2 :size="20" :stroke-width="1.75" /></div>
          <div class="lp-pcard-tier">Enterprise</div>
          <div class="lp-pcard-price">299 <span>€ / {{ t.pricing.month }}</span></div>
          <div style="font-size:11px;color:var(--faint);margin-bottom:2px">{{ t.pricing.vat }}</div>
          <div class="lp-pcard-note">{{ t.pricing.enterprise.note }}</div>
          <ul class="lp-pcard-items">
            <li v-for="item in t.pricing.enterprise.items" :key="item"><Check :size="15" class="lp-tick" />{{ item }}</li>
          </ul>
          <button class="lp-pcard-btn lp-pcard-btn-ghost" @click="navigateTo('/kaufen')"><span>{{ t.pricing.cta }}</span></button>
        </div>

      </div>
    </section>

    <!-- BRANCHEN-PAKETE -->
    <section v-if="branchItems.length" class="lp-wrap lp-branchen-section lp-reveal" id="branchen">
      <div class="lp-branchen-panel">
        <div class="lp-section-label">{{ t.branchen.label }}</div>
        <h2 class="lp-section-title" style="text-align:center;margin-bottom:8px">{{ t.branchen.heading }}</h2>
        <p style="text-align:center;font-size:14px;color:var(--muted);margin-bottom:40px;max-width:520px;margin-left:auto;margin-right:auto">{{ t.branchen.sub }}</p>
        <div class="lp-branchen-grid">
          <div class="lp-bcard" v-for="(pkg, i) in branchItems" :key="pkg.key" :style="{ transitionDelay: (i * 0.08) + 's' }">
            <div class="lp-bcard-icon"><component :is="pkg.icon" :size="20" :stroke-width="1.75" /></div>
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
        <div class="lp-branchen-note"><Info :size="14" /> {{ t.branchen.note }}</div>
      </div>
    </section>

    <!-- FOOTER CTA -->
    <section class="lp-wrap lp-footer-cta lp-reveal">
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
import { parseLandingTheme, customTheme } from '~~/shared/landingTheme'
import {
  Users, Kanban, Receipt, IdCard, Headset, BarChart3,
  Car, UtensilsCrossed, Building2, Store, Hammer, Home, Stethoscope, Scissors, BedDouble, Puzzle,
  Check, X, Info, UserRound, Rocket, Zap,
  LogIn, SlidersHorizontal, Cloud, CreditCard, ShieldCheck,
} from 'lucide-vue-next'

definePageMeta({ layout: false })

// ── i18n ────────────────────────────────────────────────────────────────────
const lang = ref<'de'|'en'>('de')

function setLang(l: 'de'|'en') {
  lang.value = l
  if (typeof localStorage !== 'undefined') localStorage.setItem('plexora-lang', l)
}

// Design der Startseite: der Betreiber legt es in den Einstellungen fest (Hell, Dunkel oder eigene Farben). Bei Hell/Dunkel darf jeder Besucher umschalten (im Browser gemerkt).
const { data: themeData } = useFetch(useApiUrl('/api/public/landing-theme'), { server: false })
const config = computed(() => parseLandingTheme((themeData.value as any)?.theme))
const customResult = computed(() => (config.value.mode === 'custom' ? customTheme(config.value) : null))
const customLook = computed(() => !!customResult.value)
const customStyle = computed(() => customResult.value?.vars || {})
const visitorTheme = ref<'light'|'dark'|''>('')
const theme = computed<'light'|'dark'>(() => visitorTheme.value || (config.value.mode === 'dark' ? 'dark' : 'light'))
const isLight = computed(() => (customResult.value ? !customResult.value.dark : theme.value === 'light'))
function toggleTheme() {
  visitorTheme.value = theme.value === 'light' ? 'dark' : 'light'
  // Die Wahl gilt nur zur aktuellen Betreiber-Einstellung: ändert sich diese, zählt wieder der neue Standard
  try { localStorage.setItem('plexora-lp-theme', `${config.value.mode}:${visitorTheme.value}`) } catch { /* privater Modus: ohne Merken */ }
}

onMounted(() => {
  const saved = localStorage.getItem('plexora-lang') as 'de'|'en' | null
  if (saved === 'de' || saved === 'en') lang.value = saved
  try {
    const [forMode, choice] = String(localStorage.getItem('plexora-lp-theme') || '').split(':')
    if ((choice === 'light' || choice === 'dark') && forMode === config.value.mode) visitorTheme.value = choice
  } catch { /* ohne Merken */ }
})

const i18n = {
  de: {
    nav: { impressum: 'Impressum', datenschutz: 'Datenschutz', agb: 'AGB', login: 'Anmelden', demo: 'Demo starten ↗', pricing: 'Preise' },
    hero: {
      h1a: 'Eine Lizenz.',
      h1b: 'Alles drin.',
      visualAlt: 'Plexora von innen: fünf Schichten einer Plattform – Module, KI-Schicht, Zugriff und Protokoll, Mandantentrennung und Infrastruktur auf AWS in Frankfurt.',
      visualZoom: 'Bild in voller Größe öffnen',
      subL1a: 'Warum 100+', subL1b: 'Lizenzen zahlen,',
      subL2a: 'wenn es die', subL2b: 'eine für alles gibt?',
      ctaDemo: 'Demo ausprobieren ↗',
      ctaLoading: 'Wird geladen...',
      ctaPricing: 'Preise ansehen',
      demoHint: 'Demo-Zugang:',
    },
    stats: {
      items: [
        { num: '', label: 'Module in einer Lizenz' },
        { num: '1', label: 'Login statt 10+ Tools' },
        { num: 'Frankfurt', label: 'AWS-Hosting, DSGVO-konform' },
        { num: 'ab 49€', label: 'Alle Module inklusive' },
      ],
    },
    howItWorks: {
      label: 'So einfach geht\'s',
      heading: 'Von Null auf startklar in 3 Schritten',
      steps: [
        { title: 'Demo starten', desc: 'Ohne Registrierung, ohne Kreditkarte — direkt ausprobieren.' },
        { title: 'Module wählen', desc: 'Nur aktivieren, was du brauchst. Jederzeit erweiterbar.' },
        { title: 'Loslegen', desc: 'Keine Einrichtungszeit, kein IT-Projekt — sofort startklar.' },
      ],
    },
    poweredBy: {
      label: 'Läuft auf bewährter Infrastruktur',
      items: [
        { name: 'Amazon Web Services', sub: 'Hosting · Frankfurt (eu-central-1)' },
        { name: 'Stripe', sub: 'Sichere Zahlungsabwicklung' },
        { name: 'Cloudflare', sub: 'Auslieferung & DDoS-Schutz' },
      ],
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
      sub: 'Zusätzliche Module für deine Branche — buchbar zu jedem Plan.',
      cta: 'Paket wählen',
      note: 'Verfügbar im Modul-Store nach dem Kauf einer Lizenz — kein Extra-Vertrag nötig.',
      items: [
        { key: 'automotive', name: 'Automotive', icon: Car, price: 59, desc: 'Fahrzeugverwaltung, Probefahrten und Werkstatt-Aufträge — alles in einem Modul.', features: ['Fahrzeug-DB', 'Probefahrten', 'TÜV-Erinnerungen'] },
        { key: 'gastro', name: 'Gastronomie', icon: UtensilsCrossed, price: 59, desc: 'Tischreservierung, Speisekarte und Bestellmanagement für dein Restaurant.', features: ['Tisch-Reservierung', 'Speisekarte', 'Bestellmanagement'] },
        { key: 'immobilien', name: 'Immobilien', icon: Building2, price: 59, desc: 'Objekt-Verwaltung, Besichtigungen und Mieter-CRM für deine Hausverwaltung.', features: ['Objekt-Verwaltung', 'Besichtigungen', 'Mieter-CRM'] },
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
      visualAlt: 'Plexora from the inside: five layers of one platform – modules, AI layer, access and audit log, tenant separation and infrastructure on AWS in Frankfurt (image text is in German).',
      visualZoom: 'Open image in full size',
      subL1a: 'Why pay for', subL1b: '100+ tools',
      subL2a: 'when one', subL2b: 'covers everything?',
      ctaDemo: 'Try the Demo ↗',
      ctaLoading: 'Loading...',
      ctaPricing: 'View Pricing',
      demoHint: 'Demo access:',
    },
    stats: {
      items: [
        { num: '', label: 'modules in one license' },
        { num: '1', label: 'login instead of 10+ tools' },
        { num: 'Frankfurt', label: 'AWS hosting, GDPR-compliant' },
        { num: 'from €49', label: 'all modules included' },
      ],
    },
    howItWorks: {
      label: 'It\'s that simple',
      heading: 'Zero to ready in 3 steps',
      steps: [
        { title: 'Start the demo', desc: 'No sign-up, no credit card — try it right away.' },
        { title: 'Pick your modules', desc: 'Activate only what you need. Expand anytime.' },
        { title: 'Get going', desc: 'No setup time, no IT project — ready instantly.' },
      ],
    },
    poweredBy: {
      label: 'Built on proven infrastructure',
      items: [
        { name: 'Amazon Web Services', sub: 'Hosting · Frankfurt (eu-central-1)' },
        { name: 'Stripe', sub: 'Secure payment processing' },
        { name: 'Cloudflare', sub: 'Delivery & DDoS protection' },
      ],
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
      sub: 'Extra modules for your industry — available with any plan.',
      cta: 'Choose Package',
      note: 'Available in the Module Store after purchasing a license — no extra contract needed.',
      items: [
        { key: 'automotive', name: 'Automotive', icon: Car, price: 59, desc: 'Vehicle inventory, test drives and workshop orders — all in one module.', features: ['Vehicle DB', 'Test Drives', 'Inspection Reminders'] },
        { key: 'gastro', name: 'Restaurants', icon: UtensilsCrossed, price: 59, desc: 'Table reservations, menu management and order handling for your restaurant.', features: ['Table Booking', 'Menu', 'Order Management'] },
        { key: 'immobilien', name: 'Real Estate', icon: Building2, price: 59, desc: 'Property management, viewings and tenant CRM for your portfolio.', features: ['Property Mgmt', 'Viewings', 'Tenant CRM'] },
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
    { key: 'crm',       name: 'CRM',       icon: Users,     desc: 'Kontakte, Pipelines, Deals',        on: true,  cost: 45 },
    { key: 'projects',  name: 'Projekte',   icon: Kanban,    desc: 'Kanban, Meilensteine, Teams',       on: true,  cost: 35 },
    { key: 'finance',   name: 'Finanzen',   icon: Receipt,   desc: 'Rechnungen, Ausgaben, Berichte',    on: true,  cost: 55 },
    { key: 'hr',        name: 'HR',         icon: IdCard,    desc: 'Mitarbeiter, Urlaub, Zeiterfassung',on: false, cost: 40 },
    { key: 'support',   name: 'Support',    icon: Headset,   desc: 'Tickets, SLA, Kunden-Portal',       on: false, cost: 30 },
    { key: 'analytics', name: 'Analytics',  icon: BarChart3, desc: 'Dashboards, KPIs, Exports',         on: false, cost: 25 },
  ],
  en: [
    { key: 'crm',       name: 'CRM',        icon: Users,     desc: 'Contacts, Pipelines, Deals',       on: true,  cost: 45 },
    { key: 'projects',  name: 'Projects',   icon: Kanban,    desc: 'Kanban, Milestones, Teams',        on: true,  cost: 35 },
    { key: 'finance',   name: 'Finance',    icon: Receipt,   desc: 'Invoices, Expenses, Reports',      on: true,  cost: 55 },
    { key: 'hr',        name: 'HR',         icon: IdCard,    desc: 'Employees, Leave, Time Tracking',  on: false, cost: 40 },
    { key: 'support',   name: 'Support',    icon: Headset,   desc: 'Tickets, SLA, Client Portal',      on: false, cost: 30 },
    { key: 'analytics', name: 'Analytics',  icon: BarChart3, desc: 'Dashboards, KPIs, Exports',        on: false, cost: 25 },
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

  // Farben des Hintergrundnetzes folgen dem Design (Akzent und zweiter Ton aus den CSS-Variablen der Seite)
  const root = canvas.closest('.lp') as HTMLElement | null
  const readRgb = (name: string, fallback: [number, number, number]): [number, number, number] => {
    const v = root ? getComputedStyle(root).getPropertyValue(name).split(',').map(x => parseInt(x, 10)) : []
    return v.length === 3 && v.every(n => Number.isFinite(n)) ? [v[0], v[1], v[2]] : fallback
  }
  let ORANGE = readRgb('--accent-rgb', [234, 88, 12]), BLUE = readRgb('--blue-rgb', [56, 189, 248])
  let frame = 0

  const nodes = Array.from({ length: 55 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    r: Math.random() * 1.5 + 0.5,
    c: ORANGE, isAccent: true,
  }))
  for (const n of nodes) { n.isAccent = Math.random() < 0.6; n.c = n.isAccent ? ORANGE : BLUE }

  const MAX_DIST = 160
  let raf: number

  const draw = () => {
    if (++frame % 30 === 0) { ORANGE = readRgb('--accent-rgb', ORANGE); BLUE = readRgb('--blue-rgb', BLUE); for (const n of nodes) n.c = n.isAccent ? ORANGE : BLUE }
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

// Branchen-Pakete kommen aus dem Modul-Store (Preise und Texte werden dort gepflegt); bei einem Abruffehler zeigt die Seite die festen Einträge.
const BRANCH_ICONS: Record<string, any> = { Car, UtensilsCrossed, Building2, Store, Hammer, Home, Stethoscope, Scissors, BedDouble }
const { data: branchData } = useFetch(useApiUrl('/api/public/branch-packages'), { server: false })
const branchItems = computed(() => {
  const d = branchData.value as any
  const live = (d?.packages || []) as any[]
  if (!d || d.unavailable) return t.value.branchen.items          // noch nicht geladen oder Abruf gescheitert: feste Einträge
  if (!live.length) return []                                     // bewusst keine Auswahl: Abschnitt entfällt
  const staticByKey = Object.fromEntries((t.value.branchen.items as any[]).map(i => [i.key, i]))
  return live.map(p => {
    const st = lang.value === 'en' ? staticByKey[p.key] : null       // Englische Texte nur, wo es sie gibt; sonst die deutschen aus dem Store
    return { key: p.key, name: st?.name || p.name, desc: st?.desc || p.desc, features: st?.features || p.features, price: p.price, icon: BRANCH_ICONS[p.icon] || Puzzle }
  })
})

// Zahl "Module in einer Lizenz": Basis-Module (Seitenleiste: CRM, Support, Finanzen, Projekte, Verträge, HR, Marketing, Shop, Formulare, Termine,
// Newsletter, Blog, Analytics, SEO/GEO, Website) plus die Branchen-Pakete aus dem Modul-Store. Bei neuen Basis-Modulen CORE_MODULE_COUNT anheben.
const CORE_MODULE_COUNT = 15
const statItems = computed(() => (t.value.stats.items as any[]).map((s, i) => i === 0 ? { ...s, num: String(CORE_MODULE_COUNT + branchItems.value.length) } : s))

const { data: pagesData } = await useFetch(useApiUrl('/api/pages'))
const navPages = computed(() =>
  ((pagesData.value as any)?.pages || [])
    .filter((p: any) => p.inNav && p.status === 'published' && !['impressum','datenschutz','agb'].includes(p.slug))
    .sort((a: any, b: any) => (a.navLabel || '').localeCompare(b.navLabel || ''))
)

// Echte Kundenstimmen kommen aus dem Admin (Einstellungen → Testimonials) statt
// hartkodierter Fake-Zitate — Sektion blendet sich aus, solange die Liste leer ist.
// server:false: "/" wird statisch vorgerendert, ein SSR/Build-Zeit-Fetch würde den Stand
// vom letzten Deploy einfrieren statt bei jedem Seitenaufruf aktuell zu sein.
const { data: testimonialsData } = await useFetch(useApiUrl('/api/public/testimonials'), { server: false })
const testimonialItems = computed(() => {
  const items = (testimonialsData.value as any)?.items || []
  return items.map((i: any) => ({
    quote: lang.value === 'en' && i.quoteEn ? i.quoteEn : i.quote,
    role:  lang.value === 'en' && i.roleEn  ? i.roleEn  : i.role,
    name:  i.name,
  }))
})

const testiIdx = ref(0)
let testiTimer: ReturnType<typeof setInterval>
onMounted(() => {
  testiTimer = setInterval(() => {
    if (!testimonialItems.value.length) return
    testiIdx.value = (testiIdx.value + 1) % testimonialItems.value.length
  }, 5000)
})
onUnmounted(() => clearInterval(testiTimer))

// ── Scroll-Reveal ───────────────────────────────────────────────────────────
onMounted(() => {
  if (typeof IntersectionObserver === 'undefined') return
  const els = document.querySelectorAll('.lp-reveal')
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('lp-in')
        io.unobserve(entry.target)
      }
    }
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' })
  els.forEach(el => io.observe(el))
  onUnmounted(() => io.disconnect())
})
</script>

<style scoped>
.lp {
  --bg: #1a1723; --card: #241f30; --card2: #211d2b; --text: #f5f2fa; --text-strong: #f0eef9; --body: #c4c2d4;
  --muted: #8b8fa8; --muted2: #9a9db8; --faint: #545870; --faint2: #666b85; --faint3: #333a55;
  --blue: #38bdf8; --blue2: #7dd3fc; --blue-rgb: 56,189,248; --orange2: #fb923c; --btn: #ea580c; --btn-text: #fff;
  --accent: #ea580c; --accent-rgb: 234,88,12; --accent2-rgb: 251,146,60; --g1: #ffb347; --g2: #ff3d00; --g3: #c2390a;
  --ink: 255,255,255; --shadow: 0,0,0; --nav-bg: rgba(26,23,35,0.88); --footer-bg: rgba(23,20,31,0.82);
  --page-bg:
    radial-gradient(ellipse 90% 60% at 15% 0%, rgba(var(--accent2-rgb),0.16) 0%, transparent 65%),
    radial-gradient(ellipse 80% 55% at 90% 45%, rgba(56,189,248,0.11) 0%, transparent 65%),
    radial-gradient(ellipse 80% 55% at 10% 90%, rgba(var(--accent2-rgb),0.10) 0%, transparent 65%),
    radial-gradient(ellipse 80% 55% at 95% 135%, rgba(56,189,248,0.09) 0%, transparent 65%),
    linear-gradient(rgba(60,110,220,0.09) 1px, transparent 1px),
    linear-gradient(90deg, rgba(60,110,220,0.09) 1px, transparent 1px);
  background: var(--bg);
  background-image: var(--page-bg);
  background-size: 100% 90vh, 100% 90vh, 100% 90vh, 100% 90vh, 64px 64px, 64px 64px;
  background-repeat: repeat-y, repeat-y, repeat-y, repeat-y, repeat, repeat;
  color: var(--text);
  font-family: "Exo 2", sans-serif;
  min-height: 100vh;
}

/* FREUNDLICHES HELLES THEMA (Standard): warmes Creme, weiche Karten, kräftigerer Text */
.lp.lp-light {
  --bg: #fff8f1; --card: #ffffff; --card2: #fffdfa; --text: #2b2433; --text-strong: #231c2c; --body: #403a4c;
  --muted: #6a6377; --muted2: #5d566a; --faint: #7a7487; --faint2: #7a7487; --faint3: #8a8497;
  --blue: #0369a1; --blue2: #0b7fc0; --blue-rgb: 3,105,161; --orange2: #c2410c; --btn: #d9480f;
  --ink: 43,36,51; --shadow: 120,70,30; --nav-bg: rgba(255,248,241,0.88); --footer-bg: rgba(255,244,232,0.9);
  --page-bg:
    radial-gradient(ellipse 80% 50% at 12% 0%, rgba(253,186,116,0.38) 0%, transparent 65%),
    radial-gradient(ellipse 70% 50% at 92% 30%, rgba(125,211,252,0.28) 0%, transparent 65%),
    radial-gradient(ellipse 70% 50% at 8% 80%, rgba(253,186,116,0.26) 0%, transparent 65%),
    radial-gradient(ellipse 70% 50% at 95% 120%, rgba(125,211,252,0.22) 0%, transparent 65%);
  background-size: 100% 90vh, 100% 90vh, 100% 90vh, 100% 90vh;
  background-repeat: repeat-y;
}
.lp-light .lp-network { opacity: 0.45; }
.lp-light .lp-letter-white { background: linear-gradient(160deg, #3b2f4a 0%, #231c2c 100%); -webkit-background-clip: text; background-clip: text; }
.lp-light .lp-btn, .lp-light .lp-pcard-btn:not(.lp-pcard-btn-ghost), .lp-light .lp-pcard-popular, .lp-light .lang-btn.active { background: var(--btn); color: var(--btn-text); }
.lp-light .lp-pcard-btn-ghost { background: #fff; color: var(--text-strong); border: 1px solid rgba(43,36,51,0.22); }
.lp-light .lp-pcard-btn:not(.lp-pcard-btn-ghost) { box-shadow: 0 6px 16px rgba(var(--accent-rgb),0.22); }
.lp-light .lp-btn { font-weight: 600; box-shadow: 0 6px 16px rgba(var(--accent-rgb),0.25); }
.lp-light .lp-btn-demo { background: rgba(3,105,161,0.08); border-color: rgba(3,105,161,0.3); font-weight: 600; }
.lp-light .lp-btn-ghost { border-color: rgba(43,36,51,0.22); }
.lp-light .lp-btn-ghost:hover { background: rgba(43,36,51,0.05); }
.lp-light .lp-nav { border-bottom-color: rgba(43,36,51,0.08); }
/* Weiche Karten mit warmem Schatten und runderen Ecken */
.lp-light .lp-mod, .lp-light .lp-howit-step, .lp-light .lp-ccard, .lp-light .lp-pcard, .lp-light .lp-bcard, .lp-light .lp-poweredby-item {
  box-shadow: 0 4px 18px rgba(var(--shadow),0.10); border-color: rgba(43,36,51,0.07);
}
.lp-light .lp-mod, .lp-light .lp-howit-step, .lp-light .lp-ccard, .lp-light .lp-bcard { border-radius: 22px; }
.lp-light .lp-pcard { border-radius: 24px; }
.lp-light .lp-mod:hover, .lp-light .lp-ccard:hover, .lp-light .lp-pcard:hover, .lp-light .lp-bcard:hover { box-shadow: 0 14px 34px rgba(var(--shadow),0.18); }
.lp-light .lp-mod.active { background: rgba(var(--blue-rgb),0.07); }
.lp-light .lp-howit-num { color: rgba(43,36,51,0.07); }
.lp-light .lp-stats-row { background: linear-gradient(160deg, rgba(253,186,116,0.32), rgba(125,211,252,0.22)); border-color: rgba(43,36,51,0.06); box-shadow: 0 4px 18px rgba(var(--shadow),0.08); }
.lp-light .lp-branchen-panel { background: linear-gradient(160deg, rgba(253,186,116,0.28), #fffdfa 60%); border-color: rgba(43,36,51,0.07); box-shadow: 0 6px 26px rgba(var(--shadow),0.10); }
.lp-light .lp-savings { background: linear-gradient(160deg, rgba(125,211,252,0.22), #ffffff); }
.lp-light .lp-pcard-featured { background: linear-gradient(160deg, rgba(253,186,116,0.22), #ffffff); }
.lp-light .lp-ccard-featured { background: linear-gradient(160deg, rgba(253,186,116,0.2), #ffffff); }
.lp-light .lp-testi-slider { background: linear-gradient(135deg, rgba(125,211,252,0.22), rgba(253,186,116,0.2)); border-color: rgba(43,36,51,0.06); }
.lp-light .lp-hero-art-img { border-color: rgba(43,36,51,0.08); box-shadow: 0 24px 60px rgba(var(--shadow),0.28); }
.lp-light .lp-hero-shot-glow { background: radial-gradient(ellipse 70% 60% at 50% 30%, rgba(var(--accent2-rgb),0.30), transparent 70%); }
.lp-light .lp-bcard-btn:hover { color: #fff; }
.lp-light .lp-pcard-btn-ghost:hover { color: var(--text-strong); }
.lp-light .lp-testi-dot { background: rgba(43,36,51,0.18); }

/* Umschalter Hell/Dunkel */
.theme-toggle { width: 34px; height: 34px; border-radius: 50%; border: 0.5px solid rgba(var(--ink),0.18); background: rgba(var(--ink),0.05); cursor: pointer; font-size: 15px; line-height: 1; display: inline-flex; align-items: center; justify-content: center; color: var(--text-strong); transition: background .15s; }
.theme-toggle:hover { background: rgba(var(--ink),0.1); }

/* NETWORK CANVAS */
.lp-network { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
.lp-wrap { max-width: 1440px; margin: 0 auto; }
/* Seitenabstand getrennt vom oberen/unteren Abstand der Abschnitte (sonst überschreibt deren padding ihn) */
.lp .lp-wrap { padding-left: 48px; padding-right: 48px; }

/* NAV */
.lp-nav {
  border-bottom: 0.5px solid rgba(var(--ink),0.08);
  padding: 20px 0;
  position: sticky; top: 0; z-index: 100;
  background: var(--nav-bg);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
.lp-nav .lp-wrap { display: flex; align-items: center; justify-content: space-between; }
.lp-logo { font-family: "Space Grotesk", sans-serif; font-weight: 800; font-size: 22px; letter-spacing: -0.5px; }
.lp-logo span {
  background: linear-gradient(160deg, var(--g1) 0%, var(--accent) 50%, var(--g3) 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}

/* LANGUAGE TOGGLE */
.lang-toggle {
  display: flex; align-items: center;
  background: rgba(var(--ink),0.05);
  border: 0.5px solid rgba(var(--ink),0.12);
  border-radius: 20px; overflow: hidden;
}
.lang-btn {
  padding: 5px 12px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;
  cursor: pointer; border: none; background: transparent; color: var(--muted);
  font-family: "Exo 2", sans-serif; transition: all .15s;
}
.lang-btn.active { background: var(--btn); color: var(--btn-text); border-radius: 20px; }
.lang-btn:hover:not(.active) { color: var(--text-strong); }

/* BUTTONS */
.lp-btn {
  background: var(--btn); color: var(--btn-text); font-size: 14px; font-weight: 500;
  padding: 10px 22px; border-radius: 40px; border: none; cursor: pointer;
  font-family: "Exo 2", sans-serif; transition: opacity 0.2s;
}
.lp-btn:hover { opacity: 0.88; }
.lp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.lp-btn-lg { font-size: 15px; padding: 14px 36px; }
.lp-btn-ghost {
  background: transparent; color: var(--text-strong); font-size: 14px; font-weight: 500;
  padding: 10px 22px; border-radius: 40px; border: 0.5px solid rgba(var(--ink),0.25);
  cursor: pointer; font-family: "Exo 2", sans-serif; transition: background 0.2s;
}
.lp-btn-ghost:hover { background: rgba(var(--ink),0.06); }
.lp-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
.lp-btn-demo {
  background: rgba(var(--blue-rgb),0.12); color: var(--blue); font-size: 14px; font-weight: 500;
  padding: 10px 22px; border-radius: 40px; border: 0.5px solid rgba(var(--blue-rgb),0.35);
  cursor: pointer; font-family: "Exo 2", sans-serif; transition: background 0.2s;
}
.lp-btn-demo:hover { background: rgba(var(--blue-rgb),0.2); }
.lp-btn-demo:disabled { opacity: 0.5; cursor: not-allowed; }

/* HERO */
.lp-hero { padding: 96px 0 72px; position: relative; overflow: hidden; }
.lp-hero-inner { text-align: center; position: relative; z-index: 1; }
@media (min-width: 1100px) {
  .lp-hero { padding: 88px 0 64px; overflow: visible; }
  .lp-hero-inner {
    display: grid; grid-template-columns: 1fr 0.95fr; gap: 32px; align-items: center; text-align: left;
  }
  .lp-hero-text .lp-ctas, .lp-hero-text .lp-demo-hint { justify-content: flex-start; }
  .lp-hero-text .lp-h1 { font-size: clamp(44px, 4.6vw, 76px); }
  .lp-hero-visual { position: relative; }
}
.lp-eyebrow {
  display: inline-block; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;
  color: var(--blue); margin-bottom: 24px; font-weight: 500;
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
  background: linear-gradient(160deg, var(--g1) 0%, var(--accent) 45%, var(--g3) 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.lp-letter-up   { animation-name: lp-fly-up; }
.lp-letter-down { animation-name: lp-fly-down; }
@keyframes lp-fly-up   { from { opacity: 0; transform: translateY(46px); } to { opacity: 1; transform: translateY(0); } }
@keyframes lp-fly-down { from { opacity: 0; transform: translateY(-46px); } to { opacity: 1; transform: translateY(0); } }

.lp-sub { font-size: clamp(15px, 1.4vw, 19px); color: var(--muted2); margin-bottom: 36px; line-height: 1.55; }
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
  font-size: 12px; color: var(--muted); margin-top: 8px;
  background: rgba(var(--ink),0.04); border: 0.5px solid rgba(var(--ink),0.08);
  border-radius: 20px; padding: 6px 16px;
}
.lp-demo-hint strong { color: var(--text-strong); }
.lp-demo-hint svg { color: var(--blue); }

/* HERO: Plexora von innen */
.lp-hero-visual { max-width: 720px; margin: 56px auto 0; }
.lp-hero-art { position: relative; display: block; }
.lp-hero-shot-glow {
  position: absolute; inset: -40px -20px 0; z-index: -1;
  background: radial-gradient(ellipse 70% 60% at 50% 30%, rgba(var(--accent-rgb),0.28), transparent 70%);
  filter: blur(20px);
}
.lp-hero-art-img {
  display: block; width: 100%; height: auto; border-radius: 16px;
  border: 0.5px solid rgba(var(--ink),0.1);
  box-shadow: 0 30px 80px rgba(var(--shadow),0.5), 0 0 0 1px rgba(var(--ink),0.03);
  transition: transform 0.3s;
}
.lp-hero-art:hover .lp-hero-art-img { transform: translateY(-3px) scale(1.01); }
@media (prefers-reduced-motion: reduce) { .lp-hero-art-img { transition: none; } .lp-hero-art:hover .lp-hero-art-img { transform: none; } }

@media (min-width: 1100px) {
  .lp-hero-visual { max-width: none; margin: 0; }
}

/* HOW IT WORKS */
.lp-howit-section { padding: 8px 0 56px; }
.lp-howit-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; position: relative; }
.lp-howit-grid::before {
  content: ''; position: absolute; top: 52px; left: calc(16.66% + 20px); right: calc(16.66% + 20px); height: 1px;
  background: repeating-linear-gradient(90deg, rgba(var(--accent2-rgb),0.4) 0 8px, transparent 8px 16px);
  z-index: -1;
}
.lp-howit-step:nth-child(2) { margin-top: 28px; }
.lp-howit-step:nth-child(3) { margin-top: -8px; }
@media (max-width: 900px) {
  .lp-howit-grid::before { display: none; }
  .lp-howit-step:nth-child(2), .lp-howit-step:nth-child(3) { margin-top: 0; }
}
.lp-howit-step {
  background: var(--card); border: 0.5px solid rgba(var(--ink),0.08); border-radius: 18px;
  padding: 28px 24px; position: relative;
  opacity: 0; transform: translateY(20px);
  transition: opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1);
}
.lp-reveal.lp-in .lp-howit-step { opacity: 1; transform: translateY(0); }
.lp-howit-num {
  position: absolute; top: 20px; right: 22px; font-family: "Space Grotesk", sans-serif;
  font-size: 32px; font-weight: 800; color: rgba(var(--ink),0.06);
}
.lp-howit-icon {
  width: 40px; height: 40px; border-radius: 11px; padding: 9px; box-sizing: border-box;
  background: rgba(var(--accent-rgb),0.12); border: 0.5px solid rgba(var(--accent-rgb),0.3);
  color: var(--orange2); margin-bottom: 16px;
}
.lp-howit-title { font-family: "Space Grotesk", sans-serif; font-size: 16px; font-weight: 700; margin-bottom: 6px; }
.lp-howit-desc { font-size: 13px; color: var(--muted2); line-height: 1.5; }

/* POWERED BY */
.lp-poweredby-section { padding: 0 0 64px; }
.lp-poweredby-row {
  display: flex; justify-content: center; flex-wrap: wrap; gap: 16px;
}
.lp-poweredby-item {
  display: flex; align-items: center; gap: 12px;
  background: rgba(var(--ink),0.03); border: 0.5px solid rgba(var(--ink),0.08);
  border-radius: 14px; padding: 14px 20px; color: var(--blue2);
}
.lp-poweredby-name { font-size: 13px; font-weight: 600; color: var(--text-strong); }
.lp-poweredby-sub { font-size: 11px; color: var(--muted); margin-top: 1px; }

/* STATS STRIP */
.lp-stats-section { padding: 0 0 56px; }
.lp-stats-row {
  display: grid; grid-template-columns: repeat(4,1fr); gap: 16px;
  background: linear-gradient(160deg, rgba(var(--accent2-rgb),0.08), rgba(var(--blue-rgb),0.05));
  border: 0.5px solid rgba(var(--ink),0.09);
  border-radius: 20px;
  padding: 28px 20px;
}
.lp-stat { text-align: center; }
.lp-stat-num { font-family: "Space Grotesk", sans-serif; font-size: 26px; font-weight: 800; color: var(--orange2); line-height: 1.2; }
.lp-stat-label { font-size: 12px; color: var(--muted2); margin-top: 4px; }

/* MODULES (BENTO) */
.lp-modules-section { padding: 48px 0; }
.lp-section-label { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); text-align: center; margin-bottom: 24px; }
.lp-modules-grid { display: grid; grid-template-columns: repeat(4,1fr); grid-auto-rows: minmax(148px, auto); gap: 16px; }
.lp-mod:nth-child(1) { grid-column: span 2; grid-row: span 2; }
.lp-mod:nth-child(2) { grid-column: span 2; grid-row: span 1; }
.lp-mod:nth-child(3) { grid-column: span 1; grid-row: span 1; }
.lp-mod:nth-child(4) { grid-column: span 1; grid-row: span 1; }
.lp-mod:nth-child(5) { grid-column: span 2; grid-row: span 1; }
.lp-mod:nth-child(6) { grid-column: span 2; grid-row: span 1; }
.lp-mod {
  background: var(--card); border: 0.5px solid rgba(var(--ink),0.08); border-radius: 16px;
  padding: 22px 20px; cursor: pointer; transition: border-color 0.25s, transform 0.18s, box-shadow 0.25s; position: relative;
  display: flex; flex-direction: column; justify-content: center;
}
.lp-mod:hover { border-color: var(--accent); transform: translateY(-3px); box-shadow: 0 10px 28px rgba(var(--accent-rgb),0.15); }
.lp-mod.active { border-color: var(--blue); border-width: 1px; background: rgba(var(--blue-rgb),0.06); }
.lp-mod-icon-badge {
  width: 40px; height: 40px; border-radius: 11px; flex-shrink: 0;
  background: rgba(var(--accent-rgb),0.12); border: 0.5px solid rgba(var(--accent-rgb),0.3);
  display: flex; align-items: center; justify-content: center;
  color: var(--orange2); margin-bottom: 14px; transition: background 0.25s, border-color 0.25s, color 0.25s;
}
.lp-mod.active .lp-mod-icon-badge { background: rgba(var(--blue-rgb),0.15); border-color: rgba(var(--blue-rgb),0.4); color: var(--blue); }
.lp-mod-featured .lp-mod-icon-badge { width: 52px; height: 52px; border-radius: 14px; }
.lp-mod-name { font-family: "Space Grotesk", sans-serif; font-size: 14px; font-weight: 700; margin-bottom: 4px; }
.lp-mod-featured .lp-mod-name { font-size: 18px; }
.lp-mod-desc { font-size: 12px; color: var(--muted); line-height: 1.5; }
.lp-mod-featured .lp-mod-desc { font-size: 13px; }
.lp-mod-badge {
  position: absolute; top: 12px; right: 12px; font-size: 9px; letter-spacing: 1px;
  text-transform: uppercase; background: rgba(var(--blue-rgb),0.15); color: var(--blue);
  padding: 2px 8px; border-radius: 20px;
}

@media (max-width: 900px) {
  .lp-modules-grid { grid-template-columns: repeat(2,1fr); grid-auto-rows: auto; }
  .lp-mod, .lp-mod:nth-child(1), .lp-mod:nth-child(2), .lp-mod:nth-child(5), .lp-mod:nth-child(6) { grid-column: span 1; grid-row: span 1; }
  .lp-mod-featured .lp-mod-icon-badge { width: 40px; height: 40px; border-radius: 11px; }
  .lp-mod-featured .lp-mod-name { font-size: 14px; }
  .lp-mod-featured .lp-mod-desc { font-size: 12px; }
}

/* SAVINGS */
.lp-savings {
  background: linear-gradient(160deg, rgba(var(--blue-rgb),0.06), var(--card)); border: 0.5px solid rgba(var(--blue-rgb),0.25);
  border-radius: 20px; padding: 36px; margin: 0 0 48px; text-align: center;
}
.lp-savings-label { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted); margin-bottom: 16px; }
.lp-savings-row { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 16px; }
.lp-savings-num { font-family: "Space Grotesk", sans-serif; font-size: 48px; font-weight: 800; color: var(--blue); line-height: 1; }
.lp-savings-unit { font-size: 13px; color: var(--muted); text-align: left; line-height: 1.6; }
.lp-savings-sub { font-size: 13px; color: var(--muted); margin-bottom: 20px; }
.lp-savings-sub strong { color: var(--text-strong); }
.lp-slider-row { display: flex; align-items: center; gap: 12px; max-width: 400px; margin: 0 auto; }
.lp-slider-row label { font-size: 12px; color: var(--muted); white-space: nowrap; }
.lp-slider-row input { flex: 1; accent-color: var(--accent); }
.lp-slider-row span { font-size: 13px; font-weight: 500; min-width: 30px; }

/* COMPARE */
.lp-compare-section { padding: 0 0 48px; }
.lp-section-title { font-family: "Space Grotesk", sans-serif; font-size: 28px; font-weight: 800; margin-bottom: 24px; letter-spacing: -0.5px; }
.lp-compare-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.lp-ccard { background: var(--card); border: 0.5px solid rgba(var(--ink),0.07); border-radius: 18px; padding: 28px; transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s; }
.lp-ccard:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(var(--shadow),0.3); }
.lp-ccard-featured { border-color: var(--accent); border-width: 1.5px; background: linear-gradient(160deg, rgba(var(--blue-rgb),0.05), var(--card)); }
.lp-ccard-featured:hover { box-shadow: 0 10px 28px rgba(var(--accent-rgb),0.15); }
.lp-ccard-items li svg { flex-shrink: 0; }
.lp-ccard-tag { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
.lp-ccard-featured .lp-ccard-tag { color: var(--blue); }
.lp-ccard-name { font-family: "Space Grotesk", sans-serif; font-size: 18px; font-weight: 700; margin-bottom: 6px; }
.lp-ccard-price { font-family: "Space Grotesk", sans-serif; font-size: 32px; font-weight: 800; margin-bottom: 4px; color: var(--muted); }
.lp-ccard-price span { font-size: 16px; font-weight: 400; }
.lp-price-accent { color: var(--accent); }
.lp-ccard-note { font-size: 12px; color: var(--muted); margin-bottom: 20px; }
.lp-ccard-items { display: flex; flex-direction: column; gap: 10px; list-style: none; }
.lp-ccard-items li { font-size: 13px; color: var(--muted); display: flex; align-items: center; gap: 8px; }

/* TESTIMONIALS */
.lp-testi-section { padding: 0 0 56px; }
.lp-testi-slider {
  position: relative; overflow: hidden; border-radius: 20px;
  background: linear-gradient(135deg, rgba(var(--blue-rgb),0.08), rgba(var(--accent-rgb),0.04));
  border: 0.5px solid rgba(var(--ink),0.07);
}
.lp-testi-track { display: flex; transition: transform 0.5s cubic-bezier(0.4,0,0.2,1); will-change: transform; }
.lp-testi-slide { min-width: 100%; padding: 40px 48px 32px; box-sizing: border-box; }
.lp-testi-stars { font-size: 18px; color: var(--accent); margin-bottom: 16px; letter-spacing: 2px; }
.lp-testi-quote { font-size: 17px; color: var(--text-strong); line-height: 1.75; margin-bottom: 20px; font-style: italic; }
.lp-testi-author { font-size: 13px; color: var(--muted); }
.lp-testi-author strong { color: var(--blue2); }
.lp-testi-dots { display: flex; justify-content: center; gap: 8px; padding: 0 0 20px; }
.lp-testi-dot { width: 8px; height: 8px; border-radius: 50%; border: none; cursor: pointer; background: rgba(var(--ink),0.15); transition: background 0.3s, transform 0.3s; }
.lp-testi-dot.active { background: var(--accent); transform: scale(1.3); }

/* PRICING */
.lp-pricing-section { padding: 0 0 64px; }
.lp-pricing-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; }
.lp-pcard {
  background: var(--card); border: 0.5px solid rgba(var(--ink),0.07);
  border-radius: 20px; padding: 32px 26px; display: flex; flex-direction: column; position: relative;
  transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s;
}
.lp-pcard:hover { transform: translateY(-4px); box-shadow: 0 14px 32px rgba(var(--shadow),0.35); border-color: rgba(var(--accent-rgb),0.4); }
.lp-pcard-featured { border-color: var(--accent); border-width: 1.5px; background: linear-gradient(160deg, rgba(var(--blue-rgb),0.1), var(--card)); }
.lp-pcard-featured:hover { box-shadow: 0 14px 32px rgba(var(--accent-rgb),0.2); border-color: var(--accent); }
.lp-pcard-icon-badge {
  width: 40px; height: 40px; border-radius: 11px;
  background: rgba(var(--accent-rgb),0.12); border: 0.5px solid rgba(var(--accent-rgb),0.3);
  display: flex; align-items: center; justify-content: center;
  color: var(--orange2); margin-bottom: 16px;
}
.lp-pcard-icon-badge-accent { background: rgba(var(--blue-rgb),0.15); border-color: rgba(var(--blue-rgb),0.4); color: var(--blue); }
.lp-pcard-popular {
  position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
  background: var(--btn); color: var(--btn-text); font-size: 10px; font-weight: 700;
  letter-spacing: 1px; text-transform: uppercase; padding: 4px 14px; border-radius: 20px; white-space: nowrap;
}
.lp-pcard-tier { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted); margin-bottom: 12px; }
.lp-pcard-featured .lp-pcard-tier { color: var(--blue2); }
.lp-pcard-price { font-family: "Space Grotesk", sans-serif; font-size: 38px; font-weight: 800; margin-bottom: 4px; line-height: 1; }
.lp-pcard-featured .lp-pcard-price { color: var(--accent); }
.lp-pcard-price span { font-family: "Exo 2", sans-serif; font-size: 14px; font-weight: 400; color: var(--muted); }
.lp-pcard-note { font-size: 12px; color: var(--muted); margin-bottom: 24px; margin-top: 6px; }
.lp-pcard-items { list-style: none; display: flex; flex-direction: column; gap: 10px; flex: 1; margin-bottom: 24px; }
.lp-pcard-items li { font-size: 13px; color: var(--body); display: flex; align-items: center; gap: 8px; }
.lp-pcard-btn {
  background: var(--btn); color: var(--btn-text); font-size: 14px; font-weight: 600;
  padding: 12px; border-radius: 10px; border: none; cursor: pointer;
  font-family: "Exo 2", sans-serif; width: 100%;
  position: relative; overflow: hidden; transition: box-shadow 0.3s, transform 0.2s;
}
.lp-pcard-btn::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(160deg, var(--g1) 0%, var(--accent) 45%, var(--g2) 80%, var(--g3) 100%);
  opacity: 0; transition: opacity 0.35s;
}
.lp-pcard-btn:hover::before { opacity: 1; }
.lp-pcard-btn:hover { box-shadow: 0 0 18px rgba(var(--accent-rgb),0.55), 0 0 40px rgba(255,100,0,0.2); transform: translateY(-1px); }
.lp-pcard-btn span, .lp-pcard-btn-ghost span { position: relative; z-index: 1; }
.lp-pcard-btn-ghost {
  background: transparent; color: var(--text-strong); border: 0.5px solid rgba(var(--ink),0.2);
  position: relative; overflow: hidden; transition: border-color 0.3s, box-shadow 0.3s, transform 0.2s;
}
.lp-pcard-btn-ghost::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(160deg, rgba(var(--accent2-rgb),0.15) 0%, rgba(var(--accent-rgb),0.2) 50%, rgba(var(--accent-rgb),0.15) 100%);
  opacity: 0; transition: opacity 0.35s;
}
.lp-pcard-btn-ghost:hover::before { opacity: 1; }
.lp-pcard-btn-ghost:hover { border-color: rgba(var(--accent-rgb),0.5); box-shadow: 0 0 14px rgba(var(--accent-rgb),0.2); transform: translateY(-1px); }

.lp-tick { color: var(--blue); flex-shrink: 0; }
.lp-cross { color: var(--faint); flex-shrink: 0; }

/* SCROLL REVEAL */
.lp-reveal { opacity: 0; transform: translateY(28px); transition: opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1); }
.lp-reveal.lp-in { opacity: 1; transform: translateY(0); }
.lp-mod, .lp-bcard { opacity: 0; transform: translateY(20px); transition: opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1), border-color 0.25s, box-shadow 0.25s; }
.lp-reveal.lp-in .lp-mod, .lp-reveal.lp-in .lp-bcard { opacity: 1; transform: translateY(0); }

/* BRANCHEN-PAKETE */
.lp-branchen-section { padding: 0 0 64px; }
.lp-branchen-panel {
  max-width: none; margin: 0 auto; position: relative; overflow: hidden;
  background: linear-gradient(160deg, rgba(var(--accent-rgb),0.06), var(--card2) 55%);
  border: 0.5px solid rgba(var(--ink),0.08);
  border-radius: 28px;
  padding: 48px 40px;
}
.lp-branchen-panel::before {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse 60% 50% at 15% 0%, rgba(var(--blue-rgb),0.10), transparent 70%);
}
.lp-branchen-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 20px; position: relative; z-index: 1; }
@media (max-width: 1180px) { .lp-branchen-grid { grid-template-columns: repeat(2,1fr); } }
.lp-bcard {
  background: rgba(var(--ink),0.02); border: 0.5px solid rgba(var(--ink),0.08);
  border-radius: 18px; padding: 26px 22px; display: flex; flex-direction: column;
  transition: border-color 0.25s, transform 0.2s, box-shadow 0.25s;
}
.lp-bcard:hover { border-color: rgba(var(--accent-rgb),0.45); transform: translateY(-3px); box-shadow: 0 12px 28px rgba(var(--shadow),0.35); }
.lp-bcard-icon {
  width: 44px; height: 44px; border-radius: 12px;
  background: rgba(var(--accent-rgb),0.12); border: 0.5px solid rgba(var(--accent-rgb),0.3);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; color: var(--accent); margin-bottom: 16px;
}
.lp-bcard-name { font-family: "Space Grotesk", sans-serif; font-size: 16px; font-weight: 700; margin-bottom: 6px; }
.lp-bcard-desc { font-size: 12.5px; color: var(--muted); line-height: 1.5; margin-bottom: 16px; }
.lp-bcard-features { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px; flex: 1; align-content: flex-start; }
.lp-bcard-chip { font-size: 11px; color: var(--muted2); background: rgba(var(--ink),0.04); border: 0.5px solid rgba(var(--ink),0.08); border-radius: 6px; padding: 3px 9px; }
.lp-bcard-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 16px; border-top: 0.5px solid rgba(var(--ink),0.07); }
.lp-bcard-price { font-family: "Space Grotesk", sans-serif; font-size: 20px; font-weight: 800; color: var(--text-strong); }
.lp-bcard-price span { font-family: "Exo 2", sans-serif; font-size: 12px; font-weight: 400; color: var(--muted); }
.lp-bcard-btn {
  background: transparent; color: var(--text-strong); border: 0.5px solid rgba(var(--ink),0.25);
  border-radius: 20px; padding: 8px 16px; font-size: 12px; font-weight: 600; cursor: pointer;
  font-family: "Exo 2", sans-serif; transition: all 0.2s; white-space: nowrap;
}
.lp-bcard-btn:hover { background: var(--btn); border-color: var(--btn); color: var(--btn-text); }
.lp-branchen-note { text-align: center; font-size: 12px; color: var(--faint2); margin-top: 28px; display: flex; align-items: center; justify-content: center; gap: 6px; }

/* FOOTER CTA */
.lp-footer-cta { text-align: center; padding: 64px 0; border-top: 0.5px solid rgba(var(--ink),0.07); }
.lp-h2 { font-family: "Space Grotesk", sans-serif; font-size: 32px; font-weight: 800; margin-bottom: 12px; letter-spacing: -0.5px; }
.lp-footer-cta p { font-size: 14px; color: var(--muted); margin-bottom: 28px; }

/* FOOTER */
.lp-footer {
  border-top: 0.5px solid rgba(var(--ink),0.07);
  background: var(--footer-bg);
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
  color: var(--faint);
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
  color: var(--muted);
  text-decoration: none;
  transition: color .15s;
}
.lp-footer-link:hover { color: var(--text-strong); }
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
  color: var(--muted);
  text-decoration: none;
  transition: color .15s;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.lp-made-by:hover { color: var(--text-strong); }
.lp-heart {
  color: var(--accent);
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
  color: var(--faint3);
}

@media (max-width: 900px) {
  .lp .lp-wrap { padding-left: 24px; padding-right: 24px; }
  .lp-branchen-grid { grid-template-columns: 1fr; }
  .lp-branchen-panel { padding: 36px 24px; }
}

@media (max-width: 640px) {
  .lp .lp-wrap { padding-left: 20px; padding-right: 20px; }
  .lp-testi-slide { padding: 28px 24px 24px; }
  .lp-testi-quote { font-size: 14px; }
  .lp-footer-inner { grid-template-columns: 1fr; }
  .lp-footer-right { align-items: flex-start; }
  .lp-modules-grid { grid-template-columns: repeat(2,1fr); }
  .lp-pricing-grid { grid-template-columns: 1fr; }
  .lp-compare-grid { grid-template-columns: 1fr; }
  .lp-branchen-panel { padding: 28px 18px; border-radius: 20px; }
  .lp-stats-row { grid-template-columns: repeat(2,1fr); gap: 24px 16px; }
}
</style>
