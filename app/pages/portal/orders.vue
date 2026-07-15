<template>
  <div class="page">
    <div class="card">
      <div class="card-header">
        <span class="card-title">Meine Bestellungen</span>
      </div>
      <table class="data-table">
        <thead>
          <tr><th>Bestellung</th><th>Datum</th><th>Artikel</th><th>Betrag</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr v-if="!orders.length">
            <td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">Keine Bestellungen</td>
          </tr>
          <tr v-for="o in orders" :key="o.orderId">
            <td class="td-name">{{ o.orderId?.slice(0,8).toUpperCase() }}</td>
            <td style="font-size:12px">{{ o.created?.slice(0,10) }}</td>
            <td style="font-size:12px">{{ (o.items || []).map((i: any) => `${i.name} ×${i.qty}`).join(', ') }}</td>
            <td>{{ formatEur(orderTotal(o)) }}</td>
            <td><span class="badge" :class="'badge-'+o.status">{{ orderLabel[o.status] || o.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatEur } from '~/modules/finance'

definePageMeta({ layout: 'portal', middleware: 'auth' })

const orderLabel: Record<string, string> = {
  pending: 'Ausstehend', processing: 'In Bearbeitung',
  shipped: 'Versendet',  delivered:  'Geliefert', cancelled: 'Storniert',
}

const { data }  = await usePortalFetch('/api/portal/orders')
const orders = computed(() => (data.value as any)?.orders || [])

function orderTotal(o: any): number {
  return (o.items || []).reduce((sum: number, i: any) => sum + (Number(i.price) || 0) * (Number(i.qty) || 0), 0)
}
</script>
