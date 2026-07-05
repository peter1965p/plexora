<template>
  <div class="page">

    <div class="stats-grid">
      <div class="stat-card">
        <i class="ti ti-users stat-icon"></i>
        <div class="stat-label">{{ t.crm.totalContacts }}</div>
        <div class="stat-value">{{ contacts.length }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ customers }} {{ t.crm.customers }}</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-briefcase stat-icon"></i>
        <div class="stat-label">{{ t.crm.totalDeals }}</div>
        <div class="stat-value">{{ deals.length }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ wonDeals }} {{ t.crm.won }}</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-trending-up stat-icon"></i>
        <div class="stat-label">{{ t.crm.pipelineValue }}</div>
        <div class="stat-value">{{ formatEur(totalValue) }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ t.crm.weighted }} {{ formatEur(weighted) }}</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-target stat-icon"></i>
        <div class="stat-label">{{ t.crm.winRate }}</div>
        <div class="stat-value">{{ winRate }}%</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ wonDeals }} {{ t.crm.of }} {{ deals.length }}</div>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:14px">

      <!-- CONTACTS -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">{{ t.crm.contacts }}</span>
          <div style="display:flex;gap:8px">
            <button class="icon-btn" title="CSV" @click="exportContactsCsv"><i class="ti ti-file-type-csv"></i></button>
            <button class="icon-btn" title="Excel" @click="exportContactsXlsx"><i class="ti ti-file-spreadsheet"></i></button>
            <button class="icon-btn" title="Import" @click="showImportModal = true"><i class="ti ti-file-import"></i></button>
            <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" @click="openAddContact">
              <i class="ti ti-plus"></i> {{ t.common.new }}
            </button>
          </div>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ t.common.name }}</th><th>{{ t.common.company }}</th><th>E-Mail</th><th>{{ t.common.status }}</th><th>Lead</th><th style="width:100px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!contacts.length">
              <td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">{{ t.crm.noContacts }}</td>
            </tr>
            <tr v-for="c in contacts" :key="c.contactId">
              <td class="td-name">{{ c.firstName }} {{ c.lastName }}</td>
              <td>{{ companyName(c) }}</td>
              <td style="font-size:12px">{{ c.email }}</td>
              <td><span class="badge" :class="statusBadge(c.status)">{{ t.contactStatus[c.status] || statusLabel(c.status) }}</span></td>
              <td>
                <span v-if="c.status === 'lead'" class="badge" :class="leadStatusBadge(c.leadStatus)">{{ leadStatusLabel(c.leadStatus) }}</span>
                <span v-else style="color:var(--text-muted)">—</span>
              </td>
              <td>
                <div style="display:flex;gap:4px">
                  <button v-if="c.status === 'lead'" class="icon-btn" :title="t.crm.makeCustomer" @click="convertContact(c)"><i class="ti ti-user-check"></i></button>
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
          <span class="card-title">{{ t.crm.deals }}</span>
          <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" @click="openAddDeal">
            <i class="ti ti-plus"></i> {{ t.common.new }}
          </button>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ t.common.company }}</th><th>{{ t.common.value }}</th><th>{{ t.common.stage }}</th><th>{{ t.common.status }}</th><th style="width:64px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!deals.length">
              <td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">{{ t.crm.noDeals }}</td>
            </tr>
            <tr v-for="d in deals" :key="d.dealId">
              <td class="td-name">{{ d.name }}</td>
              <td>{{ d.value }}</td>
              <td>{{ d.stage }}</td>
              <td><span class="badge" :class="'badge-'+d.status">{{ t.dealStage[d.status] || stageLabel[d.status] }}</span></td>
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

    <!-- COMPANIES -->
    <div class="card" style="margin-bottom:14px">
      <div class="card-header">
        <span class="card-title">{{ t.crm.companies }}</span>
        <div style="display:flex;gap:8px">
          <button class="icon-btn" title="CSV" @click="exportCompaniesCsv"><i class="ti ti-file-type-csv"></i></button>
          <button class="icon-btn" title="Excel" @click="exportCompaniesXlsx"><i class="ti ti-file-spreadsheet"></i></button>
          <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" @click="openAddCompany">
            <i class="ti ti-plus"></i> {{ t.common.new }}
          </button>
        </div>
      </div>
      <table class="data-table">
        <thead>
          <tr><th>{{ t.common.name }}</th><th>{{ t.common.industry }}</th><th>{{ t.common.city }}</th><th>Website</th><th style="width:64px"></th></tr>
        </thead>
        <tbody>
          <tr v-if="!companies.length">
            <td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">{{ t.crm.noCompanies }}</td>
          </tr>
          <tr v-for="co in companies" :key="co.companyId">
            <td class="td-name">{{ co.name }}</td>
            <td>{{ co.branche || '—' }}</td>
            <td>{{ co.city || '—' }}</td>
            <td style="font-size:12px">
              <a v-if="co.website" :href="co.website" target="_blank" rel="noopener">{{ co.website }}</a>
              <span v-else>—</span>
            </td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="icon-btn" @click="openEditCompany(co)"><i class="ti ti-pencil"></i></button>
                <button class="icon-btn" style="color:var(--danger)" @click="deleteCompany(co)"><i class="ti ti-trash"></i></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- CONTACT MODAL -->
    <div v-if="showContactModal" class="modal-overlay" @click.self="showContactModal=false">
      <div class="modal-card">
        <div class="modal-header">
          <span class="card-title">{{ editingContact ? t.crm.editContact : t.crm.newContact }}</span>
          <button class="icon-btn" @click="showContactModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-row">
            <div class="auth-field"><label>{{ t.crm.firstName }}</label><input v-model="contactForm.firstName" placeholder="Max" /></div>
            <div class="auth-field"><label>{{ t.crm.lastName }}</label><input v-model="contactForm.lastName" placeholder="Mustermann" /></div>
          </div>
          <div class="auth-field"><label>E-Mail</label><input v-model="contactForm.email" placeholder="max@firma.de" /></div>

          <div class="auth-field">
            <label>{{ t.crm.companyDb }}</label>
            <select v-model="contactForm.companyId" class="form-select" @change="onCompanySelect">
              <option value="">{{ t.crm.noCompanyLinked }}</option>
              <option v-for="co in companies" :key="co.companyId" :value="co.companyId">{{ co.name }}</option>
            </select>
          </div>
          <div class="auth-field"><label>{{ t.crm.companyFreetext }}</label><input v-model="contactForm.company" placeholder="Firma GmbH" /></div>

          <div class="auth-field"><label>{{ t.common.phone }}</label><input v-model="contactForm.phone" placeholder="+49 89 123456" /></div>

          <div class="auth-row">
            <div class="auth-field">
              <label>{{ t.common.status }}</label>
              <select v-model="contactForm.status" class="form-select">
                <option value="lead">{{ t.crm.optLead }}</option>
                <option value="customer">{{ t.crm.optCustomer }}</option>
                <option value="churned">{{ t.crm.optChurned }}</option>
              </select>
            </div>
            <div class="auth-field">
              <label>{{ t.crm.leadSourceLabel }}</label>
              <select v-model="contactForm.leadSource" class="form-select">
                <option value="manual">{{ t.crm.srcManual }}</option>
                <option value="csv-import">{{ t.crm.srcCsv }}</option>
                <option value="landingpage">{{ t.crm.srcLandingpage }}</option>
                <option value="referral">{{ t.crm.srcReferral }}</option>
                <option value="other">{{ t.crm.srcOther }}</option>
              </select>
            </div>
          </div>

          <div class="auth-field" v-if="contactForm.status === 'lead'">
            <label>{{ t.crm.leadStatusLabel }}</label>
            <select v-model="contactForm.leadStatus" class="form-select">
              <option value="new">{{ t.crm.lsNew }}</option>
              <option value="contacted">{{ t.crm.lsContacted }}</option>
              <option value="qualified">{{ t.crm.lsQualified }}</option>
              <option value="unqualified">{{ t.crm.lsUnqualified }}</option>
            </select>
          </div>

          <button class="auth-btn" :disabled="saving" @click="saveContact">
            <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else>{{ editingContact ? t.common.save : t.crm.createContact }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- DEAL MODAL -->
    <div v-if="showDealModal" class="modal-overlay" @click.self="showDealModal=false">
      <div class="modal-card">
        <div class="modal-header">
          <span class="card-title">{{ editingDeal ? t.crm.editDeal : t.crm.newDeal }}</span>
          <button class="icon-btn" @click="showDealModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-field"><label>{{ t.common.company }}</label><input v-model="dealForm.name" placeholder="Firma GmbH" /></div>
          <div class="auth-field"><label>{{ t.common.value }}</label><input v-model="dealForm.value" placeholder="€ 10.000" /></div>
          <div class="auth-field"><label>{{ t.common.stage }}</label><input v-model="dealForm.stage" placeholder="Discovery" /></div>
          <div class="auth-field">
            <label>{{ t.crm.dealProb }}</label>
            <input v-model.number="dealForm.prob" type="number" min="0" max="100" placeholder="50" />
          </div>
          <div class="auth-field">
            <label>{{ t.common.status }}</label>
            <select v-model="dealForm.status" class="form-select">
              <option value="info">{{ t.crm.dsInProgress }}</option>
              <option value="warning">{{ t.crm.dsNegotiation }}</option>
              <option value="success">{{ t.crm.dsWon }}</option>
              <option value="danger">{{ t.crm.dsLost }}</option>
            </select>
          </div>
          <button class="auth-btn" :disabled="saving" @click="saveDeal">
            <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else>{{ editingDeal ? t.common.save : t.crm.createDeal }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- COMPANY MODAL -->
    <div v-if="showCompanyModal" class="modal-overlay" @click.self="showCompanyModal=false">
      <div class="modal-card">
        <div class="modal-header">
          <span class="card-title">{{ editingCompany ? t.crm.editCompany : t.crm.newCompany }}</span>
          <button class="icon-btn" @click="showCompanyModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-field"><label>{{ t.common.name }}</label><input v-model="companyForm.name" placeholder="Firma GmbH" /></div>
          <div class="auth-row">
            <div class="auth-field"><label>{{ t.common.industry }}</label><input v-model="companyForm.branche" placeholder="IT" /></div>
            <div class="auth-field"><label>Website</label><input v-model="companyForm.website" placeholder="https://firma.de" /></div>
          </div>
          <div class="auth-row">
            <div class="auth-field"><label>E-Mail</label><input v-model="companyForm.email" placeholder="info@firma.de" /></div>
            <div class="auth-field"><label>{{ t.common.phone }}</label><input v-model="companyForm.phone" placeholder="+49 123456" /></div>
          </div>
          <div class="auth-field"><label>{{ t.common.street }}</label><input v-model="companyForm.street" placeholder="Musterstraße 1" /></div>
          <div class="auth-row">
            <div class="auth-field"><label>{{ t.common.zip }}</label><input v-model="companyForm.zip" placeholder="12345" /></div>
            <div class="auth-field"><label>{{ t.common.city }}</label><input v-model="companyForm.city" placeholder="Köln" /></div>
          </div>
          <div class="auth-field"><label>{{ t.common.country }}</label><input v-model="companyForm.country" placeholder="Deutschland" /></div>
          <div class="auth-field"><label>{{ t.common.notes }}</label><textarea v-model="companyForm.notes" rows="2" :placeholder="t.crm.internalNotes"></textarea></div>
          <button class="auth-btn" :disabled="saving" @click="saveCompany">
            <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else>{{ editingCompany ? t.common.save : t.crm.createCompany }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- IMPORT MODAL -->
    <ImportContactsModal
      :show="showImportModal"
      :companies="companies"
      :user-id="userId"
      @close="showImportModal = false"
      @imported="refreshContacts"
    />

  </div>
</template>

<script setup lang="ts">
import { calcWeightedPipeline, calcTotalValue, calcWinRate, formatEur, stageLabel } from '~/modules/deals'
import { statusLabel, statusBadge, leadStatusLabel, leadStatusBadge, leadSourceLabel } from '~/modules/contacts'
import { exportToCsv, exportToXlsx } from '~/modules/export'
import type { Contact } from '~/modules/contacts'
import type { Deal } from '~/modules/deals'
import type { Company } from '~/modules/companies'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })
const { t, lang } = useLang()
const { userId, idToken } = await useAuthUser()
const authHeaders = { Authorization: `Bearer ${idToken}` }
const route = useRoute()

onMounted(() => {
  const editId = route.query.edit as string | undefined
  if (editId) {
    const c = contacts.value.find((x: Contact) => x.contactId === editId)
    if (c) openEditContact(c)
  }
  if (route.query.new === 'contact') openAddContact()
  if (route.query.new === 'deal') openAddDeal()
})

const { data: dealsData,     refresh: refreshDeals     } = await useFetch(() => useApiUrl(`/api/deals?userId=${encodeURIComponent(userId)}`), { headers: authHeaders })
const { data: contactsData,  refresh: refreshContacts  } = await useFetch(() => useApiUrl(`/api/contacts?userId=${encodeURIComponent(userId)}`), { headers: authHeaders })
const { data: companiesData, refresh: refreshCompanies } = await useFetch(() => useApiUrl(`/api/companies?userId=${encodeURIComponent(userId)}`), { headers: authHeaders })

const deals     = computed(() => (dealsData.value as any)?.deals    || [])
const contacts  = computed(() => (contactsData.value as any)?.contacts || [])
const companies = computed(() => (companiesData.value as any)?.companies || [])

const totalValue = computed(() => calcTotalValue(deals.value))
const weighted   = computed(() => calcWeightedPipeline(deals.value))
const winRate    = computed(() => calcWinRate(deals.value))
const wonDeals   = computed(() => deals.value.filter((d: any) => d.status === 'success').length)
const customers  = computed(() => contacts.value.filter((c: any) => c.status === 'customer').length)

function companyName(c: Contact): string {
  if (c.companyId) {
    const co = companies.value.find((x: Company) => x.companyId === c.companyId)
    if (co) return co.name
  }
  return c.company || '—'
}

// ── Export ────────────────────────────────────────────
function fmtDate(iso: string): string {
  return iso ? new Date(iso).toLocaleDateString('de-DE') : ''
}

function contactsExportRows() {
  return contacts.value.map((c: Contact) => ({
    Vorname: c.firstName,
    Nachname: c.lastName,
    'E-Mail': c.email,
    Unternehmen: companyName(c),
    Telefon: c.phone || '',
    Status: statusLabel(c.status),
    'Lead-Status': leadStatusLabel(c.leadStatus),
    'Lead-Quelle': leadSourceLabel(c.leadSource),
    Erstellt: fmtDate(c.created),
  }))
}
function exportContactsCsv() {
  exportToCsv(`kontakte-${new Date().toISOString().slice(0, 10)}.csv`, contactsExportRows())
}
function exportContactsXlsx() {
  exportToXlsx(`kontakte-${new Date().toISOString().slice(0, 10)}.xlsx`, contactsExportRows(), 'Kontakte')
}

function companiesExportRows() {
  return companies.value.map((co: Company) => ({
    Name: co.name,
    Branche: co.branche || '',
    Website: co.website || '',
    'E-Mail': co.email || '',
    Telefon: co.phone || '',
    Strasse: co.street || '',
    PLZ: co.zip || '',
    Stadt: co.city || '',
    Land: co.country || '',
    Notizen: co.notes || '',
    Erstellt: fmtDate(co.created),
  }))
}
function exportCompaniesCsv() {
  exportToCsv(`unternehmen-${new Date().toISOString().slice(0, 10)}.csv`, companiesExportRows())
}
function exportCompaniesXlsx() {
  exportToXlsx(`unternehmen-${new Date().toISOString().slice(0, 10)}.xlsx`, companiesExportRows(), 'Unternehmen')
}

// ── Import Modal ──────────────────────────────────────
const showImportModal = ref(false)

// ── Contact Modal ─────────────────────────────────────
const showContactModal = ref(false)
const editingContact   = ref<Contact | null>(null)
const saving           = ref(false)
const contactForm      = reactive({
  firstName: '', lastName: '', email: '', company: '', companyId: '', phone: '',
  status: 'lead', leadSource: 'manual', leadStatus: 'new',
})

function onCompanySelect() {
  const co = companies.value.find((x: Company) => x.companyId === contactForm.companyId)
  if (co) contactForm.company = co.name
}

function openAddContact() {
  editingContact.value = null
  Object.assign(contactForm, {
    firstName: '', lastName: '', email: '', company: '', companyId: '', phone: '',
    status: 'lead', leadSource: 'manual', leadStatus: 'new',
  })
  showContactModal.value = true
}

function openEditContact(c: Contact) {
  editingContact.value = c
  Object.assign(contactForm, {
    firstName: c.firstName, lastName: c.lastName, email: c.email,
    company: c.company || '', companyId: c.companyId || '', phone: c.phone || '',
    status: c.status, leadSource: c.leadSource || 'manual', leadStatus: c.leadStatus || 'new',
  })
  showContactModal.value = true
  $fetch(useApiUrl(`/api/contacts/${c.contactId}/touch`), { method: 'POST', headers: authHeaders }).catch(() => {})
}

async function saveContact() {
  saving.value = true
  try {
    if (editingContact.value) {
      await $fetch(useApiUrl(`/api/contacts/${editingContact.value.contactId}`), {
        method: 'PATCH',
        headers: authHeaders,
        body: { ...contactForm, userId: userId }
      })
    } else {
      await $fetch(useApiUrl('/api/contacts'), {
        method: 'POST',
        headers: authHeaders,
        body: { ...contactForm, userId: userId }
      })
    }
    await refreshContacts()
    showContactModal.value = false
  } finally {
    saving.value = false
  }
}

const { openConfirm } = useConfirm()

async function deleteContact(c: Contact) {
  if (!await openConfirm({ title: 'Kontakt löschen?', name: `${c.firstName} ${c.lastName}` })) return
  await $fetch(useApiUrl(`/api/contacts/${c.contactId}`), {
    method: 'DELETE',
    headers: authHeaders,
    body: { userId: userId }
  })
  await refreshContacts()
}

async function convertContact(c: Contact) {
  if (!await openConfirm({ title: 'Zu Kunde konvertieren?', name: `${c.firstName} ${c.lastName}`, sub: 'Der Kontakt-Status wird auf "Kunde" gesetzt.', icon: 'ti-user-check' })) return
  await $fetch(useApiUrl(`/api/contacts/${c.contactId}/convert`), { method: 'POST', headers: authHeaders })
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
      await $fetch(useApiUrl(`/api/deals/${editingDeal.value.dealId}`), {
        method: 'PATCH',
        headers: authHeaders,
        body: { ...dealForm, userId: userId }
      })
    } else {
      await $fetch(useApiUrl('/api/deals'), {
        method: 'POST',
        headers: authHeaders,
        body: { ...dealForm, userId: userId }
      })
    }
    await refreshDeals()
    showDealModal.value = false
  } finally {
    saving.value = false
  }
}

