<template>
  <div class="page">

    <!-- Lizenz-Karte -->
    <div v-if="license" style="margin-bottom:20px;background:linear-gradient(135deg,rgba(var(--accent-rgb),0.12),rgba(var(--accent-rgb),0.04));border:1px solid var(--accent);border-radius:16px;padding:20px 24px;display:flex;align-items:center;gap:24px;flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
        <div style="width:44px;height:44px;border-radius:10px;background:rgba(var(--accent-rgb),0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="ti ti-key" style="font-size:20px;color:var(--accent)"></i>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">Dein Lizenz-Key</div>
          <code style="font-size:18px;font-weight:900;letter-spacing:3px;color:var(--accent)">{{ license.licenseKey }}</code>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div>
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Tarif</div>
          <span class="badge" :class="license.tier==='enterprise' ? 'badge-warning' : license.tier==='pro' ? 'badge-info' : 'badge-success'">
            {{ license.tier === 'enterprise' ? 'Enterprise' : license.tier === 'pro' ? 'Pro' : 'Starter' }}
          </span>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Status</div>
          <span class="badge badge-success"><i class="ti ti-circle-check" style="margin-right:4px"></i>Aktiv</span>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Gültig bis</div>
          <span style="font-size:13px;font-weight:600">{{ license.validUntil ? new Date(license.validUntil).toLocaleDateString('de-DE') : '∞ Unbegrenzt' }}</span>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Module</div>
          <span style="font-size:13px;font-weight:600">{{ (license.modules || []).length }} aktiv</span>
        </div>
        <button @click="copyLicKey" class="accent-btn" style="height:32px;font-size:12px;padding:0 14px">
          <i class="ti" :class="keyCopied ? 'ti-check' : 'ti-copy'"></i>
          {{ keyCopied ? 'Kopiert!' : 'Key kopieren' }}
        </button>
      </div>
    </div>

    <!-- Kein Lizenz-Banner -->
    <div v-else-if="licenseLoaded && !license" style="margin-bottom:20px;background:var(--bg-surface);border:1px dashed var(--border);border-radius:16px;padding:20px 24px;display:flex;align-items:center;gap:16px">
      <i class="ti ti-key-off" style="font-size:28px;color:var(--text-muted)"></i>
      <div style="flex:1">
        <div style="font-weight:700;margin-bottom:4px">Keine aktive Lizenz gefunden</div>
        <div style="font-size:12px;color:var(--text-muted)">Kaufe eine Plexora-Lizenz um alle Module freizuschalten.</div>
      </div>
      <a href="/#pricing" class="accent-btn" style="height:32px;font-size:12px;padding:0 14px;text-decoration:none">
        <i class="ti ti-shopping-cart"></i> Lizenz kaufen
      </a>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <i class="ti ti-receipt stat-icon"></i>
        <div class="stat-label">Rechnungen</div>
        <div class="stat-value">{{ invoices.length }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ paidCount }} bezahlt</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-shopping-cart stat-icon"></i>
        <div class="stat-label">Bestellungen</div>
        <div class="stat-value">{{ orders.length }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ activeOrders }} aktiv</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-file stat-icon"></i>
        <div class="stat-label">Dokumente</div>
        <div class="stat-value">{{ documents.length }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> verfügbar</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-clock stat-icon"></i>
        <div class="stat-label">Ausstehend</div>
        <div class="stat-value" style="color:#E05C5C">{{ formatEur(pendingAmount) }}</div>
        <div class="stat-delta down"><i class="ti ti-arrow-down-right"></i> {{ pendingCount }} offen</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Letzte Rechnungen</span>
          <NuxtLink to="/portal/invoices" class="accent-btn" style="height:28px;font-size:12px;padding:0 12px">
            Alle ansehen
          </NuxtLink>
        </div>
        <table class="data-table">
          <thead><tr><th>Nummer</th><th>Betrag</th><th>Fälligkeit</th><th>Status</th></tr></thead>
          <tbody>
            <tr v-if="!invoices.length">
              <td colspan="4" style="text-align:center;color:var(--text-muted);padding:24px">Keine Rechnungen</td>
            </tr>
            <tr v-for="i in invoices.slice(0,5)" :key="i.invoiceId">
              <td class="td-name">{{ i.number }}</td>
              <td>{{ formatEur(i.amount) }}</td>
              <td style="font-size:12px">{{ i.dueDate }}</td>
              <td><span class="badge" :class="statusBadge(i.status)">{{ statusLabel(i.status) }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Letzte Bestellungen</span>
          <NuxtLink to="/portal/orders" class="accent-btn" style="height:28px;font-size:12px;padding:0 12px">
            Alle ansehen
          </NuxtLink>
        </div>
        <table class="data-table">
          <thead><tr><th>Bestellung</th><th>Artikel</th><th>Betrag</th><th>Status</th></tr></thead>
          <tbody>
            <tr v-if="!orders.length">
              <td colspan="4" style="text-align:center;color:var(--text-muted);padding:24px">Keine Bestellungen</td>
            </tr>
            <tr v-for="o in orders.slice(0,5)" :key="o.orderId">
              <td class="td-name">{{ o.number }}</td>
              <td style="font-size:12px">{{ o.items }}</td>
              <td>{{ formatEur(o.amount) }}</td>
              <td><span class="badge" :class="'badge-'+o.status">{{ orderLabel[o.status] }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatEur, statusLabel, statusBadge } from '~/modules/finance'

definePageMeta({ layout: 'portal', middleware: 'auth' })

const userId  = ref("")
const userEmail = ref("")
const license = ref<any>(null)
const licenseLoaded = ref(false)
const keyCopied = ref(false)

onMounted(async () => {
  const { useAuthUser } = await import('~/composables/useAuth')
  const u = await useAuthUser()
  userId.value    = u.userId
  userEmail.value = u.email

  if (u.email) {
    try {
      const res = await $fetch(useApiUrl(`/api/licenses/my?email=${encodeURIComponent(u.email)}`)) as any
      license.value = res.license || null
    } catch {}
  }
  licenseLoaded.value = true
})

function copyLicKey() {
  if (!license.value?.licenseKey) return
  navigator.clipboard.writeText(license.value.licenseKey)
  keyCopied.value = true
  setTimeout(() => keyCopied.value = false, 2000)
}

const orderLabel: Record<string, string> = {
  pending:   'Ausstehend',
  processing:'In Bearbeitung',
  shipped:   'Versendet',
  delivered: 'Geliefert',
  cancelled: 'Storniert',
}

const { data: invData }   = await usePortalFetch('/api/portal/invoices', userEmail)
const { data: orderData } = await usePortalFetch('/api/portal/orders')
const { data: docData }   = await usePortalFetch('/api/portal/documents')

const invoices  = computed(() => (invData.value as any)?.invoices  || [])
const orders    = computed(() => (orderData.value as any)?.orders   || [])
const documents = computed(() => (docData.value as any)?.documents  || [])

const paidCount     = computed(() => invoices.value.filter((i: any) => i.status === 'paid').length)
const pendingCount  = computed(() => invoices.value.filter((i: any) => i.status === 'pending').length)
const pendingAmount = computed(() => invoices.value.filter((i: any) => i.status === 'pending').reduce((s: number, i: any) => s + Number(i.amount), 0))
const activeOrders  = computed(() => orders.value.filter((o: any) => ['pending','processing','shipped'].includes(o.status)).length)
</script>
