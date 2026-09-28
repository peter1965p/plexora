<template>
  <div>
    <button class="ai-fab" :class="{ open }" @click="open = !open" title="Plexi">
      <i class="ti" :class="open ? 'ti-x' : 'ti-sparkles'"></i>
    </button>

    <div v-if="open" class="ai-panel">
      <div class="ai-panel-header">
        <i class="ti ti-sparkles" style="color:var(--accent)"></i>
        <span>Plexi</span>
      </div>

      <div class="ai-panel-body" ref="scrollEl">
        <div v-if="!messages.length" class="ai-empty">
          Frag mich z.B. "Wie viele offene Rechnungen habe ich?" oder "Leg einen Kontakt für Max Mustermann an"
        </div>
        <div v-for="(m, i) in messages" :key="i" class="ai-msg" :class="m.role">
          <div>
            <div v-if="m.content" class="ai-bubble">{{ m.content }}</div>
            <div v-if="m.action" class="ai-action-card">
              <div class="ai-action-title"><i class="ti ti-wand" style="color:var(--accent)"></i> {{ m.action.label }}</div>
              <div class="ai-action-args">
                <div v-for="(v, k) in m.action.args" :key="k"><strong>{{ k }}:</strong> {{ formatArgValue(v) }}</div>
              </div>
              <div v-if="m.actionStatus === 'pending'" class="ai-action-buttons">
                <button class="ai-action-confirm" :disabled="actionBusy" @click="confirmAction(m)">
                  <i class="ti" :class="actionBusy ? 'ti-loader-2 spin' : 'ti-check'"></i> Bestätigen
                </button>
                <button class="ai-action-cancel" :disabled="actionBusy" @click="cancelAction(m)">Abbrechen</button>
              </div>
              <div v-else-if="m.actionStatus === 'confirmed'" class="ai-action-status ok"><i class="ti ti-circle-check"></i> Ausgeführt</div>
              <div v-else-if="m.actionStatus === 'cancelled'" class="ai-action-status"><i class="ti ti-circle-x"></i> Abgebrochen</div>
              <div v-else-if="m.actionStatus === 'failed'" class="ai-action-status err"><i class="ti ti-alert-triangle"></i> {{ m.actionError }}</div>
            </div>
          </div>
        </div>
        <div v-if="sending" class="ai-msg assistant">
          <div class="ai-bubble"><i class="ti ti-loader-2 spin"></i></div>
        </div>
        <div v-if="errorMsg" class="ai-error">
          <i class="ti ti-alert-triangle"></i> {{ errorMsg }}
          <NuxtLink to="/settings" @click="open = false" style="color:var(--accent);margin-left:4px">Zu Plexora AI →</NuxtLink>
        </div>
      </div>

      <div class="ai-panel-input">
        <input v-model="input" placeholder="Frage stellen..." @keydown.enter="send" :disabled="sending" />
        <button @click="send" :disabled="sending || !input.trim()"><i class="ti ti-send"></i></button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ProposedAction { id: string; name: string; label: string; args: Record<string, any> }
type ActionStatus = 'pending' | 'confirmed' | 'cancelled' | 'failed'
interface Msg { role: 'user' | 'assistant'; content: string; action?: ProposedAction; actionStatus?: ActionStatus; actionError?: string }

const open = ref(false)
const input = ref('')
const sending = ref(false)
const actionBusy = ref(false)
const errorMsg = ref('')
const messages = ref<Msg[]>([])
const scrollEl = ref<HTMLElement | null>(null)

function formatArgValue(v: any): string {
  if (Array.isArray(v)) return v.map(i => typeof i === 'object' ? Object.values(i).join(' × ') : i).join(', ')
  return String(v ?? '')
}

async function scrollDown() {
  await nextTick()
  scrollEl.value?.scrollTo({ top: scrollEl.value.scrollHeight })
}

async function send() {
  const text = input.value.trim()
  if (!text || sending.value) return
  messages.value.push({ role: 'user', content: text })
  input.value = ''
  errorMsg.value = ''
  sending.value = true
  await scrollDown()

  try {
    const { useAuthHeader } = await import('~/composables/useAuth')
    const res = await $fetch<{ text: string; action?: ProposedAction }>(useApiUrl('/api/ai/assistant'), {
      method: 'POST',
      headers: await useAuthHeader(),
      // Vorschläge aus früheren Nachrichten sind reine UI-Zustände — der Assistent
      // kennt nur den reinen Gesprächstext.
      body: { messages: messages.value.map(m => ({ role: m.role, content: m.content })) },
    })
    messages.value.push({
      role: 'assistant',
      content: res.text,
      action: res.action,
      actionStatus: res.action ? 'pending' : undefined,
    })
  } catch (e: any) {
    errorMsg.value = e?.data?.message || e?.message || 'Anfrage fehlgeschlagen'
  } finally {
    sending.value = false
    await scrollDown()
  }
}

