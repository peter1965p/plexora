<template>
  <div style="min-height:100vh;background:var(--bg-base);padding:48px 24px">
    <div style="max-width:700px;margin:0 auto">
      <NuxtLink to="/shop" style="color:var(--accent);font-size:13px;display:inline-flex;align-items:center;gap:6px;margin-bottom:28px;text-decoration:none">
        <i class="ti ti-arrow-left"></i> Zurück zum Shop
      </NuxtLink>

      <h1 style="font-size:24px;font-weight:900;margin:0 0 24px">
        <i class="ti ti-shopping-cart" style="color:var(--accent)"></i> Warenkorb
      </h1>

      <div v-if="!cart.length" style="text-align:center;padding:60px;color:var(--text-muted)">
        <i class="ti ti-shopping-cart-off" style="font-size:48px;display:block;margin-bottom:12px"></i>
        Dein Warenkorb ist leer
        <div style="margin-top:16px">
          <NuxtLink to="/shop"><button class="accent-btn">Zum Shop</button></NuxtLink>
        </div>
      </div>

      <div v-else>
        <!-- Artikel -->
        <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;overflow:hidden;margin-bottom:20px">
          <div v-for="(item, i) in cart" :key="item.productId"
            :style="`padding:16px 20px;display:flex;align-items:center;gap:16px;${i < cart.length-1 ? 'border-bottom:0.5px solid var(--border)' : ''}`">
            <div style="width:56px;height:56px;border-radius:10px;overflow:hidden;background:var(--bg-elevated);flex-shrink:0;display:flex;align-items:center;justify-content:center">
              <img v-if="item.image" :src="item.image" style="width:100%;height:100%;object-fit:cover" />
              <i v-else class="ti ti-package" style="font-size:24px;color:var(--text-muted)"></i>
            </div>
            <div style="flex:1">
              <div style="font-weight:700;font-size:15px">{{ item.name }}</div>
              <div style="font-size:12px;color:var(--text-muted)">€ {{ item.price }} / Stück</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <button @click="updateQty(item, -1)" style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:6px;width:28px;height:28px;cursor:pointer;color:var(--text-primary);font-size:16px">−</button>
              <span style="font-weight:700;min-width:24px;text-align:center">{{ item.quantity }}</span>
              <button @click="updateQty(item, 1)" style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:6px;width:28px;height:28px;cursor:pointer;color:var(--text-primary);font-size:16px">+</button>
            </div>
            <div style="font-weight:800;color:var(--accent);min-width:70px;text-align:right">€ {{ (item.price * item.quantity).toFixed(2) }}</div>
            <button @click="removeItem(item.productId)" style="background:none;border:none;color:#E05C5C;cursor:pointer;font-size:18px;padding:4px">
              <i class="ti ti-trash"></i>
            </button>
          </div>
        </div>

        <!-- Summe -->
        <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;padding:20px;margin-bottom:20px">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;color:var(--text-muted)">
            <span>Zwischensumme</span><span>€ {{ subtotal.toFixed(2) }}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:16px;font-size:14px;color:var(--text-muted)">
            <span>MwSt. (19%)</span><span>€ {{ vat.toFixed(2) }}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:900;padding-top:12px;border-top:0.5px solid var(--border)">
            <span>Gesamt</span><span style="color:var(--accent)">€ {{ total.toFixed(2) }}</span>
          </div>
        </div>

        <!-- Checkout Button -->
        <button class="auth-btn" style="font-size:16px;height:52px" @click="checkout" :disabled="checking">
          <span v-if="checking"><i class="ti ti-loader-2 spin"></i> Weiterleitung...</span>
          <span v-else><i class="ti ti-lock"></i> Sicher bezahlen — € {{ total.toFixed(2) }}</span>
        </button>
        <p style="text-align:center;font-size:12px;color:var(--text-muted);margin-top:12px">
          <i class="ti ti-shield-check"></i> Sichere Zahlung via Stripe
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const apiBase = 'https://7hrkm580pb.execute-api.eu-central-1.amazonaws.com'
const cart    = ref<any[]>([])
const checking = ref(false)

onMounted(() => {
  try { cart.value = JSON.parse(localStorage.getItem('plexora-cart') || '[]') } catch {}
})

const subtotal = computed(() => cart.value.reduce((s, i) => s + i.price * i.quantity, 0))
const vat      = computed(() => Math.round(subtotal.value * 0.19 * 100) / 100)
const total    = computed(() => subtotal.value + vat.value)

function updateQty(item: any, delta: number) {
  item.quantity = Math.max(1, item.quantity + delta)
  localStorage.setItem('plexora-cart', JSON.stringify(cart.value))
}

function removeItem(productId: string) {
  cart.value = cart.value.filter(i => i.productId !== productId)
  localStorage.setItem('plexora-cart', JSON.stringify(cart.value))
}

async function checkout() {
  if (!cart.value.length) return
  checking.value = true
  try {
    // Erstes Produkt checkout (multi-item folgt später)
    const item = cart.value[0]
    const res: any = await $fetch(`${apiBase}/api/shop/checkout`, {
      method: 'POST',
      body: {
        productId: item.productId,
        quantity:  item.quantity,
        baseUrl:   window.location.origin
      }
    })
    if (res?.url) {
      localStorage.removeItem('plexora-cart')
      window.location.href = res.url
    }
  } catch (err) {
    console.error('Checkout fehlgeschlagen:', err)
  } finally { checking.value = false }
}
</script>
