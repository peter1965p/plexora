<template>
  <div class="lp" style="min-height:100vh;background:#0a0e1a;color:#f0eef9;font-family:'Inter',sans-serif">
    <!-- NAV -->
    <nav style="border-bottom:0.5px solid rgba(255,255,255,0.07);padding:20px 32px;display:flex;align-items:center;justify-content:space-between;max-width:1100px;margin:0 auto">
      <NuxtLink to="/" style="text-decoration:none">
        <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:22px;letter-spacing:-0.5px">Plexo<span style="color:#6c3fe8">ra</span></div>
      </NuxtLink>
      <NuxtLink to="/login" style="text-decoration:none;color:#8b8fa8;font-size:13px">Bereits Kunde? Einloggen →</NuxtLink>
    </nav>

    <div style="max-width:900px;margin:0 auto;padding:64px 32px">
      <!-- Header -->
      <div style="text-align:center;margin-bottom:56px">
        <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#00d4b4;margin-bottom:12px">Lizenz kaufen</div>
        <h1 style="font-family:'Syne',sans-serif;font-size:42px;font-weight:800;letter-spacing:-1.5px;margin-bottom:12px">Wählen Sie Ihr Paket</h1>
        <p style="font-size:15px;color:#8b8fa8">Monatlich kündbar. Sofortiger Zugriff. Keine Einrichtungsgebühr.</p>
      </div>

      <!-- Email -->
      <div style="max-width:420px;margin:0 auto 48px">
        <label style="font-size:12px;color:#8b8fa8;display:block;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Ihre E-Mail-Adresse</label>
        <input
          v-model="email"
          type="email"
          placeholder="name@firma.de"
          style="width:100%;background:#13182a;border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:12px 16px;color:#f0eef9;font-size:15px;font-family:'Inter',sans-serif;outline:none;box-sizing:border-box"
          :style="emailError ? 'border-color:#e05c5c' : ''"
          @input="emailError = ''"
        />
        <div v-if="emailError" style="color:#e05c5c;font-size:12px;margin-top:6px">{{ emailError }}</div>
      </div>

      <!-- Pricing Cards -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:48px">

        <!-- Starter -->
        <div
          class="pcard"
          :class="{ selected: selected === 'starter' }"
          @click="selected = 'starter'"
        >
          <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#8b8fa8;margin-bottom:12px">Starter</div>
          <div style="font-family:'Syne',sans-serif;font-size:36px;font-weight:800;line-height:1;margin-bottom:4px">49 <span style="font-family:'Inter',sans-serif;font-size:14px;font-weight:400;color:#8b8fa8">€</span></div>
          <div style="font-size:12px;color:#8b8fa8;margin-bottom:20px">/ Monat</div>
          <ul style="list-style:none;display:flex;flex-direction:column;gap:8px;flex:1;margin-bottom:20px">
            <li style="font-size:13px;color:#c4c2d4;display:flex;gap:8px;align-items:center"><i class="ti ti-check" style="color:#00d4b4"></i>CRM</li>
            <li style="font-size:13px;color:#c4c2d4;display:flex;gap:8px;align-items:center"><i class="ti ti-check" style="color:#00d4b4"></i>Support-Tickets</li>
            <li style="font-size:13px;color:#545870;display:flex;gap:8px;align-items:center"><i class="ti ti-minus" style="color:#545870"></i>Finanzen</li>
            <li style="font-size:13px;color:#545870;display:flex;gap:8px;align-items:center"><i class="ti ti-minus" style="color:#545870"></i>Projekte & HR</li>
          </ul>
          <div class="select-indicator">{{ selected === 'starter' ? '✓ Ausgewählt' : 'Auswählen' }}</div>
        </div>

        <!-- Pro (highlighted) -->
        <div
          class="pcard pcard-featured"
          :class="{ selected: selected === 'pro' }"
          @click="selected = 'pro'"
        >
          <div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:#6c3fe8;color:#fff;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:4px 14px;border-radius:20px;white-space:nowrap">Beliebteste Wahl</div>
          <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#a78bfa;margin-bottom:12px">Pro</div>
          <div style="font-family:'Syne',sans-serif;font-size:36px;font-weight:800;color:#6c3fe8;line-height:1;margin-bottom:4px">149 <span style="font-family:'Inter',sans-serif;font-size:14px;font-weight:400;color:#8b8fa8">€</span></div>
          <div style="font-size:12px;color:#8b8fa8;margin-bottom:20px">/ Monat</div>
          <ul style="list-style:none;display:flex;flex-direction:column;gap:8px;flex:1;margin-bottom:20px">
            <li style="font-size:13px;color:#c4c2d4;display:flex;gap:8px;align-items:center"><i class="ti ti-check" style="color:#00d4b4"></i>CRM + Support</li>
            <li style="font-size:13px;color:#c4c2d4;display:flex;gap:8px;align-items:center"><i class="ti ti-check" style="color:#00d4b4"></i>Finanzen & Rechnungen</li>
            <li style="font-size:13px;color:#c4c2d4;display:flex;gap:8px;align-items:center"><i class="ti ti-check" style="color:#00d4b4"></i>Projekte & HR</li>
            <li style="font-size:13px;color:#c4c2d4;display:flex;gap:8px;align-items:center"><i class="ti ti-check" style="color:#00d4b4"></i>Shop, Pagebuilder, Formulare</li>
          </ul>
          <div class="select-indicator">{{ selected === 'pro' ? '✓ Ausgewählt' : 'Auswählen' }}</div>
        </div>

        <!-- Enterprise -->
        <div
          class="pcard"
          :class="{ selected: selected === 'enterprise' }"
          @click="selected = 'enterprise'"
        >
          <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#8b8fa8;margin-bottom:12px">Enterprise</div>
          <div style="font-family:'Syne',sans-serif;font-size:36px;font-weight:800;line-height:1;margin-bottom:4px">299 <span style="font-family:'Inter',sans-serif;font-size:14px;font-weight:400;color:#8b8fa8">€</span></div>
          <div style="font-size:12px;color:#8b8fa8;margin-bottom:20px">/ Monat</div>
          <ul style="list-style:none;display:flex;flex-direction:column;gap:8px;flex:1;margin-bottom:20px">
            <li style="font-size:13px;color:#c4c2d4;display:flex;gap:8px;align-items:center"><i class="ti ti-check" style="color:#00d4b4"></i>Alles aus Pro</li>
            <li style="font-size:13px;color:#c4c2d4;display:flex;gap:8px;align-items:center"><i class="ti ti-check" style="color:#00d4b4"></i>Marketing-Suite</li>
            <li style="font-size:13px;color:#c4c2d4;display:flex;gap:8px;align-items:center"><i class="ti ti-check" style="color:#00d4b4"></i>UTM-Tracking & QR-Codes</li>
            <li style="font-size:13px;color:#c4c2d4;display:flex;gap:8px;align-items:center"><i class="ti ti-check" style="color:#00d4b4"></i>Prioritäts-Support</li>
          </ul>
          <div class="select-indicator">{{ selected === 'enterprise' ? '✓ Ausgewählt' : 'Auswählen' }}</div>
        </div>

      </div>

      <!-- Checkout Button -->
      <div style="text-align:center">
        <button
          @click="checkout"
          :disabled="loading"
          style="background:#6c3fe8;color:#fff;font-size:16px;font-weight:700;padding:16px 48px;border-radius:40px;border:none;cursor:pointer;font-family:'Inter',sans-serif;transition:opacity 0.2s;min-width:280px"
          :style="loading ? 'opacity:0.6;cursor:not-allowed' : ''"
        >
          {{ loading ? 'Weiterleitung zu Stripe...' : `Jetzt kaufen — ${prices[selected]} €` }}
        </button>
        <div style="margin-top:12px;font-size:12px;color:#545870;display:flex;align-items:center;justify-content:center;gap:6px">
          <i class="ti ti-lock" style="font-size:14px"></i>
          Sichere Zahlung via Stripe · SSL-verschlüsselt
        </div>
        <div v-if="error" style="margin-top:12px;color:#e05c5c;font-size:13px">{{ error }}</div>
      </div>

      <!-- Trust Badges -->
      <div style="display:flex;gap:32px;justify-content:center;margin-top:48px;flex-wrap:wrap">
        <div style="text-align:center">
          <div style="font-size:20px;margin-bottom:4px">⚡</div>
          <div style="font-size:12px;color:#8b8fa8">Sofortiger Zugriff</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:20px;margin-bottom:4px">🔑</div>
          <div style="font-size:12px;color:#8b8fa8">Lizenz-Key per Mail</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:20px;margin-bottom:4px">🔄</div>
          <div style="font-size:12px;color:#8b8fa8">Monatlich kündbar</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:20px;margin-bottom:4px">📧</div>
          <div style="font-size:12px;color:#8b8fa8">Login-Daten sofort</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

