<template>
  <div class="page">

    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:22px;font-weight:800;margin:0">Gesundheit <span style="color:var(--accent)">/ Praxis</span></h1>
        <p style="color:var(--text-muted);font-size:13px;margin:4px 0 0">Patienten, Terminplanung & Karteikarte</p>
      </div>
      <button v-if="activeTab==='patienten'" class="accent-btn" @click="openNewPatient">
        <i class="ti ti-plus"></i> Patient anlegen
      </button>
      <button v-if="activeTab==='termine'" class="accent-btn" @click="openNewTermin">
        <i class="ti ti-plus"></i> Termin anlegen
      </button>
    </div>

    <!-- Tabs -->
    <div style="display:flex;gap:8px;margin-bottom:20px;border-bottom:0.5px solid var(--border);padding-bottom:0">
      <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
        style="padding:10px 16px;border:none;background:none;cursor:pointer;font-size:13px;font-weight:600;border-bottom:2px solid transparent;display:flex;align-items:center;gap:6px"
        :style="activeTab===tab.key ? 'color:var(--accent);border-bottom-color:var(--accent)' : 'color:var(--text-muted)'">
        <i :class="'ti ' + tab.icon"></i> {{ tab.label }}
      </button>
    </div>

    <!-- PATIENTEN -->
    <div v-if="activeTab==='patienten'">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="text-align:left;font-size:11px;color:var(--text-muted);text-transform:uppercase">
            <th style="padding:8px">Name</th><th style="padding:8px">Geburtsdatum</th><th style="padding:8px">Kontakt</th><th style="padding:8px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in patienten" :key="p.patientId" style="border-top:0.5px solid var(--border)">
            <td style="padding:8px;font-weight:600">{{ p.name }}</td>
            <td style="padding:8px;color:var(--text-muted)">{{ p.birthDate }}</td>
            <td style="padding:8px;color:var(--text-muted)">{{ p.phone }} {{ p.email }}</td>
            <td style="padding:8px;text-align:right">
              <button class="icon-btn" style="width:28px;height:28px" @click="goToKarteikarte(p)"><i class="ti ti-notebook"></i></button>
              <button class="icon-btn" style="width:28px;height:28px" @click="openEditPatient(p)"><i class="ti ti-edit"></i></button>
              <button class="icon-btn" style="width:28px;height:28px" @click="deletePatient(p)"><i class="ti ti-trash"></i></button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!patienten.length" style="text-align:center;padding:40px;color:var(--text-muted)">Noch keine Patienten angelegt.</div>
    </div>

    <!-- TERMINE -->
    <div v-if="activeTab==='termine'">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="text-align:left;font-size:11px;color:var(--text-muted);text-transform:uppercase">
            <th style="padding:8px">Datum</th><th style="padding:8px">Zeit</th><th style="padding:8px">Patient</th>
            <th style="padding:8px">Grund</th><th style="padding:8px">Status</th><th style="padding:8px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in termineSorted" :key="t.terminId" style="border-top:0.5px solid var(--border)">
            <td style="padding:8px;font-weight:600">{{ t.date }}</td>
            <td style="padding:8px">{{ t.startTime }}–{{ t.endTime }}</td>
            <td style="padding:8px">{{ patientName(t.patientId) }}</td>
            <td style="padding:8px;color:var(--text-muted)">{{ t.reason }}</td>
            <td style="padding:8px"><span style="font-size:11px;padding:3px 8px;border-radius:6px" :style="terminStatusStyle(t.status)">{{ t.status }}</span></td>
            <td style="padding:8px;text-align:right">
              <button class="icon-btn" style="width:28px;height:28px" @click="openEditTermin(t)"><i class="ti ti-edit"></i></button>
              <button class="icon-btn" style="width:28px;height:28px" @click="deleteTermin(t)"><i class="ti ti-trash"></i></button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!termine.length" style="text-align:center;padding:40px;color:var(--text-muted)">Noch keine Termine angelegt.</div>
    </div>

    <!-- KARTEIKARTE -->
    <div v-if="activeTab==='karteikarte'">
      <div class="auth-field" style="max-width:340px;margin-bottom:20px">
        <label>Patient auswählen</label>
        <select v-model="karteikartePatientId" class="form-select">
          <option value="">— wählen —</option>
          <option v-for="p in patienten" :key="p.patientId" :value="p.patientId">{{ p.name }}</option>
        </select>
      </div>

      <div v-if="karteikartePatient">
        <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;padding:20px;margin-bottom:20px">
          <div style="font-weight:800;font-size:17px;margin-bottom:8px">{{ karteikartePatient.name }}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;color:var(--text-muted)">
            <div>Geboren: {{ karteikartePatient.birthDate || '—' }}</div>
            <div>Telefon: {{ karteikartePatient.phone || '—' }}</div>
            <div>E-Mail: {{ karteikartePatient.email || '—' }}</div>
            <div>Versicherung: {{ karteikartePatient.insurance?.provider || '—' }} ({{ karteikartePatient.insurance?.type || '—' }})</div>
          </div>
          <div v-if="karteikartePatient.notes" style="margin-top:12px;font-size:13px;color:var(--text-secondary)">{{ karteikartePatient.notes }}</div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
          <div>
            <div style="font-weight:700;font-size:14px;margin-bottom:10px">Termine</div>
            <div v-for="t in patientTermine" :key="t.terminId" style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:10px;padding:12px;margin-bottom:8px;font-size:13px">
              <div style="font-weight:600">{{ t.date }} · {{ t.startTime }}–{{ t.endTime }}</div>
              <div style="color:var(--text-muted)">{{ t.reason }}</div>
            </div>
            <div v-if="!patientTermine.length" style="color:var(--text-muted);font-size:13px">Keine Termine.</div>
          </div>

          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
              <div style="font-weight:700;font-size:14px">Rezepte</div>
              <button class="icon-btn" @click="openNewRezept"><i class="ti ti-plus"></i> Rezept ausstellen</button>
            </div>
            <div v-for="r in patientRezepte" :key="r.rezeptId" style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:10px;padding:12px;margin-bottom:8px">
              <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div style="font-size:12px;color:var(--text-muted)">{{ formatDate(r.issuedAt) }}</div>
                <div style="display:flex;gap:4px">
                  <button class="icon-btn" style="width:24px;height:24px" @click="downloadRezeptPdf(r)"><i class="ti ti-file-download"></i></button>
                  <button class="icon-btn" style="width:24px;height:24px" @click="deleteRezept(r)"><i class="ti ti-trash"></i></button>
                </div>
              </div>
              <div style="font-size:13px;margin-top:6px;white-space:pre-wrap">{{ r.text }}</div>
            </div>
            <div v-if="!patientRezepte.length" style="color:var(--text-muted);font-size:13px">Keine Rezepte.</div>
          </div>
        </div>
      </div>
      <div v-else style="text-align:center;padding:40px;color:var(--text-muted)">Bitte einen Patienten auswählen.</div>
    </div>

    <!-- PATIENT MODAL -->
    <div v-if="showPatientModal" class="modal-overlay" @click.self="showPatientModal=false">
      <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;padding:24px;width:100%;max-width:460px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <div style="font-size:16px;font-weight:700">{{ editingPatientId ? 'Patient bearbeiten' : 'Patient anlegen' }}</div>
          <button class="icon-btn" @click="showPatientModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="auth-field" style="margin-bottom:12px"><label>Name</label><input v-model="pForm.name" placeholder="Vor- und Nachname" /></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
          <div class="auth-field"><label>Geburtsdatum</label><input v-model="pForm.birthDate" type="date" /></div>
          <div class="auth-field"><label>Telefon</label><input v-model="pForm.phone" placeholder="+49..." /></div>
        </div>
        <div class="auth-field" style="margin-bottom:12px"><label>E-Mail</label><input v-model="pForm.email" placeholder="patient@beispiel.de" /></div>
        <div class="auth-field" style="margin-bottom:12px"><label>Adresse</label><input v-model="pForm.address" placeholder="Straße, PLZ Ort" /></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
          <div class="auth-field"><label>Versicherungsart</label>
            <select v-model="pForm.insuranceType" class="form-select"><option value="gesetzlich">Gesetzlich</option><option value="privat">Privat</option></select>
          </div>
          <div class="auth-field"><label>Kasse/Versicherer</label><input v-model="pForm.insuranceProvider" placeholder="z.B. AOK" /></div>
        </div>
        <div class="auth-field" style="margin-bottom:20px"><label>Notizen</label>
          <textarea v-model="pForm.notes" style="height:60px;resize:none;width:100%" class="form-select" placeholder="Anamnese, Allergien..."></textarea>
        </div>
        <button class="auth-btn" :disabled="!pForm.name" @click="savePatient">
          <i class="ti ti-device-floppy" style="margin-right:6px"></i>{{ editingPatientId ? 'Speichern' : 'Anlegen' }}
        </button>
      </div>
    </div>

    <!-- TERMIN MODAL -->
    <div v-if="showTerminModal" class="modal-overlay" @click.self="showTerminModal=false">
      <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;padding:24px;width:100%;max-width:440px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <div style="font-size:16px;font-weight:700">{{ editingTerminId ? 'Termin bearbeiten' : 'Termin anlegen' }}</div>
          <button class="icon-btn" @click="showTerminModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="auth-field" style="margin-bottom:12px"><label>Patient</label>
          <select v-model="tForm.patientId" class="form-select">
            <option value="">— wählen —</option>
            <option v-for="p in patienten" :key="p.patientId" :value="p.patientId">{{ p.name }}</option>
          </select>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px">
          <div class="auth-field"><label>Datum</label><input v-model="tForm.date" type="date" /></div>
          <div class="auth-field"><label>Von</label><input v-model="tForm.startTime" type="time" /></div>
          <div class="auth-field"><label>Bis</label><input v-model="tForm.endTime" type="time" /></div>
        </div>
        <div class="auth-field" style="margin-bottom:12px"><label>Grund</label><input v-model="tForm.reason" placeholder="z.B. Kontrolle" /></div>
        <div class="auth-field" style="margin-bottom:20px"><label>Status</label>
          <select v-model="tForm.status" class="form-select">
            <option value="geplant">Geplant</option><option value="erledigt">Erledigt</option><option value="abgesagt">Abgesagt</option>
          </select>
        </div>
        <button class="auth-btn" :disabled="!tForm.patientId || !tForm.date" @click="saveTermin">
          <i class="ti ti-device-floppy" style="margin-right:6px"></i>{{ editingTerminId ? 'Speichern' : 'Anlegen' }}
        </button>
      </div>
    </div>

    <!-- REZEPT MODAL -->
    <div v-if="showRezeptModal" class="modal-overlay" @click.self="showRezeptModal=false">
      <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;padding:24px;width:100%;max-width:460px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <div style="font-size:16px;font-weight:700">Rezept ausstellen</div>
          <button class="icon-btn" @click="showRezeptModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">Interne Notiz für die Akte — kein eRezept, keine Apotheken-Anbindung.</div>
        <div class="auth-field" style="margin-bottom:20px"><label>Text</label>
          <textarea v-model="rForm.text" style="height:120px;resize:none;width:100%" class="form-select" placeholder="Medikament, Dosierung, Hinweise..."></textarea>
        </div>
        <button class="auth-btn" :disabled="!rForm.text" @click="saveRezept">
          <i class="ti ti-device-floppy" style="margin-right:6px"></i>Ausstellen
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const userEmail = ref('')
const authToken = ref('')
const activeTab = ref('patienten')
const patienten = ref<any[]>([])
const termine   = ref<any[]>([])
const rezepte   = ref<any[]>([])

