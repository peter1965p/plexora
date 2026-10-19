<template>
  <span class="help-tip" tabindex="0" role="note" :aria-label="text" @keydown.esc="($event.target as HTMLElement).blur()">
    <i class="ti ti-help-circle"></i>
    <span class="help-tip-bubble">{{ text }}</span>
  </span>
</template>

<script setup lang="ts">
import { HELP_TIPS } from '~~/shared/helpContent'
const props = defineProps<{ k: string }>()
const text = computed(() => HELP_TIPS[props.k] || '')
</script>

<style scoped>
.help-tip { position: relative; display: inline-flex; align-items: center; margin-left: 6px; color: var(--text-muted); cursor: help; font-size: 14px; outline: none; vertical-align: middle }
.help-tip:hover, .help-tip:focus { color: var(--accent) }
.help-tip-bubble { display: none; position: absolute; top: 120%; left: 50%; transform: translateX(-50%); width: 260px; padding: 10px 12px; background: var(--bg-elevated); border: 0.5px solid var(--border); border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,.35); font-size: 12px; font-weight: 400; line-height: 1.45; color: var(--text); z-index: 60; white-space: normal; text-align: left }
.help-tip:hover .help-tip-bubble, .help-tip:focus .help-tip-bubble { display: block }
@media (max-width: 600px) { .help-tip-bubble { left: 0; transform: none; width: 220px } }
</style>
