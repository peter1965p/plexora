<template>
  <div class="page">
    <div class="card">
      <div class="card-header">
        <span class="card-title">Meine Rechnungen</span>
      </div>
      <table class="data-table">
        <thead>
          <tr><th>Nummer</th><th>Betrag</th><th>Fälligkeit</th><th>Status</th><th style="width:80px">PDF</th></tr>
        </thead>
        <tbody>
          <tr v-if="!invoices.length">
            <td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">Keine Rechnungen</td>
          </tr>
          <tr v-for="i in invoices" :key="i.invoiceId">
            <td class="td-name">{{ i.number }}</td>
            <td>{{ formatEur(i.amount) }}</td>
            <td style="font-size:12px">{{ i.dueDate }}</td>
            <td><span class="badge" :class="statusBadge(i.status)">{{ statusLabel(i.status) }}</span></td>
            <td>
              <button class="icon-btn" title="PDF herunterladen" @click="downloadPdf(i)">
                <i class="ti ti-download"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatEur, statusLabel, statusBadge } from '~/modules/finance'

definePageMeta({ layout: 'portal', middleware: 'auth' })

const userEmail = ref('')
onMounted(async () => {
  const { useAuthUser } = await import('~/composables/useAuth')
  const u = await useAuthUser()
  userEmail.value = u.email
})

const { data, refresh } = usePortalFetch('/api/portal/invoices', userEmail)
const invoices = computed(() => (data.value as any)?.invoices || [])

function downloadPdf(invoice: any) {
  window.location.href = `/api/finance/${invoice.invoiceId}/pdf?userId=${invoice.userId}`
}
</script>