const tabs = [
  { key: 'patienten',   label: 'Patienten',   icon: 'ti-users' },
  { key: 'termine',     label: 'Termine',     icon: 'ti-calendar' },
  { key: 'karteikarte', label: 'Karteikarte', icon: 'ti-notebook' },
]

function authHeaders() { return { 'x-user-email': userEmail.value, Authorization: `Bearer ${authToken.value}` } }

async function loadPatienten() {
  try { const r = await $fetch<any>(useApiUrl('/api/praxis/patienten'), { headers: authHeaders() }); patienten.value = r.patienten || [] } catch {}
}
async function loadTermine() {
  try { const r = await $fetch<any>(useApiUrl('/api/praxis/termine'), { headers: authHeaders() }); termine.value = r.termine || [] } catch {}
}
async function loadRezepte() {
  try { const r = await $fetch<any>(useApiUrl('/api/praxis/rezepte'), { headers: authHeaders() }); rezepte.value = r.rezepte || [] } catch {}
}

function patientName(id: string) { return patienten.value.find(p => p.patientId === id)?.name || '—' }
function formatDate(d?: string) { if (!d) return ''; return new Date(d).toLocaleDateString('de-DE', { day:'2-digit', month:'short', year:'numeric' }) }

const termineSorted = computed(() => [...termine.value].sort((a, b) => (a.date||'').localeCompare(b.date||'')))
function terminStatusStyle(s?: string) {
  if (s === 'erledigt') return 'background:#22c55e22;color:#22c55e'
  if (s === 'abgesagt') return 'background:#ef444422;color:#ef4444'
  return 'background:var(--accent)22;color:var(--accent)'
}

