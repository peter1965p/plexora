<template>
  <div class="page">

    <div class="stats-grid">
      <div class="stat-card">
        <i class="ti ti-users stat-icon"></i>
        <div class="stat-label">Kontakte gesamt</div>
        <div class="stat-value">{{ contacts.length }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ customers }} Kunden</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-briefcase stat-icon"></i>
        <div class="stat-label">Deals gesamt</div>
        <div class="stat-value">{{ deals.length }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ wonDeals }} gewonnen</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-trending-up stat-icon"></i>
        <div class="stat-label">Pipeline Wert</div>
        <div class="stat-value">{{ formatEur(totalValue) }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> gewichtet {{ formatEur(weighted) }}</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-target stat-icon"></i>
        <div class="stat-label">Win Rate</div>
        <div class="stat-value">{{ winRate }}%</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ wonDeals }} von {{ deals.length }}</div>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:14px">

      <!-- CONTACTS -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Kontakte</span>
          <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" @click="openAddContact">
            <i class="ti ti-plus"></i> Neu
          </button>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th><th>Unternehmen</th><th>E-Mail</th><th>Status</th><th style="width:64px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!contacts.length">
              <td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">Keine Kontakte</td>
            </tr>
            <tr v-for="c in contacts" :key="c.contactId">
              <td class="td-name">{{ c.firstName }} {{ c.lastName }}</td>
              <td>{{ c.company }}</td>
              <td style="font-size:12px">{{ c.email }}</td>
              <td><span class="badge" :class="statusBadge(c.status)">{{ statusLabel(c.status) }}</span></td>
              <td>
                <div style="display:flex;gap:4px">
                  <button class="icon-btn" @click="openEditContact(c)"><i class="ti ti-pencil"></i></button>
                  <button class="icon-btn" style="color:var(--danger)" @click="deleteContact(c)"><i class="ti ti-trash"></i></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- DEALS -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Deals</span>
          <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" @click="openAddDeal">
            <i class="ti ti-plus"></i> Neu
          </button>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Unternehmen</th><th>Wert</th><th>Phase</th><th>Status</th><th style="width:64px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!deals.length">
              <td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">Keine Deals</td>
            </tr>
            <tr v-for="d in deals" :key="d.dealId">
              <td class="td-name">{{ d.name }}</td>
              <td>{{ d.value }}</td>
              <td>{{ d.stage }}</td>
              <td><span class="badge" :class="'badge-'+d.status">{{ stageLabel[d.status] }}</span></td>
              <td>
                <div style="display:flex;gap:4px">
                  <button class="icon-btn" @click="openEditDeal(d)"><i class="ti ti-pencil"></i></button>
                  <button class="icon-btn" style="color:var(--danger)" @click="deleteDeal(d)"><i class="ti ti-trash"></i></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- CONTACT MODAL -->
    <div v-if="showContactModal" class="modal-overlay" @click.self="showContactModal=false">
      <div class="modal-card">
        <div class="modal-header">
          <span class="card-title">{{ editingContact ? 'Kontakt bearbeiten' : 'Neuer Kontakt' }}</span>
          <button class="icon-btn" @click="showContactModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-row">
            <div class="auth-field"><label>Vorname</label><input v-model="contactForm.firstName" placeholder="Max" /></div>
            <div class="auth-field"><label>Nachname</label><input v-model="contactForm.lastName" placeholder="Mustermann" /></div>
          </div>
          <div class="auth-field"><label>E-Mail</label><input v-model="contactForm.email" placeholder="max@firma.de" /></div>
          <div class="auth-field"><label>Unternehmen</label><input v-model="contactForm.company" placeholder="Firma GmbH" /></div>
          <div class="auth-field"><label>Telefon</label><input v-model="contactForm.phone" placeholder="+49 89 123456" /></div>
          <div class="auth-field">
            <label>Status</label>
            <select v-model="contactForm.status" class="form-select">
              <option value="lead">Lead</option>
              <option value="customer">Kunde</option>
              <option value="churned">Verloren</option>
            </select>
          </div>
          <button class="auth-btn" :disabled="saving" @click="saveContact">
            <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else>{{ editingContact ? 'Speichern' : 'Kontakt anlegen' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- DEAL MODAL -->
    <div v-if="showDealModal" class="modal-overlay" @click.self="showDealModal=false">
      <div class="modal-card">
        <div class="modal-header">
          <span class="card-title">{{ editingDeal ? 'Deal bearbeiten' : 'Neuer Deal' }}</span>
          <button class="icon-btn" @click="showDealModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-field"><label>Unternehmen</label><input v-model="dealForm.name" placeholder="Firma GmbH" /></div>
          <div class="auth-field"><label>Wert</label><input v-model="dealForm.value" placeholder="€ 10.000" /></div>
          <div class="auth-field"><label>Phase</label><input v-model="dealForm.stage" placeholder="Discovery" /></div>
          <div class="auth-field">
            <label>Wahrscheinlichkeit %</label>
            <input v-model.number="dealForm.prob" type="number" min="0" max="100" placeholder="50" />
          </div>
          <div class="auth-field">
            <label>Status</label>
            <select v-model="dealForm.status" class="form-select">
              <option value="info">In Arbeit</option>
              <option value="warning">Verhandlung</option>
              <option value="success">Gewonnen</option>
              <option value="danger">Verloren</option>
            </select>
          </div>
          <button class="auth-btn" :disabled="saving" @click="saveDeal">
            <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else>{{ editingDeal ? 'Speichern' : 'Deal anlegen' }}</span>
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { calcWeightedPipeline, calcTotalValue, calcWinRate, formatEur, stageLabel } from '~/modules/deals'
import { statusLabel, statusBadge } from '~/modules/contacts'
import type { Contact } from '~/modules/contacts'
import type { Deal } from '~/modules/deals'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const userId = ref('demo-user')
onMounted(async () => {
  const { useAuthUser } = await import('~/composables/useAuth')
  const u = await useAuthUser()
  userId.value = u.userId
})

const { data: dealsData,    refresh: refreshDeals    } = await useFetch('/api/deals')
const { data: contactsData, refresh: refreshContacts } = await useFetch('/api/contacts')

const deals    = computed(() => (dealsData.value as any)?.deals    || [])
const contacts = computed(() => (contactsData.value as any)?.contacts || [])

const totalValue = computed(() => calcTotalValue(deals.value))
const weighted   = computed(() => calcWeightedPipeline(deals.value))
const winRate    = computed(() => calcWinRate(deals.value))
const wonDeals   = computed(() => deals.value.filter((d: any) => d.status === 'success').length)
const customers  = computed(() => contacts.value.filter((c: any) => c.status === 'customer').length)

// ── Contact Modal ─────────────────────────────────────
const showContactModal = ref(false)
const editingContact   = ref<Contact | null>(null)
const saving           = ref(false)
const contactForm      = reactive({ firstName: '', lastName: '', email: '', company: '', phone: '', status: 'lead' })

function openAddContact() {
  editingContact.value = null
  Object.assign(contactForm, { firstName: '', lastName: '', email: '', company: '', phone: '', status: 'lead' })
  showContactModal.value = true
}

function openEditContact(c: Contact) {
  editingContact.value = c
  Object.assign(contactForm, { firstName: c.firstName, lastName: c.lastName, email: c.email, company: c.company, phone: c.phone || '', status: c.status })
  showContactModal.value = true
}

async function saveContact() {
  saving.value = true
  try {
    if (editingContact.value) {
      await $fetch(`/api/contacts/${editingContact.value.contactId}`, {
        method: 'PATCH',
        body: { ...contactForm, userId: userId.value }
      })
    } else {
      await $fetch('/api/contacts', {
        method: 'POST',
        body: { ...contactForm, userId: userId.value }
      })
    }
    await refreshContacts()
    showContactModal.value = false
  } finally {
    saving.value = false
  }
}

async function deleteContact(c: Contact) {
  if (!confirm(`${c.firstName} ${c.lastName} wirklich löschen?`)) return
  await $fetch(`/api/contacts/${c.contactId}`, {
    method: 'DELETE',
    body: { userId: userId.value }
  })
  await refreshContacts()
}

// ── Deal Modal ────────────────────────────────────────
const showDealModal = ref(false)
const editingDeal   = ref<Deal | null>(null)
const dealForm      = reactive({ name: '', value: '', stage: '', prob: 50, status: 'info' })

function openAddDeal() {
  editingDeal.value = null
  Object.assign(dealForm, { name: '', value: '', stage: '', prob: 50, status: 'info' })
  showDealModal.value = true
}

function openEditDeal(d: Deal) {
  editingDeal.value = d
  Object.assign(dealForm, { name: d.name, value: d.value, stage: d.stage, prob: d.prob, status: d.status })
  showDealModal.value = true
}

async function saveDeal() {
  saving.value = true
  try {
    if (editingDeal.value) {
      await $fetch(`/api/deals/${editingDeal.value.dealId}`, {
        method: 'PATCH',
        body: { ...dealForm, userId: userId.value }
      })
    } else {
      await $fetch('/api/deals', {
        method: 'POST',
        body: { ...dealForm, userId: userId.value }
      })
    }
    await refreshDeals()
    showDealModal.value = false
  } finally {
    saving.value = false
  }
}

async function deleteDeal(d: Deal) {
  if (!confirm(`Deal "${d.name}" wirklich löschen?`)) return
  await $fetch(`/api/deals/${d.dealId}`, {
    method: 'DELETE',
    body: { userId: userId.value }
  })
  await refreshDeals()
}
</script>
