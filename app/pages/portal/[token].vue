<template>
  <div style="min-height:100vh;background:#0b0f1a;display:flex;align-items:center;justify-content:center;padding:24px">
    <div style="width:100%;max-width:600px">

      <!-- HEADER -->
      <div style="text-align:center;margin-bottom:32px">
        <div style="font-size:24px;font-weight:700;color:#f0eef9;margin-bottom:4px">Plexora Support</div>
        <div style="font-size:13px;color:#8b8fa8">Ihr Ticket-Status</div>
      </div>

      <!-- LOADING -->
      <div v-if="pending" style="text-align:center;color:#8b8fa8;padding:40px">
        <i class="ti ti-loader-2 spin" style="font-size:24px"></i>
      </div>

      <!-- ERROR -->
      <div v-else-if="error" style="text-align:center;color:#E05C5C;padding:40px">
        <i class="ti ti-alert-circle" style="font-size:32px;display:block;margin-bottom:8px"></i>
        Ticket nicht gefunden.
      </div>

      <div v-else-if="ticket">
        <!-- TICKET INFO -->
        <div style="background:#13182a;border:0.5px solid rgba(255,255,255,0.07);border-radius:16px;padding:20px 24px;margin-bottom:16px">
          <div style="font-size:18px;font-weight:600;color:#f0eef9;margin-bottom:12px">{{ ticket.title }}</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">
            <span class="portal-badge" :class="'prio-'+ticket.priority">{{ prioLabel[ticket.priority] || ticket.priority }}</span>
            <span class="portal-badge" :class="'status-'+ticket.status">{{ statusMap[ticket.status] || ticket.status }}</span>
          </div>
          <div style="font-size:12px;color:#8b8fa8">Erstellt: {{ new Date(ticket.created).toLocaleDateString('de-DE') }}</div>
        </div>

        <!-- COMMENTS -->
        <div style="background:#13182a;border:0.5px solid rgba(255,255,255,0.07);border-radius:16px;overflow:hidden;margin-bottom:16px">
          <div style="padding:14px 20px;border-bottom:0.5px solid rgba(255,255,255,0.07);font-size:13px;font-weight:600;color:#f0eef9">
            Verlauf ({{ ticket.comments?.length || 0 }} Nachrichten)
          </div>
          <div style="padding:16px;display:flex;flex-direction:column;gap:10px;max-height:360px;overflow-y:auto">
            <div v-if="!ticket.comments?.length" style="text-align:center;color:#8b8fa8;padding:16px;font-size:13px">Noch keine Nachrichten</div>
            <div v-for="c in ticket.comments" :key="c.id"
              style="border-radius:10px;padding:10px 14px"
              :style="c.isCustomer ? 'background:rgba(108,63,232,0.1);border-left:2px solid #6C3FE8' : 'background:#1e2640'"
            >
              <div style="font-size:11px;font-weight:600;color:#ea580c;margin-bottom:4px">
                {{ c.isCustomer ? '👤 ' : '🎧 ' }}{{ c.author }}
              </div>
              <div style="font-size:13px;color:#f0eef9;line-height:1.5">{{ c.text }}</div>
              <div style="font-size:10px;color:#8b8fa8;margin-top:4px">{{ new Date(c.created).toLocaleString('de-DE') }}</div>
            </div>
          </div>
        </div>

        <!-- REPLY FORM -->
        <div v-if="!['resolved','closed'].includes(ticket.status)" style="background:#13182a;border:0.5px solid rgba(255,255,255,0.07);border-radius:16px;padding:20px 24px">
          <div style="font-size:13px;font-weight:600;color:#f0eef9;margin-bottom:12px">Nachricht senden</div>
          <div style="margin-bottom:10px">
            <input v-model="name" placeholder="Ihr Name" style="width:100%;background:#1e2640;border:0.5px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px 14px;font-size:13px;color:#f0eef9;outline:none;box-sizing:border-box" />
          </div>
          <textarea v-model="replyText" rows="3" placeholder="Ihre Nachricht..."
            style="width:100%;background:#1e2640;border:0.5px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px 14px;font-size:13px;color:#f0eef9;outline:none;resize:none;font-family:inherit;box-sizing:border-box"></textarea>
          <button :disabled="!replyText.trim() || !name.trim() || sending"
            @click="sendReply"
            style="width:100%;margin-top:10px;height:40px;background:#ea580c;border:none;border-radius:8px;color:#fff;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;opacity:1"
            :style="(!replyText.trim() || !name.trim()) ? 'opacity:0.5;cursor:not-allowed' : ''"
          >
            <i v-if="sending" class="ti ti-loader-2 spin"></i>
            <i v-else class="ti ti-send"></i>
            Nachricht senden
          </button>
          <div v-if="sent" style="text-align:center;color:#00D4B4;margin-top:10px;font-size:13px">✓ Nachricht gesendet!</div>
        </div>
        <div v-else style="text-align:center;color:#00D4B4;padding:16px;font-size:13px">
          <i class="ti ti-circle-check" style="margin-right:6px"></i>Dieses Ticket ist abgeschlossen.
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const token = route.params.token as string

const { data, pending, error } = await useFetch(useApiUrl(`/api/support/portal/${token}`))
const ticket = computed(() => data.value as any)

const prioLabel  = { low: 'Niedrig', medium: 'Mittel', high: 'Hoch', critical: 'Kritisch' } as Record<string,string>
const statusMap  = { open: 'Offen', in_progress: 'In Bearbeitung', resolved: 'Gelöst', closed: 'Geschlossen' } as Record<string,string>

const name      = ref('')
const replyText = ref('')
const sending   = ref(false)
const sent      = ref(false)

async function sendReply() {
  if (!replyText.value.trim() || !name.value.trim()) return
  sending.value = true
  try {
    await $fetch(useApiUrl(`/api/support/portal/${token}/comment`), {
      method: 'POST', body: { text: replyText.value, name: name.value }
    })
    replyText.value = ''
    sent.value = true
    setTimeout(() => sent.value = false, 3000)
    await refreshNuxtData()
  } finally { sending.value = false }
}
</script>

<style scoped>
.portal-badge { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
.prio-critical, .prio-high { background: rgba(224,92,92,0.15); color: #E05C5C; }
.prio-medium  { background: rgba(245,158,11,0.15); color: #f59e0b; }
.prio-low     { background: rgba(0,212,180,0.1); color: #00D4B4; }
.status-open  { background: rgba(224,92,92,0.1); color: #E05C5C; }
.status-in_progress { background: rgba(245,158,11,0.1); color: #f59e0b; }
.status-resolved, .status-closed { background: rgba(0,212,180,0.1); color: #00D4B4; }
</style>
