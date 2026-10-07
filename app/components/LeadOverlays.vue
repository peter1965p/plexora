<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Overlay } from '../../shared/leadDecor'
import { SHAPE_PRIMS, overlayBoxStyle, overlayTextColor, overlayTextLayout, dragPosition, pageBoxStyle, pageDragPosition, type PageView } from '~/utils/leadShapes'

// Zeichnet die Overlays (Sticker) auf dem Hero-Bild. Der Eltern-Container muss position:relative und container-type:inline-size haben.
// Texte werden nur als Text ausgegeben, Formen kommen aus der festen Bibliothek (IDs). Animationen respektieren prefers-reduced-motion.
// Nur in der Editor-Vorschau (editable): Sticker lassen sich mit Maus, Finger oder Pfeiltasten verschieben; die Seite selbst zeigt sie ohne Bedienung.
// layer="image": über dem Hero-Bild (Lage in % des Bildes). layer="page": frei auf der Seite (Lage je Ansicht in u = 1 % der Inhaltsbreite).
// view/contentRatio gibt nur die Editor-Vorschau an (gewählte Ansicht, Anteil des Inhalts an der Vorschau-Breite); die echte Seite wählt per Media-Query.
const props = defineProps<{ overlays: Overlay[]; editable?: boolean; selectedId?: string; layer?: 'image' | 'page'; view?: PageView; contentRatio?: number }>()
const emit = defineEmits<{ (e: 'move', v: { id: string; x: number; y: number; view?: PageView }): void; (e: 'select', id: string): void }>()
const isPage = computed(() => props.layer === 'page')
const unit = computed(() => (!isPage.value ? '1cqw' : props.contentRatio ? `calc(100cqw * ${Number(props.contentRatio)} / 100)` : 'calc(min(100cqw, 1200px) / 100)'))
const boxStyle = (o: Overlay) => (isPage.value ? pageBoxStyle(o, props.view) : overlayBoxStyle(o))
const layer = ref<HTMLElement | null>(null)
type Drag = { id: string; px: number; py: number; page: boolean; left: number; top: number; bw: number; bh: number; W: number; H: number; uPx: number; cx: number; cy: number }
let drag: Drag | null = null
function geometry(el: HTMLElement) {
  const L = layer.value
  if (!L) return null
  const W = L.clientWidth, H = L.clientHeight
  const uPx = isPage.value ? (props.contentRatio ? (W * props.contentRatio) / 100 : Math.min(W, 1200) / 100) : 1
  return {
    W, H, uPx, left: (el.offsetLeft / W) * 100, top: (el.offsetTop / H) * 100, bw: (el.offsetWidth / W) * 100, bh: (el.offsetHeight / H) * 100,
    // Seitenebene: Mittelpunkt in u und Größe in Pixeln
    cx: (el.offsetLeft + el.offsetWidth / 2 - W / 2) / uPx, cy: (el.offsetTop + el.offsetHeight / 2 - H / 2) / uPx, bwPx: el.offsetWidth, bhPx: el.offsetHeight,
  }
}
function target(g: NonNullable<ReturnType<typeof geometry>>, dxPx: number, dyPx: number) {
  if (isPage.value) return pageDragPosition({ cx: g.cx, cy: g.cy, bw: g.bwPx, bh: g.bhPx, dxPx, dyPx, W: g.W, H: g.H, uPx: g.uPx })
  return dragPosition({ left: g.left, top: g.top, bw: g.bw, bh: g.bh, dxPx, dyPx, W: g.W, H: g.H })
}
function onDown(e: PointerEvent, o: Overlay) {
  if (!props.editable || (e.button ?? 0) > 0) return
  const el = e.currentTarget as HTMLElement, g = geometry(el)
  if (!g) return
  el.setPointerCapture?.(e.pointerId)
  drag = { id: o.id, px: e.clientX, py: e.clientY, page: isPage.value, ...g }
  emit('select', o.id); e.preventDefault()
}
function onMove(e: PointerEvent) {
  if (!drag) return
  const g = drag
  emit('move', { id: g.id, ...target(g as any, e.clientX - g.px, e.clientY - g.py), ...(isPage.value ? { view: props.view } : {}) })
}
const onUp = () => { drag = null }
function onKey(e: KeyboardEvent, o: Overlay) {
  const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
  if (!props.editable || !d) return
  const g = geometry(e.currentTarget as HTMLElement)
  if (!g) return
  const step = e.shiftKey ? 5 : 1
  // Bildebene: Prozent der Bildfläche; Seitenebene: Einheiten u
  const dx = isPage.value ? d[0] * step * g.uPx : (d[0] * step * g.W) / 100, dy = isPage.value ? d[1] * step * g.uPx : (d[1] * step * g.H) / 100
  emit('move', { id: o.id, ...target(g, dx, dy), ...(isPage.value ? { view: props.view } : {}) })
  emit('select', o.id); e.preventDefault()
}
const textStyle = (o: Overlay) => {
  const l = overlayTextLayout(o)
  return { color: overlayTextColor(o), fontSize: `calc(var(--lo-u, 1cqw) * ${l.fontSize.toFixed(2)})`, left: `${((0.5 + l.dx) * 100).toFixed(1)}%`, top: `${((0.5 + l.dy) * 100).toFixed(1)}%` }
}
const shown = computed(() => props.overlays.filter(o => o.on && SHAPE_PRIMS[o.shape] && (o.place || 'image') === (props.layer || 'image')))
</script>

<template>
  <div v-if="shown.length" ref="layer" class="lo-layer" :class="{ 'lo-layer-page': isPage }" :style="{ '--lo-u': unit }" :aria-hidden="editable ? undefined : 'true'">
    <div v-for="o in shown" :key="o.id" class="lo" :class="{ 'lo-edit': editable, 'lo-sel': editable && o.id === selectedId, 'lo-page': isPage, 'lo-hide-m': o.hideMobile && !view, 'lo-dim': o.hideMobile && view === 'mobile' }" :style="boxStyle(o)"
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
.lo-layer-page { container-type: inline-size; z-index: 3; }
.lo-page { --lo-x: var(--lo-px); --lo-y: var(--lo-py); }
.lo-dim { opacity: .3; }
@media (max-width: 900px) { .lo-page { --lo-x: var(--lo-mx); --lo-y: var(--lo-my); } .lo-hide-m { display: none; } }
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
