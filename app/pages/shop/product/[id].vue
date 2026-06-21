<template>
  <div style="min-height:100vh;background:var(--bg-base);padding:48px 24px">
    <div style="max-width:960px;margin:0 auto">
      <NuxtLink to="/shop" style="color:var(--accent);font-size:13px;display:inline-flex;align-items:center;gap:6px;margin-bottom:28px;text-decoration:none">
        <i class="ti ti-arrow-left"></i> Zurück zum Shop
      </NuxtLink>

      <div v-if="loading" style="text-align:center;padding:48px;color:var(--text-muted)">
        <i class="ti ti-loader-2 spin" style="font-size:32px"></i>
      </div>

      <div v-else-if="product" style="display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start">

        <!-- Bild -->
        <div>
          <div style="border-radius:20px;overflow:hidden;background:var(--bg-elevated);aspect-ratio:1;display:flex;align-items:center;justify-content:center;border:0.5px solid var(--border)">
            <img v-if="product.image" :src="product.image" style="width:100%;height:100%;object-fit:cover" />
            <i v-else class="ti ti-package" style="font-size:80px;color:var(--text-muted)"></i>
          </div>
        </div>

        <!-- Info -->
        <div style="display:flex;flex-direction:column;gap:20px">
          <div>
            <div style="font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:.1em;font-weight:700;margin-bottom:8px">{{ product.category }}</div>
            <h1 style="font-size:30px;font-weight:900;margin:0 0 12px;line-height:1.2">{{ product.name }}</h1>
            <p style="color:var(--text-muted);font-size:15px;line-height:1.6;margin:0">{{ product.description }}</p>
          </div>

          <!-- Features -->
          <div v-if="features.length" style="background:var(--bg-elevated);border-radius:12px;padding:18px;border:0.5px solid var(--border)">
            <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px">Enthaltene Features</div>
            <div v-for="f in features" :key="f" style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              <i class="ti ti-circle-check" style="color:#00D4B4;font-size:16px;flex-shrink:0"></i>
              <span style="font-size:14px">{{ f }}</span>
            </div>
          </div>

          <!-- Langbeschreibung -->
          <div v-if="product.longDescription" style="font-size:14px;line-height:1.8;color:var(--text-secondary)">
            {{ product.longDescription }}
          </div>

          <!-- Preis + Kaufen -->
          <div style="background:rgba(var(--accent-rgb),0.08);border:1px solid rgba(var(--accent-rgb),0.3);border-radius:16px;padding:20px">
            <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:4px">
              <span style="font-size:36px;font-weight:900;color:var(--accent)">€ {{ product.price }}</span>
              <span v-if="product.priceModel && product.priceModel !== 'einmalig'" style="font-size:14px;color:var(--text-muted)">/ {{ product.priceModel }}</span>
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">
              {{ product.vatRate ?? 19 }}% MwSt. inklusive
              <span v-if="product.priceModel === 'einmalig'"> · Einmalzahlung</span>
            </div>
            <button class="auth-btn" style="font-size:16px;height:52px" @click="addToCart">
              <i class="ti ti-shopping-cart"></i> In den Warenkorb
            </button>
          </div>


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
const { data, pending: loading } = await useFetch(useApiUrl('/api/shop/products'))
const product = computed(() => {
  const all = (data.value as any)?.products || []
  return all.find((p: any) => p.productId === productId) || null
})

const features = computed(() => {
  if (!product.value?.features) return []
  if (Array.isArray(product.value.features)) return product.value.features.filter(Boolean)
  return product.value.features.split('\n').filter((f: string) => f.trim())
})

function addToCart() {
  if (!product.value) return
  try {
    const cart = JSON.parse(localStorage.getItem('plexora-cart') || '[]')
    const existing = cart.find((i: any) => i.productId === product.value!.productId)
    if (existing) {
      existing.quantity++
    } else {
      cart.push({
        productId: product.value.productId,
        name:      product.value.name,
        price:     product.value.price,
        quantity:  1,
        image:     product.value.image || ''
      })
    }
    localStorage.setItem('plexora-cart', JSON.stringify(cart))
    navigateTo('/shop')
  } catch (err) { console.error(err) }
}
</script>
