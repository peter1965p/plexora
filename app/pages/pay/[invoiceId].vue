<template>
  <div style="min-height:100vh;background:var(--bg-base);display:flex;align-items:center;justify-content:center;padding:24px">
    <div style="max-width:480px;width:100%">

      <!-- Branding -->
      <div style="text-align:center;margin-bottom:32px">
        <div v-if="branding.logoUrl">
          <img :src="branding.logoUrl" style="max-height:56px;max-width:180px;object-fit:contain" />
        </div>
        <div v-else class="logo-text" style="font-size:28px">
          {{ brandFirst }}<span class="logo-accent">{{ brandLast }}</span>
        </div>
      </div>

      <!-- Laden -->
      <div v-if="loading" class="card" style="text-align:center;padding:48px">
        <i class="ti ti-loader-2 spin" style="font-size:32px;color:var(--accent)"></i>
        <p style="color:var(--text-muted);margin-top:12px">Rechnung wird geladen...</p>
      </div>

      <!-- Nicht gefunden -->
      <div v-else-if="!invoice" class="card" style="text-align:center;padding:48px">
        <i class="ti ti-file-off" style="font-size:48px;color:var(--text-muted)"></i>
        <h2 style="margin:16px 0 8px">Rechnung nicht gefunden</h2>
        <p style="color:var(--text-muted)">Bitte prüfe den Link oder wende dich an den Absender.</p>
      </div>

      <!-- Bereits bezahlt -->
      <div v-else-if="invoice.status === 'paid'" class="card" style="text-align:center;padding:48px">
        <i class="ti ti-circle-check" style="font-size:56px;color:#00D4B4"></i>
        <h2 style="margin:16px 0 8px">Bereits bezahlt</h2>
        <p style="color:var(--text-muted)">Diese Rechnung wurde bereits beglichen. Vielen Dank!</p>
      </div>

      <!-- Bezahlformular -->
      <div v-else>
        <div class="card" style="margin-bottom:16px">
          <div class="card-body" style="display:flex;flex-direction:column;gap:16px">

            <!-- Rechnungsinfo -->
            <div style="background:var(--bg-elevated);border-radius:10px;padding:16px">
              <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px">
                <div>
                  <div style="font-size:12px;color:var(--text-muted)">Rechnung Nr.</div>
                  <div style="font-weight:700;font-size:15px">{{ invoice.number || invoice.invoiceId?.slice(0,8).toUpperCase() }}</div>
                </div>
                <div style="text-align:right">
                  <div style="font-size:12px;color:var(--text-muted)">Fällig am</div>
                  <div style="font-weight:600;font-size:14px;color:var(--danger)">{{ invoice.dueDate || '–' }}</div>
                </div>
              </div>
              <div style="border-top:0.5px solid var(--border);padding-top:12px">
                <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">Empfänger</div>
                <div style="font-weight:600">{{ invoice.client || '–' }}</div>
              </div>
            </div>

            <!-- Betrag -->
            <div style="background:rgba(var(--accent-rgb),0.08);border:0.5px solid var(--accent);border-radius:10px;padding:20px;text-align:center">
              <div style="font-size:13px;color:var(--text-muted);margin-bottom:4px">Zu zahlender Betrag</div>
              <div style="font-size:36px;font-weight:900;color:var(--accent)">€ {{ brutto }}</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:4px">inkl. 19% MwSt.</div>
            </div>

            <template v-if="stripeEnabled">
              <!-- Gateway Badge -->
              <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-muted);justify-content:center">
                <i class="ti ti-lock" style="color:#00D4B4"></i>
                Sichere Zahlung via {{ gatewayName }}
              </div>

              <!-- Pay Button -->
              <button class="auth-btn" :disabled="paying" @click="startPayment" style="font-size:16px;height:52px">
                <span v-if="paying"><i class="ti ti-loader-2 spin"></i> Weiterleitung...</span>
                <span v-else><i class="ti ti-credit-card"></i> Jetzt bezahlen — € {{ brutto }}</span>
              </button>
            </template>
            <div v-else style="text-align:center;font-size:13px;color:var(--text-muted)">
              <i class="ti ti-building-bank" style="margin-right:6px"></i>
              Online-Zahlung ist für diese Rechnung nicht aktiviert — bitte die Bankverbindung/den QR-Code auf der Rechnung nutzen.
            </div>

          </div>
        </div>

        <p style="text-align:center;font-size:11px;color:var(--text-muted)">
          Nach erfolgreicher Zahlung wird diese Rechnung automatisch als bezahlt markiert.
        </p>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const route     = useRoute()
const invoiceId = route.params.invoiceId as string

const { data, pending: loading } = await useFetch(useApiUrl(`/api/pay/${invoiceId}`))
const invoice = computed(() => (data.value as any)?.invoice || null)
const gateway = computed(() => (data.value as any)?.gateway || null)
const stripeEnabled = computed(() => (data.value as any)?.stripeEnabled !== false)

const { branding } = useBranding()
watchEffect(() => { if ((data.value as any)?.branding) Object.assign(branding.value, (data.value as any).branding) })
const brandFirst = computed(() => branding.value.brandName.slice(0, -1))
const brandLast  = computed(() => branding.value.brandName.slice(-1))

const gatewayLabels: Record<string, string> = { stripe: 'Stripe', paypal: 'PayPal', mollie: 'Mollie', custom: 'Payment Gateway' }
const gatewayName = computed(() => gatewayLabels[gateway.value as string] || 'Stripe')

const brutto = computed(() => {
  const netto = Number(invoice.value?.amount) || 0
  return (netto * 1.19).toFixed(2).replace('.', ',')
})

const paying = ref(false)

async function startPayment() {
  paying.value = true
  try {
    const res = await $fetch(useApiUrl(`/api/pay/${invoiceId}/checkout`), {
      method: 'POST',
    }) as any
    if (res?.url) window.location.href = res.url
  } catch (err) {
    console.error('Checkout fehlgeschlagen:', err)
    paying.value = false
  }
}
</script>
