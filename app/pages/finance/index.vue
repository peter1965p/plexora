<template>
  <div class="page">

    <div class="stats-grid">
      <div class="stat-card">
        <i class="ti ti-circle-check stat-icon"></i>
        <div class="stat-label">{{ t.finance.paid }}</div>
        <div class="stat-value" style="color:#00D4B4">{{ formatEur(revenue) }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ paidCount }} {{ t.finance.invoices }}</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-clock stat-icon"></i>
        <div class="stat-label">{{ t.finance.pending }}</div>
        <div class="stat-value">{{ formatEur(pending) }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ pendingCount }} {{ t.common.open }}</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-alert-circle stat-icon"></i>
        <div class="stat-label">{{ t.finance.overdue }}</div>
        <div class="stat-value" style="color:#E05C5C">{{ formatEur(overdue) }}</div>
        <div class="stat-delta down"><i class="ti ti-arrow-down-right"></i> {{ overdueCount }} {{ t.finance.overdue }}</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-receipt stat-icon"></i>
        <div class="stat-label">{{ t.finance.invoices }}</div>
        <div class="stat-value">{{ invoices.length }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ formatEur(revenue + pending + overdue) }} {{ t.finance.total }}</div>
      </div>
    </div>

    <!-- TABS -->
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <button class="theme-opt" :class="{ active: tab==='invoices' }"   @click="tab='invoices'">  <i class="ti ti-receipt"></i> {{ t.finance.invoices }}</button>
      <button class="theme-opt" :class="{ active: tab==='cashbook' }"   @click="tab='cashbook'">  <i class="ti ti-cash"></i> {{ t.finance.cashbook }}</button>
      <button class="theme-opt" :class="{ active: tab==='bank' }"       @click="tab='bank'">      <i class="ti ti-building-bank"></i> {{ t.finance.bankImport }}</button>
      <button class="theme-opt" :class="{ active: tab==='tax' }"        @click="tab='tax'">       <i class="ti ti-file-euro"></i> {{ t.finance.tax }}</button>
    </div>

    <!-- ═══ TAB: RECHNUNGEN ═══ -->
    <div v-if="tab==='invoices'" class="card">
      <div class="card-header">
        <span class="card-title">{{ t.finance.invoices }}</span>
        <div style="display:flex;gap:8px">
          <button class="icon-btn" title="Als CSV exportieren" @click="doExportCsv"><i class="ti ti-file-type-csv"></i></button>
          <button class="icon-btn" title="Als Excel exportieren" @click="doExportXlsx"><i class="ti ti-file-spreadsheet"></i></button>
        </div>
        <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" @click="showAdd=true">
          <i class="ti ti-plus"></i> {{ t.finance.newInvoice }}
        </button>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>{{ t.finance.number }}</th><th>{{ t.finance.client }}</th><th>{{ t.common.email }}</th><th>{{ t.finance.amount }}</th><th>{{ t.finance.dueDate }}</th><th>{{ t.common.status }}</th>
            <th style="width:140px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!invoices.length">
            <td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px">{{ t.finance.noInvoices }}</td>
          </tr>
          <tr v-for="i in invoices" :key="i.invoiceId">
            <td class="td-name">{{ i.number }}</td>
            <td>{{ i.client }}</td>
            <td style="font-size:12px;color:var(--text-muted)">{{ i.clientEmail || '–' }}</td>
            <td>{{ formatEur(i.amount) }}</td>
            <td style="font-size:12px">{{ i.dueDate }}</td>
            <td>
              <span class="badge" :class="statusBadge(i.status)">{{ statusLabel(i.status) }}</span>
              <i v-if="i.mailSent"       class="ti ti-mail-check"   style="color:#00D4B4;margin-left:6px;font-size:12px" :title="t.finance.mailSent"></i>
              <i v-if="i.finalizedAt"    class="ti ti-lock"         style="color:#a78bfa;margin-left:6px;font-size:12px" :title="t.finance.archived"></i>
            </td>
            <td>
              <div style="display:flex;gap:4px">
                <button v-if="canDunning(i)" class="icon-btn" :title="dunningTitle(i)" @click="sendDunning(i)" style="color:#E05C5C">
                  <i v-if="dunning===i.invoiceId" class="ti ti-loader-2 spin"></i>
                  <i v-else class="ti ti-alert-triangle"></i>
                </button>
                <button class="icon-btn" :title="t.finance.downloadPdf" @click="downloadPdf(i)">
                  <i class="ti ti-file-type-pdf"></i>
                </button>
                <button class="icon-btn" :title="t.finance.downloadXRechnung" @click="downloadXRechnung(i)">
                  <i class="ti ti-file-code"></i>
                </button>
                <button class="icon-btn" :title="t.finance.sendMail" :disabled="!i.clientEmail || sending===i.invoiceId" @click="sendMail(i)" style="color:var(--accent)">
                  <i v-if="sending===i.invoiceId" class="ti ti-loader-2 spin"></i>
                  <i v-else class="ti ti-send"></i>
                </button>
                <button v-if="!i.finalizedAt" class="icon-btn" :title="t.finance.archiveGobd" @click="finalizeInvoice(i)" style="color:#a78bfa">
                  <i class="ti ti-lock-open"></i>
                </button>
                <button v-if="!i.finalizedAt" class="icon-btn" :title="t.common.delete" @click="deleteInvoice(i)" style="color:var(--danger)">
                  <i class="ti ti-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ═══ TAB: KASSENBUCH ═══ -->
    <div v-if="tab==='cashbook'" class="card">
      <div class="card-header">
        <span class="card-title">{{ t.finance.cashbook }}</span>
        <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" @click="showCash=true">
          <i class="ti ti-plus"></i> {{ t.finance.booking }}
        </button>
      </div>
      <table class="data-table">
        <thead>
          <tr><th>{{ t.common.date }}</th><th>{{ t.finance.description }}</th><th>{{ t.common.amount }}</th><th>{{ t.finance.balance }}</th><th style="width:40px"></th></tr>
        </thead>
        <tbody>
          <tr v-if="!cashEntries.length">
            <td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">{{ t.finance.noCashbook }}</td>
          </tr>
          <tr v-for="e in cashEntries" :key="e.cashId">
            <td style="font-size:12px">{{ e.date }}</td>
            <td>{{ e.description }}</td>
            <td :style="{ color: e.amount >= 0 ? '#00D4B4' : '#E05C5C', fontWeight: '600' }">
              {{ e.amount >= 0 ? '+' : '' }}{{ formatEur(e.amount) }}
            </td>
            <td style="font-size:12px;color:var(--text-muted)">{{ formatEur(e.balance) }}</td>
            <td>
              <button class="icon-btn" style="color:var(--danger)" @click="deleteCash(e)"><i class="ti ti-trash"></i></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ═══ TAB: BANK-IMPORT ═══ -->
    <div v-if="tab==='bank'">
      <div class="card" style="margin-bottom:14px">
        <div class="card-header"><span class="card-title">{{ t.finance.bankImportTitle }}</span></div>
        <div class="card-body" style="padding:16px 20px">
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:14px">
            Export aus Online-Banking als CSV (Sparkasse, DKB, ING, Commerzbank). Spalten: <strong>Buchungstag, Verwendungszweck, Betrag</strong>.
          </p>
          <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap">
            <div class="auth-field" style="flex:1;min-width:200px;margin:0">
              <label>CSV-Datei auswählen</label>
              <input type="file" accept=".csv,.txt" @change="onBankFile" style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px;color:var(--text-primary);width:100%" />
            </div>
            <button class="accent-btn" :disabled="!bankCsv || importing" style="height:36px;padding:0 20px" @click="doImport">
              <i v-if="importing" class="ti ti-loader-2 spin"></i>
              <i v-else class="ti ti-upload"></i> {{ t.finance.importBtn }}
            </button>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">{{ t.finance.importedBookings }}</span></div>
        <table class="data-table">
          <thead>
            <tr><th>{{ t.common.date }}</th><th>{{ t.finance.description }}</th><th>{{ t.common.amount }}</th><th>{{ t.common.status }}</th><th style="width:160px">{{ t.finance.assignInvoice }}</th></tr>
          </thead>
          <tbody>
            <tr v-if="!bankTxns.length">
              <td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">{{ t.finance.noBookings }}</td>
            </tr>
            <tr v-for="txn in bankTxns" :key="txn.txnId">
              <td style="font-size:12px">{{ txn.date }}</td>
              <td style="font-size:12px;max-width:300px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ txn.description }}</td>
              <td :style="{ color: txn.amount >= 0 ? '#00D4B4' : '#E05C5C', fontWeight: '600' }">
                {{ txn.amount >= 0 ? '+' : '' }}{{ formatEur(txn.amount) }}
              </td>
              <td>
                <span v-if="txn.matched" class="badge badge-success">{{ t.finance.assigned }}</span>
                <span v-else class="badge badge-warn">{{ t.common.open }}</span>
              </td>
              <td>
                <div v-if="!txn.matched" style="display:flex;gap:6px;align-items:center">
                  <select v-model="matchMap[txn.txnId]" class="form-select" style="height:26px;font-size:11px;padding:0 6px;flex:1">
                    <option value="">– Rechnung –</option>
                    <option v-for="inv in unpaidInvoices" :key="inv.invoiceId" :value="inv.invoiceId">
                      {{ inv.number }} ({{ formatEur(inv.amount) }})
                    </option>
                  </select>
                  <button v-if="matchMap[txn.txnId]" class="accent-btn" style="height:26px;font-size:11px;padding:0 8px;white-space:nowrap" @click="doMatch(txn)">
                    {{ t.finance.assign }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ═══ TAB: STEUER & EXPORT ═══ -->
    <div v-if="tab==='tax'">
      <!-- UStVA -->
      <div class="card" style="margin-bottom:14px">
        <div class="card-header">
          <span class="card-title">{{ t.finance.vatReport }}</span>
          <div style="display:flex;gap:8px;align-items:center">
            <select v-model="taxYear" class="form-select" style="height:28px;font-size:12px;padding:0 8px">
              <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
            </select>
            <select v-model="taxMode" class="form-select" style="height:28px;font-size:12px;padding:0 8px">
              <option value="quarterly">{{ t.finance.quarterly }}</option>
              <option value="monthly">{{ t.common.monthly }}</option>
            </select>
          </div>
        </div>
        <div v-if="ustva" style="padding:0 0 8px">
          <table class="data-table">
            <thead>
              <tr><th>{{ t.finance.period }}</th><th>{{ t.finance.netKz41 }}</th><th>{{ t.finance.vat19Kz81 }}</th><th>{{ t.finance.gross }}</th><th>{{ t.finance.invoices }}</th></tr>
            </thead>
            <tbody>
              <tr v-if="!ustva.periods.length">
                <td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">{{ t.finance.noInvoices }} {{ taxYear }}</td>
              </tr>
              <tr v-for="p in ustva.periods" :key="p.label">
                <td class="td-name">{{ p.label }}</td>
                <td>{{ formatEur(p.netto) }}</td>
                <td style="color:#a78bfa;font-weight:600">{{ formatEur(p.ust) }}</td>
                <td>{{ formatEur(p.brutto) }}</td>
                <td>{{ p.invoiceCount }}</td>
              </tr>
              <tr v-if="ustva.periods.length" style="font-weight:700;border-top:1px solid var(--border)">
                <td>{{ t.finance.totalYear.replace('{year}', String(taxYear)) }}</td>
                <td>{{ formatEur(ustva.totals.netto) }}</td>
                <td style="color:#a78bfa">{{ formatEur(ustva.totals.ust) }}</td>
                <td>{{ formatEur(ustva.totals.brutto) }}</td>
                <td>–</td>
              </tr>
            </tbody>
          </table>
          <div v-if="ustva.periods.length" style="padding:12px 20px;background:rgba(108,63,232,0.06);border-top:0.5px solid var(--border);font-size:13px;color:var(--text-muted)">
            <strong style="color:var(--text-primary)">ELSTER-Kennzahlen:</strong>
            &nbsp; Kz. 41 = <strong style="color:var(--text-primary)">{{ ustva.kennzahlen.kz41 }} €</strong>
            &nbsp;|&nbsp; Kz. 81 = <strong style="color:#a78bfa">{{ ustva.kennzahlen.kz81 }} €</strong>
            &nbsp;|&nbsp;
            <a href="https://www.elster.de/eportal/start" target="_blank" style="color:var(--accent)">→ {{ t.finance.elsterOpen }}</a>
          </div>
        </div>
      </div>

      <!-- EÜR -->
      <div class="card" style="margin-bottom:14px">
        <div class="card-header"><span class="card-title">{{ t.finance.euRTitle.replace('{year}', String(taxYear)) }}</span></div>
        <div v-if="ustva" style="padding:16px 20px">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
            <div style="background:rgba(0,212,180,0.08);border-radius:10px;padding:16px">
              <div style="font-size:11px;color:#8b8fa8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">{{ t.finance.businessRevenue }}</div>
              <div style="font-size:22px;font-weight:700;color:#00D4B4">{{ formatEur(ustva.totals.netto) }}</div>
              <div style="font-size:11px;color:#8b8fa8;margin-top:4px">Netto aus bezahlten Rechnungen</div>
            </div>
            <div style="background:rgba(224,92,92,0.08);border-radius:10px;padding:16px">
              <div style="font-size:11px;color:#8b8fa8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">{{ t.finance.businessExpenses }}</div>
              <div style="font-size:22px;font-weight:700;color:#E05C5C">{{ formatEur(cashExpenses) }}</div>
              <div style="font-size:11px;color:#8b8fa8;margin-top:4px">Ausgaben aus Kassenbuch</div>
            </div>
            <div style="background:rgba(108,63,232,0.08);border-radius:10px;padding:16px">
              <div style="font-size:11px;color:#8b8fa8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">{{ t.finance.profitBeforeTax }}</div>
              <div style="font-size:22px;font-weight:700" :style="{ color: (ustva.totals.netto + cashExpenses) >= 0 ? '#a78bfa' : '#E05C5C' }">
                {{ formatEur(ustva.totals.netto + cashExpenses) }}
              </div>
              <div style="font-size:11px;color:#8b8fa8;margin-top:4px">Einnahmen − Ausgaben</div>
            </div>
          </div>
        </div>
      </div>

      <!-- EXPORTE -->
      <div class="card">
        <div class="card-header"><span class="card-title">{{ t.finance.exports }}</span></div>
        <div style="padding:16px 20px;display:flex;gap:12px;flex-wrap:wrap">
          <button class="accent-btn" style="height:38px;padding:0 20px;font-size:13px;display:flex;align-items:center;gap:8px" @click="doDatevExport">
            <i class="ti ti-file-spreadsheet"></i> DATEV Buchungsstapel {{ taxYear }}
          </button>
          <button class="accent-btn" style="height:38px;padding:0 18px;font-size:13px;background:transparent;border:0.5px solid var(--border);display:flex;align-items:center;gap:8px" @click="doExportCsv">
            <i class="ti ti-file-type-csv"></i> {{ t.finance.invoices }} CSV
          </button>
          <button class="accent-btn" style="height:38px;padding:0 18px;font-size:13px;background:transparent;border:0.5px solid var(--border);display:flex;align-items:center;gap:8px" @click="doExportXlsx">
            <i class="ti ti-file-spreadsheet"></i> {{ t.finance.invoices }} Excel
          </button>
        </div>
        <div style="padding:0 20px 16px;font-size:12px;color:var(--text-muted)">
          DATEV-Export enthält alle Rechnungen des gewählten Jahres im Buchungsstapel-Format (kompatibel mit DATEV REWE und DATEV Unternehmen Online).
        </div>
      </div>
    </div>

    <!-- ADD RECHNUNG MODAL -->
    <div v-if="showAdd" class="modal-overlay" @click.self="showAdd=false">
      <div class="modal-card">
        <div class="modal-header">
          <span class="card-title">{{ t.finance.newInvoice }}</span>
          <button class="icon-btn" @click="showAdd=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-row">
            <div class="auth-field"><label>{{ t.finance.client }}</label><input v-model="newInv.client" placeholder="Firma GmbH" /></div>
            <div class="auth-field"><label>{{ t.finance.clientEmail }}</label><input v-model="newInv.clientEmail" placeholder="kunde@firma.de" /></div>
          </div>
          <div class="auth-field"><label>{{ t.common.description }}</label><input v-model="newInv.description" placeholder="Webentwicklung Mai 2026" /></div>
          <div class="auth-row">
            <div class="auth-field"><label>{{ t.common.amount }} (€ netto)</label><input v-model.number="newInv.amount" type="number" placeholder="10000" /></div>
            <div class="auth-field"><label>{{ t.finance.dueDate }}</label><input v-model="newInv.dueDate" type="date" /></div>
          </div>
          <div class="auth-field">
            <label>{{ t.common.status }}</label>
            <select v-model="newInv.status" class="form-select">
              <option value="pending">{{ t.finance.pending }}</option>
              <option value="paid">{{ t.finance.paid }}</option>
              <option value="overdue">{{ t.finance.overdue }}</option>
            </select>
          </div>
          <div style="display:flex;gap:10px">
            <button class="auth-btn" :disabled="saving" @click="addInvoice(false)" style="flex:1">
              <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
              <span v-else><i class="ti ti-device-floppy"></i> {{ t.common.save }}</span>
            </button>
            <button class="auth-btn" :disabled="saving || !newInv.clientEmail" @click="addInvoice(true)" style="flex:1;background:var(--accent)">
              <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
              <span v-else><i class="ti ti-send"></i> {{ t.finance.saveAndMail }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ADD KASSENBUCH MODAL -->
    <div v-if="showCash" class="modal-overlay" @click.self="showCash=false">
      <div class="modal-card">
        <div class="modal-header">
          <span class="card-title">{{ t.finance.cashbookEntry }}</span>
          <button class="icon-btn" @click="showCash=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-row">
            <div class="auth-field"><label>{{ t.common.date }}</label><input v-model="newCash.date" type="date" /></div>
            <div class="auth-field">
              <label>{{ t.common.type }}</label>
              <select v-model="newCash.type" class="form-select">
                <option value="einnahme">{{ t.finance.income }}</option>
                <option value="ausgabe">{{ t.finance.expense }}</option>
              </select>
            </div>
          </div>
          <div class="auth-field"><label>{{ t.finance.description }}</label><input v-model="newCash.description" placeholder="z.B. Büromaterial" /></div>
          <div class="auth-field"><label>{{ t.common.amount }} (€)</label><input v-model.number="newCash.amount" type="number" placeholder="50.00" /></div>
          <button class="auth-btn" :disabled="saving" @click="addCash">
            <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else>{{ t.finance.book }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- TOAST -->
    <div v-if="toast" class="toast-success">
      <i class="ti ti-circle-check"></i> {{ toast }}
    </div>

  </div>
</template>

<script setup lang="ts">
import { calcRevenue, calcPending, calcOverdue, formatEur, statusLabel, statusBadge } from '~/modules/finance'
import { exportToCsv, exportToXlsx } from '~/modules/export'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })
const { userId } = await useAuthUser()
const { t, lang } = useLang()

const { data, refresh } = await useFetch(() => useApiUrl(`/api/finance?userId=${encodeURIComponent(userId)}`))
const invoices = computed(() => (data.value as any)?.invoices || [])

const revenue      = computed(() => calcRevenue(invoices.value))
const pending      = computed(() => calcPending(invoices.value))
const overdue      = computed(() => calcOverdue(invoices.value))
const paidCount    = computed(() => invoices.value.filter((i: any) => i.status === 'paid').length)
const pendingCount = computed(() => invoices.value.filter((i: any) => i.status === 'pending').length)
const overdueCount = computed(() => invoices.value.filter((i: any) => i.status === 'overdue').length)
const unpaidInvoices = computed(() => invoices.value.filter((i: any) => i.status !== 'paid'))

// ── Kassenbuch ────────────────────────────────────────
const { data: cashData, refresh: refreshCash } = await useFetch(() => useApiUrl(`/api/finance/cashbook?userId=${encodeURIComponent(userId)}`))
const cashEntries = computed(() => (cashData.value as any)?.entries || [])
const cashExpenses = computed(() => cashEntries.value.reduce((s: number, e: any) => e.amount < 0 ? s + e.amount : s, 0))

// ── Bank-Import ───────────────────────────────────────
const { data: bankData, refresh: refreshBank } = await useFetch(() => useApiUrl(`/api/finance/bank-txns?userId=${encodeURIComponent(userId)}`))
const bankTxns  = computed(() => (bankData.value as any)?.transactions || [])
const matchMap  = reactive<Record<string, string>>({})
const bankCsv   = ref('')
const importing = ref(false)

function onBankFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { bankCsv.value = reader.result as string }
  reader.readAsText(file, 'latin1')
}

