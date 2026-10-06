<script setup lang="ts">
import { computed } from 'vue'
import type { Overlay } from '../../shared/leadDecor'
import { SHAPE_PRIMS, overlayBoxStyle, overlayTextColor } from '~/utils/leadShapes'

// Zeichnet die Overlays (Sticker) auf dem Hero-Bild. Der Eltern-Container muss position:relative und container-type:inline-size haben.
// Texte werden nur als Text ausgegeben, Formen kommen aus der festen Bibliothek (IDs). Animationen respektieren prefers-reduced-motion.
const props = defineProps<{ overlays: Overlay[] }>()
const shown = computed(() => props.overlays.filter(o => o.on && SHAPE_PRIMS[o.shape]))
</script>

<template>
  <div v-if="shown.length" class="lo-layer" aria-hidden="true">
    <div v-for="o in shown" :key="o.id" class="lo" :style="overlayBoxStyle(o)">
      <div class="lo-in" :class="`lo-${o.anim}`">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="lo-svg" :style="{ '--lo-fill': o.color }">
          <component :is="p.tag" v-for="(p, i) in SHAPE_PRIMS[o.shape]" :key="i" v-bind="p.attrs"
            :fill="p.attrs.fill ?? (p.accent === 'white' ? '#ffffff' : o.color)" :stroke="p.accent === 'white' && p.attrs.fill === 'none' ? '#ffffff' : 'none'" />
        </svg>
        <span v-if="o.text" class="lo-text" :style="{ color: overlayTextColor(o), fontSize: `${(o.size * 0.17).toFixed(2)}cqw` }">{{ o.text }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lo-layer { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 2; }
.lo { pointer-events: none; }
.lo-in { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.lo-svg { position: absolute; inset: 0; width: 100%; height: 100%; filter: drop-shadow(0 2px 4px rgba(0,0,0,.35)); }
.lo-text { position: relative; font-weight: 800; line-height: 1.05; text-align: center; max-width: 86%; word-break: break-word; text-shadow: 0 1px 2px rgba(0,0,0,.25); }
/* Animationen: langsam genug (kürzeste Periode 1,2 s = unter 1 Hz), nie schneller als 3 Mal pro Sekunde */
.lo-pulse  { animation: lo-pulse 2s ease-in-out infinite; }
.lo-wiggle { animation: lo-wiggle 1.2s ease-in-out infinite; }
.lo-spin .lo-svg { animation: lo-spin 24s linear infinite; }      /* nur die Form dreht sich, der Text bleibt lesbar */
@keyframes lo-pulse  { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
@keyframes lo-wiggle { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
@keyframes lo-spin   { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .lo-pulse, .lo-wiggle, .lo-spin .lo-svg { animation: none; } }
</style>