async function confirmAction(m: Msg) {
  if (!m.action || actionBusy.value) return
  actionBusy.value = true
  try {
    const { useAuthHeader } = await import('~/composables/useAuth')
    const res = await $fetch<{ ok: boolean; message?: string; error?: string }>(useApiUrl('/api/ai/assistant/execute'), {
      method: 'POST',
      headers: await useAuthHeader(),
      body: { name: m.action.name, args: m.action.args },
    })
    if (res.ok) {
      m.actionStatus = 'confirmed'
      messages.value.push({ role: 'assistant', content: res.message || 'Erledigt.' })
    } else {
      m.actionStatus = 'failed'
      m.actionError = res.error || 'Aktion fehlgeschlagen'
    }
  } catch (e: any) {
    m.actionStatus = 'failed'
    m.actionError = e?.data?.message || e?.message || 'Aktion fehlgeschlagen'
  } finally {
    actionBusy.value = false
    await scrollDown()
  }
}

function cancelAction(m: Msg) {
  m.actionStatus = 'cancelled'
}
</script>

<style scoped>
.ai-fab {
  position: fixed; bottom: 24px; right: 24px; z-index: 1000;
  width: 52px; height: 52px; border-radius: 50%; border: none; cursor: pointer;
  background: var(--accent); color: #fff; font-size: 22px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 6px 20px rgba(0,0,0,.35);
  transition: transform .15s;
}
.ai-fab:hover { transform: scale(1.06); }
.ai-fab.open { background: var(--bg-elevated); color: var(--text); }

.ai-panel {
  position: fixed; bottom: 88px; right: 24px; z-index: 1000;
  width: 360px; max-height: 520px; display: flex; flex-direction: column;
  background: var(--bg-surface); border: 0.5px solid var(--border); border-radius: 14px;
  box-shadow: 0 16px 48px rgba(0,0,0,.45); overflow: hidden;
}
.ai-panel-header {
  padding: 14px 16px; font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 8px;
  border-bottom: 0.5px solid var(--border); color: var(--text);
}
.ai-panel-body { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; min-height: 120px; }
.ai-empty { font-size: 12px; color: var(--text-muted); text-align: center; padding: 20px 8px; }
.ai-msg { display: flex; }
.ai-msg.user { justify-content: flex-end; }
.ai-bubble {
  max-width: 85%; padding: 8px 12px; border-radius: 10px; font-size: 13px; line-height: 1.5; white-space: pre-wrap;
  background: var(--bg-elevated); color: var(--text);
}
.ai-msg.user .ai-bubble { background: var(--accent); color: #fff; }
.ai-error { font-size: 11px; color: #e05c5c; padding: 6px 4px; }

.ai-action-card {
  margin-top: 6px; border: 1px solid var(--accent); border-radius: 10px; padding: 10px 12px;
  background: color-mix(in srgb, var(--accent) 8%, transparent); font-size: 12px;
}
.ai-action-title { font-weight: 700; display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.ai-action-args { color: var(--text-muted); line-height: 1.6; margin-bottom: 8px; word-break: break-word; }
.ai-action-args strong { color: var(--text); }
.ai-action-buttons { display: flex; gap: 8px; }
.ai-action-confirm, .ai-action-cancel {
  flex: 1; height: 30px; border-radius: 7px; border: none; cursor: pointer; font-size: 12px; font-weight: 600;
  display: flex; align-items: center; justify-content: center; gap: 4px;
}
.ai-action-confirm { background: var(--accent); color: #fff; }
.ai-action-confirm:disabled, .ai-action-cancel:disabled { opacity: .6; cursor: default; }
.ai-action-cancel { background: var(--bg-elevated); color: var(--text-muted); }
.ai-action-status { display: flex; align-items: center; gap: 6px; color: var(--text-muted); font-weight: 600; }
.ai-action-status.ok { color: #00c853; }
.ai-action-status.err { color: #e05c5c; }

.ai-panel-input { display: flex; gap: 8px; padding: 12px; border-top: 0.5px solid var(--border); }
.ai-panel-input input {
  flex: 1; background: var(--bg-elevated); border: 0.5px solid var(--border); border-radius: 8px;
  padding: 8px 10px; font-size: 13px; color: var(--text); font-family: inherit;
}
.ai-panel-input button {
  width: 34px; height: 34px; border-radius: 8px; border: none; background: var(--accent); color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.ai-panel-input button:disabled { opacity: .5; cursor: default; }
</style>