async function doImport() {
  if (!bankCsv.value) return
  importing.value = true
  try {
    const res = await $fetch(useApiUrl('/api/finance/bank-import'), {
      method: 'POST', body: { csv: bankCsv.value, userId }
    }) as any
    await refreshBank()
    bankCsv.value = ''
    showToast(`${res.count} Buchungen importiert!`)
  } catch (e: any) {
    showToast('Fehler: ' + (e.data?.message || e.message))
  } finally {
    importing.value = false
  }
}

async function doMatch(txn: any) {
  const invoiceId = matchMap[txn.txnId]
  if (!invoiceId) return
  await $fetch(useApiUrl('/api/finance/bank-match'), {
    method: 'POST', body: { txnId: txn.txnId, invoiceId, markPaid: true, userId }
  })
  await Promise.all([refreshBank(), refresh()])
  delete matchMap[txn.txnId]
  showToast('Buchung zugeordnet & Rechnung als bezahlt markiert!')
}

// ── UStVA / EÜR ──────────────────────────────────────
const taxYear = ref(new Date().getFullYear())
const taxMode = ref('quarterly')
const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)
const { data: _ustvaRaw } = await useFetch(() => useApiUrl(`/api/finance/ustva?userId=${encodeURIComponent(userId)}&year=${taxYear.value}&mode=${taxMode.value}`))
const ustva = computed(() => _ustvaRaw.value as any)

