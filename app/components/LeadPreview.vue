<script setup lang="ts">
import { computed } from 'vue'
import { resolveTrustItems, resolvePrivacyLine, resolveOverlays, TRUST_ICONS } from '../../shared/leadDecor'

// Live-Vorschau der Lead-Seite im Kampagnenformular (Desktop- und Handy-Ansicht). Zeigt dieselben Bausteine wie die echte Seite:
// Vertrauenspunkte, Datenschutzzeile und Overlays über dem Hero-Bild – alles nur als Text und über IDs aus shared/leadDecor.ts.
const props = defineProps<{ campaign: Record<string, any>; form: Record<string, any> | null; mode: 'desktop' | 'mobile'; selectedOverlayId?: string }>()
const emit = defineEmits<{ (e: 'move-overlay', v: { id: string; x: number; y: number }): void; (e: 'select-overlay', id: string): void }>()
const mode = defineModel<'desktop' | 'mobile'>('mode', { default: 'desktop' })
const accent = computed(() => props.campaign.accentColor || '#6C3FE8')
const trust = computed(() => resolveTrustItems(props.campaign.trustItems).filter(t => t.on))
const privacy = computed(() => resolvePrivacyLine(props.campaign.privacyLine))
const overlays = computed(() => resolveOverlays(props.campaign.overlays))
const items = computed<string[]>(() => (Array.isArray(props.campaign.contentItems) ? props.campaign.contentItems.filter(Boolean) : []).slice(0, 4))
const bg = computed(() => props.campaign.bgImageUrl ? `background:url('${encodeURI(props.campaign.bgImageUrl)}') center/cover no-repeat` : `background:${/^#[0-9a-fA-F]{6}$/.test(props.campaign.bgColor || '') ? props.campaign.bgColor : '#050815'}`)
const fields = computed(() => (props.form?.fields || []).slice(0, 4))
</script>

<template>
  <div class="pv">
    <div class="pv-toggle" role="group" aria-label="Vorschau-Ansicht">
      <button type="button" class="theme-opt" :class="{ active: mode === 'desktop' }" @click="mode = 'desktop'"><i class="ti ti-device-desktop"></i> Desktop</button>
      <button type="button" class="theme-opt" :class="{ active: mode === 'mobile' }" @click="mode = 'mobile'"><i class="ti ti-device-mobile"></i> Handy</button>
    </div>
    <div class="pv-frame" :class="`pv-${mode}`" :style="bg">
      <div class="pv-dim"></div>
      <div class="pv-layout">
        <div class="pv-hero">
          <div class="pv-h1">{{ campaign.headline || 'Deine Headline' }}</div>
          <div v-if="campaign.subtext" class="pv-sub">{{ campaign.subtext }}</div>
          <div v-if="campaign.headerImageUrl" class="pv-banner"><img :src="campaign.headerImageUrl" alt="" /><LeadOverlays :overlays="overlays" editable :selected-id="selectedOverlayId" @move="emit('move-overlay', $event)" @select="emit('select-overlay', $event)" /></div>
          <div v-for="(it, i) in items" :key="i" class="pv-item"><span class="pv-chk" :style="{ background: accent + '22', color: accent }"><i class="ti ti-check"></i></span>{{ it }}</div>
          <div v-if="trust.length" class="pv-trust"><span v-for="t in trust" :key="t.id" class="pv-trust-item"><i class="ti" :class="TRUST_ICONS[t.icon]" :style="{ color: accent }"></i> {{ t.text }}</span></div>
        </div>
        <div class="pv-form">
          <div class="pv-ft">{{ form?.title || campaign.headline || 'Anfrage' }}</div>
          <div v-for="f in fields" :key="f.id" class="pv-field">{{ f.label }}{{ f.required ? ' *' : '' }}</div>
          <button type="button" class="pv-btn" :style="{ background: accent }">{{ form?.submitLabel || 'Jetzt anfragen' }}</button>
          <div v-if="privacy.on" class="pv-privacy"><i class="ti ti-lock"></i> {{ privacy.text }}</div>
        </div>
      </div>
    </div>
    <div v-if="overlays.some(o => o.on) && campaign.headerImageUrl" class="pv-hint"><i class="ti ti-hand-move"></i> Sticker mit Maus oder Finger direkt im Bild ziehen. Alternativ anklicken und mit den Pfeiltasten verschieben (Umschalt = große Schritte).</div>
    <div v-if="overlays.some(o => o.on) && !campaign.headerImageUrl" class="pv-hint"><i class="ti ti-info-circle"></i> Ohne Hero-Bild (Header-Banner) werden keine Overlays angezeigt.</div>
  </div>
</template>

<style scoped>
.pv-toggle { display: flex; gap: 6px; margin-bottom: 8px; }
.pv-frame { position: relative; overflow: hidden; border-radius: 12px; border: 0.5px solid var(--border); margin: 0 auto; color: #fff; }
.pv-desktop { width: 100%; }
.pv-mobile { width: 300px; max-width: 100%; }
.pv-dim { position: absolute; inset: 0; background: rgba(5, 8, 21, .65); pointer-events: none; }
.pv-layout { position: relative; z-index: 1; display: grid; gap: 12px; padding: 14px; align-items: start; }
.pv-desktop .pv-layout { grid-template-columns: 1.1fr 1fr; }
.pv-mobile .pv-layout { grid-template-columns: 1fr; }
.pv-h1 { font-size: 15px; font-weight: 800; line-height: 1.2; margin-bottom: 4px; }
.pv-sub { font-size: 10px; color: rgba(255,255,255,.65); margin-bottom: 8px; }
.pv-banner { position: relative; container-type: inline-size; border-radius: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,.12); margin-bottom: 8px; max-width: 220px; }
.pv-banner img { display: block; width: 100%; height: auto; }
.pv-item { display: flex; align-items: center; gap: 5px; font-size: 10px; margin-bottom: 4px; color: rgba(255,255,255,.85); }
.pv-chk { width: 14px; height: 14px; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; font-size: 9px; }
.pv-trust { display: flex; flex-wrap: wrap; gap: 8px 12px; margin-top: 8px; }
.pv-trust-item { font-size: 9px; color: rgba(255,255,255,.55); display: inline-flex; align-items: center; gap: 4px; }
.pv-form { background: rgba(15,20,40,.75); border: 1px solid rgba(255,255,255,.1); border-radius: 10px; padding: 10px; }
.pv-ft { font-size: 11px; font-weight: 700; margin-bottom: 8px; }
.pv-field { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); border-radius: 6px; padding: 5px 8px; font-size: 10px; color: rgba(255,255,255,.45); margin-bottom: 4px; }
.pv-btn { width: 100%; color: #fff; border: none; padding: 6px; border-radius: 6px; font-size: 10px; font-weight: 700; cursor: default; margin-top: 4px; }
.pv-privacy { text-align: center; font-size: 9px; color: rgba(255,255,255,.4); margin-top: 6px; }
.pv-hint { font-size: 11px; color: var(--text-muted); margin-top: 6px; }
</style>
