<template>
  <div class="page">
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

const userId = ref("")
const userEmail = ref("")
onMounted(async () => {
  const { useAuthUser } = await import('~/composables/useAuth')
  const u = await useAuthUser()
  userId.value = u.userId
  userEmail.value = u.email
})

const orderLabel: Record<string, string> = {
  pending:   'Ausstehend',
  processing:'In Bearbeitung',
  shipped:   'Versendet',
  delivered: 'Geliefert',
  cancelled: 'Storniert',
}

const { data: invData }   = usePortalFetch('/api/portal/invoices', userEmail)
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