// ── UI state ──────────────────────────────────────────
const tab      = ref('invoices')
const route    = useRoute()
const showAdd  = ref(false)
const showCash = ref(false)
const saving   = ref(false)
const sending  = ref<string | null>(null)
const dunning  = ref<string | null>(null)
const toast    = ref('')

onMounted(() => { if (route.query.new) showAdd.value = true })

const newInv = reactive({ client: '', clientEmail: '', description: '', amount: 0, dueDate: '', status: 'pending' })
const newCash = reactive({ date: new Date().toISOString().slice(0, 10), description: '', amount: 0, type: 'ausgabe' })

function showToast(msg: string) { toast.value = msg; setTimeout(() => toast.value = '', 3500) }

// ── Rechnungen ────────────────────────────────────────
async function addInvoice(sendMailFlag: boolean) {
  saving.value = true
  try {
    const inv = await $fetch(useApiUrl('/api/finance'), { method: 'POST', body: { ...newInv, userId } }) as any
    await refresh()
    if (sendMailFlag && inv.invoice?.invoiceId && newInv.clientEmail) {
      await $fetch(useApiUrl(`/api/finance/${inv.invoice.invoiceId}/send`), {
        method: 'POST', body: { userId, toEmail: newInv.clientEmail }
      })
      showToast(`Rechnung gespeichert und an ${newInv.clientEmail} gesendet!`)
    } else {
      showToast('Rechnung gespeichert!')
    }
    showAdd.value = false
    Object.assign(newInv, { client: '', clientEmail: '', description: '', amount: 0, dueDate: '', status: 'pending' })
  } finally { saving.value = false }
}

