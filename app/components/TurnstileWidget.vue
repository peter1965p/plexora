<script setup lang="ts">
import { mountTurnstile, type TurnstileHandle } from '~/utils/turnstile'

const props = defineProps<{ siteKey: string; mode?: string; theme?: 'light' | 'dark' | 'auto' }>()
const model = defineModel<string>({ default: '' })
const el = ref<HTMLElement | null>(null)
const failed = ref(false)
let handle: TurnstileHandle | null = null

onMounted(async () => {
  if (!el.value) return
  try { handle = await mountTurnstile(el.value, { siteKey: props.siteKey, mode: props.mode, theme: props.theme }, (t) => { model.value = t }) }
  catch { failed.value = true }
})
onBeforeUnmount(() => handle?.remove())

// Ein Token gilt nur für einen Absendeversuch: nach jedem Versuch neu anfordern
defineExpose({ reset: () => handle?.reset() })
</script>

<template>
  <div class="plx-turnstile">
    <div ref="el"></div>
    <div v-if="failed" style="font-size:12px;color:#ef4444">
      Die Sicherheitsprüfung konnte nicht geladen werden. Bitte Seite neu laden oder Werbeblocker deaktivieren.
    </div>
  </div>
</template>
