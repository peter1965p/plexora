<script setup lang="ts">
import { reactive, watch, computed } from 'vue'
import { TRUST_ICONS, TRUST_ICON_LABELS, OVERLAY_SHAPES, OVERLAY_ANIMATIONS, MAX_TRUST_ITEMS, MAX_TRUST_TEXT, MAX_PRIVACY_TEXT, MAX_OVERLAYS, MAX_OVERLAY_TEXT, MAX_ANIMATED_OVERLAYS,
  DEFAULT_TRUST_ITEMS, DEFAULT_PRIVACY_LINE, DEFAULT_OVERLAY, resolveTrustItems, resolvePrivacyLine, resolveOverlays, type TrustItem, type PrivacyLine, type Overlay } from '../../shared/leadDecor'

// Editor für Vertrauenspunkte, Datenschutzzeile und Overlays (Sticker). Alle Werte sind IDs aus fester Liste oder reiner Text;
// der Server prüft sie beim Speichern noch einmal streng.
const props = defineProps<{ modelValue: { trustItems: TrustItem[]; privacyLine: PrivacyLine; overlays: Overlay[] }; hasHero: boolean; customTemplate: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: { trustItems: TrustItem[]; privacyLine: PrivacyLine; overlays: Overlay[] }): void; (e: 'touched'): void }>()

const state = reactive({
  trustItems: resolveTrustItems(props.modelValue.trustItems), privacyLine: resolvePrivacyLine(props.modelValue.privacyLine), overlays: resolveOverlays(props.modelValue.overlays),
})
let silent = false
watch(() => props.modelValue, (v) => { silent = true; state.trustItems = resolveTrustItems(v.trustItems); state.privacyLine = resolvePrivacyLine(v.privacyLine); state.overlays = resolveOverlays(v.overlays); queueMicrotask(() => { silent = false }) })
watch(state, () => { if (silent) return; emit('update:modelValue', JSON.parse(JSON.stringify(state))); emit('touched') }, { deep: true })

const uid = () => Math.random().toString(36).slice(2, 10)
const animatedCount = computed(() => state.overlays.filter(o => o.anim !== 'none').length)
const addTrust = () => { if (state.trustItems.length < MAX_TRUST_ITEMS) state.trustItems.push({ id: uid(), on: true, icon: 'check', text: '' }) }
const move = (arr: any[], i: number, d: number) => { const j = i + d; if (j < 0 || j >= arr.length) return; const [x] = arr.splice(i, 1); arr.splice(j, 0, x) }
const resetTrust = () => { state.trustItems = DEFAULT_TRUST_ITEMS.map(t => ({ ...t })); state.privacyLine = { ...DEFAULT_PRIVACY_LINE } }
const addOverlay = () => { if (state.overlays.length < MAX_OVERLAYS) state.overlays.push({ id: uid(), ...DEFAULT_OVERLAY, x: 8 + (state.overlays.length * 6) % 60, y: 8 + (state.overlays.length * 6) % 60 }) }
const animDisabled = (o: Overlay, key: string) => key !== 'none' && o.anim === 'none' && animatedCount.value >= MAX_ANIMATED_OVERLAYS
</script>