async function sendMail(invoice: any) {
  if (!invoice.clientEmail) return
  sending.value = invoice.invoiceId
  try {
    await $fetch(useApiUrl(`/api/finance/${invoice.invoiceId}/send`), {
      method: 'POST', body: { userId: invoice.userId || userId, toEmail: invoice.clientEmail }
    })
    await refresh()
    showToast(`Rechnungskopie an ${invoice.client || invoice.clientEmail} gesendet!`)
  } finally { sending.value = null }
}

function downloadPdf(invoice: any) {
  window.location.href = useApiUrl(`/api/finance/${invoice.invoiceId}/pdf?userId=${invoice.userId || userId}`)
}

function downloadXRechnung(invoice: any) {
  window.location.href = useApiUrl(`/api/finance/${invoice.invoiceId}/xrechnung?userId=${invoice.userId || userId}`)
}

async function finalizeInvoice(invoice: any) {
  const msg = lang.value === 'en'
    ? `Archive invoice ${invoice.number} GoBD-compliant? It can no longer be deleted afterwards.`
    : `Rechnung ${invoice.number} GoBD-konform archivieren? Sie kann danach nicht mehr gelöscht werden.`
  if (!confirm(msg)) return
  await $fetch(useApiUrl(`/api/finance/${invoice.invoiceId}/finalize`), {
    method: 'POST', body: { userId: invoice.userId || userId }
  })
  await refresh()
  showToast(`Rechnung ${invoice.number} archiviert!`)
}

