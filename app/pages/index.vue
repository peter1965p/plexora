<template>
  <div class="lp">
    <!-- NAV -->
    <nav class="lp-nav">
      <div class="lp-wrap" style="display:flex;align-items:center;justify-content:space-between">
        <div class="lp-logo">Plexo<span>ra</span></div>
        <div style="display:flex;gap:8px;align-items:center">
          <NuxtLink v-for="p in navPages" :key="p.slug" :to="`/p/${p.slug}`" style="text-decoration:none">
            <button class="lp-btn-ghost" style="font-size:13px">{{ p.navLabel || p.title }}</button>
          </NuxtLink>
          <NuxtLink to="/impressum" style="text-decoration:none">
            <button class="lp-btn-ghost" style="font-size:13px">Impressum</button>
          </NuxtLink>
          <NuxtLink to="/datenschutz" style="text-decoration:none">
            <button class="lp-btn-ghost" style="font-size:13px">Datenschutz</button>
          </NuxtLink>
          <NuxtLink to="/agb" style="text-decoration:none">
            <button class="lp-btn-ghost" style="font-size:13px">AGB</button>
          </NuxtLink>
          <button class="lp-btn-ghost" @click="navigateTo('/login')">Anmelden</button>
          <button class="lp-btn-demo" @click="startDemo" :disabled="demoLoading">
            {{ demoLoading ? '...' : 'Demo starten ↗' }}
          </button>
          <button class="lp-btn" @click="scrollTo('#pricing')">Preise</button>
        </div>
      </div>
    </nav>

    <!-- HERO -->
    <section class="lp-hero">
      <canvas ref="networkRef" class="lp-network"></canvas>
      <div class="lp-wrap lp-hero-inner">
        <div class="lp-eyebrow">Business Platform</div>
        <h1 class="lp-h1">
          Eine Lizenz.<br /><span class="lp-hl">Alles drin.</span>
        </h1>
        <p class="lp-sub">
          Warum 100+ Lizenzen zahlen,<br />wenn es die eine für alles gibt?
        </p>
        <div class="lp-ctas">
          <button class="lp-btn lp-btn-lg" @click="startDemo" :disabled="demoLoading">
            {{ demoLoading ? 'Wird geladen...' : 'Demo ausprobieren ↗' }}
          </button>
          <button class="lp-btn-ghost lp-btn-lg" @click="scrollTo('#pricing')">
            Preise ansehen
          </button>
        </div>
        <!-- Demo Credentials -->
        <div class="lp-demo-hint">
          <i class="ti ti-user-circle"></i>
          Demo-Zugang: <strong>demo@plexora.eu</strong> · <strong>Demo1234!</strong>
        </div>
      </div>
    </section>

    <!-- MODULE GRID -->
    <section class="lp-wrap lp-modules-section" id="modules">
      <div class="lp-section-label">Klicken Sie ein Modul an</div>
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
          <span v-if="mod.on" class="lp-mod-badge">Aktiv</span>
        </div>
      </div>
    </section>

    <!-- SAVINGS -->
    <section class="lp-wrap" id="savings">
      <div class="lp-savings">
        <div class="lp-savings-label">Ihre monatliche Ersparnis</div>
        <div class="lp-savings-row">
          <div class="lp-savings-num">{{ formatNum(savings) }} €</div>
          <div class="lp-savings-unit">
            / Monat<br /><span>gegenüber Einzeltools</span>
          </div>
        </div>
        <div class="lp-savings-sub">
          Statt <strong>{{ formatNum(oldCost) }} €</strong> für Einzellizenzen
          zahlen Sie nur <strong>{{ formatNum(newCost) }} €</strong> mit Plexora
        </div>
        <div class="lp-slider-row">
          <label>Nutzer</label>
          <input type="range" min="5" max="200" step="5" v-model="users" />
          <span>{{ users }}</span>
        </div>
      </div>
    </section>

    <!-- COMPARE -->
    <section class="lp-wrap lp-compare-section">
      <h2 class="lp-section-title">Plexora vs. der Tool-Zoo</h2>
      <div class="lp-compare-grid">
        <div class="lp-ccard">
          <div class="lp-ccard-tag">Bisherige Lösung</div>
          <div class="lp-ccard-name">Einzeltools</div>
          <div class="lp-ccard-price">8–12 <span>Tools</span></div>
          <div class="lp-ccard-note">Jedes mit eigener Lizenz & Login</div>
          <ul class="lp-ccard-items">
            <li><i class="ti ti-x lp-cross"></i>Daten über mehrere Systeme verteilt</li>
            <li><i class="ti ti-x lp-cross"></i>Integrationen brechen regelmäßig</li>
            <li><i class="ti ti-x lp-cross"></i>Separate Verträge & Rechnungen</li>
            <li><i class="ti ti-x lp-cross"></i>Kein einheitliches Reporting</li>
          </ul>
        </div>
        <div class="lp-ccard lp-ccard-featured">
          <div class="lp-ccard-tag">Empfohlen</div>
          <div class="lp-ccard-name">Plexora</div>
          <div class="lp-ccard-price lp-price-accent">1 <span>Plattform</span></div>
          <div class="lp-ccard-note">Eine Lizenz, alle Module inklusive</div>
          <ul class="lp-ccard-items">
            <li><i class="ti ti-check lp-tick"></i>Alle Daten zentral & verknüpft</li>
            <li><i class="ti ti-check lp-tick"></i>Module greifen nahtlos ineinander</li>
            <li><i class="ti ti-check lp-tick"></i>Ein Vertrag, eine Rechnung</li>
            <li><i class="ti ti-check lp-tick"></i>Unternehmensweites Dashboard</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- TESTIMONIAL -->
    <section class="lp-wrap">
      <div class="lp-testi">
        <div class="lp-testi-quote">
          „Wir haben Salesforce, Jira, Personio und Lexoffice gekündigt. Plexora
          macht das alles – und unsere Buchhalterin musste sich nur einmal neu
          einarbeiten."
        </div>
        <div class="lp-testi-author">
          <strong>Markus T.</strong>, CTO · Münchner SaaS-Startup, 60 Mitarbeiter
        </div>
      </div>
    </section>

    <!-- PRICING -->
    <section class="lp-wrap lp-pricing-section" id="pricing">
      <div class="lp-section-label">Transparente Preise</div>
      <h2 class="lp-section-title" style="text-align:center;margin-bottom:8px">Wählen Sie Ihr Paket</h2>
      <p style="text-align:center;font-size:14px;color:#8b8fa8;margin-bottom:40px">Monatlich kündbar. Keine Einrichtungsgebühr. Keine versteckten Kosten.</p>
      <div class="lp-pricing-grid">

        <!-- Starter -->
        <div class="lp-pcard">
          <div class="lp-pcard-tier">Starter</div>
          <div class="lp-pcard-price">49 <span>€ / Monat</span></div>
          <div style="font-size:11px;color:#545870;margin-bottom:2px">zzgl. MwSt.</div>
          <div class="lp-pcard-note">Für Einzelunternehmer & kleine Teams</div>
          <ul class="lp-pcard-items">
            <li><i class="ti ti-check lp-tick"></i>CRM</li>
            <li><i class="ti ti-check lp-tick"></i>Support-Tickets</li>
            <li><i class="ti ti-check lp-tick"></i>Kunden-Portal</li>
            <li style="color:#545870"><i class="ti ti-minus" style="color:#545870"></i>Finanzen & Rechnungen</li>
            <li style="color:#545870"><i class="ti ti-minus" style="color:#545870"></i>Projekte & HR</li>
          </ul>
          <button class="lp-pcard-btn lp-pcard-btn-ghost" @click="navigateTo('/kaufen')"><span>Jetzt starten</span></button>
        </div>

        <!-- Pro -->
        <div class="lp-pcard lp-pcard-featured">
          <div class="lp-pcard-popular">Beliebteste Wahl</div>
          <div class="lp-pcard-tier">Pro</div>
          <div class="lp-pcard-price">149 <span>€ / Monat</span></div>
          <div style="font-size:11px;color:#545870;margin-bottom:2px">zzgl. MwSt.</div>
          <div class="lp-pcard-note">Für wachsende Unternehmen</div>
          <ul class="lp-pcard-items">
            <li><i class="ti ti-check lp-tick"></i>CRM + Support</li>
            <li><i class="ti ti-check lp-tick"></i>Finanzen & Rechnungen</li>
            <li><i class="ti ti-check lp-tick"></i>Projekte & Verträge</li>
            <li><i class="ti ti-check lp-tick"></i>HR & Analytics</li>
            <li><i class="ti ti-check lp-tick"></i>Shop, Pagebuilder, Formulare</li>
          </ul>
          <button class="lp-pcard-btn" @click="navigateTo('/kaufen')"><span>Jetzt starten</span></button>
        </div>

        <!-- Enterprise -->
        <div class="lp-pcard">
          <div class="lp-pcard-tier">Enterprise</div>
          <div class="lp-pcard-price">299 <span>€ / Monat</span></div>
          <div style="font-size:11px;color:#545870;margin-bottom:2px">zzgl. MwSt.</div>
          <div class="lp-pcard-note">Für Teams mit vollem Funktionsumfang</div>
          <ul class="lp-pcard-items">
            <li><i class="ti ti-check lp-tick"></i>Alles aus Pro</li>
            <li><i class="ti ti-check lp-tick"></i>Marketing-Suite</li>
            <li><i class="ti ti-check lp-tick"></i>UTM-Tracking & QR-Codes</li>
            <li><i class="ti ti-check lp-tick"></i>Lead-Kampagnen</li>
            <li><i class="ti ti-check lp-tick"></i>Prioritäts-Support</li>
          </ul>
          <button class="lp-pcard-btn lp-pcard-btn-ghost" @click="navigateTo('/kaufen')"><span>Jetzt starten</span></button>
        </div>

      </div>
    </section>

    <!-- FOOTER CTA -->
    <section class="lp-wrap lp-footer-cta">
      <h2 class="lp-h2">Überzeugen Sie sich selbst.</h2>
      <p>Demo-Zugang sofort verfügbar — kein Account nötig.</p>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <button class="lp-btn lp-btn-lg" @click="startDemo" :disabled="demoLoading">
          {{ demoLoading ? 'Wird geladen...' : 'Demo starten ↗' }}
        </button>
        <button class="lp-btn-ghost lp-btn-lg" @click="scrollTo('#pricing')">Preise ansehen</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const users = ref(25)
