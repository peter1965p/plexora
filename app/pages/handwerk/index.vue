<template>
  <div class="page">

    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:22px;font-weight:800;margin:0">Handwerk <span style="color:var(--accent)">Manager</span></h1>
        <p style="color:var(--text-muted);font-size:13px;margin:4px 0 0">Baustellen, Aufmaß-Erfassung & Auftragszettel</p>
      </div>
      <button v-if="!selectedBaustelle" class="accent-btn" @click="openNewBaustelle">
        <i class="ti ti-plus"></i> Baustelle anlegen
      </button>
    </div>

    <!-- BAUSTELLEN LISTE -->
    <div v-if="!selectedBaustelle">
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">
        <div v-for="b in baustellen" :key="b.baustelleId" @click="selectBaustelle(b)"
          style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:14px;padding:18px;cursor:pointer">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <div style="font-weight:700;font-size:14px">{{ b.customerName || 'Unbenannt' }}</div>
            <span style="font-size:11px;padding:3px 8px;border-radius:6px" :style="statusStyle(b.status)">{{ b.status }}</span>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px"><i class="ti ti-map-pin"></i> {{ b.address }}</div>
          <div style="font-size:12px;color:var(--text-muted)">{{ b.description }}</div>
        </div>
      </div>
      <div v-if="!baustellen.length" style="text-align:center;padding:40px;color:var(--text-muted)">Noch keine Baustellen angelegt.</div>
    </div>

    <!-- BAUSTELLE DETAIL -->
    <div v-else>
      <button class="icon-btn" style="margin-bottom:16px" @click="selectedBaustelle=null"><i class="ti ti-arrow-left"></i> Zurück</button>

      <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;padding:20px;margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="font-weight:800;font-size:17px;margin-bottom:4px">{{ selectedBaustelle.customerName }}</div>
            <div style="font-size:13px;color:var(--text-muted)"><i class="ti ti-map-pin"></i> {{ selectedBaustelle.address }}</div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="icon-btn" @click="openEditBaustelle(selectedBaustelle)"><i class="ti ti-edit"></i></button>
            <button class="icon-btn" @click="downloadPdf(selectedBaustelle)"><i class="ti ti-file-download"></i> Auftragszettel</button>
          </div>
        </div>
        <div style="margin-top:12px;font-size:13px;color:var(--text-secondary)">{{ selectedBaustelle.description }}</div>
        <div v-if="selectedBaustelle.notes" style="margin-top:8px;font-size:12px;color:var(--text-muted)"><strong>Notizen:</strong> {{ selectedBaustelle.notes }}</div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div style="font-weight:700;font-size:14px">Aufmaß-Erfassung</div>
        <button class="accent-btn" @click="openNewAufmass"><i class="ti ti-plus"></i> Aufmaß erfassen</button>
      </div>

      <div v-for="a in baustelleAufmasse" :key="a.aufmassId" style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:12px;padding:16px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div style="font-weight:700;font-size:13px">{{ a.bereich }}</div>
          <div style="display:flex;gap:6px">
            <button class="icon-btn" style="width:26px;height:26px" @click="openEditAufmass(a)"><i class="ti ti-edit"></i></button>
            <button class="icon-btn" style="width:26px;height:26px" @click="deleteAufmass(a)"><i class="ti ti-trash"></i></button>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px" v-if="a.measurements?.length">
          <thead><tr style="text-align:left;color:var(--text-muted)"><th style="padding:4px">Position</th><th style="padding:4px">B×H</th><th style="padding:4px">Menge</th><th style="padding:4px">Notiz</th></tr></thead>
          <tbody>
            <tr v-for="(m,i) in a.measurements" :key="i" style="border-top:0.5px solid var(--border)">
              <td style="padding:4px">{{ m.label }}</td>
              <td style="padding:4px">{{ m.width }}×{{ m.height }}</td>
              <td style="padding:4px">{{ m.qty }} {{ m.unit }}</td>
              <td style="padding:4px;color:var(--text-muted)">{{ m.note }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="a.notes" style="font-size:12px;color:var(--text-muted);margin-top:8px">{{ a.notes }}</div>
      </div>
      <div v-if="!baustelleAufmasse.length" style="text-align:center;padding:24px;color:var(--text-muted)">Noch kein Aufmaß erfasst.</div>
    </div>

    <!-- BAUSTELLE MODAL -->
    <div v-if="showBaustelleModal" class="modal-overlay" @click.self="showBaustelleModal=false">
      <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;padding:24px;width:100%;max-width:460px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <div style="font-size:16px;font-weight:700">{{ editingBaustelleId ? 'Baustelle bearbeiten' : 'Baustelle anlegen' }}</div>
          <button class="icon-btn" @click="showBaustelleModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="auth-field" style="margin-bottom:12px"><label>Kunde</label><input v-model="bForm.customerName" placeholder="Kundenname" /></div>
        <div class="auth-field" style="margin-bottom:12px"><label>Adresse</label><input v-model="bForm.address" placeholder="Baustellen-Adresse" /></div>
        <div class="auth-field" style="margin-bottom:12px"><label>Beschreibung</label>
          <textarea v-model="bForm.description" style="height:70px;resize:none;width:100%" class="form-select" placeholder="Auftragsbeschreibung..."></textarea>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px">
          <div class="auth-field"><label>Status</label>
            <select v-model="bForm.status" class="form-select">
              <option value="geplant">Geplant</option><option value="laufend">Laufend</option><option value="abgeschlossen">Abgeschlossen</option>
            </select>
          </div>
          <div class="auth-field"><label>Start</label><input v-model="bForm.startDate" type="date" /></div>
          <div class="auth-field"><label>Ende</label><input v-model="bForm.endDate" type="date" /></div>
        </div>
        <div class="auth-field" style="margin-bottom:20px"><label>Notizen</label>
          <textarea v-model="bForm.notes" style="height:60px;resize:none;width:100%" class="form-select" placeholder="Interne Notizen..."></textarea>
        </div>
        <button class="auth-btn" :disabled="!bForm.customerName" @click="saveBaustelle">
          <i class="ti ti-device-floppy" style="margin-right:6px"></i>{{ editingBaustelleId ? 'Speichern' : 'Anlegen' }}
        </button>
      </div>
    </div>

    <!-- AUFMASS MODAL -->
    <div v-if="showAufmassModal" class="modal-overlay" @click.self="showAufmassModal=false">
      <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;padding:24px;width:100%;max-width:560px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <div style="font-size:16px;font-weight:700">{{ editingAufmassId ? 'Aufmaß bearbeiten' : 'Aufmaß erfassen' }}</div>
          <button class="icon-btn" @click="showAufmassModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="auth-field" style="margin-bottom:14px"><label>Bereich</label><input v-model="aForm.bereich" placeholder="z.B. Wohnzimmer, Fassade Nord..." /></div>

        <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px">Maße</div>
        <div v-for="(m, i) in aForm.measurements" :key="i" style="display:grid;grid-template-columns:1.4fr 0.8fr 0.8fr 0.8fr 0.6fr 1.2fr auto;gap:6px;margin-bottom:8px;align-items:center">
          <input v-model="m.label" placeholder="Position" class="form-select" style="padding:6px 8px;font-size:12px" />
          <input v-model="m.width" placeholder="Breite" class="form-select" style="padding:6px 8px;font-size:12px" />
          <input v-model="m.height" placeholder="Höhe" class="form-select" style="padding:6px 8px;font-size:12px" />
          <input v-model="m.qty" placeholder="Menge" class="form-select" style="padding:6px 8px;font-size:12px" />
          <input v-model="m.unit" placeholder="Einh." class="form-select" style="padding:6px 8px;font-size:12px" />
          <input v-model="m.note" placeholder="Notiz" class="form-select" style="padding:6px 8px;font-size:12px" />
          <button class="icon-btn" style="width:26px;height:26px" @click="aForm.measurements.splice(i,1)"><i class="ti ti-x"></i></button>
        </div>
        <button class="icon-btn" style="margin-bottom:16px" @click="aForm.measurements.push({label:'',width:'',height:'',qty:'',unit:'m',note:''})">
          <i class="ti ti-plus"></i> Maß hinzufügen
        </button>

        <div class="auth-field" style="margin-bottom:20px"><label>Notizen</label>
          <textarea v-model="aForm.notes" style="height:60px;resize:none;width:100%" class="form-select" placeholder="Zusätzliche Notizen..."></textarea>
        </div>
        <button class="auth-btn" :disabled="!aForm.bereich" @click="saveAufmass">
          <i class="ti ti-device-floppy" style="margin-right:6px"></i>{{ editingAufmassId ? 'Speichern' : 'Erfassen' }}
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const userEmail = ref('')
const authToken = ref('')
const baustellen = ref<any[]>([])
const aufmasse   = ref<any[]>([])
const selectedBaustelle = ref<any>(null)

function authHeaders() { return { 'x-user-email': userEmail.value, Authorization: `Bearer ${authToken.value}` } }

async function loadBaustellen() {
  try { const r = await $fetch<any>(useApiUrl('/api/handwerk/baustellen'), { headers: authHeaders() }); baustellen.value = r.baustellen || [] } catch {}
}
async function loadAufmasse() {
  try { const r = await $fetch<any>(useApiUrl('/api/handwerk/aufmass'), { headers: authHeaders() }); aufmasse.value = r.aufmasse || [] } catch {}
}

const baustelleAufmasse = computed(() => aufmasse.value.filter(a => a.baustelleId === selectedBaustelle.value?.baustelleId))

function selectBaustelle(b: any) { selectedBaustelle.value = b }

function statusStyle(s?: string) {
  if (s === 'abgeschlossen') return 'background:#22c55e22;color:#22c55e'
  if (s === 'laufend')       return 'background:var(--accent)22;color:var(--accent)'
  return 'background:var(--border);color:var(--text-muted)'
}

// Baustelle
const showBaustelleModal = ref(false)
const editingBaustelleId  = ref('')
const bForm = reactive({ customerName: '', address: '', description: '', status: 'geplant', startDate: '', endDate: '', notes: '' })

function openNewBaustelle() {
  Object.assign(bForm, { customerName: '', address: '', description: '', status: 'geplant', startDate: '', endDate: '', notes: '' })
  editingBaustelleId.value = ''
  showBaustelleModal.value = true
}
function openEditBaustelle(b: any) {
  Object.assign(bForm, { customerName: b.customerName, address: b.address, description: b.description, status: b.status, startDate: b.startDate, endDate: b.endDate, notes: b.notes })
  editingBaustelleId.value = b.baustelleId
  showBaustelleModal.value = true
}
async function saveBaustelle() {
  try {
    if (editingBaustelleId.value) {
      const r = await $fetch<any>(useApiUrl(`/api/handwerk/baustellen/${editingBaustelleId.value}`), { method: 'PUT', headers: authHeaders(), body: { ...bForm } })
      if (selectedBaustelle.value?.baustelleId === editingBaustelleId.value) selectedBaustelle.value = r.baustelle
    } else {
      await $fetch(useApiUrl('/api/handwerk/baustellen'), { method: 'POST', headers: authHeaders(), body: { ...bForm } })
    }
    showBaustelleModal.value = false
    await loadBaustellen()
  } catch {}
}

// Aufmaß
const showAufmassModal = ref(false)
const editingAufmassId  = ref('')
const aForm = reactive({ bereich: '', measurements: [] as any[], notes: '' })

function openNewAufmass() {
  Object.assign(aForm, { bereich: '', measurements: [{ label:'', width:'', height:'', qty:'', unit:'m', note:'' }], notes: '' })
  editingAufmassId.value = ''
  showAufmassModal.value = true
}
function openEditAufmass(a: any) {
  Object.assign(aForm, { bereich: a.bereich, measurements: JSON.parse(JSON.stringify(a.measurements || [])), notes: a.notes })
  editingAufmassId.value = a.aufmassId
  showAufmassModal.value = true
}
async function saveAufmass() {
  try {
    const body = { ...aForm, baustelleId: selectedBaustelle.value.baustelleId }
    if (editingAufmassId.value) {
      await $fetch(useApiUrl(`/api/handwerk/aufmass/${editingAufmassId.value}`), { method: 'PUT', headers: authHeaders(), body })
    } else {
      await $fetch(useApiUrl('/api/handwerk/aufmass'), { method: 'POST', headers: authHeaders(), body })
    }
    showAufmassModal.value = false
    await loadAufmasse()
  } catch {}
}
async function deleteAufmass(a: any) {
  if (!confirm('Aufmaß löschen?')) return
  await $fetch(useApiUrl(`/api/handwerk/aufmass/${a.aufmassId}`), { method: 'DELETE', headers: authHeaders() })
  await loadAufmasse()
}

async function downloadPdf(b: any) {
  const blob = await $fetch<Blob>(useApiUrl(`/api/handwerk/baustellen/${b.baustelleId}/pdf`), { headers: authHeaders(), responseType: 'blob' } as any)
  const blobUrl = URL.createObjectURL(blob as any)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = `Auftragszettel-${(b.customerName || 'Baustelle').replace(/\s+/g,'_')}.pdf`
  a.click()
  URL.revokeObjectURL(blobUrl)
}

onMounted(async () => {
  const { useAuthUser } = await import('~/composables/useAuth')
  const u = await useAuthUser()
  userEmail.value = u.email || ''
  authToken.value = u.idToken || ''
  await Promise.all([loadBaustellen(), loadAufmasse()])
})
</script>