function canDunning(invoice: any): boolean {
  return !!invoice.clientEmail && invoice.status !== 'paid' && invoice.status !== 'dunning_3'
}
function dunningTitle(invoice: any): string {
  if (lang.value === 'en') {
    return ({ pending: 'Send 1st reminder', overdue: 'Send 1st reminder', dunning_1: 'Send 2nd reminder', dunning_2: 'Send 3rd reminder' } as any)[invoice.status] || 'Send reminder'
  }
  return ({ pending: '1. Mahnung senden', overdue: '1. Mahnung senden', dunning_1: '2. Mahnung senden', dunning_2: '3. Mahnung senden' } as any)[invoice.status] || 'Mahnung senden'
}
function dunningLevel(invoice: any): number {
  return ({ pending: 1, overdue: 1, dunning_1: 2, dunning_2: 3 } as any)[invoice.status] || 1
}

async function sendDunning(invoice: any) {
  const msg = lang.value === 'en'
    ? `${dunningTitle(invoice)} to ${invoice.clientEmail}?`
    : `${dunningTitle(invoice)} an ${invoice.clientEmail}?`
  if (!confirm(msg)) return
  dunning.value = invoice.invoiceId
  try {
    const res = await $fetch(useApiUrl(`/api/finance/${invoice.invoiceId}/dunning`), {
      method: 'POST', body: { level: dunningLevel(invoice), userId: invoice.userId || userId }
    }) as any
    await refresh()
    showToast(res.message || 'Mahnung gesendet!')
  } catch (e: any) { showToast('Fehler: ' + e.message) }
  finally { dunning.value = null }
}