<template>
  <div class="lde">
    <div class="lde-warn"><i class="ti ti-scale"></i> Angaben müssen stimmen. Irreführende Werbung ist in Deutschland abmahnfähig.</div>

    <div class="lde-block">
      <div class="lde-head"><strong>Vertrauenspunkte</strong> <span class="lde-count">{{ state.trustItems.length }} / {{ MAX_TRUST_ITEMS }}</span>
        <button type="button" class="theme-opt" @click="resetTrust"><i class="ti ti-restore"></i> Standard</button></div>
      <div v-for="(t, i) in state.trustItems" :key="t.id" class="lde-row">
        <input type="checkbox" v-model="t.on" title="anzeigen" />
        <select v-model="t.icon" class="field-input lde-icon"><option v-for="(label, id) in TRUST_ICON_LABELS" :key="id" :value="id">{{ label }}</option></select>
        <i class="ti lde-prev" :class="TRUST_ICONS[t.icon]"></i>
        <input v-model="t.text" class="field-input lde-text" :maxlength="MAX_TRUST_TEXT" placeholder="Text des Punktes" />
        <span class="lde-count">{{ t.text.length }}/{{ MAX_TRUST_TEXT }}</span>
        <button type="button" class="theme-opt" :disabled="i === 0" title="nach oben" @click="move(state.trustItems, i, -1)"><i class="ti ti-arrow-up"></i></button>
        <button type="button" class="theme-opt" :disabled="i === state.trustItems.length - 1" title="nach unten" @click="move(state.trustItems, i, 1)"><i class="ti ti-arrow-down"></i></button>
        <button type="button" class="theme-opt" title="löschen" @click="state.trustItems.splice(i, 1)"><i class="ti ti-trash"></i></button>
      </div>
      <button type="button" class="theme-opt" :disabled="state.trustItems.length >= MAX_TRUST_ITEMS" @click="addTrust"><i class="ti ti-plus"></i> Punkt hinzufügen</button>
    </div>

    <div class="lde-block">
      <div class="lde-head"><strong>Zeile unter dem Button</strong></div>
      <div class="lde-row"><input type="checkbox" v-model="state.privacyLine.on" title="anzeigen" />
        <input v-model="state.privacyLine.text" class="field-input lde-text" :maxlength="MAX_PRIVACY_TEXT" placeholder="z. B. Datenschutzhinweis" /><span class="lde-count">{{ state.privacyLine.text.length }}/{{ MAX_PRIVACY_TEXT }}</span></div>
    </div>

    <div class="lde-block">
      <div class="lde-head"><strong>Sticker auf dem Hero-Bild</strong> <span class="lde-count">{{ state.overlays.length }} / {{ MAX_OVERLAYS }} · animiert {{ animatedCount }} / {{ MAX_ANIMATED_OVERLAYS }}</span></div>
      <div v-if="customTemplate" class="lde-note"><i class="ti ti-info-circle"></i> Diese Kampagne nutzt ein frei gestaltetes Template: Vertrauenspunkte und Datenschutzzeile gelten dort, <strong>Overlays gelten nicht</strong>.</div>
      <div v-else-if="!hasHero" class="lde-note"><i class="ti ti-info-circle"></i> Ohne Hero-Bild (Header-Banner) werden keine Overlays angezeigt. Lade oben ein Header-Banner hoch.</div>
      <div v-for="(o, i) in state.overlays" :key="o.id" class="lde-ov">
        <div class="lde-row">
          <input type="checkbox" v-model="o.on" title="anzeigen" />
          <select v-model="o.shape" class="field-input"><option v-for="(label, id) in OVERLAY_SHAPES" :key="id" :value="id">{{ label }}</option></select>
          <input v-model="o.text" class="field-input lde-text" :maxlength="MAX_OVERLAY_TEXT" placeholder="Text (optional)" /><span class="lde-count">{{ o.text.length }}/{{ MAX_OVERLAY_TEXT }}</span>
          <input type="color" v-model="o.color" title="Farbe" class="lde-color" />
          <button type="button" class="theme-opt" title="löschen" @click="state.overlays.splice(i, 1)"><i class="ti ti-trash"></i></button>
        </div>
        <div class="lde-sliders">
          <label>Größe {{ o.size }} %<input type="range" v-model.number="o.size" min="8" max="40" /></label>
          <label>Textgröße {{ o.textSize }} %<input type="range" v-model.number="o.textSize" min="50" max="150" /></label>
          <label>Drehung {{ o.rotate }}°<input type="range" v-model.number="o.rotate" min="-180" max="180" /></label>
          <label>Links {{ o.x }} %<input type="range" v-model.number="o.x" min="0" max="92" /></label>
          <label>Oben {{ o.y }} %<input type="range" v-model.number="o.y" min="0" max="92" /></label>
          <label>Animation<select v-model="o.anim" class="field-input"><option v-for="(label, id) in OVERLAY_ANIMATIONS" :key="id" :value="id" :disabled="animDisabled(o, String(id))">{{ label }}</option></select></label>
        </div>
      </div>
      <button type="button" class="theme-opt" :disabled="state.overlays.length >= MAX_OVERLAYS" @click="addOverlay"><i class="ti ti-plus"></i> Sticker hinzufügen</button>
      <div class="lde-note">Hinweis: Animationen werden bei eingestellter Bewegungsreduzierung des Geräts abgeschaltet. Es sind höchstens {{ MAX_ANIMATED_OVERLAYS }} animierte Sticker erlaubt.</div>
    </div>
  </div>
</template>

<style scoped>
.lde { display: flex; flex-direction: column; gap: 14px; }
.lde-warn { font-size: 12px; background: #f59e0b14; border: 1px solid #f59e0b55; border-radius: 8px; padding: 8px 10px; }
.lde-block { display: flex; flex-direction: column; gap: 8px; }
.lde-head { display: flex; align-items: center; gap: 10px; font-size: 13px; }
.lde-count { font-size: 11px; color: var(--text-muted); }
.lde-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.lde-text { flex: 1; min-width: 140px; }
.lde-icon { max-width: 150px; }
.lde-prev { color: var(--accent); width: 18px; text-align: center; }
.lde-color { width: 34px; height: 30px; padding: 0; border: 1px solid var(--border); background: none; border-radius: 6px; }
.lde-ov { border: 1px solid var(--border); border-radius: 8px; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
.lde-sliders { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; font-size: 11px; color: var(--text-muted); }
.lde-sliders label { display: flex; flex-direction: column; gap: 2px; }
.lde-note { font-size: 11px; color: var(--text-muted); }
</style>