// Patienten CRUD
const showPatientModal = ref(false)
const editingPatientId  = ref('')
const pForm = reactive({ name: '', birthDate: '', phone: '', email: '', address: '', insuranceType: 'gesetzlich', insuranceProvider: '', notes: '' })

function openNewPatient() {
  Object.assign(pForm, { name: '', birthDate: '', phone: '', email: '', address: '', insuranceType: 'gesetzlich', insuranceProvider: '', notes: '' })
  editingPatientId.value = ''
  showPatientModal.value = true
}
function openEditPatient(p: any) {
  Object.assign(pForm, { name: p.name, birthDate: p.birthDate, phone: p.phone, email: p.email, address: p.address, insuranceType: p.insurance?.type || 'gesetzlich', insuranceProvider: p.insurance?.provider || '', notes: p.notes })
  editingPatientId.value = p.patientId
  showPatientModal.value = true
}
async function savePatient() {
  try {
    const body = { ...pForm, insurance: { type: pForm.insuranceType, provider: pForm.insuranceProvider } }
    if (editingPatientId.value) {
      await $fetch(useApiUrl(`/api/praxis/patienten/${editingPatientId.value}`), { method: 'PUT', headers: authHeaders(), body })
    } else {
      await $fetch(useApiUrl('/api/praxis/patienten'), { method: 'POST', headers: authHeaders(), body })
    }
    showPatientModal.value = false
    await loadPatienten()
  } catch {}
}
async function deletePatient(p: any) {
  if (!confirm(`Patient "${p.name}" wirklich löschen?`)) return
  await $fetch(useApiUrl(`/api/praxis/patienten/${p.patientId}`), { method: 'DELETE', headers: authHeaders() })
  await loadPatienten()
}
function goToKarteikarte(p: any) { karteikartePatientId.value = p.patientId; activeTab.value = 'karteikarte' }

