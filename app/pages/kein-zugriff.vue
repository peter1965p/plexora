<template>
  <div class="auth-wrap">
    <div class="auth-card">
      <div class="auth-logo">Plexo<span>ra</span></div>
      <div class="auth-title">Kein Zugriff</div>
      <div class="auth-sub">{{ headline }}</div>
      <div class="auth-info" style="margin-top:12px">
        <i class="ti ti-lock"></i>
        <span v-if="owner">Bitte {{ owner }} um die Rolle {{ needLabel }}.</span>
        <span v-else>Bitte den Inhaber deines Teams um die Rolle {{ needLabel }}.</span>
      </div>
      <div class="auth-switch"><NuxtLink to="/dashboard">Zum Dashboard →</NuxtLink></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ROLE_LABELS, type Role } from '~~/shared/roles'

// Seite statt leerer Fläche: nennt Bereich, nötige und eigene Rolle und wen man fragen kann. Sie verrät nicht, was im Bereich steht.
definePageMeta({ layout: 'default' })
const route = useRoute()
const { state, load } = useRole()
onMounted(() => load())
const roleOf = (v: unknown): Role | null => (typeof v === 'string' && Object.hasOwn(ROLE_LABELS, v) ? (v as Role) : null)
const area = computed(() => String(route.query.bereich || 'diesen Bereich').slice(0, 40))
const need = computed(() => roleOf(route.query.rolle) || 'admin')
const needLabel = computed(() => ROLE_LABELS[need.value])
const mine = computed(() => (state.value.role ? ROLE_LABELS[state.value.role] : ''))
const owner = computed(() => state.value.owner)
const headline = computed(() => `Für den Bereich ${area.value} brauchst du die Rolle ${needLabel.value}.${mine.value ? ` Du bist als ${mine.value} angemeldet.` : ''}`)
</script>