async function deleteInvoice(invoice: any) {
  const msg = lang.value === 'en'
    ? `Really delete invoice ${invoice.number}?`
    : `Rechnung ${invoice.number} wirklich löschen?`
  if (!confirm(msg)) return
  await $fetch(useApiUrl(`/api/finance/${invoice.invoiceId}`), {
    method: 'DELETE', body: { userId: invoice.userId || userId }
  })
  await refresh()
}

// ── Kassenbuch ────────────────────────────────────────
async function addCash() {
  saving.value = true
  try {
    await $fetch(useApiUrl('/api/finance/cashbook'), { method: 'POST', body: { ...newCash, userId } })
    await refreshCash()
    showCash.value = false
    Object.assign(newCash, { date: new Date().toISOString().slice(0, 10), description: '', amount: 0, type: 'ausgabe' })
    showToast('Buchung gespeichert!')
  } finally { saving.value = false }
}

async function deleteCash(entry: any) {
  const msg = lang.value === 'en' ? 'Delete cash book entry?' : 'Kassenbucheintrag löschen?'
  if (!confirm(msg)) return
  await $fetch(useApiUrl('/api/finance/cashbook'), { method: 'DELETE', body: { cashId: entry.cashId, userId } })
  await refreshCash()
}

// ── DATEV Export ──────────────────────────────────────
function doDatevExport() {
  window.location.href = useApiUrl(`/api/finance/datev?userId=${encodeURIComponent(userId)}&year=${taxYear.value}`)
}

function exportRows() {
  return invoices.value.map((i: any) => ({
    'Rechnungs-Nr':   i.number || '',
    Kunde:            i.client || '',
    Betrag:           i.amount || 0,
    Status:           statusLabel(i.status),
    Fälligkeitsdatum: i.dueDate ? new Date(i.dueDate).toLocaleDateString('de-DE') : '',
    Erstellt:         i.created ? new Date(i.created).toLocaleDateString('de-DE') : '',
  }))
}
function doExportCsv()  { exportToCsv(`rechnungen-${new Date().toISOString().slice(0,10)}.csv`, exportRows()) }
function doExportXlsx() { exportToXlsx(`rechnungen-${new Date().toISOString().slice(0,10)}.xlsx`, exportRows(), 'Rechnungen') }
</script>
