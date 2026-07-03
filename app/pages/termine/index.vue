<template>
  <div class="page">

    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:22px;font-weight:800;margin:0">Termine <span style="color:var(--accent)">Planer</span></h1>
        <p style="color:var(--text-muted);font-size:13px;margin:4px 0 0">Terminarten, Buchungen &amp; öffentliche Buchungsseite</p>
      </div>
      <button v-if="activeTab === 'terminarten'" class="accent-btn" @click="openNewType">
        <i class="ti ti-plus"></i> Terminart anlegen
      </button>
    </div>

    <!-- Stats -->
    <div class="stats-grid" style="margin-bottom:20px">
      <div class="stat-card">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:40px;height:40px;border-radius:10px;background:var(--accent)22;display:flex;align-items:center;justify-content:center">
            <i class="ti ti-calendar-event" style="color:var(--accent);font-size:20px"></i>
          </div>
          <div>
            <div style="font-size:22px;font-weight:800">{{ types.length }}</div>
            <div style="font-size:12px;color:var(--text-muted)">Terminarten</div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:40px;height:40px;border-radius:10px;background:#3b82f622;display:flex;align-items:center;justify-content:center">
            <i class="ti ti-calendar-time" style="color:#3b82f6;font-size:20px"></i>
          </div>
          <div>
            <div style="font-size:22px;font-weight:800">{{ upcomingCount }}</div>
            <div style="font-size:12px;color:var(--text-muted)">Anstehende Termine</div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:40px;height:40px;border-radius:10px;background:#22c55e22;display:flex;align-items:center;justify-content:center">
            <i class="ti ti-circle-check" style="color:#22c55e;font-size:20px"></i>
          </div>
          <div>
            <div style="font-size:22px;font-weight:800">{{ bookings.length }}</div>
            <div style="font-size:12px;color:var(--text-muted)">Buchungen gesamt</div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:40px;height:40px;border-radius:10px;background:#f59e0b22;display:flex;align-items:center;justify-content:center">
            <i class="ti ti-world" style="color:#f59e0b;font-size:20px"></i>
          </div>
          <div>
            <div style="font-size:22px;font-weight:800">{{ settingsForm.termineEnabled ? 'An' : 'Aus' }}</div>
            <div style="font-size:12px;color:var(--text-muted)">Öffentliche Seite</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
      <button v-for="tab in tabs" :key="tab.key" class="theme-opt" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
        <i class="ti" :class="tab.icon"></i> {{ tab.label }}
      </button>
    </div>

    <!-- ── TAB: TERMINARTEN ── -->
    <div v-if="activeTab === 'terminarten'">
      <div v-if="loadingTypes" style="display:flex;justify-content:center;padding:60px;color:var(--text-muted)">
        <i class="ti ti-loader-2 spin" style="font-size:28px"></i>
      </div>
      <div v-else-if="!types.length" style="text-align:center;padding:80px;color:var(--text-muted)">
        <i class="ti ti-calendar-off" style="font-size:48px;display:block;margin-bottom:12px;opacity:.3"></i>
        <p style="font-size:14px;margin-bottom:16px">Noch keine Terminarten angelegt.</p>
        <button class="accent-btn" @click="openNewType"><i class="ti ti-plus" style="margin-right:6px"></i>Erste Terminart anlegen</button>
      </div>
      <div v-else style="display:flex;flex-direction:column;gap:8px">
        <div v-for="t in types" :key="t.typeId"
          style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:16px"
          :style="!t.active ? 'opacity:.5' : ''">
          <div style="flex:1;min-width:0">
            <span style="font-weight:700;font-size:14px">{{ t.name }}</span>
            <span v-if="!t.active" style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:var(--border);color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-left:8px">Inaktiv</span>
          </div>
          <div style="font-size:13px;color:var(--text-muted);flex-shrink:0"><i class="ti ti-clock" style="margin-right:4px"></i>{{ t.durationMinutes }} Min.</div>
          <div style="display:flex;gap:4px;flex-shrink:0">
            <button @click="toggleTypeActive(t)" class="icon-btn" :title="t.active ? 'Deaktivieren' : 'Aktivieren'">
              <i class="ti" :class="t.active ? 'ti-eye' : 'ti-eye-off'"></i>
            </button>
            <button @click="openEditType(t)" class="icon-btn" title="Bearbeiten"><i class="ti ti-edit"></i></button>
            <button @click="deleteType(t)" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:16px;padding:4px 6px;border-radius:6px" title="Löschen">
              <i class="ti ti-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── TAB: TERMINE ── -->
    <div v-else-if="activeTab === 'termine'">
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <button v-for="f in bookingFilters" :key="f.key" class="theme-opt" :class="{ active: bookingFilter === f.key }" @click="bookingFilter = f.key">
          {{ f.label }}
        </button>
      </div>
      <div v-if="loadingBookings" style="display:flex;justify-content:center;padding:60px;color:var(--text-muted)">
        <i class="ti ti-loader-2 spin" style="font-size:28px"></i>
      </div>
      <div v-else-if="!filteredBookings.length" style="text-align:center;padding:80px;color:var(--text-muted)">
        <i class="ti ti-calendar-off" style="font-size:48px;display:block;margin-bottom:12px;opacity:.3"></i>
        <p style="font-size:14px">Keine Termine in dieser Ansicht.</p>
      </div>
      <div v-else style="display:flex;flex-direction:column;gap:8px">
        <div v-for="b in filteredBookings" :key="b.bookingId"
          style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap"
          :style="b.status === 'cancelled' ? 'opacity:.5' : ''">
          <div style="width:120px;flex-shrink:0">
            <div style="font-weight:700;font-size:13px">{{ formatDate(b.date) }}</div>
            <div style="font-size:12px;color:var(--text-muted)">{{ b.startTime }}–{{ b.endTime }}</div>
          </div>
          <div style="flex:1;min-width:160px">
            <div style="font-weight:600;font-size:13px">{{ b.customerName }}</div>
            <div style="font-size:12px;color:var(--text-muted)">{{ b.typeName }} · {{ b.customerEmail }}</div>
          </div>
          <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:.05em;flex-shrink:0"
            :style="b.status === 'cancelled' ? 'background:#ef444422;color:#ef4444' : 'background:#22c55e22;color:#22c55e'">
            {{ b.status === 'cancelled' ? 'Storniert' : 'Bestätigt' }}
          </span>
          <a v-if="b.googleMeetLink" :href="b.googleMeetLink" target="_blank" class="icon-btn" title="Meet-Link öffnen" style="flex-shrink:0">
            <i class="ti ti-video"></i>
          </a>
          <button v-if="b.status !== 'cancelled'" @click="cancelBooking(b)" class="icon-btn" style="color:#ef4444;flex-shrink:0" title="Stornieren">
            <i class="ti ti-x"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- ── TAB: EINSTELLUNGEN ── -->
    <div v-else-if="activeTab === 'einstellungen'">
      <div v-if="loadingSettings" style="display:flex;justify-content:center;padding:60px;color:var(--text-muted)">
        <i class="ti ti-loader-2 spin" style="font-size:28px"></i>
      </div>
      <div v-else style="display:flex;flex-direction:column;gap:16px;max-width:640px">

        <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:14px;padding:18px 20px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div style="font-size:13px;font-weight:700"><i class="ti ti-world" style="margin-right:6px;color:var(--accent)"></i>Öffentliche Buchungsseite</div>
            <button @click="settingsForm.termineEnabled = !settingsForm.termineEnabled"
              style="width:42px;height:24px;border-radius:12px;border:none;cursor:pointer;transition:all .2s;position:relative;flex-shrink:0"
              :style="settingsForm.termineEnabled ? 'background:var(--accent)' : 'background:var(--border)'">
              <span style="position:absolute;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .2s"
                :style="settingsForm.termineEnabled ? 'left:21px' : 'left:3px'"></span>
            </button>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">
            Kunden können auf deiner Nexora-Webseite selbst einen freien Termin buchen.
          </div>
          <div class="auth-field" v-if="settingsForm.termineEnabled">
            <label>Seitentitel (Navigation &amp; Überschrift)</label>
            <input v-model="settingsForm.termineTitle" placeholder="Termine" />
          </div>
        </div>

        <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:14px;padding:18px 20px">
          <div style="font-size:13px;font-weight:700;margin-bottom:14px"><i class="ti ti-clock-hour-4" style="margin-right:6px;color:var(--accent)"></i>Arbeitszeiten</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <div v-for="d in weekdays" :key="d.key" style="display:flex;align-items:center;gap:10px">
              <label style="display:flex;align-items:center;gap:8px;width:110px;flex-shrink:0;cursor:pointer;font-size:13px">
                <input type="checkbox" v-model="settingsForm.termineWorkingHours[d.key].enabled" style="width:auto" />
                {{ d.label }}
              </label>
              <template v-if="settingsForm.termineWorkingHours[d.key].enabled">
                <input type="time" v-model="settingsForm.termineWorkingHours[d.key].start" class="form-select" style="width:110px" />
                <span style="color:var(--text-muted);font-size:12px">bis</span>
                <input type="time" v-model="settingsForm.termineWorkingHours[d.key].end" class="form-select" style="width:110px" />
              </template>
              <span v-else style="font-size:12px;color:var(--text-muted)">Geschlossen</span>
            </div>
          </div>
        </div>

        <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:14px;padding:18px 20px">
          <div style="font-size:13px;font-weight:700;margin-bottom:14px"><i class="ti ti-adjustments" style="margin-right:6px;color:var(--accent)"></i>Buchungsregeln</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="auth-field"><label>Slot-Länge (Min.)</label>
              <select v-model.number="settingsForm.termineSlotStepMinutes" class="form-select">
                <option :value="15">15</option><option :value="30">30</option><option :value="45">45</option><option :value="60">60</option>
              </select>
            </div>
            <div class="auth-field"><label>Zeitzone</label>
              <select v-model="settingsForm.termineTimezone" class="form-select">
                <option value="Europe/Berlin">Europe/Berlin</option>
                <option value="Europe/Vienna">Europe/Vienna</option>
                <option value="Europe/Zurich">Europe/Zurich</option>
              </select>
            </div>
            <div class="auth-field"><label>Mindest-Vorlauf (Stunden)</label><input v-model.number="settingsForm.termineMinNoticeHours" type="number" min="0" /></div>
            <div class="auth-field"><label>Max. Vorausbuchung (Tage)</label><input v-model.number="settingsForm.termineMaxAdvanceDays" type="number" min="1" /></div>
          </div>
        </div>

        <button class="accent-btn" style="align-self:flex-start" :disabled="savingSettings" @click="saveSettings">
          <i v-if="savingSettings" class="ti ti-loader-2 spin"></i>
          <span v-else><i class="ti ti-device-floppy" style="margin-right:6px"></i>Speichern</span>
        </button>
      </div>
    </div>

    <!-- MODAL: Terminart -->
    <div v-if="showTypeModal" class="modal-overlay" @click.self="showTypeModal=false">
      <div class="modal-card" style="max-width:420px">
        <div class="modal-header">
          <span class="card-title">{{ editingTypeId ? 'Terminart bearbeiten' : 'Terminart anlegen' }}</span>
          <button class="icon-btn" @click="showTypeModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-field"><label>Name *</label><input v-model="typeForm.name" placeholder="Beratungsgespräch" /></div>
          <div class="auth-field"><label>Dauer (Minuten) *</label><input v-model.number="typeForm.durationMinutes" type="number" min="5" step="5" placeholder="30" /></div>
          <div class="auth-field">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" v-model="typeForm.active" style="width:auto" /> Aktiv
            </label>
          </div>
        </div>
        <div style="padding:0 24px 24px">
          <button class="auth-btn" @click="saveType" :disabled="!typeForm.name || !typeForm.durationMinutes">
            <i class="ti ti-device-floppy" style="margin-right:6px"></i>{{ editingTypeId ? 'Speichern' : 'Terminart anlegen' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const userEmail = ref('')
const activeTab = ref('terminarten')

const tabs = [
  { key: 'terminarten',  label: 'Terminarten',  icon: 'ti-calendar-event' },
  { key: 'termine',      label: 'Termine',       icon: 'ti-list-details' },
  { key: 'einstellungen', label: 'Einstellungen', icon: 'ti-settings' },
]

interface AppointmentType { typeId: string; name: string; durationMinutes: number; active: boolean }
interface Booking {
  bookingId: string; typeId: string; typeName: string; durationMinutes: number
  date: string; startTime: string; endTime: string
  customerName: string; customerEmail: string; customerPhone: string; notes: string
  status: string; googleEventId?: string; googleMeetLink?: string; createdAt: string
}

const weekdays = [
  { key: 'mon', label: 'Montag' }, { key: 'tue', label: 'Dienstag' }, { key: 'wed', label: 'Mittwoch' },
  { key: 'thu', label: 'Donnerstag' }, { key: 'fri', label: 'Freitag' }, { key: 'sat', label: 'Samstag' }, { key: 'sun', label: 'Sonntag' },
]

function formatDate(d?: string) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// ── Terminarten ───────────────────────────────────────
const types        = ref<AppointmentType[]>([])
const loadingTypes = ref(true)
const showTypeModal = ref(false)
const editingTypeId = ref('')
const typeForm = reactive({ name: '', durationMinutes: 30, active: true })

function resetTypeForm() { typeForm.name = ''; typeForm.durationMinutes = 30; typeForm.active = true; editingTypeId.value = '' }
function openNewType() { resetTypeForm(); showTypeModal.value = true }
function openEditType(t: AppointmentType) {
  typeForm.name = t.name; typeForm.durationMinutes = t.durationMinutes; typeForm.active = t.active
  editingTypeId.value = t.typeId
  showTypeModal.value = true
}

async function loadTypes() {
  loadingTypes.value = true
  try {
    const res = await $fetch<{ types: AppointmentType[] }>(useApiUrl('/api/termine/types'), { headers: { 'x-user-email': userEmail.value } })
    types.value = res.types || []
  } catch {}
  loadingTypes.value = false
}

async function saveType() {
  if (!typeForm.name || !typeForm.durationMinutes) return
  try {
    if (editingTypeId.value) {
      await $fetch(useApiUrl(`/api/termine/types/${editingTypeId.value}`), { method: 'PUT', headers: { 'x-user-email': userEmail.value }, body: { ...typeForm } })
    } else {
      await $fetch(useApiUrl('/api/termine/types'), { method: 'POST', headers: { 'x-user-email': userEmail.value }, body: { ...typeForm } })
    }
    showTypeModal.value = false
    await loadTypes()
  } catch {}
}

async function toggleTypeActive(t: AppointmentType) {
  t.active = !t.active
  await $fetch(useApiUrl(`/api/termine/types/${t.typeId}`), { method: 'PUT', headers: { 'x-user-email': userEmail.value }, body: { active: t.active } })
}

async function deleteType(t: AppointmentType) {
  if (!confirm(`"${t.name}" wirklich löschen?`)) return
  await $fetch(useApiUrl(`/api/termine/types/${t.typeId}`), { method: 'DELETE', headers: { 'x-user-email': userEmail.value } })
  await loadTypes()
}

// ── Termine (Buchungen) ────────────────────────────────
const bookings        = ref<Booking[]>([])
const loadingBookings = ref(true)
const bookingFilter   = ref('anstehend')
const bookingFilters = [
  { key: 'alle',       label: 'Alle' },
  { key: 'anstehend',  label: 'Anstehend' },
  { key: 'vergangen',  label: 'Vergangen' },
  { key: 'storniert',  label: 'Storniert' },
]

const todayStr = new Date().toISOString().slice(0, 10)

const upcomingCount = computed(() =>
  bookings.value.filter(b => b.status !== 'cancelled' && b.date >= todayStr).length
)

const filteredBookings = computed(() => {
  const sorted = [...bookings.value].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
  if (bookingFilter.value === 'anstehend') return sorted.filter(b => b.status !== 'cancelled' && b.date >= todayStr)
  if (bookingFilter.value === 'vergangen') return sorted.filter(b => b.status !== 'cancelled' && b.date < todayStr).reverse()
  if (bookingFilter.value === 'storniert') return sorted.filter(b => b.status === 'cancelled')
  return sorted
})

async function loadBookings() {
  loadingBookings.value = true
  try {
    const res = await $fetch<{ bookings: Booking[] }>(useApiUrl('/api/termine/bookings'), { headers: { 'x-user-email': userEmail.value } })
    bookings.value = res.bookings || []
  } catch {}
  loadingBookings.value = false
}

async function cancelBooking(b: Booking) {
  if (!confirm(`Termin mit "${b.customerName}" wirklich stornieren?`)) return
  b.status = 'cancelled'
  await $fetch(useApiUrl(`/api/termine/bookings/${b.bookingId}`), { method: 'PUT', headers: { 'x-user-email': userEmail.value }, body: { status: 'cancelled' } })
}

// ── Einstellungen ───────────────────────────────────────
const loadingSettings = ref(true)
const savingSettings  = ref(false)
const settingsForm = reactive({
  termineEnabled: false,
  termineTitle: 'Termine',
  termineTimezone: 'Europe/Berlin',
  termineWorkingHours: {} as Record<string, { enabled: boolean; start: string; end: string }>,
  termineSlotStepMinutes: 30,
  termineMinNoticeHours: 2,
  termineMaxAdvanceDays: 60,
})

async function loadSettings() {
  loadingSettings.value = true
  try {
    const res = await $fetch<{ tenantId: string; settings: typeof settingsForm }>(useApiUrl('/api/termine/settings'), { headers: { 'x-user-email': userEmail.value } })
    Object.assign(settingsForm, res.settings)
  } catch {}
  loadingSettings.value = false
}

async function saveSettings() {
  savingSettings.value = true
  try {
    await $fetch(useApiUrl('/api/termine/settings'), {
      method: 'PUT',
      headers: { 'x-user-email': userEmail.value },
      body: { ...settingsForm },
    })
  } catch {
    alert('Fehler beim Speichern.')
  } finally {
    savingSettings.value = false
  }
}

onMounted(async () => {
  const { useAuthUser } = await import('~/composables/useAuth')
  const u = await useAuthUser()
  userEmail.value = u.email || ''
  await Promise.all([loadTypes(), loadBookings(), loadSettings()])
})
</script>
