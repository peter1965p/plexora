<template>
  <div class="stempel-root">

    <!-- Header -->
    <header class="stempel-header">
      <div class="stempel-logo">
        <span class="logo-mark">P</span>
        <span class="logo-text">Plexora</span>
      </div>
      <div class="stempel-date">{{ currentDate }}</div>
      <div class="stempel-clock">{{ currentTime }}</div>
    </header>

    <!-- Confirmation Overlay -->
    <Transition name="confirm-fade">
      <div v-if="confirmation" class="confirm-overlay">
        <div class="confirm-card" :class="confirmation.action">
          <i :class="confirmation.action === 'in' ? 'ti ti-login' : 'ti ti-logout'"></i>
          <div class="confirm-name">{{ confirmation.name }}</div>
          <div class="confirm-action">{{ confirmation.action === 'in' ? 'Eingestempelt' : 'Ausgestempelt' }}</div>
          <div class="confirm-time">{{ confirmation.time }} Uhr</div>
          <div v-if="confirmation.minutes" class="confirm-duration">
            Arbeitszeit: {{ formatMinutes(confirmation.minutes) }}
          </div>
        </div>
      </div>
    </Transition>

    <!-- Kiosk nicht angemeldet -->
    <main v-if="!kioskReady" class="stempel-main" style="display:flex;align-items:center;justify-content:center;min-height:60vh">
      <div style="text-align:center;color:var(--text-muted,#888)">
        <i class="ti ti-lock" style="font-size:48px;display:block;margin-bottom:16px"></i>
        <div style="font-size:16px;font-weight:700;margin-bottom:6px">Dieses Gerät ist nicht angemeldet</div>
        <div style="font-size:13px">Bitte auf diesem Kiosk-Gerät einmalig mit dem Firmen-Account einloggen.</div>
      </div>
    </main>

    <!-- Main Content -->
    <main v-else class="stempel-main">

      <!-- Employee Grid -->
      <section class="emp-section">
        <h2 class="section-label">Mitarbeiter auswählen</h2>
        <div class="emp-grid">
          <button
            v-for="emp in employees" :key="emp.id"
            class="emp-card"
            :class="{ selected: selectedId === emp.id, 'is-in': isClockedIn(emp.id) }"
            @click="selectEmployee(emp)"
          >
            <div class="emp-avatar">{{ initials(emp.name) }}</div>
            <div class="emp-name">{{ emp.name }}</div>
            <div class="emp-status">
              <span v-if="isClockedIn(emp.id)" class="status-dot in"></span>
              <span v-else class="status-dot out"></span>
              <span>{{ isClockedIn(emp.id) ? 'seit ' + clockedInSince(emp.id) : 'nicht eingest.' }}</span>
            </div>
          </button>
        </div>
      </section>

      <!-- Action Panel -->
      <section class="action-section">
        <div v-if="!selectedEmployee" class="action-placeholder">
          <i class="ti ti-hand-finger"></i>
          <p>Mitarbeiter antippen</p>
        </div>

        <div v-else class="action-panel">
          <div class="action-emp-info">
            <div class="action-avatar">{{ initials(selectedEmployee.name) }}</div>
            <div class="action-emp-name">{{ selectedEmployee.name }}</div>
            <div class="action-emp-sub" v-if="isClockedIn(selectedEmployee.id)">
              Eingestempelt seit {{ clockedInSince(selectedEmployee.id) }} Uhr
            </div>
            <div class="action-emp-sub" v-else>Noch nicht eingestempelt heute</div>
          </div>

          <button
            v-if="!isClockedIn(selectedEmployee.id)"
            class="stamp-btn in"
            :disabled="loading"
            @click="stamp('in')"
          >
            <i class="ti ti-login"></i>
            Einstempeln
          </button>
          <button
            v-else
            class="stamp-btn out"
            :disabled="loading"
            @click="stamp('out')"
          >
            <i class="ti ti-logout"></i>
            Ausstempeln
          </button>

          <button class="cancel-btn" @click="selectedEmployee = null; selectedId = null">
            <i class="ti ti-x"></i> Abbrechen
          </button>
        </div>
      </section>

    </main>

    <!-- Today's Log -->
    <footer class="stempel-log">
      <div class="log-label">Heute</div>
      <div class="log-entries">
        <div v-if="todayEntries.length === 0" class="log-empty">Noch keine Einträge</div>
        <div v-for="e in todayEntries" :key="e.logId" class="log-entry">
          <div class="log-emp">{{ e.employeeName }}</div>
          <div class="log-times">
            <span class="log-in">{{ e.clockIn }}</span>
            <span class="log-arrow">→</span>
            <span class="log-out" :class="{ open: !e.clockOut }">{{ e.clockOut || '…' }}</span>
          </div>
          <div v-if="e.minutes" class="log-dur">{{ formatMinutes(e.minutes) }}</div>
        </div>
      </div>
    </footer>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const apiBase = useRuntimeConfig().public.apiBase as string
