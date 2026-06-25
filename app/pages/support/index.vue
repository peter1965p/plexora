<template>
  <div class="page">

    <div class="stats-grid">
      <div class="stat-card">
        <i class="ti ti-ticket stat-icon"></i>
        <div class="stat-label">Tickets gesamt</div>
        <div class="stat-value">{{ tickets.length }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ openCount }} offen</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-alert-triangle stat-icon"></i>
        <div class="stat-label">Kritisch / Hoch</div>
        <div class="stat-value" style="color:#E05C5C">{{ criticalCount }}</div>
        <div class="stat-delta down"><i class="ti ti-arrow-down-right"></i> sofort handeln</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-loader stat-icon"></i>
        <div class="stat-label">In Bearbeitung</div>
        <div class="stat-value">{{ inProgressCount }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> aktiv</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-circle-check stat-icon"></i>
        <div class="stat-label">Gelöst</div>
        <div class="stat-value" style="color:#00D4B4">{{ resolvedCount }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> heute</div>
      </div>
    </div>

    <div style="display:flex;gap:14px;align-items:flex-start">

      <!-- TICKET LIST -->
      <div class="card" style="flex:1;min-width:0">
        <div class="card-header">
          <span class="card-title">Support Tickets</span>
          <div style="display:flex;gap:6px">
            <select v-model="filterStatus" class="form-select" style="height:28px;font-size:11px;padding:0 8px">
              <option value="">Alle</option>
              <option value="open">Offen</option>
              <option value="in_progress">In Bearbeitung</option>
              <option value="resolved">Gelöst</option>
              <option value="closed">Geschlossen</option>
            </select>
            <select v-model="filterPrio" class="form-select" style="height:28px;font-size:11px;padding:0 8px">
              <option value="">Alle Prios</option>
              <option value="critical">Kritisch</option>
              <option value="high">Hoch</option>
              <option value="medium">Mittel</option>
              <option value="low">Niedrig</option>
            </select>
          </div>
          <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" @click="showAdd=true">
            <i class="ti ti-plus"></i> Neues Ticket
          </button>
        </div>
        <table class="data-table">
          <thead>
            <tr><th>Titel</th><th>Kunde</th><th>Zuständig</th><th>Prio</th><th>SLA</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr v-if="!filtered.length">
              <td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">Keine Tickets</td>
            </tr>
            <tr
              v-for="t in filtered" :key="t.ticketId"
              @click="openDetail(t)"
              style="cursor:pointer"
              :class="{ 'tr-active': detail?.ticketId === t.ticketId }"
            >
              <td class="td-name">
                {{ t.title }}
                <span v-if="t.comments?.length" style="font-size:10px;color:var(--text-muted);margin-left:4px">
                  <i class="ti ti-message"></i> {{ t.comments.length }}
                </span>
              </td>
              <td style="font-size:12px">{{ t.client }}</td>
              <td style="font-size:12px;color:var(--text-muted)">{{ t.assignee || '–' }}</td>
              <td><span class="badge" :class="priorityBadge(t.priority)">{{ priorityLabel(t.priority) }}</span></td>
              <td>
                <div class="sla-bar-wrap" :title="slaTooltip(t)">
                  <div class="sla-bar" :class="slaClass(t)" :style="{ width: Math.min(slaPercent(t), 100) + '%' }"></div>
                  <span class="sla-label" :class="slaClass(t)">{{ slaLabel(t) }}</span>
                </div>
              </td>
              <td><span class="badge" :class="t.status==='open'?'badge-danger':t.status==='in_progress'?'badge-warning':'badge-success'">{{ statusLabel(t.status) }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- TICKET DETAIL DRAWER -->
      <div v-if="detail" class="ticket-drawer">
        <div class="ticket-drawer-header">
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--text-primary)">{{ detail.title }}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px">{{ detail.client }} · {{ new Date(detail.created).toLocaleDateString('de-DE') }}</div>
          </div>
          <button class="icon-btn" @click="detail=null"><i class="ti ti-x"></i></button>
        </div>

        <!-- STATUS + ASSIGN -->
        <div style="padding:12px 16px;border-bottom:0.5px solid var(--border);display:flex;gap:8px;flex-wrap:wrap">
          <select :value="detail.status" class="form-select" style="height:28px;font-size:11px;flex:1" @change="updateTicket(detail,'status',($event.target as HTMLSelectElement).value)">
            <option value="open">Offen</option>
            <option value="in_progress">In Bearbeitung</option>
            <option value="resolved">Gelöst</option>
            <option value="closed">Geschlossen</option>
          </select>
          <input :value="detail.assignee" @blur="updateTicket(detail,'assignee',($event.target as HTMLInputElement).value)"
            class="form-select" style="height:28px;font-size:11px;flex:1" placeholder="Zuständig..." />
        </div>

        <!-- SLA INFO -->
        <div style="padding:10px 16px;border-bottom:0.5px solid var(--border);font-size:12px;color:var(--text-muted)">
          <span>SLA: <strong :class="'sla-txt-'+slaClass(detail)">{{ slaTooltip(detail) }}</strong></span>
          <span v-if="detail.portalToken" style="float:right">
            <button class="icon-btn" style="font-size:11px;padding:0 8px;height:22px" @click="copyPortalLink(detail)" title="Kunden-Portal-Link kopieren">
              <i class="ti ti-link"></i> Portal-Link
            </button>
          </span>
        </div>

        <!-- COMMENT THREAD -->
        <div class="ticket-comments" ref="commentsEl">
          <div v-if="!detail.comments?.length" style="text-align:center;color:var(--text-muted);padding:24px;font-size:13px">Noch keine Kommentare</div>
          <div v-for="c in detail.comments" :key="c.id" class="ticket-comment" :class="{ 'customer': c.isCustomer }">
            <div class="tc-author">{{ c.isCustomer ? '👤 ' : '🎧 ' }}{{ c.author }}</div>
            <div class="tc-text">{{ c.text }}</div>
            <div class="tc-time">{{ new Date(c.created).toLocaleString('de-DE') }}</div>
          </div>
        </div>

        <!-- REPLY -->
        <div style="padding:12px 16px;border-top:0.5px solid var(--border)">
          <textarea v-model="replyText" rows="2" placeholder="Antwort eingeben..." style="width:100%;background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px;color:var(--text-primary);outline:none;resize:none;font-family:inherit;box-sizing:border-box"></textarea>
          <button class="accent-btn" :disabled="!replyText.trim() || replying" style="width:100%;margin-top:6px;height:32px;font-size:12px" @click="sendReply">
            <i v-if="replying" class="ti ti-loader-2 spin"></i>
            <i v-else class="ti ti-send"></i> Antwort senden
          </button>
        </div>
      </div>
    </div>

    <!-- ADD TICKET MODAL -->
    <div v-if="showAdd" class="modal-overlay" @click.self="showAdd=false">
      <div class="modal-card">
        <div class="modal-header">
          <span class="card-title">Neues Ticket</span>
          <button class="icon-btn" @click="showAdd=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-field"><label>Titel</label><input v-model="newTicket.title" placeholder="Problem beschreiben..." /></div>
          <div class="auth-row">
            <div class="auth-field"><label>Kunde</label><input v-model="newTicket.client" placeholder="Firma GmbH" /></div>
            <div class="auth-field"><label>Kunden-E-Mail</label><input v-model="newTicket.clientEmail" placeholder="kunde@firma.de" /></div>
          </div>
          <div class="auth-row">
            <div class="auth-field">
              <label>Priorität</label>
              <select v-model="newTicket.priority" class="form-select">
                <option value="low">Niedrig</option><option value="medium">Mittel</option>
                <option value="high">Hoch</option><option value="critical">Kritisch</option>
              </select>
            </div>
            <div class="auth-field"><label>Zuständig</label><input v-model="newTicket.assignee" placeholder="Name des Agents" /></div>
          </div>
          <button class="auth-btn" :disabled="saving" @click="addTicket">
            <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else>Ticket erstellen</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="toast" class="toast-success"><i class="ti ti-circle-check"></i> {{ toast }}</div>
  </div>
</template>

<script setup lang="ts">
import { priorityLabel, priorityBadge, statusLabel } from '~/modules/support'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })
const { userId } = await useAuthUser()

