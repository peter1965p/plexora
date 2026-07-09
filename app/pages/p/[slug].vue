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
            :style="currentSlug===p.slug ? 'color:var(--accent)' : ''"
            @mouseenter="e => e.currentTarget.style.color='var(--text-primary)'"
            @mouseleave="e => e.currentTarget.style.color=currentSlug===p.slug ? 'var(--accent)' : 'var(--text-muted)'">
            {{ p.navLabel || p.title }}
          </button>
        </NuxtLink>
        <NuxtLink to="/login">
          <button style="padding:6px 16px;border-radius:8px;border:0.5px solid var(--border);background:none;color:var(--text-muted);cursor:pointer;font-size:13px">Anmelden</button>
        </NuxtLink>
      </div>
    </nav>

    <!-- Page not found -->
    <div v-if="!page" style="text-align:center;padding:120px 24px;color:var(--text-muted)">
      <i class="ti ti-file-off" style="font-size:64px;display:block;margin-bottom:16px"></i>
      <h2>Seite nicht gefunden</h2>
      <NuxtLink to="/"><button class="accent-btn" style="margin-top:16px">Zurück zur Startseite</button></NuxtLink>
    </div>

    <!-- Blocks Renderer -->
    <div v-else>
      <div v-for="block in page.blocks" :key="block.id">

        <!-- Hero -->
        <div v-if="block.type==='hero'" style="text-align:center;padding:100px 24px;max-width:800px;margin:0 auto">
          <h1 style="font-size:48px;font-weight:800;margin:0 0 16px;line-height:1.1">{{ block.data.headline }}</h1>
          <p style="font-size:18px;color:var(--text-muted);margin:0 0 32px">{{ block.data.subline }}</p>
          <NuxtLink v-if="block.data.btnUrl" :to="block.data.btnUrl">
            <button class="accent-btn" style="height:48px;font-size:16px;padding:0 32px">{{ block.data.btnText }}</button>
          </NuxtLink>
        </div>

        <!-- Text -->
        <div v-if="block.type==='text'" style="max-width:800px;margin:0 auto;padding:60px 24px">
          <h2 v-if="block.data.heading" style="font-size:28px;font-weight:700;margin:0 0 20px">{{ block.data.heading }}</h2>
          <p style="font-size:16px;line-height:1.8;color:var(--text-muted);white-space:pre-wrap">{{ block.data.body }}</p>
        </div>

        <!-- Bild -->
        <div v-if="block.type==='image'" style="max-width:1000px;margin:0 auto;padding:40px 24px;text-align:center">
          <img :src="block.data.url" :alt="block.data.caption" style="width:100%;border-radius:16px;border:0.5px solid var(--border)" />
          <p v-if="block.data.caption" style="font-size:13px;color:var(--text-muted);margin-top:12px">{{ block.data.caption }}</p>
        </div>

        <!-- 2 Spalten -->
        <div v-if="block.type==='two-col'" style="max-width:1000px;margin:0 auto;padding:60px 24px;display:grid;grid-template-columns:1fr 1fr;gap:48px">
          <p style="font-size:16px;line-height:1.8;color:var(--text-muted);white-space:pre-wrap">{{ block.data.left }}</p>
          <p style="font-size:16px;line-height:1.8;color:var(--text-muted);white-space:pre-wrap">{{ block.data.right }}</p>
        </div>

        <!-- CTA Banner -->
        <div v-if="block.type==='cta'" style="background:var(--bg-surface);border-top:0.5px solid var(--border);border-bottom:0.5px solid var(--border);padding:80px 24px;text-align:center;margin:40px 0">
          <h2 style="font-size:36px;font-weight:800;margin:0 0 12px">{{ block.data.title }}</h2>
          <p style="font-size:16px;color:var(--text-muted);margin:0 0 32px">{{ block.data.subtitle }}</p>
          <NuxtLink v-if="block.data.btnUrl" :to="block.data.btnUrl">
            <button class="accent-btn" style="height:48px;font-size:16px;padding:0 32px">{{ block.data.btnText }}</button>
          </NuxtLink>
        </div>

        <!-- Divider -->
        <div v-if="block.type==='divider'" style="max-width:1000px;margin:0 auto;padding:20px 24px">
          <hr style="border:none;border-top:0.5px solid var(--border)" />
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const currentSlug = computed(() => route.params.slug as string)

const { branding, loadBranding } = useBranding()
const brandFirst = computed(() => branding.value.brandName.slice(0, -1))
const brandLast  = computed(() => branding.value.brandName.slice(-1))
onMounted(() => loadBranding())

const { data: pageData } = await useFetch(useApiUrl(`/api/pages/${currentSlug.value}`))
const page = computed(() => (pageData.value as any)?.page)

const { data: pagesData } = await useFetch(useApiUrl('/api/pages'))
const navPages = computed(() =>
  ((pagesData.value as any)?.pages || [])
    .filter((p: any) => p.inNav && p.status === 'published')
    .sort((a: any, b: any) => a.navLabel?.localeCompare(b.navLabel))
)
</script>
