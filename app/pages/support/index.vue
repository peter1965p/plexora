<template>
  <div class="page">

    <div class="stats-grid">
      <div class="stat-card">
        <i class="ti ti-ticket stat-icon"></i>
        <div class="stat-label">{{ t.support.totalTickets }}</div>
        <div class="stat-value">{{ tickets.length }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ openCount }} {{ t.support.open }}</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-alert-triangle stat-icon"></i>
        <div class="stat-label">{{ t.support.criticalHigh }}</div>
        <div class="stat-value" style="color:#E05C5C">{{ criticalCount }}</div>
        <div class="stat-delta down"><i class="ti ti-arrow-down-right"></i> {{ t.support.actNow }}</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-loader stat-icon"></i>
        <div class="stat-label">{{ t.support.inProgress }}</div>
        <div class="stat-value">{{ inProgressCount }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ t.support.active }}</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-circle-check stat-icon"></i>
        <div class="stat-label">{{ t.support.resolved }}</div>
        <div class="stat-value" style="color:#00D4B4">{{ resolvedCount }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ t.support.today }}</div>
      </div>
    </div>

    <div style="display:flex;gap:14px;align-items:flex-start">

      <!-- TICKET LIST -->
      <div class="card" style="flex:1;min-width:0">
        <div class="card-header">
          <span class="card-title">Support Tickets</span>
          <div style="display:flex;gap:6px">
            <select v-model="filterStatus" class="form-select" style="height:28px;font-size:11px;padding:0 8px">
              <option value="">{{ t.support.filterAll }}</option>
              <option value="open">{{ t.support.filterOpen }}</option>
              <option value="in_progress">{{ t.support.filterInProgress }}</option>
              <option value="resolved">{{ t.support.filterResolved }}</option>
              <option value="closed">{{ t.support.filterClosed }}</option>
            </select>
            <select v-model="filterPrio" class="form-select" style="height:28px;font-size:11px;padding:0 8px">
              <option value="">{{ t.support.filterAllPrios }}</option>
              <option value="critical">{{ t.support.critical }}</option>
              <option value="high">{{ t.support.high }}</option>
              <option value="medium">{{ t.support.medium }}</option>
              <option value="low">{{ t.support.low }}</option>
            </select>
          </div>
          <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" @click="showAdd=true">
            <i class="ti ti-plus"></i> {{ t.support.newTicket }}
          </button>
        </div>
        <table class="data-table">
          <thead>
            <tr><th>{{ t.support.colTitle }}</th><th>{{ t.support.colClient }}</th><th>{{ t.support.colAssignee }}</th><th>{{ t.support.colPrio }}</th><th>{{ t.support.colSla }}</th><th>{{ t.common.status }}</th></tr>
          </thead>
          <tbody>
            <tr v-if="!filtered.length">
              <td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">{{ t.common.noResults }}</td>
            </tr>
            <tr
              v-for="tk in filtered" :key="tk.ticketId"
              @click="openDetail(tk)"
              style="cursor:pointer"
              :class="{ 'tr-active': detail?.ticketId === tk.ticketId }"
            >
              <td class="td-name">
                {{ tk.title }}
                <span v-if="tk.comments?.length" style="font-size:10px;color:var(--text-muted);margin-left:4px">
                  <i class="ti ti-message"></i> {{ tk.comments.length }}
                </span>
              </td>
              <td style="font-size:12px">{{ tk.client }}</td>
              <td style="font-size:12px;color:var(--text-muted)">{{ tk.assignee || '–' }}</td>
              <td><span class="badge" :class="priorityBadge(tk.priority)">{{ priorityLabel(tk.priority) }}</span></td>
              <td>
                <div class="sla-bar-wrap" :title="slaTooltip(tk)">
                  <div class="sla-bar" :class="slaClass(tk)" :style="{ width: Math.min(slaPercent(tk), 100) + '%' }"></div>
                  <span class="sla-label" :class="slaClass(tk)">{{ slaLabel(tk) }}</span>
                </div>
              </td>
              <td><span class="badge" :class="tk.status==='open'?'badge-danger':tk.status==='in_progress'?'badge-warning':'badge-success'">{{ statusLabel(tk.status) }}</span></td>
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
            <option value="open">{{ t.support.filterOpen }}</option>
            <option value="in_progress">{{ t.support.filterInProgress }}</option>
            <option value="resolved">{{ t.support.filterResolved }}</option>
            <option value="closed">{{ t.support.filterClosed }}</option>
          </select>
          <input :value="detail.assignee" @blur="updateTicket(detail,'assignee',($event.target as HTMLInputElement).value)"
            class="form-select" style="height:28px;font-size:11px;flex:1" :placeholder="t.support.colAssignee + '...'" />
        </div>

        <!-- SLA INFO -->
        <div style="padding:10px 16px;border-bottom:0.5px solid var(--border);font-size:12px;color:var(--text-muted)">
          <span>SLA: <strong :class="'sla-txt-'+slaClass(detail)">{{ slaTooltip(detail) }}</strong></span>
          <span v-if="detail.portalToken" style="float:right">
            <button class="icon-btn" style="font-size:11px;padding:0 8px;height:22px" @click="copyPortalLink(detail)" :title="t.support.copyPortalLink">
              <i class="ti ti-link"></i> Portal-Link
            </button>
          </span>
        </div>

        <!-- COMMENT THREAD -->
        <div class="ticket-comments" ref="commentsEl">
          <div v-if="!detail.comments?.length" style="text-align:center;color:var(--text-muted);padding:24px;font-size:13px">{{ t.support.noComments }}</div>
          <div v-for="c in detail.comments" :key="c.id" class="ticket-comment" :class="{ 'customer': c.isCustomer }">
            <div class="tc-author">{{ c.isCustomer ? '👤 ' : '🎧 ' }}{{ c.author }}</div>
            <div class="tc-text">{{ c.text }}</div>
            <div class="tc-time">{{ new Date(c.created).toLocaleString('de-DE') }}</div>
          </div>
        </div>

        <!-- REPLY -->
        <div style="padding:12px 16px;border-top:0.5px solid var(--border)">
          <textarea v-model="replyText" rows="2" :placeholder="t.support.replyPlaceholder" style="width:100%;background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px;color:var(--text-primary);outline:none;resize:none;font-family:inherit;box-sizing:border-box"></textarea>
          <button class="accent-btn" :disabled="!replyText.trim() || replying" style="width:100%;margin-top:6px;height:32px;font-size:12px" @click="sendReply">
            <i v-if="replying" class="ti ti-loader-2 spin"></i>
            <i v-else class="ti ti-send"></i> {{ t.support.sendReply }}
          </button>
        </div>
      </div>
    </div>

    <!-- ADD TICKET MODAL -->
    <div v-if="showAdd" class="modal-overlay" @click.self="showAdd=false">
      <div class="modal-card">
        <div class="modal-header">
          <span class="card-title">{{ t.support.newTicket }}</span>
          <button class="icon-btn" @click="showAdd=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-field"><label>{{ t.support.colTitle }}</label><input v-model="newTicket.title" :placeholder="t.support.problemDesc" /></div>
          <div class="auth-row">
            <div class="auth-field"><label>{{ t.support.colClient }}</label><input v-model="newTicket.client" placeholder="Firma GmbH" /></div>
            <div class="auth-field"><label>{{ t.support.clientEmail }}</label><input v-model="newTicket.clientEmail" placeholder="kunde@firma.de" /></div>
          </div>
          <div class="auth-row">
            <div class="auth-field">
              <label>{{ t.support.colPrio }}</label>
              <select v-model="newTicket.priority" class="form-select">
                <option value="low">{{ t.support.low }}</option><option value="medium">{{ t.support.medium }}</option>
                <option value="high">{{ t.support.high }}</option><option value="critical">{{ t.support.critical }}</option>
              </select>
            </div>
            <div class="auth-field"><label>{{ t.support.colAssignee }}</label><input v-model="newTicket.assignee" :placeholder="t.support.agentName" /></div>
          </div>
          <button class="auth-btn" :disabled="saving" @click="addTicket">
            <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else>{{ t.support.createTicket }}</span>
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
const { t, lang } = useLang()

