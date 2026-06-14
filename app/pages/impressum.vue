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
          <button style="padding:6px 16px;border-radius:8px;border:none;background:none;color:var(--accent);cursor:pointer;font-size:13px;font-weight:600">
            Impressum
          </button>
        </NuxtLink>
        <NuxtLink to="/datenschutz" style="text-decoration:none">
          <button style="padding:6px 16px;border-radius:8px;border:none;background:none;color:var(--text-muted);cursor:pointer;font-size:13px;font-weight:500;transition:color 0.15s"
            @mouseenter="e => e.currentTarget.style.color='var(--text-primary)'"
            @mouseleave="e => e.currentTarget.style.color='var(--text-muted)'">
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
      <h1 style="font-size:36px;font-weight:800;margin:0 0 40px">Impressum</h1>

      <section style="margin-bottom:32px">
        <h2 style="font-size:18px;font-weight:700;margin:0 0 12px">Angaben gemäß § 5 TMG</h2>
        <p style="font-size:15px;line-height:1.8;color:var(--text-muted);margin:0">
          {{ company.legalName }}<br />
          <template v-if="company.representedBy">{{ company.representedBy }}<br /></template>
          {{ company.street }}<br />
          {{ company.zipCity }}<br />
          {{ company.country }}
        </p>
      </section>

      <section v-if="company.email || company.phone" style="margin-bottom:32px">
        <h2 style="font-size:18px;font-weight:700;margin:0 0 12px">Kontakt</h2>
        <p style="font-size:15px;line-height:1.8;color:var(--text-muted);margin:0">
          <template v-if="company.phone">Telefon: {{ company.phone }}<br /></template>
          <template v-if="company.email">E-Mail: <a :href="`mailto:${company.email}`" style="color:var(--accent)">{{ company.email }}</a></template>
        </p>
      </section>

      <section v-if="company.vatId" style="margin-bottom:32px">
        <h2 style="font-size:18px;font-weight:700;margin:0 0 12px">Umsatzsteuer-ID</h2>
        <p style="font-size:15px;line-height:1.8;color:var(--text-muted);margin:0">
          Umsatzsteuer-Identifikationsnummer gemäß §27a Umsatzsteuergesetz:<br />
          {{ company.vatId }}
        </p>
      </section>

      <section v-if="company.register" style="margin-bottom:32px">
        <h2 style="font-size:18px;font-weight:700;margin:0 0 12px">Registereintrag</h2>
        <p style="font-size:15px;line-height:1.8;color:var(--text-muted);margin:0">
          {{ company.register }}<br />
          <template v-if="company.registerCourt">{{ company.registerCourt }}</template>
        </p>
      </section>

      <section style="margin-bottom:32px">
        <h2 style="font-size:18px;font-weight:700;margin:0 0 12px">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
        <p style="font-size:15px;line-height:1.8;color:var(--text-muted);margin:0">
          {{ company.representedBy || company.legalName }}<br />
          {{ company.street }}<br />
          {{ company.zipCity }}
        </p>
      </section>

      <section style="margin-bottom:32px">
        <h2 style="font-size:18px;font-weight:700;margin:0 0 12px">Haftung für Inhalte</h2>
        <p style="font-size:14px;line-height:1.8;color:var(--text-muted);margin:0">
          Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
        </p>
      </section>

      <section style="margin-bottom:32px">
        <h2 style="font-size:18px;font-weight:700;margin:0 0 12px">Haftung für Links</h2>
        <p style="font-size:14px;line-height:1.8;color:var(--text-muted);margin:0">
          Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
        </p>
      </section>

      <section>
        <h2 style="font-size:18px;font-weight:700;margin:0 0 12px">Urheberrecht</h2>
        <p style="font-size:14px;line-height:1.8;color:var(--text-muted);margin:0">
          Die durch den Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
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

const company = reactive({
  legalName: '', representedBy: '', street: '', zipCity: '', country: 'Deutschland',
  email: '', phone: '', vatId: '', register: '', registerCourt: ''
})

const { data } = await useFetch(useApiUrl('/api/settings/company'))
if ((data.value as any)?.company) Object.assign(company, (data.value as any).company)

const { data: pagesData } = await useFetch(useApiUrl('/api/pages'))
const navPages = computed(() =>
  ((pagesData.value as any)?.pages || [])
    .filter((p: any) => p.inNav && p.status === 'published' && p.slug !== 'impressum')
    .sort((a: any, b: any) => a.navLabel?.localeCompare(b.navLabel))
)
</script>