// Termine CRUD
const showTerminModal = ref(false)
const editingTerminId  = ref('')
const tForm = reactive({ patientId: '', date: '', startTime: '', endTime: '', reason: '', status: 'geplant' })

function openNewTermin() {
  Object.assign(tForm, { patientId: karteikartePatientId.value || '', date: '', startTime: '', endTime: '', reason: '', status: 'geplant' })
  editingTerminId.value = ''
  showTerminModal.value = true
}
function openEditTermin(t: any) {
  Object.assign(tForm, { patientId: t.patientId, date: t.date, startTime: t.startTime, endTime: t.endTime, reason: t.reason, status: t.status })
  editingTerminId.value = t.terminId
  showTerminModal.value = true
}
async function saveTermin() {
  try {
    if (editingTerminId.value) {
      await $fetch(useApiUrl(`/api/praxis/termine/${editingTerminId.value}`), { method: 'PUT', headers: authHeaders(), body: { ...tForm } })
    } else {
      await $fetch(useApiUrl('/api/praxis/termine'), { method: 'POST', headers: authHeaders(), body: { ...tForm } })
    }
    showTerminModal.value = false
    await loadTermine()
  } catch {}
}
async function deleteTermin(t: any) {
  if (!confirm('Termin löschen?')) return
  await $fetch(useApiUrl(`/api/praxis/termine/${t.terminId}`), { method: 'DELETE', headers: authHeaders() })
  await loadTermine()
}

// Karteikarte
const karteikartePatientId = ref('')
const karteikartePatient = computed(() => patienten.value.find(p => p.patientId === karteikartePatientId.value) || null)
const patientTermine = computed(() => termineSorted.value.filter(t => t.patientId === karteikartePatientId.value))
const patientRezepte = computed(() => rezepte.value.filter(r => r.patientId === karteikartePatientId.value))

// Rezepte
const showRezeptModal = ref(false)
const rForm = reactive({ text: '' })

function openNewRezept() {
  if (!karteikartePatientId.value) return
  Object.assign(rForm, { text: '' })
  showRezeptModal.value = true
}
async function saveRezept() {
  try {
    await $fetch(useApiUrl('/api/praxis/rezepte'), { method: 'POST', headers: authHeaders(), body: { patientId: karteikartePatientId.value, text: rForm.text } })
    showRezeptModal.value = false
    await loadRezepte()
  } catch {}
}
async function deleteRezept(r: any) {
  if (!confirm('Rezept löschen?')) return
  await $fetch(useApiUrl(`/api/praxis/rezepte/${r.rezeptId}`), { method: 'DELETE', headers: authHeaders() })
  await loadRezepte()
}
async function downloadRezeptPdf(r: any) {
  const blob = await $fetch<Blob>(useApiUrl(`/api/praxis/rezepte/${r.rezeptId}/pdf`), { headers: authHeaders(), responseType: 'blob' } as any)
  const blobUrl = URL.createObjectURL(blob as any)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = `Rezept-${(patientName(r.patientId) || 'Patient').replace(/\s+/g,'_')}.pdf`
  a.click()
  URL.revokeObjectURL(blobUrl)
}

onMounted(async () => {
  const { useAuthUser } = await import('~/composables/useAuth')
  const u = await useAuthUser()
  userEmail.value = u.email || ''
  authToken.value = u.idToken || ''
  await Promise.all([loadPatienten(), loadTermine(), loadRezepte()])
})
</script>