const demoLoading = ref(false)

const modules = reactive([
  { key: 'crm',       name: 'CRM',       icon: 'ti-users',         desc: 'Kontakte, Pipelines, Deals',        on: true,  cost: 45 },
  { key: 'projects',  name: 'Projekte',   icon: 'ti-layout-kanban', desc: 'Kanban, Meilensteine, Teams',       on: true,  cost: 35 },
  { key: 'finance',   name: 'Finanzen',   icon: 'ti-receipt',       desc: 'Rechnungen, Ausgaben, Berichte',    on: true,  cost: 55 },
  { key: 'hr',        name: 'HR',         icon: 'ti-id-badge',      desc: 'Mitarbeiter, Urlaub, Lohnbuch.',    on: false, cost: 40 },
  { key: 'support',   name: 'Support',    icon: 'ti-headset',       desc: 'Tickets, SLA, Wissensbasis',        on: false, cost: 30 },
  { key: 'analytics', name: 'Analytics',  icon: 'ti-chart-dots',    desc: 'Dashboards, KPIs, Exports',         on: false, cost: 25 },
])

const activeCost = computed(() => modules.filter(m => m.on).reduce((s, m) => s + m.cost, 0))
const oldCost    = computed(() => Math.round((users.value * activeCost.value * 0.85) / 10) * 10)
const newCost    = computed(() => Math.round((users.value * 34) / 10) * 10)
const savings    = computed(() => Math.max(0, oldCost.value - newCost.value))

