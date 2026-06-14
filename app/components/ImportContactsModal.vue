<template>
  <div v-if="show" class="modal-overlay" @click.self="close">
    <div class="modal-card" style="max-width:680px">
      <div class="modal-header">
        <span class="card-title">Kontakte importieren (CSV/Excel)</span>
        <button class="icon-btn" @click="close"><i class="ti ti-x"></i></button>
      </div>
      <div class="modal-body">

        <!-- STEP 1: FILE SELECT -->
        <div v-if="step === 'select'">
          <div class="auth-field">
            <label>Datei wählen (.csv, .xlsx, .xls)</label>
            <input type="file" accept=".csv,.xlsx,.xls" @change="onFileChange" />
          </div>
          <p style="color:var(--text-muted);font-size:13px">
            Die erste Zeile sollte Spaltenüberschriften enthalten (z.B. "Vorname", "E-Mail", "Firma").
          </p>
        </div>

        <!-- STEP 2: MAPPING -->
        <div v-if="step === 'mapping'">
          <p style="margin-bottom:12px">{{ rows.length }} Zeilen gefunden. Spalten zuordnen:</p>

          <div v-for="field in targetFields" :key="field.key" class="auth-field">
            <label>{{ field.label }} <span v-if="field.required" style="color:var(--danger)">*</span></label>
            <select v-model="mapping[field.key]" class="form-select">
              <option value="">— nicht zuordnen —</option>
              <option v-for="h in headers" :key="h" :value="h">{{ h }}</option>
            </select>
          </div>

          <div class="auth-field">
            <label>Lead-Quelle für diesen Import</label>
            <select v-model="importLeadSource" class="form-select">
              <option value="csv-import">CSV/Excel-Import</option>
              <option value="referral">Empfehlung</option>
              <option value="other">Sonstiges</option>
            </select>
          </div>

          <p v-if="missingRequired.length" style="color:var(--danger);font-size:13px">
            Bitte mindestens zuordnen: {{ missingRequired.join(', ') }}
          </p>

          <!-- PREVIEW -->
          <div v-if="previewRows.length" style="margin-top:12px;overflow-x:auto">
            <table class="data-table">
              <thead>
                <tr><th v-for="f in targetFields" :key="f.key">{{ f.label }}</th></tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in previewRows" :key="i">
                  <td v-for="f in targetFields" :key="f.key" style="font-size:12px">{{ r[f.key] || '—' }}</td>
                </tr>
              </tbody>
            </table>
            <p style="color:var(--text-muted);font-size:12px;margin-top:4px">Vorschau (erste 5 von {{ rows.length }})</p>
          </div>

          <div style="display:flex;gap:8px;margin-top:16px">
            <button class="icon-btn" @click="step='select'"><i class="ti ti-arrow-left"></i></button>
            <button class="auth-btn" :disabled="!!missingRequired.length || importing" @click="startImport">
              <span v-if="importing"><i class="ti ti-loader-2 spin"></i> Importiere {{ progress }}/{{ rows.length }}...</span>
              <span v-else>{{ rows.length }} Kontakte importieren</span>
            </button>
          </div>
        </div>

        <!-- STEP 3: DONE -->
        <div v-if="step === 'done'">
          <p style="font-size:15px">
            <i class="ti ti-circle-check" style="color:var(--success)"></i>
            {{ successCount }} Kontakte importiert.
            <span v-if="errorCount"> {{ errorCount }} übersprungen (keine E-Mail).</span>
          </p>
          <button class="auth-btn" @click="close">Schließen</button>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import type { Company } from '~/modules/companies'

const props = defineProps<{
  show: boolean
  companies: Company[]
  userId: string
}>()

const emit = defineEmits<{ close: []; imported: [] }>()

const step = ref<'select' | 'mapping' | 'done'>('select')
const headers = ref<string[]>([])
const rows = ref<Record<string, any>[]>([])
const importing = ref(false)
const progress = ref(0)
const successCount = ref(0)
const errorCount = ref(0)
const importLeadSource = ref('csv-import')

const targetFields = [
  { key: 'firstName', label: 'Vorname', required: false },
  { key: 'lastName',  label: 'Nachname', required: false },
  { key: 'email',     label: 'E-Mail', required: true },
  { key: 'company',   label: 'Firma', required: false },
  { key: 'phone',     label: 'Telefon', required: false },
]

const mapping = reactive<Record<string, string>>({
  firstName: '', lastName: '', email: '', company: '', phone: '',
})

const missingRequired = computed(() =>
  targetFields.filter(f => f.required && !mapping[f.key]).map(f => f.label)
)

const previewRows = computed(() => rows.value.slice(0, 5).map(mapRow))

function guessMapping() {
  const guesses: Record<string, string[]> = {
    firstName: ['vorname', 'first name', 'firstname', 'first'],
    lastName:  ['nachname', 'last name', 'lastname', 'surname', 'name'],
    email:     ['email', 'e-mail', 'mail'],
    company:   ['firma', 'unternehmen', 'company', 'organisation'],
    phone:     ['telefon', 'phone', 'tel', 'mobile'],
  }
  for (const field of targetFields) {
    const candidates = guesses[field.key] || []
    const match = headers.value.find(h => candidates.includes(h.toLowerCase().trim()))
    if (match) mapping[field.key] = match
  }
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const ext = file.name.split('.').pop()?.toLowerCase()

  if (ext === 'csv') {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        headers.value = result.meta.fields || []
        rows.value = result.data as Record<string, any>[]
        guessMapping()
        step.value = 'mapping'
      }
    })
  } else {
    const reader = new FileReader()
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, any>[]
      headers.value = json.length ? Object.keys(json[0]) : []
      rows.value = json
      guessMapping()
      step.value = 'mapping'
    }
    reader.readAsArrayBuffer(file)
  }
}

function mapRow(r: Record<string, any>) {
  const out: Record<string, string> = {}
  for (const field of targetFields) {
    const src = mapping[field.key]
    out[field.key] = src ? String(r[src] ?? '').trim() : ''
  }
  return out
}

function findCompanyId(name: string): string {
  if (!name) return ''
  const match = props.companies.find(c => c.name.toLowerCase().trim() === name.toLowerCase().trim())
  return match?.companyId || ''
}

async function startImport() {
  importing.value = true
  progress.value = 0
  successCount.value = 0
  errorCount.value = 0

  for (const r of rows.value) {
    const mapped = mapRow(r)
    if (!mapped.email) { errorCount.value++; progress.value++; continue }

    try {
      await $fetch(useApiUrl('/api/contacts'), {
        method: 'POST',
        body: {
          ...mapped,
          companyId: findCompanyId(mapped.company),
          status: 'lead',
          leadSource: importLeadSource.value,
          leadStatus: 'new',
          userId: props.userId,
        }
      })
      successCount.value++
    } catch {
      errorCount.value++
    }
    progress.value++
  }

  importing.value = false
  step.value = 'done'
  emit('imported')
}

function close() {
  step.value = 'select'
  headers.value = []
  rows.value = []
  Object.keys(mapping).forEach(k => mapping[k] = '')
  emit('close')
}
</script>
