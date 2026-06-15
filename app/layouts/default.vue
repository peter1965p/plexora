<template>
  <div :style="wrapperStyle">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { LIGHT_VARS } from '~/modules/themes'
import type { ThemeVars } from '~/modules/themes'

const { data: ftData } = await useFetch(useApiUrl('/api/settings/frontend-theme'), { getCachedData: () => undefined })
const { data: themesData } = await useFetch(useApiUrl('/api/themes'), { getCachedData: () => undefined })

const activeThemeId = computed(() => (ftData.value as any)?.frontendTheme?.activeThemeId || '')
const themes = computed(() => (themesData.value as any)?.themes || [])

const overrideVars = computed<ThemeVars | null>(() => {
  const id = activeThemeId.value
  if (!id) return null
  if (id === '__light__') return LIGHT_VARS
  const t = themes.value.find((x: any) => x.themeId === id)
  return t?.vars || null
})

const wrapperStyle = computed(() => ({
  display: 'contents',
  ...(overrideVars.value || {}),
}))
</script>