const { data, refresh } = await useFetch(() => useApiUrl(`/api/support?userId=${encodeURIComponent(userId)}`))
const tickets = computed(() => (data.value as any)?.tickets || [])

const openCount       = computed(() => tickets.value.filter((t: any) => t.status === 'open').length)
const inProgressCount = computed(() => tickets.value.filter((t: any) => t.status === 'in_progress').length)
const resolvedCount   = computed(() => tickets.value.filter((t: any) => ['resolved','closed'].includes(t.status)).length)
const criticalCount   = computed(() => tickets.value.filter((t: any) => ['critical','high'].includes(t.priority)).length)

const filterStatus = ref('')
const filterPrio   = ref('')
const filtered = computed(() => tickets.value.filter((t: any) => {
  if (filterStatus.value && t.status   !== filterStatus.value) return false
  if (filterPrio.value   && t.priority !== filterPrio.value)   return false
  return true
}))

// ── SLA ───────────────────────────────────────────────
const SLA_HOURS: Record<string, number> = { critical: 4, high: 8, medium: 24, low: 72 }
function slaHours(t: any)   { return SLA_HOURS[t.priority] || 24 }
function slaElapsed(t: any) { return (Date.now() - new Date(t.created).getTime()) / 3_600_000 }
function slaPercent(t: any) { return (slaElapsed(t) / slaHours(t)) * 100 }
function slaClass(t: any) {
  const p = slaPercent(t)
  if (['resolved','closed'].includes(t.status)) return 'ok'
  return p >= 100 ? 'breach' : p >= 75 ? 'warn' : 'ok'
}
function slaLabel(t: any) {
  if (['resolved','closed'].includes(t.status)) return '✓'
  const remaining = slaHours(t) - slaElapsed(t)
  if (remaining <= 0) return 'überfällig'
  if (remaining < 1) return `${Math.round(remaining * 60)}m`
  return `${remaining.toFixed(1)}h`
}
function slaTooltip(t: any) {
  if (['resolved','closed'].includes(t.status)) return 'Erledigt'
  const remaining = slaHours(t) - slaElapsed(t)
  return remaining <= 0 ? `SLA überschritten um ${Math.abs(remaining).toFixed(1)}h` : `${remaining.toFixed(1)}h bis SLA-Ablauf`
}

