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
        <div style="display:flex;gap:8px">
          <button class="icon-btn" title="Als CSV exportieren" @click="doExportCsv"><i class="ti ti-file-type-csv"></i></button>
          <button class="icon-btn" title="Als Excel exportieren" @click="doExportXlsx"><i class="ti ti-file-spreadsheet"></i></button>
        </div>
        <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" @click="showAdd=true">
          <i class="ti ti-plus"></i> Neue Rechnung
        </button>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Nummer</th>
            <th>Kunde</th>
            <th>E-Mail</th>
            <th>Betrag</th>
            <th>Fälligkeit</th>
            <th>Status</th>
            <th style="width:100px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!invoices.length">
            <td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px">Keine Rechnungen</td>
          </tr>
          <tr v-for="i in invoices" :key="i.invoiceId">
            <td class="td-name">{{ i.number }}</td>
            <td>{{ i.client }}</td>
            <td style="font-size:12px;color:var(--text-muted)">{{ i.clientEmail || '–' }}</td>
            <td>{{ formatEur(i.amount) }}</td>
            <td style="font-size:12px">{{ i.dueDate }}</td>
            <td>
              <span class="badge" :class="statusBadge(i.status)">{{ statusLabel(i.status) }}</span>
              <i v-if="i.mailSent" class="ti ti-mail-check" style="color:#00D4B4;margin-left:6px;font-size:12px" title="Mail gesendet"></i>
            </td>
            <td>
              <div style="display:flex;gap:4px">
                <button v-if="canDunning(i)" class="icon-btn" :title="dunningTitle(i)" @click="sendDunning(i)" style="color:#E05C5C">
                  <i v-if="dunning===i.invoiceId" class="ti ti-loader-2 spin"></i>
                  <i v-else class="ti ti-alert-triangle"></i>
                </button>
                <button class="icon-btn" title="PDF herunterladen" @click="downloadPdf(i)">
                  <i class="ti ti-file-type-pdf"></i>
                </button>
                <button class="icon-btn" title="Per Mail senden" :disabled="!i.clientEmail || sending===i.invoiceId" @click="sendMail(i)" style="color:var(--accent)">
                  <i v-if="sending===i.invoiceId" class="ti ti-loader-2 spin"></i>
                  <i v-else class="ti ti-send"></i>
                </button>
                <button class="icon-btn" title="Löschen" @click="deleteInvoice(i)" style="color:var(--danger)">
                  <i class="ti ti-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ADD MODAL -->
    <div v-if="showAdd" class="modal-overlay" @click.self="showAdd=false">
      <div class="modal-card">
        <div class="modal-header">
          <span class="card-title">Neue Rechnung</span>
          <button class="icon-btn" @click="showAdd=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-row">
            <div class="auth-field"><label>Kunde</label><input v-model="newInv.client" placeholder="Firma GmbH" /></div>
            <div class="auth-field"><label>Kunden-E-Mail</label><input v-model="newInv.clientEmail" placeholder="kunde@firma.de" /></div>
          </div>
          <div class="auth-field"><label>Beschreibung</label><input v-model="newInv.description" placeholder="Webentwicklung Mai 2026" /></div>
          <div class="auth-row">
            <div class="auth-field"><label>Betrag (€ netto)</label><input v-model.number="newInv.amount" type="number" placeholder="10000" /></div>
            <div class="auth-field"><label>Fälligkeitsdatum</label><input v-model="newInv.dueDate" type="date" /></div>
          </div>
          <div class="auth-field">
            <label>Status</label>
            <select v-model="newInv.status" class="form-select">
              <option value="pending">Ausstehend</option>
              <option value="paid">Bezahlt</option>
              <option value="overdue">Überfällig</option>
            </select>
          </div>
          <div style="display:flex;gap:10px">
            <button class="auth-btn" :disabled="saving" @click="addInvoice(false)" style="flex:1">
              <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
              <span v-else><i class="ti ti-device-floppy"></i> Speichern</span>
            </button>
            <button class="auth-btn" :disabled="saving || !newInv.clientEmail" @click="addInvoice(true)" style="flex:1;background:var(--accent)">
              <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
              <span v-else><i class="ti ti-send"></i> Speichern + Mail</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- SUCCESS TOAST -->
    <div v-if="toast" class="toast-success">
      <i class="ti ti-circle-check"></i> {{ toast }}
    </div>

  </div>
</template>

<script setup lang="ts">
import { calcRevenue, calcPending, calcOverdue, formatEur, statusLabel, statusBadge } from '~/modules/finance'
import { exportToCsv, exportToXlsx } from '~/modules/export'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const userId = ref('demo-user')
onMounted(async () => {
  const { useAuthUser } = await import('~/composables/useAuth')
  const u = await useAuthUser()
  userId.value = u.userId
})

const { data, refresh } = await useFetch(useApiUrl('/api/finance'))
const invoices = computed(() => (data.value as any)?.invoices || [])

