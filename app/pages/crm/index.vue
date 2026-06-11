<template>
  <div class="page">

    <!-- STATS -->
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
          <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" @click="showAddContact=true">
            <i class="ti ti-plus"></i> Neu
          </button>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Unternehmen</th>
              <th>E-Mail</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!contacts.length">
              <td colspan="4" style="text-align:center;color:var(--text-muted);padding:24px">Keine Kontakte</td>
            </tr>
            <tr v-for="c in contacts" :key="c.contactId">
              <td class="td-name">{{ c.firstName }} {{ c.lastName }}</td>
              <td>{{ c.company }}</td>
              <td style="font-size:12px">{{ c.email }}</td>
              <td><span class="badge" :class="statusBadge(c.status)">{{ statusLabel(c.status) }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- DEALS -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Deals</span>
          <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" @click="showAddDeal=true">
            <i class="ti ti-plus"></i> Neu
          </button>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Unternehmen</th>
              <th>Wert</th>
              <th>Phase</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!deals.length">
              <td colspan="4" style="text-align:center;color:var(--text-muted);padding:24px">Keine Deals</td>
            </tr>
            <tr v-for="d in deals" :key="d.dealId">
              <td class="td-name">{{ d.name }}</td>
              <td>{{ d.value }}</td>
              <td>{{ d.stage }}</td>
              <td><span class="badge" :class="'badge-'+d.status">{{ dealStageLabel[d.status] }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ADD CONTACT MODAL -->
    <div v-if="showAddContact" class="modal-overlay" @click.self="showAddContact=false">
      <div class="modal-card">
        <div class="modal-header">
          <span class="card-title">Neuer Kontakt</span>
          <button class="icon-btn" @click="showAddContact=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-row">
            <div class="auth-field"><label>Vorname</label><input v-model="newContact.firstName" placeholder="Max" /></div>
            <div class="auth-field"><label>Nachname</label><input v-model="newContact.lastName" placeholder="Mustermann" /></div>
          </div>
          <div class="auth-field"><label>E-Mail</label><input v-model="newContact.email" placeholder="max@firma.de" /></div>
          <div class="auth-field"><label>Unternehmen</label><input v-model="newContact.company" placeholder="Firma GmbH" /></div>
          <div class="auth-field"><label>Telefon</label><input v-model="newContact.phone" placeholder="+49 89 123456" /></div>
          <div class="auth-field">
            <label>Status</label>
            <select v-model="newContact.status" style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:8px;padding:10px 14px;font-size:14px;color:var(--text-primary);width:100%;outline:none">
              <option value="lead">Lead</option>
              <option value="customer">Kunde</option>
              <option value="churned">Verloren</option>
            </select>
          </div>
          <button class="auth-btn" :disabled="saving" @click="addContact">
            <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else>Kontakt speichern</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ADD DEAL MODAL -->
    <div v-if="showAddDeal" class="modal-overlay" @click.self="showAddDeal=false">
      <div class="modal-card">
        <div class="modal-header">
          <span class="card-title">Neuer Deal</span>
          <button class="icon-btn" @click="showAddDeal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-field"><label>Unternehmen</label><input v-model="newDeal.name" placeholder="Firma GmbH" /></div>
          <div class="auth-field"><label>Wert</label><input v-model="newDeal.value" placeholder="€ 10.000" /></div>
          <div class="auth-field"><label>Phase</label><input v-model="newDeal.stage" placeholder="Discovery" /></div>
          <div class="auth-field">
            <label>Wahrscheinlichkeit %</label>
            <input v-model.number="newDeal.prob" type="number" min="0" max="100" placeholder="50" />
          </div>
          <div class="auth-field">
            <label>Status</label>
            <select v-model="newDeal.status" style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:8px;padding:10px 14px;font-size:14px;color:var(--text-primary);width:100%;outline:none">
              <option value="info">In Arbeit</option>
              <option value="warning">Verhandlung</option>
              <option value="success">Gewonnen</option>
              <option value="danger">Verloren</option>
            </select>
          </div>
          <button class="auth-btn" :disabled="saving" @click="addDeal">
            <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else>Deal speichern</span>
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { calcWeightedPipeline, calcTotalValue, calcWinRate, formatEur, stageLabel as dealStageLabel } from '~/modules/deals'
import { statusLabel, statusBadge } from '~/modules/contacts'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const { data: dealsData,    refresh: refreshDeals    } = await useFetch('/api/deals')
const { data: contactsData, refresh: refreshContacts } = await useFetch('/api/contacts')

const deals    = computed(() => (dealsData.value as any)?.deals    || [])
const contacts = computed(() => (contactsData.value as any)?.contacts || [])

const totalValue = computed(() => calcTotalValue(deals.value))
const weighted   = computed(() => calcWeightedPipeline(deals.value))
const winRate    = computed(() => calcWinRate(deals.value))
const wonDeals   = computed(() => deals.value.filter((d: any) => d.status === 'success').length)
const customers  = computed(() => contacts.value.filter((c: any) => c.status === 'customer').length)

const showAddContact = ref(false)
const showAddDeal    = ref(false)
const saving         = ref(false)

const newContact = reactive({ firstName: '', lastName: '', email: '', company: '', phone: '', status: 'lead' })
const newDeal    = reactive({ name: '', value: '', stage: '', prob: 50, status: 'info' })

async function addContact() {
  saving.value = true
  await $fetch('/api/contacts', { method: 'POST', body: { ...newContact, userId: 'demo-user' } })
  await refreshContacts()
  showAddContact.value = false
  Object.assign(newContact, { firstName: '', lastName: '', email: '', company: '', phone: '', status: 'lead' })
  saving.value = false
}

async function addDeal() {
  saving.value = true
  await $fetch('/api/deals', { method: 'POST', body: { ...newDeal, userId: 'demo-user' } })
  await refreshDeals()
  showAddDeal.value = false
  Object.assign(newDeal, { name: '', value: '', stage: '', prob: 50, status: 'info' })
  saving.value = false
}
</script>
