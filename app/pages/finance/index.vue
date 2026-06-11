<template>
  <div class="page">

    <div class="stats-grid">
      <div class="stat-card">
        <i class="ti ti-circle-check stat-icon"></i>
        <div class="stat-label">Bezahlt</div>
        <div class="stat-value" style="color:#00D4B4">{{ formatEur(revenue) }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ paidCount }} Rechnungen</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-clock stat-icon"></i>
        <div class="stat-label">Ausstehend</div>
        <div class="stat-value">{{ formatEur(pending) }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ pendingCount }} offen</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-alert-circle stat-icon"></i>
        <div class="stat-label">Überfällig</div>
        <div class="stat-value" style="color:#E05C5C">{{ formatEur(overdue) }}</div>
        <div class="stat-delta down"><i class="ti ti-arrow-down-right"></i> {{ overdueCount }} überfällig</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-receipt stat-icon"></i>
        <div class="stat-label">Rechnungen gesamt</div>
        <div class="stat-value">{{ invoices.length }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ formatEur(revenue + pending + overdue) }} total</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Rechnungen</span>
        <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" @click="showAdd=true">
          <i class="ti ti-plus"></i> Neue Rechnung
        </button>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Nummer</th>
            <th>Kunde</th>
            <th>Betrag</th>
            <th>Fälligkeit</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!invoices.length">
            <td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">Keine Rechnungen</td>
          </tr>
          <tr v-for="i in invoices" :key="i.invoiceId">
            <td class="td-name">{{ i.number }}</td>
            <td>{{ i.client }}</td>
            <td>{{ formatEur(i.amount) }}</td>
            <td style="font-size:12px">{{ i.dueDate }}</td>
            <td><span class="badge" :class="statusBadge(i.status)">{{ statusLabel(i.status) }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showAdd" class="modal-overlay" @click.self="showAdd=false">
      <div class="modal-card">
        <div class="modal-header">
          <span class="card-title">Neue Rechnung</span>
          <button class="icon-btn" @click="showAdd=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-field"><label>Kunde</label><input v-model="newInv.client" placeholder="Firma GmbH" /></div>
          <div class="auth-field"><label>Betrag (€)</label><input v-model.number="newInv.amount" type="number" placeholder="10000" /></div>
          <div class="auth-field"><label>Fälligkeitsdatum</label><input v-model="newInv.dueDate" type="date" /></div>
          <div class="auth-field">
            <label>Status</label>
            <select v-model="newInv.status" style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:8px;padding:10px 14px;font-size:14px;color:var(--text-primary);width:100%;outline:none">
              <option value="pending">Ausstehend</option>
              <option value="paid">Bezahlt</option>
              <option value="overdue">Überfällig</option>
            </select>
          </div>
          <button class="auth-btn" :disabled="saving" @click="addInvoice">
            <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else>Rechnung speichern</span>
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { calcRevenue, calcPending, calcOverdue, formatEur, statusLabel, statusBadge } from '~/modules/finance'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const { data, refresh } = await useFetch('/api/finance')
const invoices = computed(() => (data.value as any)?.invoices || [])

const revenue  = computed(() => calcRevenue(invoices.value))
const pending  = computed(() => calcPending(invoices.value))
const overdue  = computed(() => calcOverdue(invoices.value))
const paidCount    = computed(() => invoices.value.filter((i: any) => i.status === 'paid').length)
const pendingCount = computed(() => invoices.value.filter((i: any) => i.status === 'pending').length)
const overdueCount = computed(() => invoices.value.filter((i: any) => i.status === 'overdue').length)

const showAdd = ref(false)
const saving  = ref(false)
const newInv  = reactive({ client: '', amount: 0, dueDate: '', status: 'pending' })

async function addInvoice() {
  saving.value = true
  await $fetch('/api/finance', { method: 'POST', body: { ...newInv, userId: 'demo-user' } })
  await refresh()
  showAdd.value = false
  Object.assign(newInv, { client: '', amount: 0, dueDate: '', status: 'pending' })
  saving.value = false
}
</script>