useHead({
  link: [
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=Inter:wght@400;500;600&display=swap' },
    { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css' },
  ]
})

const selected = ref<'starter' | 'pro' | 'enterprise'>('pro')
const email    = ref('')
const loading  = ref(false)
const error    = ref('')
const emailError = ref('')

const prices: Record<string, number> = { starter: 49, pro: 149, enterprise: 299 }

async function checkout() {
  error.value = ''
  if (!email.value || !email.value.includes('@')) {
    emailError.value = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.'
    return
  }
  loading.value = true
  try {
    const res = await $fetch<{ url: string }>(useApiUrl('/api/licenses/checkout'), {
      method: 'POST',
      body: { tier: selected.value, email: email.value }
    })
    if (res.url) window.location.href = res.url
  } catch (e: any) {
    error.value = 'Fehler beim Erstellen der Zahlungssession. Bitte versuchen Sie es erneut.'
    loading.value = false
  }
}
</script>

<style scoped>
.pcard {
  background: #13182a;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 28px 20px;
  cursor: pointer;
  transition: border-color 0.2s, transform 0.15s;
  display: flex;
  flex-direction: column;
  position: relative;
}
.pcard:hover { border-color: rgba(108,63,232,0.5); transform: translateY(-2px); }
.pcard.selected { border-color: #6c3fe8; border-width: 2px; }
.pcard-featured { background: linear-gradient(160deg, rgba(108,63,232,0.1), #13182a); border-color: rgba(108,63,232,0.4); }
.pcard-featured.selected { border-color: #6c3fe8; border-width: 2px; }
.select-indicator {
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  padding: 10px;
  border-radius: 8px;
  background: rgba(255,255,255,0.04);
  color: #8b8fa8;
  transition: all 0.2s;
}
.pcard.selected .select-indicator,
.pcard-featured.selected .select-indicator {
  background: rgba(108,63,232,0.2);
  color: #a78bfa;
}
</style>
