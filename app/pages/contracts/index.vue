<template>
  <div class="page">

    <div class="stats-grid">
      <div class="stat-card">
        <i class="ti ti-files stat-icon"></i>
        <div class="stat-label">Verträge gesamt</div>
        <div class="stat-value">{{ contracts.length }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ activeCount }} aktiv</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-circle-check stat-icon"></i>
        <div class="stat-label">Aktive Verträge</div>
        <div class="stat-value">{{ activeCount }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ autoRenewCount }} auto-verlängernd</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-trending-up stat-icon"></i>
        <div class="stat-label">MRR (geschätzt)</div>
        <div class="stat-value">{{ formatEur(mrr) }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> ~{{ formatEur(mrr * 12) }} / Jahr</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-alert-triangle stat-icon"></i>
        <div class="stat-label">Laufen bald aus</div>
        <div class="stat-value">{{ expiring }}</div>
        <div class="stat-delta">in den nächsten 30 Tagen / Kündigungsfrist</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:14px">
      <div class="card-header">
        <span class="card-title">Verträge</span>
        <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" @click="openAdd">
          <i class="ti ti-plus"></i> Neu
        </button>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Titel</th><th>Unternehmen</th><th>Typ</th><th>Wert</th><th>Laufzeit</th><th>Status</th><th style="width:64px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!contracts.length">
            <td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px">Keine Verträge</td>
          </tr>
          <tr v-for="c in contracts" :key="c.contractId">
            <td class="td-name">
              {{ c.title }}
              <i v-if="c.autoRenew" class="ti ti-refresh" title="Automatische Verlängerung" style="color:var(--text-muted);margin-left:4px"></i>
            </td>
            <td>{{ companyName(c) }}</td>
            <td>{{ typeLabel(c.type) }}</td>
            <td style="font-size:13px">{{ c.value || '—' }} <span style="color:var(--text-muted)">{{ billingCycleLabel(c.billingCycle) }}</span></td>
            <td style="font-size:12px">
              <div>{{ c.endDate ? fmtDate(c.endDate) : '—' }}</div>
              <span v-if="expiryInfo(c)" class="badge" :class="expiryInfo(c)!.badge" style="margin-top:2px;display:inline-block">{{ expiryInfo(c)!.label }}</span>
            </td>
            <td><span class="badge" :class="statusBadge(c.status)">{{ statusLabel(c.status) }}</span></td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="icon-btn" @click="openEdit(c)"><i class="ti ti-pencil"></i></button>
                <button class="icon-btn" style="color:var(--danger)" @click="deleteContract(c)"><i class="ti ti-trash"></i></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- CONTRACT MODAL -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal=false">
      <div class="modal-card">
        <div class="modal-header">
          <span class="card-title">{{ editing ? 'Vertrag bearbeiten' : 'Neuer Vertrag' }}</span>
          <button class="icon-btn" @click="showModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-field"><label>Titel</label><input v-model="form.title" placeholder="Hosting-Vertrag" /></div>
          <div class="auth-row">
            <div class="auth-field"><label>Vertragsnummer</label><input v-model="form.contractNumber" placeholder="V-2026-001" /></div>
            <div class="auth-field">
              <label>Typ</label>
              <select v-model="form.type" class="form-select">
                <option value="service">Dienstleistung</option>
                <option value="license">Lizenz</option>
                <option value="maintenance">Wartung</option>
                <option value="rental">Miete</option>
                <option value="insurance">Versicherung</option>
                <option value="other">Sonstiges</option>
              </select>
            </div>
          </div>

          <div class="auth-field">
            <label>Unternehmen</label>
            <select v-model="form.companyId" class="form-select">
              <option value="">— kein Unternehmen verknüpft —</option>
              <option v-for="co in companies" :key="co.companyId" :value="co.companyId">{{ co.name }}</option>
            </select>
          </div>
          <div class="auth-field">
            <label>Ansprechpartner</label>
            <select v-model="form.contactId" class="form-select">
              <option value="">— kein Kontakt verknüpft —</option>
              <option v-for="ct in contacts" :key="ct.contactId" :value="ct.contactId">{{ ct.firstName }} {{ ct.lastName }}</option>
            </select>
          </div>

          <div class="auth-row">
            <div class="auth-field"><label>Beginn</label><input v-model="form.startDate" type="date" /></div>
            <div class="auth-field"><label>Ende</label><input v-model="form.endDate" type="date" /></div>
          </div>

          <div class="auth-row">
            <div class="auth-field"><label>Wert</label><input v-model="form.value" placeholder="€ 99" /></div>
            <div class="auth-field">
              <label>Abrechnung</label>
              <select v-model="form.billingCycle" class="form-select">
                <option value="monthly">Monatlich</option>
                <option value="quarterly">Quartalsweise</option>
                <option value="yearly">Jährlich</option>
                <option value="once">Einmalig</option>
              </select>
            </div>
          </div>

          <div class="auth-row">
            <div class="auth-field"><label>Kündigungsfrist (Tage)</label><input v-model.number="form.noticePeriodDays" type="number" min="0" placeholder="30" /></div>
            <div class="auth-field" style="display:flex;align-items:center;gap:8px;padding-top:22px">
              <input v-model="form.autoRenew" type="checkbox" id="autoRenew" style="width:16px;height:16px" />
              <label for="autoRenew" style="margin:0">Automatische Verlängerung</label>
            </div>
          </div>

          <div class="auth-field">
            <label>Status</label>
            <select v-model="form.status" class="form-select">
              <option value="draft">Entwurf</option>
              <option value="active">Aktiv</option>
              <option value="cancelled">Gekündigt</option>
              <option value="expired">Abgelaufen</option>
            </select>
          </div>

          <div class="auth-field"><label>Notizen</label><textarea v-model="form.notes" rows="2" placeholder="Interne Notizen..."></textarea></div>

          <button class="auth-btn" :disabled="saving" @click="save">
            <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else>{{ editing ? 'Speichern' : 'Vertrag anlegen' }}</span>
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import {
  typeLabel, statusLabel, statusBadge, billingCycleLabel,
  formatEur, calcMrr, expiryInfo, expiringCount,
} from '~/modules/contracts'
import type { Contract } from '~/modules/contracts'
import type { Company } from '~/modules/companies'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const userId = ref('demo-user')
onMounted(async () => {
  const { useAuthUser } = await import('~/composables/useAuth')
  const u = await useAuthUser()
  userId.value = u.userId
})

const { data: contractsData, refresh: refreshContracts } = await useFetch(useApiUrl('/api/contracts'))
const { data: companiesData } = await useFetch(useApiUrl('/api/companies'))
const { data: contactsData }  = await useFetch(useApiUrl('/api/contacts'))

const contracts = computed(() => (contractsData.value as any)?.contracts || [])
const companies = computed(() => (companiesData.value as any)?.companies || [])
const contacts  = computed(() => (contactsData.value as any)?.contacts  || [])

const activeCount    = computed(() => contracts.value.filter((c: Contract) => c.status === 'active').length)
const autoRenewCount = computed(() => contracts.value.filter((c: Contract) => c.autoRenew).length)
const mrr            = computed(() => calcMrr(contracts.value))
const expiring       = computed(() => expiringCount(contracts.value))

function companyName(c: Contract): string {
  if (!c.companyId) return '—'
  const co = companies.value.find((x: Company) => x.companyId === c.companyId)
  return co?.name || '—'
}

function fmtDate(iso: string): string {
  return iso ? new Date(iso).toLocaleDateString('de-DE') : ''
}

// ── Modal ─────────────────────────────────────────────
const showModal = ref(false)
const editing   = ref<Contract | null>(null)
const saving    = ref(false)
const form = reactive({
  title: '', contractNumber: '', type: 'service', companyId: '', contactId: '',
  startDate: '', endDate: '', value: '', billingCycle: 'monthly',
  autoRenew: false, noticePeriodDays: 30, status: 'active', notes: '',
})

function resetForm() {
  Object.assign(form, {
    title: '', contractNumber: '', type: 'service', companyId: '', contactId: '',
    startDate: '', endDate: '', value: '', billingCycle: 'monthly',
    autoRenew: false, noticePeriodDays: 30, status: 'active', notes: '',
  })
}

function openAdd() {
  editing.value = null
  resetForm()
  showModal.value = true
}

function openEdit(c: Contract) {
  editing.value = c
  Object.assign(form, {
    title: c.title, contractNumber: c.contractNumber || '', type: c.type,
    companyId: c.companyId || '', contactId: c.contactId || '',
    startDate: c.startDate || '', endDate: c.endDate || '', value: c.value || '',
    billingCycle: c.billingCycle, autoRenew: c.autoRenew || false,
    noticePeriodDays: c.noticePeriodDays ?? 30, status: c.status, notes: c.notes || '',
  })
  showModal.value = true
}

async function save() {
  saving.value = true
  try {
    if (editing.value) {
      await $fetch(useApiUrl(`/api/contracts/${editing.value.contractId}`), {
        method: 'PATCH',
        body: { ...form, userId: userId.value }
      })
    } else {
      await $fetch(useApiUrl('/api/contracts'), {
        method: 'POST',
        body: { ...form, userId: userId.value }
      })
    }
    await refreshContracts()
    showModal.value = false
  } finally {
    saving.value = false
  }
}

async function deleteContract(c: Contract) {
  if (!confirm(`Vertrag "${c.title}" wirklich löschen?`)) return
  await $fetch(useApiUrl(`/api/contracts/${c.contractId}`), { method: 'DELETE' })
  await refreshContracts()
}
</script>