// ── Detail Drawer ─────────────────────────────────────
const detail      = ref<any>(null)
const replyText   = ref('')
const replying    = ref(false)
const commentsEl  = ref<HTMLElement | null>(null)

function openDetail(t: any) {
  detail.value = { ...t }
  replyText.value = ''
  nextTick(() => { if (commentsEl.value) commentsEl.value.scrollTop = commentsEl.value.scrollHeight })
}

async function updateTicket(t: any, field: string, value: string) {
  await $fetch(useApiUrl(`/api/support/${t.ticketId}`), {
    method: 'PATCH', body: { [field]: value, userId }
  })
  await refresh()
  detail.value = { ...detail.value, [field]: value }
}

async function sendReply() {
  if (!replyText.value.trim()) return
  replying.value = true
  try {
    await $fetch(useApiUrl(`/api/support/${detail.value.ticketId}/comment`), {
      method: 'POST', body: { text: replyText.value, author: 'Support-Team', userId }
    })
    replyText.value = ''
    await refresh()
    const updated = tickets.value.find((t: any) => t.ticketId === detail.value.ticketId)
    if (updated) detail.value = { ...updated }
    nextTick(() => { if (commentsEl.value) commentsEl.value.scrollTop = commentsEl.value.scrollHeight })
  } finally { replying.value = false }
}

function copyPortalLink(t: any) {
  const url = `${window.location.origin}/portal/${t.portalToken}`
  navigator.clipboard.writeText(url)
  showToast('Portal-Link kopiert!')
}

// ── Add Ticket ────────────────────────────────────────
const route     = useRoute()
const showAdd   = ref(false)
const saving    = ref(false)
const toast     = ref('')
const newTicket = reactive({ title: '', client: '', clientEmail: '', priority: 'medium', assignee: '' })

onMounted(() => { if (route.query.new) showAdd.value = true })

function showToast(msg: string) { toast.value = msg; setTimeout(() => toast.value = '', 3000) }

async function addTicket() {
  saving.value = true
  await $fetch(useApiUrl('/api/support'), { method: 'POST', body: { ...newTicket, userId, status: 'open' } })
  await refresh()
  showAdd.value = false
  Object.assign(newTicket, { title: '', client: '', clientEmail: '', priority: 'medium', assignee: '' })
  saving.value = false
}
</script>

<style scoped>
.tr-active td { background: rgba(108,63,232,0.06); }
.ticket-drawer {
  width: 380px; flex-shrink: 0;
  background: var(--bg-card); border: 0.5px solid var(--border);
  border-radius: 14px; display: flex; flex-direction: column;
  max-height: calc(100vh - 180px); overflow: hidden;
}
.ticket-drawer-header { padding: 14px 16px; border-bottom: 0.5px solid var(--border); display: flex; justify-content: space-between; align-items: flex-start; }
.ticket-comments { flex: 1; overflow-y: auto; padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; }
.ticket-comment { background: var(--bg-elevated); border-radius: 10px; padding: 10px 12px; }
.ticket-comment.customer { background: rgba(108,63,232,0.08); border-left: 2px solid #6C3FE8; }
.tc-author { font-size: 11px; font-weight: 600; color: var(--accent); margin-bottom: 4px; }
.tc-text   { font-size: 13px; color: var(--text-primary); line-height: 1.5; }
.tc-time   { font-size: 10px; color: var(--text-muted); margin-top: 4px; }
.sla-bar-wrap { position: relative; background: rgba(255,255,255,0.05); border-radius: 4px; height: 18px; width: 80px; overflow: hidden; }
.sla-bar { height: 100%; border-radius: 4px; transition: width 0.3s; }
.sla-bar.ok     { background: #00D4B4; }
.sla-bar.warn   { background: #f59e0b; }
.sla-bar.breach { background: #E05C5C; }
.sla-label { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; color: #fff; }
.sla-txt-ok     { color: #00D4B4; }
.sla-txt-warn   { color: #f59e0b; }
.sla-txt-breach { color: #E05C5C; }
</style>
