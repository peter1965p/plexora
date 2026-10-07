<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Overlay } from '../../shared/leadDecor'
import { SHAPE_PRIMS, overlayBoxStyle, overlayTextColor, overlayTextLayout, dragPosition } from '~/utils/leadShapes'

// Zeichnet die Overlays (Sticker) auf dem Hero-Bild. Der Eltern-Container muss position:relative und container-type:inline-size haben.
// Texte werden nur als Text ausgegeben, Formen kommen aus der festen Bibliothek (IDs). Animationen respektieren prefers-reduced-motion.
// Nur in der Editor-Vorschau (editable): Sticker lassen sich mit Maus, Finger oder Pfeiltasten verschieben; die Seite selbst zeigt sie ohne Bedienung.
const props = defineProps<{ overlays: Overlay[]; editable?: boolean; selectedId?: string }>()
const emit = defineEmits<{ (e: 'move', v: { id: string; x: number; y: number }): void; (e: 'select', id: string): void }>()
const layer = ref<HTMLElement | null>(null)
let drag: { id: string; px: number; py: number; left: number; top: number; bw: number; bh: number; W: number; H: number } | null = null
function geometry(el: HTMLElement) {
  const L = layer.value
  if (!L) return null
  const W = L.clientWidth, H = L.clientHeight
  return { W, H, left: (el.offsetLeft / W) * 100, top: (el.offsetTop / H) * 100, bw: (el.offsetWidth / W) * 100, bh: (el.offsetHeight / H) * 100 }
}
function onDown(e: PointerEvent, o: Overlay) {
  if (!props.editable || (e.button ?? 0) > 0) return
  const el = e.currentTarget as HTMLElement, g = geometry(el)
  if (!g) return
  el.setPointerCapture?.(e.pointerId)
  drag = { id: o.id, px: e.clientX, py: e.clientY, ...g }
  emit('select', o.id); e.preventDefault()
}
function onMove(e: PointerEvent) {
  if (!drag) return
  emit('move', { id: drag.id, ...dragPosition({ ...drag, dxPx: e.clientX - drag.px, dyPx: e.clientY - drag.py }) })
}
const onUp = () => { drag = null }
function onKey(e: KeyboardEvent, o: Overlay) {
  const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
  if (!props.editable || !d) return
  const g = geometry(e.currentTarget as HTMLElement)
  if (!g) return
  const step = e.shiftKey ? 5 : 1
  emit('move', { id: o.id, ...dragPosition({ ...g, dxPx: (d[0] * step * g.W) / 100, dyPx: (d[1] * step * g.H) / 100 }) })
  emit('select', o.id); e.preventDefault()
}
const textStyle = (o: Overlay) => {
  const l = overlayTextLayout(o)
  return { color: overlayTextColor(o), fontSize: `${l.fontSize.toFixed(2)}cqw`, left: `${((0.5 + l.dx) * 100).toFixed(1)}%`, top: `${((0.5 + l.dy) * 100).toFixed(1)}%` }
}
const shown = computed(() => props.overlays.filter(o => o.on && SHAPE_PRIMS[o.shape]))
</script>

<template>
  <div v-if="shown.length" ref="layer" class="lo-layer" :aria-hidden="editable ? undefined : 'true'">
    <div v-for="o in shown" :key="o.id" class="lo" :class="{ 'lo-edit': editable, 'lo-sel': editable && o.id === selectedId }" :style="overlayBoxStyle(o)"
      :tabindex="editable ? 0 : undefined" :role="editable ? 'button' : undefined" :aria-label="editable ? 'Sticker verschieben (ziehen oder Pfeiltasten)' : undefined"
      @pointerdown="onDown($event, o)" @pointermove="onMove" @pointerup="onUp" @pointercancel="onUp" @keydown="onKey($event, o)">
      <div class="lo-in" :class="`lo-${o.anim}`">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="lo-svg" :style="{ '--lo-fill': o.color }">
          <component :is="p.tag" v-for="(p, i) in SHAPE_PRIMS[o.shape]" :key="i" v-bind="p.attrs"
            :fill="p.attrs.fill ?? (p.accent === 'white' ? '#ffffff' : o.color)" :stroke="p.accent === 'white' && p.attrs.fill === 'none' ? '#ffffff' : 'none'" />
        </svg>
        <span v-if="o.text" class="lo-text" :style="textStyle(o)"><template v-for="(line, li) in overlayTextLayout(o).lines" :key="li"><br v-if="li" />{{ line }}</template></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lo-layer { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 2; }
.lo { pointer-events: none; }
.lo-edit { pointer-events: auto; cursor: grab; touch-action: none; user-select: none; border-radius: 6px; }
.lo-edit:active { cursor: grabbing; }
.lo-edit:hover, .lo-edit:focus-visible { outline: 1.5px dashed rgba(255,255,255,.85); outline-offset: 2px; }
.lo-sel { outline: 1.5px dashed #62a0ea; outline-offset: 2px; }
.lo-edit:hover .lo-in, .lo-edit:active .lo-in, .lo-edit:hover .lo-svg, .lo-edit:active .lo-svg { animation-play-state: paused; }
.lo-in { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.lo-svg { position: absolute; inset: 0; width: 100%; height: 100%; filter: drop-shadow(0 2px 4px rgba(0,0,0,.35)); }
.lo-text { position: absolute; transform: translate(-50%, -50%); font-weight: 800; line-height: 1.1; text-align: center; white-space: nowrap; text-shadow: 0 1px 2px rgba(0,0,0,.25); }
/* Animationen: langsam genug (kürzeste Periode 1,2 s = unter 1 Hz), nie schneller als 3 Mal pro Sekunde */
.lo-pulse  { animation: lo-pulse 2s ease-in-out infinite; }
.lo-wiggle { animation: lo-wiggle 1.2s ease-in-out infinite; }
.lo-spin .lo-svg { animation: lo-spin 24s linear infinite; }      /* nur die Form dreht sich, der Text bleibt lesbar */
@keyframes lo-pulse  { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
@keyframes lo-wiggle { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
@keyframes lo-spin   { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .lo-pulse, .lo-wiggle, .lo-spin .lo-svg { animation: none; } }
</style>
