<template>
  <div style="min-height:100vh;background:var(--bg-base)">
    <header style="background:var(--bg-surface);border-bottom:0.5px solid var(--border);padding:0 32px;height:64px;display:flex;align-items:center;justify-content:space-between">
      <NuxtLink to="/shop" style="text-decoration:none">
        <span class="logo-text" style="font-size:24px">{{ brandFirst }}<span class="logo-accent">{{ brandLast }}</span></span>
      </NuxtLink>
      <NuxtLink to="/shop" style="text-decoration:none;font-size:14px;color:var(--text-muted)">
        <i class="ti ti-arrow-left"></i> Weiter einkaufen
      </NuxtLink>
    </header>

    <div style="max-width:900px;margin:40px auto;padding:0 24px">
      <h1 style="font-size:28px;font-weight:800;margin:0 0 32px">Warenkorb</h1>

      <div v-if="!cart.length" style="text-align:center;padding:60px;color:var(--text-muted)">
        <i class="ti ti-shopping-cart" style="font-size:48px;display:block;margin-bottom:16px"></i>
        Ihr Warenkorb ist leer
        <br><br>
        <NuxtLink to="/shop"><button class="accent-btn">Zum Shop</button></NuxtLink>
      </div>

      <div v-else style="display:grid;grid-template-columns:1fr 320px;gap:24px;align-items:start">
        <!-- Cart Items -->
        <div class="card">
          <div v-for="(item, idx) in cart" :key="item.productId" style="padding:16px;border-bottom:0.5px solid var(--border);display:flex;gap:16px;align-items:center">
            <div style="width:64px;height:64px;background:var(--bg-elevated);border-radius:8px;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center">
              <img v-if="item.image" :src="item.image" style="width:100%;height:100%;object-fit:cover" />
              <i v-else class="ti ti-package" style="color:var(--text-muted)"></i>
            </div>
            <div style="flex:1">
              <div style="font-weight:600;margin-bottom:4px">{{ item.name }}</div>
              <div style="font-size:16px;font-weight:800;color:var(--accent)">€ {{ Number(item.price).toLocaleString('de-DE') }}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <button class="icon-btn" @click="updateQty(idx, -1)"><i class="ti ti-minus"></i></button>
              <span style="font-weight:700;min-width:24px;text-align:center">{{ item.quantity }}</span>
              <button class="icon-btn" @click="updateQty(idx, 1)"><i class="ti ti-plus"></i></button>
              <button class="icon-btn" style="color:var(--danger)" @click="removeItem(idx)"><i class="ti ti-trash"></i></button>
            </div>
            <div style="font-weight:700;min-width:80px;text-align:right">€ {{ (item.price * item.quantity).toLocaleString('de-DE') }}</div>
          </div>
        </div>

        <!-- Order Summary -->
        <div class="card" style="padding:24px">
          <h3 style="margin:0 0 20px;font-size:16px">Bestellübersicht</h3>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px">
            <span style="color:var(--text-muted)">Zwischensumme</span>
            <span>€ {{ subtotal.toLocaleString('de-DE') }}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px">
            <span style="color:var(--text-muted)">MwSt. 19%</span>
            <span>€ {{ mwst.toLocaleString('de-DE') }}</span>
          </div>
          <div style="border-top:0.5px solid var(--border);margin:16px 0;padding-top:16px;display:flex;justify-content:space-between;font-weight:800;font-size:18px">
            <span>Gesamt</span>
            <span style="color:var(--accent)">€ {{ total.toLocaleString('de-DE') }}</span>
          </div>

          <div class="auth-field" style="margin-bottom:12px">
            <label>E-Mail für Bestätigung</label>
            <input v-model="email" placeholder="ihre@email.de" type="email" />
          </div>

          <button class="auth-btn" :disabled="checking || !email" @click="checkout">
            <span v-if="checking"><i class="ti ti-loader-2 spin"></i> Weiterleitung...</span>
            <span v-else><i class="ti ti-lock"></i> Jetzt bezahlen</span>
          </button>
          <p style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:8px">
            <i class="ti ti-shield-check"></i> Sicher bezahlen mit Stripe
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const { branding, loadBranding } = useBranding()
const brandFirst = computed(() => branding.value.brandName.slice(0, -1))
const brandLast  = computed(() => branding.value.brandName.slice(-1))
onMounted(() => { loadBranding(); loadCart() })

const cart     = ref<any[]>([])
const email    = ref('')
const checking = ref(false)

function loadCart() {
  try { cart.value = JSON.parse(localStorage.getItem('plexora-cart') || '[]') } catch {}
}

function saveCart() {
  localStorage.setItem('plexora-cart', JSON.stringify(cart.value))
}

function updateQty(idx: number, delta: number) {
  cart.value[idx].quantity += delta
  if (cart.value[idx].quantity <= 0) removeItem(idx)
  else saveCart()
}

function removeItem(idx: number) {
  cart.value.splice(idx, 1)
  saveCart()
}

const subtotal = computed(() => cart.value.reduce((s, i) => s + i.price * i.quantity, 0))
const mwst     = computed(() => Math.round(subtotal.value * 0.19 * 100) / 100)
const total    = computed(() => subtotal.value + mwst.value)

async function checkout() {
  if (!email.value) return
  checking.value = true
  try {
    const res = await $fetch(useApiUrl('/api/shop/checkout'), {
      method: 'POST',
      body: { items: cart.value.map(i => ({ productId: i.productId, quantity: i.quantity })), email: email.value }
    }) as any
    if (res.url) {
      localStorage.removeItem('plexora-cart')
      window.location.href = res.url
    }
  } finally {
    checking.value = false
  }
}
</script>