const idToken = ref('')
const kioskReady = ref(false)

const currentTime = ref('')
const currentDate = ref('')
const employees   = ref<any[]>([])
const todayEntries= ref<any[]>([])
const selectedEmployee = ref<any>(null)
const selectedId  = ref<string | null>(null)
const loading     = ref(false)
const confirmation= ref<any>(null)

function authHeaders() { return idToken.value ? { Authorization: `Bearer ${idToken.value}` } : {} }

let clockTimer: ReturnType<typeof setInterval>
let refreshTimer: ReturnType<typeof setInterval>

function tick() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  currentDate.value = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function initials(name: string) {
  return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
}

function isClockedIn(empId: string) {
  return todayEntries.value.some(e => e.employeeId === empId && !e.clockOut)
}

function clockedInSince(empId: string) {
  const e = todayEntries.value.find(e => e.employeeId === empId && !e.clockOut)
  return e?.clockIn || ''
}

function formatMinutes(m: number) {
  const h = Math.floor(m / 60)
  const min = m % 60
  return h > 0 ? `${h}h ${min}min` : `${min}min`
}

function selectEmployee(emp: any) {
  selectedEmployee.value = emp
  selectedId.value = emp.id
}

async function loadTodayEntries() {
  try {
    const res = await $fetch<{ entries: any[] }>(`${apiBase}/api/hr/stempel`, { headers: authHeaders() })
    todayEntries.value = res.entries || []
  } catch {}
}

async function loadEmployees() {
  try {
    const res = await $fetch<{ employees: any[] }>(`${apiBase}/api/hr`, { headers: authHeaders() })
    employees.value = (res.employees || []).map((e: any) => ({
      id: e.employeeId,
      name: `${e.firstName} ${e.lastName}`,
    }))
  } catch {
    employees.value = []
  }
}

async function stamp(action: 'in' | 'out') {
  if (!selectedEmployee.value || loading.value) return
  loading.value = true
  try {
    const res = await $fetch<any>(`${apiBase}/api/hr/stempel`, {
      method: 'POST',
      headers: authHeaders(),
      body: { action, employeeId: selectedEmployee.value.id, employeeName: selectedEmployee.value.name },
    })
    await loadTodayEntries()
    confirmation.value = { action, name: selectedEmployee.value.name, time: res.time, minutes: res.minutes }
    selectedEmployee.value = null
    selectedId.value = null
    setTimeout(() => { confirmation.value = null }, 3500)
  } catch (err: any) {
    alert(err?.data?.message || 'Fehler beim Stempeln')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  tick()
  clockTimer   = setInterval(tick, 1000)
  refreshTimer = setInterval(loadTodayEntries, 30000)

  try {
    const { fetchAuthSession } = await import('aws-amplify/auth')
    const session = await fetchAuthSession()
    idToken.value = session.tokens?.idToken?.toString() || ''
  } catch {}

  if (idToken.value) {
    kioskReady.value = true
    await Promise.all([loadEmployees(), loadTodayEntries()])
  }
})

onUnmounted(() => {
  clearInterval(clockTimer)
  clearInterval(refreshTimer)
})
</script>

<style scoped>
.stempel-root {
  min-height: 100dvh;
  background: #0d0d14;
  color: #f0f0f8;
  display: flex;
  flex-direction: column;
  font-family: 'Inter', system-ui, sans-serif;
  user-select: none;
}

/* ── HEADER ─────────────────────────────────────────────────── */
.stempel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 32px;
  border-bottom: 0.5px solid #1e1e2e;
  background: #0a0a10;
}

.stempel-logo {
  display: flex;
  align-items: center;
  gap: 10px;
}
.logo-mark {
  width: 32px; height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #6366f1, #a78bfa);
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 16px; color: #fff;
}
.logo-text {
  font-weight: 700;
  font-size: 18px;
  color: #e8e8f8;
}

.stempel-date {
  font-size: 14px;
  color: #888;
  text-transform: capitalize;
}

.stempel-clock {
  font-size: 22px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #a78bfa;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  letter-spacing: 2px;
}

