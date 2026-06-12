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

const { data } = await useFetch('/api/portal/invoices')
const invoices = computed(() => (data.value as any)?.invoices || [])

function downloadPdf(invoice: any) {
  navigateTo(`/api/portal/invoices/${invoice.invoiceId}/pdf`, { external: true, open: { target: '_blank' } })
}
</script>
