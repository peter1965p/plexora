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
      <div class="agb-content" style="font-size:15px;line-height:1.8;color:var(--text-muted)" v-html="agbHtml"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { marked } from 'marked'
definePageMeta({ layout: false })

const { branding, loadBranding } = useBranding()
const brandFirst = computed(() => branding.value.brandName.slice(0, -1))
const brandLast  = computed(() => branding.value.brandName.slice(-1))
onMounted(() => loadBranding())

const { data } = await useFetch(useApiUrl('/api/settings/agb'))
const agb = computed(() => (data.value as any)?.agb)
const agbHtml = computed(() => marked.parse(agb.value?.content || ''))

const { data: pagesData } = await useFetch(useApiUrl('/api/pages'))
const navPages = computed(() =>
  ((pagesData.value as any)?.pages || [])
    .filter((p: any) => p.inNav && p.status === 'published' && ['impressum','datenschutz','agb'].indexOf(p.slug) === -1)
    .sort((a: any, b: any) => (a.navLabel || '').localeCompare(b.navLabel || ''))
)
</script>