/* ── CONFIRM OVERLAY ────────────────────────────────────────── */
.confirm-overlay {
  position: fixed; inset: 0;
  z-index: 999;
  background: rgba(0,0,0,0.75);
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(4px);
}
.confirm-card {
  background: #13131e;
  border-radius: 24px;
  padding: 48px 56px;
  text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  border: 1px solid #2a2a3e;
  box-shadow: 0 32px 80px rgba(0,0,0,0.6);
}
.confirm-card i {
  font-size: 56px;
  margin-bottom: 8px;
}
.confirm-card.in i  { color: #4ade80; }
.confirm-card.out i { color: #f87171; }
.confirm-name   { font-size: 28px; font-weight: 800; }
.confirm-action {
  font-size: 16px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 2px;
}
.confirm-time     { font-size: 40px; font-weight: 900; color: #a78bfa; font-variant-numeric: tabular-nums; }
.confirm-duration { font-size: 14px; color: #666; margin-top: 4px; }

.confirm-fade-enter-active,
.confirm-fade-leave-active { transition: all .25s ease; }
.confirm-fade-enter-from,
.confirm-fade-leave-to    { opacity: 0; transform: scale(0.9); }

/* ── MAIN ──────────────────────────────────────────────────── */
.stempel-main {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 0;
  overflow: hidden;
}

/* ── EMPLOYEE SECTION ───────────────────────────────────────── */
.emp-section {
  padding: 28px 32px;
  overflow-y: auto;
}
.section-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: #555;
  margin-bottom: 20px;
}
.emp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 14px;
}
.emp-card {
  background: #13131e;
  border: 1.5px solid #1e1e2e;
  border-radius: 16px;
  padding: 20px 12px;
  cursor: pointer;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  transition: all .15s ease;
  text-align: center;
}
.emp-card:hover {
  border-color: #6366f1;
  background: #16162a;
  transform: translateY(-2px);
}
.emp-card.selected {
  border-color: #a78bfa;
  background: #1a1a2e;
  box-shadow: 0 0 0 3px rgba(167,139,250,0.2);
}
.emp-card.is-in {
  border-color: #22c55e44;
  background: #0f1a14;
}
.emp-card.is-in.selected {
  border-color: #4ade80;
  box-shadow: 0 0 0 3px rgba(74,222,128,0.15);
}
.emp-avatar {
  width: 52px; height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #a78bfa);
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; font-weight: 800; color: #fff;
}
.emp-name {
  font-size: 13px; font-weight: 600;
  line-height: 1.3;
}
.emp-status {
  display: flex; align-items: center; gap: 5px;
  font-size: 11px; color: #666;
}
.status-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-dot.in  { background: #4ade80; box-shadow: 0 0 6px #4ade80; }
.status-dot.out { background: #333; }

/* ── ACTION SECTION ─────────────────────────────────────────── */
.action-section {
  border-left: 0.5px solid #1e1e2e;
  display: flex; align-items: center; justify-content: center;
  padding: 32px;
  background: #0a0a10;
}
.action-placeholder {
  text-align: center;
  color: #333;
}
.action-placeholder i { font-size: 56px; display: block; margin-bottom: 16px; }
.action-placeholder p { font-size: 15px; }

.action-panel {
  display: flex; flex-direction: column; align-items: center; gap: 24px;
  width: 100%;
}
.action-emp-info {
  text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.action-avatar {
  width: 72px; height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #a78bfa);
  display: flex; align-items: center; justify-content: center;
  font-size: 26px; font-weight: 800; color: #fff;
  margin-bottom: 4px;
}
.action-emp-name { font-size: 22px; font-weight: 800; }
.action-emp-sub  { font-size: 13px; color: #666; }

.stamp-btn {
  width: 100%;
  padding: 20px;
  border-radius: 14px;
  border: none;
  font-size: 18px; font-weight: 800;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  transition: all .15s ease;
  letter-spacing: 0.5px;
}
.stamp-btn i { font-size: 22px; }
.stamp-btn.in {
  background: linear-gradient(135deg, #16a34a, #4ade80);
  color: #fff;
  box-shadow: 0 8px 32px rgba(74,222,128,0.25);
}
.stamp-btn.in:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(74,222,128,0.35);
}
.stamp-btn.out {
  background: linear-gradient(135deg, #dc2626, #f87171);
  color: #fff;
  box-shadow: 0 8px 32px rgba(248,113,113,0.25);
}
.stamp-btn.out:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(248,113,113,0.35);
}
.stamp-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.cancel-btn {
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  border: 0.5px solid #2a2a3e;
  background: transparent;
  color: #555;
  font-size: 14px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  transition: all .15s;
}
.cancel-btn:hover { border-color: #444; color: #888; }

/* ── TODAY'S LOG ────────────────────────────────────────────── */
.stempel-log {
  border-top: 0.5px solid #1e1e2e;
  padding: 16px 32px;
  background: #0a0a10;
  display: flex;
  align-items: flex-start;
  gap: 24px;
  overflow-x: auto;
}
.log-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: #555;
  white-space: nowrap;
  padding-top: 4px;
  min-width: 48px;
}
.log-entries {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  flex: 1;
}
.log-empty {
  font-size: 13px;
  color: #333;
  padding-top: 4px;
}
.log-entry {
  background: #13131e;
  border: 0.5px solid #1e1e2e;
  border-radius: 10px;
  padding: 8px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}
.log-emp   { font-weight: 600; color: #c0c0d8; }
.log-times { display: flex; align-items: center; gap: 6px; color: #666; font-variant-numeric: tabular-nums; }
.log-in    { color: #4ade80; font-weight: 600; }
.log-arrow { color: #333; }
.log-out   { color: #f87171; font-weight: 600; }
.log-out.open { color: #555; }
.log-dur   { color: #a78bfa; font-size: 12px; font-weight: 600; }

/* Scrollbar */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #2a2a3e; border-radius: 2px; }
</style>
