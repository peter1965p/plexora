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
          <button style="padding:6px 16px;border-radius:8px;border:none;background:none;color:var(--text-muted);cursor:pointer;font-size:13px;font-weight:500;transition:color 0.15s"
            @mouseenter="e => e.currentTarget.style.color='var(--text-primary)'"
            @mouseleave="e => e.currentTarget.style.color='var(--text-muted)'">
            Datenschutz
          </button>
        </NuxtLink>
        <NuxtLink to="/agb" style="text-decoration:none">
          <button style="padding:6px 16px;border-radius:8px;border:none;background:none;color:var(--accent);cursor:pointer;font-size:13px;font-weight:600">
            AGB
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
    <div style="max-width:900px;margin:0 auto;padding:60px 24px 100px">
      <h1 style="font-size:36px;font-weight:800;margin:0 0 8px">Allgemeine Geschäftsbedingungen</h1>

      <div v-if="agb?.url" style="margin-top:24px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <p style="font-size:13px;color:var(--text-muted);margin:0">
            Stand: {{ agb.uploaded ? new Date(agb.uploaded).toLocaleDateString('de-DE') : '' }}
          </p>
          <a :href="agb.url" target="_blank" style="text-decoration:none">
            <button style="padding:6px 16px;border-radius:8px;border:0.5px solid var(--border);background:none;color:var(--text-muted);cursor:pointer;font-size:13px">
              <i class="ti ti-download"></i> PDF herunterladen
            </button>
          </a>
        </div>
        <div style="border:0.5px solid var(--border);border-radius:12px;overflow:hidden;background:var(--bg-surface)">
          <iframe :src="agb.url" style="width:100%;height:80vh;border:none;display:block"></iframe>
        </div>
      </div>

      <div v-else style="text-align:center;padding:80px 24px;color:var(--text-muted)">
        <i class="ti ti-file-off" style="font-size:64px;display:block;margin-bottom:16px"></i>
        <p>Aktuell ist kein AGB-Dokument hinterlegt.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const { branding, loadBranding } = useBranding()
const brandFirst = computed(() => branding.value.brandName.slice(0, -1))
const brandLast  = computed(() => branding.value.brandName.slice(-1))
onMounted(() => loadBranding())

const { data } = await useFetch(useApiUrl('/api/settings/agb'))
const agb = computed(() => (data.value as any)?.agb)

const { data: pagesData } = await useFetch(useApiUrl('/api/pages'))
const navPages = computed(() =>
  ((pagesData.value as any)?.pages || [])
    .filter((p: any) => p.inNav && p.status === 'published' && ['impressum','datenschutz','agb'].indexOf(p.slug) === -1)
    .sort((a: any, b: any) => (a.navLabel || '').localeCompare(b.navLabel || ''))
)
</script>