const revenue      = computed(() => calcRevenue(invoices.value))
const pending      = computed(() => calcPending(invoices.value))
const overdue      = computed(() => calcOverdue(invoices.value))
const paidCount    = computed(() => invoices.value.filter((i: any) => i.status === 'paid').length)
const pendingCount = computed(() => invoices.value.filter((i: any) => i.status === 'pending').length)
const overdueCount = computed(() => invoices.value.filter((i: any) => i.status === 'overdue').length)

const showAdd = ref(false)
const saving  = ref(false)
const sending = ref<string | null>(null)
const toast   = ref('')

const newInv = reactive({
  client: '', clientEmail: '', description: '', amount: 0, dueDate: '', status: 'pending'
})

function showToast(msg: string) {
  toast.value = msg
  setTimeout(() => toast.value = '', 3500)
}

async function addInvoice(sendMail: boolean) {
  saving.value = true
  try {
    const inv = await $fetch(useApiUrl('/api/finance'), {
      method: 'POST',
      body: { ...newInv, userId: userId.value }
    }) as any
    await refresh()
    if (sendMail && inv.invoice?.invoiceId && newInv.clientEmail) {
      await $fetch(`https://7hrkm580pb.execute-api.eu-central-1.amazonaws.com/api/finance/${inv.invoice.invoiceId}/send`, {
        method: 'POST',
        body: { userId: userId.value, toEmail: newInv.clientEmail }
      })
      showToast(`Rechnung gespeichert und an ${newInv.clientEmail} gesendet!`)
    } else {
      showToast('Rechnung gespeichert!')
    }
    showAdd.value = false
    Object.assign(newInv, { client: '', clientEmail: '', description: '', amount: 0, dueDate: '', status: 'pending' })
  } finally {
    saving.value = false
  }
}

async function sendMail(invoice: any) {
  if (!invoice.clientEmail) return
  sending.value = invoice.invoiceId
  try {
    await $fetch(`https://7hrkm580pb.execute-api.eu-central-1.amazonaws.com/api/finance/${invoice.invoiceId}/send`, {
      method: 'POST',
      body: { userId: invoice.userId || userId.value, toEmail: invoice.clientEmail }
    })
    await refresh()
    showToast(`Rechnung an ${invoice.clientEmail} gesendet!`)
  } finally {
    sending.value = null
  }
}

function downloadPdf(invoice: any) {
  window.location.href = `https://7hrkm580pb.execute-api.eu-central-1.amazonaws.com/api/finance/${invoice.invoiceId}/pdf?userId=${invoice.userId || userId.value}`
}


const dunning = ref<string | null>(null)

function canDunning(invoice: any): boolean {
  if (!invoice.clientEmail) return false
  if (invoice.status === 'paid') return false
  if (['dunning_3'].includes(invoice.status)) return false
  return true
}

function dunningTitle(invoice: any): string {
  const map: Record<string, string> = {
    pending:   '1. Mahnung senden',
    overdue:   '1. Mahnung senden',
    dunning_1: '2. Mahnung senden',
    dunning_2: '3. Mahnung senden',
  }
  return map[invoice.status] || 'Mahnung senden'
}

function dunningLevel(invoice: any): number {
  const map: Record<string, number> = {
    pending:   1,
    overdue:   1,
    dunning_1: 2,
    dunning_2: 3,
  }
  return map[invoice.status] || 1
}

async function sendDunning(invoice: any) {
  if (!confirm(`${dunningTitle(invoice)} an ${invoice.clientEmail}?`)) return
  dunning.value = invoice.invoiceId
  try {
    const res = await $fetch(`https://7hrkm580pb.execute-api.eu-central-1.amazonaws.com/api/finance/${invoice.invoiceId}/dunning`, {
      method: 'POST',
      body: { level: dunningLevel(invoice), userId: invoice.userId || userId.value }
    }) as any
    await refresh()
    showToast(res.message || 'Mahnung gesendet!')
  } catch (e: any) {
    showToast('Fehler: ' + e.message)
  } finally {
    dunning.value = null
  }
}

async function deleteInvoice(invoice: any) {
  if (!confirm(`Rechnung ${invoice.number} wirklich löschen?`)) return
  await $fetch(`/api/finance/${invoice.invoiceId}`, {
    method: 'DELETE',
    body: { userId: invoice.userId || userId.value }
  })
  await refresh()
}

function exportRows() {
  const invoices = (data.value as any)?.invoices || []
  return invoices.map((i: any) => ({
    'Rechnungs-Nr':   i.invoiceNumber || i.invoiceId?.slice(0,8) || '',
    Kunde:            i.customer || '',
    Betrag:           i.amount || 0,
    Status:           statusLabel(i.status),
    Fälligkeitsdatum: i.dueDate ? new Date(i.dueDate).toLocaleDateString('de-DE') : '',
    Erstellt:         i.created ? new Date(i.created).toLocaleDateString('de-DE') : '',
  }))
}
function doExportCsv()  { exportToCsv(`rechnungen-${new Date().toISOString().slice(0,10)}.csv`, exportRows()) }
function doExportXlsx() { exportToXlsx(`rechnungen-${new Date().toISOString().slice(0,10)}.xlsx`, exportRows(), 'Rechnungen') }
</script>