const { data, refresh } = await useFetch(() => useApiUrl(`/api/support?userId=${encodeURIComponent(userId)}`))
const tickets = computed(() => (data.value as any)?.tickets || [])

const openCount       = computed(() => tickets.value.filter((tk: any) => tk.status === 'open').length)
const inProgressCount = computed(() => tickets.value.filter((tk: any) => tk.status === 'in_progress').length)
const resolvedCount   = computed(() => tickets.value.filter((tk: any) => ['resolved','closed'].includes(tk.status)).length)
const criticalCount   = computed(() => tickets.value.filter((tk: any) => ['critical','high'].includes(tk.priority)).length)

const filterStatus = ref('')
const filterPrio   = ref('')
const filtered = computed(() => tickets.value.filter((tk: any) => {
  if (filterStatus.value && tk.status   !== filterStatus.value) return false
  if (filterPrio.value   && tk.priority !== filterPrio.value)   return false
  return true
}))

// ── SLA ───────────────────────────────────────────────
const SLA_HOURS: Record<string, number> = { critical: 4, high: 8, medium: 24, low: 72 }
function slaHours(tk: any)   { return SLA_HOURS[tk.priority] || 24 }
function slaElapsed(tk: any) { return (Date.now() - new Date(tk.created).getTime()) / 3_600_000 }
function slaPercent(tk: any) { return (slaElapsed(tk) / slaHours(tk)) * 100 }
function slaClass(tk: any) {
  const p = slaPercent(tk)
  if (['resolved','closed'].includes(tk.status)) return 'ok'
  return p >= 100 ? 'breach' : p >= 75 ? 'warn' : 'ok'
}
function slaLabel(tk: any) {
  if (['resolved','closed'].includes(tk.status)) return '✓'
  const remaining = slaHours(tk) - slaElapsed(tk)
  if (remaining <= 0) return t.value.support.slaOverdue
  if (remaining < 1) return `${Math.round(remaining * 60)}m`
  return `${remaining.toFixed(1)}h`
}
function slaTooltip(tk: any) {
  if (['resolved','closed'].includes(tk.status)) return t.value.support.slaDone
  const remaining = slaHours(tk) - slaElapsed(tk)
  return remaining <= 0 ? `SLA überschritten um ${Math.abs(remaining).toFixed(1)}h` : `${remaining.toFixed(1)}h bis SLA-Ablauf`
}

// ── Detail Drawer ─────────────────────────────────────
const detail      = ref<any>(null)
const replyText   = ref('')
const replying    = ref(false)
const commentsEl  = ref<HTMLElement | null>(null)

function openDetail(tk: any) {
  detail.value = { ...tk }
  replyText.value = ''
  nextTick(() => { if (commentsEl.value) commentsEl.value.scrollTop = commentsEl.value.scrollHeight })
}

async function updateTicket(tk: any, field: string, value: string) {
  await $fetch(useApiUrl(`/api/support/${tk.ticketId}`), {
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
    const updated = tickets.value.find((tk: any) => tk.ticketId === detail.value.ticketId)
    if (updated) detail.value = { ...updated }
    nextTick(() => { if (commentsEl.value) commentsEl.value.scrollTop = commentsEl.value.scrollHeight })
  } finally { replying.value = false }
}

function copyPortalLink(tk: any) {
  const url = `${window.location.origin}/portal/${tk.portalToken}`
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