async function deleteDeal(d: Deal) {
  if (!await openConfirm({ title: 'Deal löschen?', name: d.name })) return
  await $fetch(useApiUrl(`/api/deals/${d.dealId}`), {
    method: 'DELETE',
    headers: authHeaders,
    body: { userId: userId }
  })
  await refreshDeals()
}

// ── Company Modal ─────────────────────────────────────
const showCompanyModal = ref(false)
const editingCompany   = ref<Company | null>(null)
const companyForm      = reactive({
  name: '', website: '', branche: '', email: '', phone: '',
  street: '', zip: '', city: '', country: '', notes: '',
})

function openAddCompany() {
  editingCompany.value = null
  Object.assign(companyForm, {
    name: '', website: '', branche: '', email: '', phone: '',
    street: '', zip: '', city: '', country: '', notes: '',
  })
  showCompanyModal.value = true
}

function openEditCompany(co: Company) {
  editingCompany.value = co
  Object.assign(companyForm, {
    name: co.name, website: co.website || '', branche: co.branche || '',
    email: co.email || '', phone: co.phone || '', street: co.street || '',
    zip: co.zip || '', city: co.city || '', country: co.country || '', notes: co.notes || '',
  })
  showCompanyModal.value = true
}

async function saveCompany() {
  saving.value = true
  try {
    if (editingCompany.value) {
      await $fetch(useApiUrl(`/api/companies/${editingCompany.value.companyId}`), {
        method: 'PATCH',
        headers: authHeaders,
        body: { ...companyForm, userId: userId }
      })
    } else {
      await $fetch(useApiUrl('/api/companies'), {
        method: 'POST',
        headers: authHeaders,
        body: { ...companyForm, userId: userId }
      })
    }
    await refreshCompanies()
    showCompanyModal.value = false
  } finally {
    saving.value = false
  }
}

async function deleteCompany(co: Company) {
  if (!await openConfirm({ title: 'Unternehmen löschen?', name: co.name })) return
  await $fetch(useApiUrl(`/api/companies/${co.companyId}`), { method: 'DELETE', headers: authHeaders })
  await refreshCompanies()
}
</script>
