<template>
  <div style="min-height:100vh;background:var(--bg-base)">

    <!-- Header -->
    <header style="background:var(--bg-surface);border-bottom:0.5px solid var(--border);padding:0 32px;height:64px;display:flex;align-items:center;justify-content:space-between">
      <NuxtLink to="/" style="text-decoration:none">
        <span class="logo-text" style="font-size:24px">{{ brandFirst }}<span class="logo-accent">{{ brandLast }}</span></span>
      </NuxtLink>
      <div style="display:flex;align-items:center;gap:16px">
        <NuxtLink to="/shop/cart" style="text-decoration:none">
          <button class="accent-btn" style="position:relative">
            <i class="ti ti-shopping-cart"></i> Warenkorb
            <span v-if="cartCount > 0" style="position:absolute;top:-8px;right:-8px;background:#E05C5C;color:white;border-radius:50%;width:18px;height:18px;font-size:11px;display:flex;align-items:center;justify-content:center;font-weight:700">{{ cartCount }}</span>
          </button>
        </NuxtLink>
      </div>
    </header>

    <!-- Hero -->
    <div style="text-align:center;padding:60px 24px 40px">
      <h1 style="font-size:36px;font-weight:800;margin:0 0 12px">Shop</h1>
      <p style="color:var(--text-muted);font-size:16px">Entdecken Sie unsere Produkte</p>
    </div>

    <!-- Produkte Grid -->
    <div style="max-width:1200px;margin:0 auto;padding:0 24px 60px">
      <div v-if="!products.length" style="text-align:center;color:var(--text-muted);padding:60px">
        Keine Produkte verfügbar
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:24px">
        <div v-for="p in products" :key="p.productId"
          style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;overflow:hidden;cursor:pointer;transition:transform 0.15s,box-shadow 0.15s"
          @mouseenter="e => e.currentTarget.style.transform='translateY(-4px)'"
          @mouseleave="e => e.currentTarget.style.transform='translateY(0)'"
          @click="navigateTo(`/shop/product/${p.productId}`)">

          <!-- Produkt Bild -->
          <div style="height:200px;background:var(--bg-elevated);display:flex;align-items:center;justify-content:center;overflow:hidden">
            <img v-if="p.image" :src="p.image" :alt="p.name" style="width:100%;height:100%;object-fit:cover" />
            <i v-else class="ti ti-package" style="font-size:48px;color:var(--text-muted)"></i>
          </div>

          <!-- Produkt Info -->
          <div style="padding:20px">
            <div style="font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">{{ p.category }}</div>
            <h3 style="font-size:16px;font-weight:700;margin:0 0 8px">{{ p.name }}</h3>
            <p style="font-size:13px;color:var(--text-muted);margin:0 0 16px;line-height:1.5">{{ p.description?.slice(0,80) }}{{ p.description?.length > 80 ? '...' : '' }}</p>
            <div style="display:flex;align-items:center;justify-content:space-between">
              <span style="font-size:20px;font-weight:800;color:var(--accent)">€ {{ Number(p.price).toLocaleString('de-DE') }}</span>
              <button class="accent-btn" style="height:32px;font-size:12px;padding:0 16px" @click.stop="addToCart(p)">
                <i class="ti ti-plus"></i> In den Warenkorb
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div v-if="toast" class="toast-success">
      <i class="ti ti-circle-check"></i> {{ toast }}
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const { branding, loadBranding } = useBranding()
const brandFirst = computed(() => branding.value.brandName.slice(0, -1))
const brandLast  = computed(() => branding.value.brandName.slice(-1))
onMounted(() => loadBranding())

const { data } = await useFetch(`${useRuntimeConfig().public.apiBase}/api/shop/products`)
const products = computed(() => (data.value as any)?.products || [])

// Cart aus localStorage
const cart      = ref<any[]>([])
const cartCount = computed(() => cart.value.reduce((s, i) => s + i.quantity, 0))
const toast     = ref('')

onMounted(() => {
  try { cart.value = JSON.parse(localStorage.getItem('plexora-cart') || '[]') } catch {}
})

function addToCart(product: any) {
  const existing = cart.value.find(i => i.productId === product.productId)
  if (existing) {
    existing.quantity++
  } else {
    cart.value.push({ productId: product.productId, name: product.name, price: product.price, quantity: 1, image: product.image })
  }
  localStorage.setItem('plexora-cart', JSON.stringify(cart.value))
  toast.value = `${product.name} zum Warenkorb hinzugefügt!`
  setTimeout(() => toast.value = '', 2500)
}
</script>
