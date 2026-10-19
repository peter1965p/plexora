<template>
  <Teleport to="body">
    <div v-if="open" class="tour-overlay" @click.self="finish">
      <div class="tour-card" role="dialog" aria-modal="true" :aria-label="step.title">
        <div class="tour-icon"><i class="ti" :class="step.icon"></i></div>
        <h2 class="tour-title">{{ step.title }}</h2>
        <p class="tour-text">{{ step.text }}</p>
        <div class="tour-dots"><span v-for="(_, i) in TOUR_STEPS" :key="i" :class="{ on: i === idx }"></span></div>
        <div class="tour-actions">
          <button class="icon-btn" style="width:auto;padding:0 12px" @click="finish">Überspringen</button>
          <span style="flex:1"></span>
          <button v-if="idx > 0" class="icon-btn" style="width:auto;padding:0 12px" @click="idx--">Zurück</button>
          <button class="accent-btn" @click="next">{{ last ? 'Los geht’s' : 'Weiter' }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { TOUR_STEPS } from '~~/shared/helpContent'
const KEY = 'plexora-tour-done'
const open = ref(false), idx = ref(0)
const step = computed(() => TOUR_STEPS[idx.value])
const last = computed(() => idx.value === TOUR_STEPS.length - 1)
const store = () => { try { return localStorage } catch { return null } }
const next = () => { if (last.value) finish(); else idx.value++ }
function finish() { open.value = false; try { store()?.setItem(KEY, '1') } catch {} }
function start() { idx.value = 0; open.value = true }
defineExpose({ start })
onMounted(() => {
  window.addEventListener('plexora:start-tour', start)
  let done = true
  try { done = store()?.getItem(KEY) === '1' } catch {}
  if (!done) start()
})
onBeforeUnmount(() => window.removeEventListener('plexora:start-tour', start))
</script>

<style scoped>
.tour-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 16px }
.tour-card { background: var(--bg-elevated); border: 0.5px solid var(--border); border-radius: 18px; max-width: 460px; width: 100%; padding: 28px; box-shadow: 0 20px 60px rgba(0,0,0,.5) }
.tour-icon { width: 52px; height: 52px; border-radius: 14px; background: var(--accent-dim, rgba(124,92,255,.15)); color: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 26px; margin-bottom: 14px }
.tour-title { font-size: 20px; font-weight: 800; margin: 0 0 8px }
.tour-text { font-size: 14px; line-height: 1.55; color: var(--text-muted); margin: 0 0 18px }
.tour-dots { display: flex; gap: 6px; margin-bottom: 18px }
.tour-dots span { width: 8px; height: 8px; border-radius: 50%; background: var(--border) }
.tour-dots span.on { background: var(--accent) }
.tour-actions { display: flex; align-items: center; gap: 8px }
</style>