const formatNum = (n: number) => n.toLocaleString('de-DE')

function scrollTo(selector: string) {
  document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth' })
}

async function startDemo() {
  demoLoading.value = true
  try {
    const { signIn, signOut, getCurrentUser } = await import('aws-amplify/auth')
    try {
      const current = await getCurrentUser()
      if (current.username !== 'demo-plexora') {
        await signOut()
        await signIn({ username: 'demo@plexora.eu', password: 'Demo1234!' })
      }
    } catch {
      await signIn({ username: 'demo@plexora.eu', password: 'Demo1234!' })
    }
    await navigateTo('/dashboard')
  } catch {
    demoLoading.value = false
    await navigateTo('/login')
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

  const nodes = Array.from({ length: 55 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    r: Math.random() * 1.5 + 0.5,
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
          ctx.strokeStyle = `rgba(234,88,12,${(1 - d/MAX_DIST) * 0.25})`
          ctx.lineWidth = 0.6
          ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke()
        }
      }
    }
    for (const n of nodes) {
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI*2)
      ctx.fillStyle = 'rgba(234,88,12,0.55)'; ctx.fill()
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
</script>

<style scoped>
@import url("https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css");

.lp {
  background: #0a0e1a;
  background-image:
    radial-gradient(ellipse 70% 45% at 50% -5%, rgba(234,88,12,0.13) 0%, transparent 70%),
    linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
  background-size: 100% 100%, 52px 52px, 52px 52px;
  color: #f0eef9;
  font-family: "Exo 2", sans-serif;
  min-height: 100vh;
}

/* NETWORK CANVAS */
.lp-network {
  position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0;
}
.lp-wrap { max-width: 1100px; margin: 0 auto; padding: 0 32px; }

/* NAV */
.lp-nav {
  border-bottom: 0.5px solid rgba(255,255,255,0.07);
  padding: 20px 0;
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(10,14,26,0.88);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
.lp-nav .lp-wrap { display: flex; align-items: center; justify-content: space-between; }
.lp-logo { font-family: "Space Grotesk", sans-serif; font-weight: 800; font-size: 22px; letter-spacing: -0.5px; }
.lp-logo span {
  background: linear-gradient(160deg, #ffb347 0%, #ea580c 50%, #c2390a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

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
  background: rgba(0,212,180,0.12); color: #00d4b4; font-size: 14px; font-weight: 500;
  padding: 10px 22px; border-radius: 40px; border: 0.5px solid rgba(0,212,180,0.35);
  cursor: pointer; font-family: "Exo 2", sans-serif; transition: background 0.2s;
}
.lp-btn-demo:hover { background: rgba(0,212,180,0.2); }
.lp-btn-demo:disabled { opacity: 0.5; cursor: not-allowed; }

/* HERO */
.lp-hero { padding: 80px 0 64px; position: relative; overflow: hidden; }
.lp-hero-inner { text-align: center; position: relative; z-index: 1; }
.lp-eyebrow {
  display: inline-block; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
  color: #00d4b4; margin-bottom: 20px; font-weight: 500;
}
.lp-h1 {
  font-family: "Roboto", sans-serif;
  font-size: 64px;
  font-weight: 900;
  line-height: 1.08;
  letter-spacing: -2px;
  margin-bottom: 16px;
  background: linear-gradient(160deg, #ffffff 0%, #e0e0e0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.lp-hl {
  background: linear-gradient(160deg, #ffb347 0%, #ea580c 45%, #c2390a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.lp-sub { font-size: 18px; color: #8b8fa8; margin-bottom: 36px; line-height: 1.5; }
.lp-ctas { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 20px; }
.lp-demo-hint {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 12px; color: #8b8fa8; margin-top: 8px;
  background: rgba(255,255,255,0.04); border: 0.5px solid rgba(255,255,255,0.08);
  border-radius: 20px; padding: 6px 16px;
}
.lp-demo-hint strong { color: #f0eef9; }
.lp-demo-hint .ti { color: #00d4b4; }

/* MODULES */
.lp-modules-section { padding: 48px 0; }
.lp-section-label { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #8b8fa8; text-align: center; margin-bottom: 24px; }
.lp-modules-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
.lp-mod {
  background: #13182a; border: 0.5px solid rgba(255,255,255,0.07); border-radius: 12px;
  padding: 20px 18px; cursor: pointer; transition: border-color 0.25s, transform 0.18s; position: relative;
}
.lp-mod:hover { border-color: #ea580c; transform: translateY(-2px); }
.lp-mod.active { border-color: #00d4b4; background: rgba(0,212,180,0.05); }
.lp-mod-icon { font-size: 22px; color: #ea580c; margin-bottom: 10px; display: block; }
.lp-mod.active .lp-mod-icon { color: #00d4b4; }
.lp-mod-name { font-family: "Space Grotesk", sans-serif; font-size: 14px; font-weight: 700; margin-bottom: 4px; }
.lp-mod-desc { font-size: 12px; color: #8b8fa8; line-height: 1.5; }
.lp-mod-badge {
  position: absolute; top: 12px; right: 12px; font-size: 9px; letter-spacing: 1px;
  text-transform: uppercase; background: rgba(0,212,180,0.15); color: #00d4b4;
  padding: 2px 8px; border-radius: 20px;
}

/* SAVINGS */
.lp-savings {
  background: #13182a; border: 0.5px solid rgba(108,63,232,0.25);
  border-radius: 16px; padding: 32px; margin: 0 0 48px; text-align: center;
}
.lp-savings-label { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #8b8fa8; margin-bottom: 16px; }
.lp-savings-row { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 16px; }
.lp-savings-num { font-family: "Space Grotesk", sans-serif; font-size: 48px; font-weight: 800; color: #00d4b4; line-height: 1; }
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
.lp-compare-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.lp-ccard { background: #13182a; border: 0.5px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 24px; }
.lp-ccard-featured { border-color: #ea580c; border-width: 1.5px; }
.lp-ccard-tag { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: #8b8fa8; margin-bottom: 8px; }
.lp-ccard-featured .lp-ccard-tag { color: #00d4b4; }
.lp-ccard-name { font-family: "Space Grotesk", sans-serif; font-size: 18px; font-weight: 700; margin-bottom: 6px; }
.lp-ccard-price { font-family: "Space Grotesk", sans-serif; font-size: 32px; font-weight: 800; margin-bottom: 4px; color: #8b8fa8; }
.lp-ccard-price span { font-size: 16px; font-weight: 400; }
.lp-price-accent { color: #ea580c; }
.lp-ccard-note { font-size: 12px; color: #8b8fa8; margin-bottom: 20px; }
.lp-ccard-items { display: flex; flex-direction: column; gap: 10px; list-style: none; }
.lp-ccard-items li { font-size: 13px; color: #8b8fa8; display: flex; align-items: center; gap: 8px; }

/* TESTIMONIAL */
.lp-testi {
  border-left: 2px solid #ea580c; padding: 16px 24px; margin: 0 0 48px;
  background: rgba(108,63,232,0.06); border-radius: 0 12px 12px 0;
}
.lp-testi-quote { font-size: 15px; color: #f0eef9; line-height: 1.7; margin-bottom: 10px; font-style: italic; }
.lp-testi-author { font-size: 12px; color: #8b8fa8; }

/* PRICING */
.lp-pricing-section { padding: 0 0 64px; }
.lp-pricing-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; }
.lp-pcard {
  background: #13182a; border: 0.5px solid rgba(255,255,255,0.07);
  border-radius: 16px; padding: 28px 24px; display: flex; flex-direction: column; gap: 0; position: relative;
}
.lp-pcard-featured {
  border-color: #ea580c; border-width: 1.5px;
  background: linear-gradient(160deg, rgba(108,63,232,0.1), #13182a);
}
.lp-pcard-popular {
  position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
  background: #ea580c; color: #fff; font-size: 10px; font-weight: 700;
  letter-spacing: 1px; text-transform: uppercase; padding: 4px 14px; border-radius: 20px; white-space: nowrap;
}
.lp-pcard-tier { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #8b8fa8; margin-bottom: 12px; }
.lp-pcard-featured .lp-pcard-tier { color: #a78bfa; }
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
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(160deg, #ffb347 0%, #ea580c 45%, #ff3d00 80%, #c2390a 100%);
  opacity: 0;
  transition: opacity 0.35s;
}
.lp-pcard-btn:hover::before { opacity: 1; }
.lp-pcard-btn:hover {
  box-shadow: 0 0 18px rgba(234,88,12,0.55), 0 0 40px rgba(255,100,0,0.2);
  transform: translateY(-1px);
}
.lp-pcard-btn span, .lp-pcard-btn-ghost span { position: relative; z-index: 1; }

.lp-pcard-btn-ghost {
  background: transparent; color: #f0eef9; border: 0.5px solid rgba(240,238,249,0.2);
  position: relative; overflow: hidden; transition: border-color 0.3s, box-shadow 0.3s, transform 0.2s;
}
.lp-pcard-btn-ghost::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(160deg, rgba(255,179,71,0.15) 0%, rgba(234,88,12,0.2) 50%, rgba(194,57,10,0.15) 100%);
  opacity: 0;
  transition: opacity 0.35s;
}
.lp-pcard-btn-ghost:hover::before { opacity: 1; }
.lp-pcard-btn-ghost:hover {
  border-color: rgba(234,88,12,0.5);
  box-shadow: 0 0 14px rgba(234,88,12,0.2);
  transform: translateY(-1px);
}

/* SHARED */
.lp-tick { color: #00d4b4; font-size: 15px; }
.lp-cross { color: #545870; font-size: 15px; }

/* FOOTER CTA */
.lp-footer-cta { text-align: center; padding: 64px 0; border-top: 0.5px solid rgba(255,255,255,0.07); }
.lp-h2 { font-family: "Space Grotesk", sans-serif; font-size: 32px; font-weight: 800; margin-bottom: 12px; letter-spacing: -0.5px; }
.lp-footer-cta p { font-size: 14px; color: #8b8fa8; margin-bottom: 28px; }
</style>
