<template>
  <div style="min-height:100vh;background:var(--bg-base);padding:48px 24px">
    <div style="max-width:900px;margin:0 auto">
      <NuxtLink to="/shop" style="color:var(--accent);font-size:13px;display:inline-flex;align-items:center;gap:6px;margin-bottom:24px;text-decoration:none">
        <i class="ti ti-arrow-left"></i> Zurück zum Shop
      </NuxtLink>

      <div v-if="loading" style="text-align:center;padding:48px;color:var(--text-muted)">
        <i class="ti ti-loader-2 spin" style="font-size:32px"></i>
      </div>

      <div v-else-if="product" style="display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:start">
        <!-- Bild -->
        <div style="border-radius:16px;overflow:hidden;background:var(--bg-elevated);aspect-ratio:1;display:flex;align-items:center;justify-content:center">
          <img v-if="product.image" :src="product.image" style="width:100%;height:100%;object-fit:cover" />
          <i v-else class="ti ti-package" style="font-size:80px;color:var(--text-muted)"></i>
        </div>

        <!-- Info -->
        <div>
          <div style="font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:.1em;font-weight:700;margin-bottom:8px">{{ product.category }}</div>
          <h1 style="font-size:28px;font-weight:900;margin:0 0 12px">{{ product.name }}</h1>
          <p style="color:var(--text-muted);font-size:15px;line-height:1.6;margin:0 0 24px">{{ product.description }}</p>

          <div style="background:var(--bg-elevated);border-radius:12px;padding:20px;margin-bottom:24px">
            <div style="font-size:32px;font-weight:900;color:var(--accent)">€ {{ product.price }}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:4px">{{ product.vatRate ?? 19 }}% MwSt. inklusive</div>
          </div>

          <button class="auth-btn" style="font-size:16px;height:52px" @click="addToCart">
            <i class="ti ti-shopping-cart"></i> In den Warenkorb
          </button>
        </div>
      </div>

      <div v-else style="text-align:center;padding:48px;color:var(--text-muted)">
        <i class="ti ti-package-off" style="font-size:48px;display:block;margin-bottom:12px"></i>
        Produkt nicht gefunden
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const route     = useRoute()
const productId = route.params.id as string
const apiBase   = 'https://7hrkm580pb.execute-api.eu-central-1.amazonaws.com'

const { data, pending: loading } = await useFetch(`${apiBase}/api/shop/products`)
const product = computed(() => {
  const all = (data.value as any)?.products || []
  return all.find((p: any) => p.productId === productId) || null
})

function addToCart() {
  // TODO: Warenkorb
  alert('Warenkorb kommt bald!')
}
</script>
