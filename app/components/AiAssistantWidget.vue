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
          Frag mich z.B. "Wie viele offene Rechnungen habe ich?" oder "Wie steht die Pipeline?"
        </div>
        <div v-for="(m, i) in messages" :key="i" class="ai-msg" :class="m.role">
          <div class="ai-bubble">{{ m.content }}</div>
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
interface Msg { role: 'user' | 'assistant'; content: string }

const open = ref(false)
const input = ref('')
const sending = ref(false)
const errorMsg = ref('')
const messages = ref<Msg[]>([])
const scrollEl = ref<HTMLElement | null>(null)

async function send() {
  const text = input.value.trim()
  if (!text || sending.value) return
  messages.value.push({ role: 'user', content: text })
  input.value = ''
  errorMsg.value = ''
  sending.value = true
  await nextTick()
  scrollEl.value?.scrollTo({ top: scrollEl.value.scrollHeight })

  try {
    const { useAuthHeader } = await import('~/composables/useAuth')
    const res = await $fetch<{ text: string }>(useApiUrl('/api/ai/assistant'), {
      method: 'POST',
      headers: await useAuthHeader(),
      body: { messages: messages.value.map(m => ({ role: m.role, content: m.content })) },
    })
    messages.value.push({ role: 'assistant', content: res.text })
  } catch (e: any) {
    errorMsg.value = e?.data?.message || e?.message || 'Anfrage fehlgeschlagen'
  } finally {
    sending.value = false
    await nextTick()
    scrollEl.value?.scrollTo({ top: scrollEl.value.scrollHeight })
  }
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
  width: 340px; max-height: 480px; display: flex; flex-direction: column;
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
