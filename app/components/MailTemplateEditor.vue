<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  DEFAULT_INVITE, STYLE_PRESETS, FONT_LABELS, PLACEHOLDERS, PLACEHOLDER_LABELS, MAIL_LIMITS, SAMPLE_CTX, applyPreset, resolveInviteConfig, renderInviteMail, contrastWarnings,
  unknownPlaceholders, containsLink, LOGO_UPLOAD_MAX_BYTES, type InviteMailConfig,
} from '~~/shared/mailTemplate'
import { plain } from '~/utils/plain'

// Editor für die frei gestaltbare Einladungsmail (Einstellungen → E-Mail-Vorlagen). Die Vorschau nutzt EXAKT dieselbe Funktion wie der Server
// (shared/mailTemplate.ts), steckt in einem Iframe ohne Skripte und zeigt Hell, Dunkel (invertiert wie bei automatischer Abdunkelung) und Handy.
const props = defineProps<{ disabled?: boolean }>()

const loading = ref(true)
const forbidden = ref(false)
const saving = ref(false), testing = ref(false), uploading = ref(false)
const msg = reactive({ text: '', ok: true, warn: false })
const errorField = ref('')
const draft = reactive<InviteMailConfig>(plain(DEFAULT_INVITE))
const server = reactive({ customLogoUrl: '', brandingLogoUrl: '', customized: false })
const view = reactive({ dark: false, mobile: false })
const lastField = ref<'subject' | 'heading' | 'body' | 'buttonText' | 'footer'>('body')

const say = (text: string, ok = true, warn = false) => { msg.text = text; msg.ok = ok; msg.warn = warn }
// Verständliche Fehlermeldung; 404 heißt: der Server (Backend) kennt die Funktion noch nicht, das Frontend ist neuer
const errText = (e: any, fallback: string) => ((e?.statusCode ?? e?.status) === 404 ? 'Der Server kennt diese Funktion noch nicht (das Backend ist noch nicht aktualisiert). Bitte nach dem Backend-Deploy erneut versuchen.' : (e?.data?.message || e?.message || fallback))
const api = async <T>(path: string, opts: any = {}): Promise<T> => {
  const { useAuthHeader } = await import('~/composables/useAuth')
  return await $fetch<T>(useApiUrl(`/api/settings/mail-templates/${path}`), { ...opts, headers: await useAuthHeader() })
}
const apply = (cfg: InviteMailConfig) => { Object.assign(draft, plain(cfg)) }

async function load() {
  loading.value = true
  try {
    const r: any = await api('invite')
    apply(resolveInviteConfig(r.config)); server.customLogoUrl = r.customLogoUrl || ''; server.brandingLogoUrl = r.brandingLogoUrl || ''; server.customized = !!r.customized; forbidden.value = false
  } catch (e: any) { if (e?.statusCode === 403 || e?.status === 403) forbidden.value = true; else say(errText(e, 'Die Vorlage konnte nicht geladen werden.'), false) }
  finally { loading.value = false }
}
onMounted(load)

// ── Prüfungen im Editor (dieselben Regeln wie auf dem Server; der Server prüft beim Speichern trotzdem noch einmal) ──
const TEXT_FIELDS = [
  { key: 'subject', label: 'Betreff', max: MAIL_LIMITS.subject, multi: false },
  { key: 'heading', label: 'Überschrift', max: MAIL_LIMITS.heading, multi: false },
  { key: 'body', label: 'Text', max: MAIL_LIMITS.body, multi: true },
  { key: 'buttonText', label: 'Button-Text', max: MAIL_LIMITS.button, multi: false },
  { key: 'footer', label: 'Fußzeile', max: MAIL_LIMITS.footer, multi: false },
] as const
const fieldProblems = computed(() => {
  const out: Record<string, string> = {}
  for (const f of TEXT_FIELDS) {
    const v = String((draft as any)[f.key] ?? '')
    if (containsLink(v)) out[f.key] = 'Links, Adressen und E-Mail-Adressen sind hier nicht erlaubt. Der Annahme-Link wird immer automatisch eingefügt.'
    else if (!f.multi && /[\r\n]/.test(v)) out[f.key] = 'Keine Zeilenumbrüche in diesem Feld.'
    else if (f.key !== 'footer' && !v.trim()) out[f.key] = 'Darf nicht leer sein.'
  }
  if (containsLink(draft.logo.alt)) out.alt = 'Keine Links im Alternativtext.'
  if (!draft.logo.alt.trim()) out.alt = 'Der Alternativtext ist Pflicht.'
  return out
})
const unknown = computed(() => Object.fromEntries(TEXT_FIELDS.map(f => [f.key, unknownPlaceholders(String((draft as any)[f.key] ?? ''))])) as Record<string, string[]>)
const warnings = computed(() => contrastWarnings(resolveInviteConfig(draft)))
const canSave = computed(() => !props.disabled && !saving.value && Object.keys(fieldProblems.value).length === 0 && !(draft.logo.mode === 'custom' && !draft.logo.file))

const logoUrl = computed(() => (draft.logo.mode === 'custom' ? server.customLogoUrl : draft.logo.mode === 'branding' ? server.brandingLogoUrl : ''))
const preview = computed(() => {
  try { return renderInviteMail(resolveInviteConfig(draft), { ...SAMPLE_CTX, logoUrl: logoUrl.value, acceptUrl: SAMPLE_CTX.acceptUrl }).html } catch { return '<p style="font-family:sans-serif">Vorschau nicht möglich.</p>' }
})
const previewStyle = computed(() => ({ width: view.mobile ? '375px' : '100%', maxWidth: '100%', height: '640px', border: '1px solid var(--border)', borderRadius: '10px', background: '#fff', filter: view.dark ? 'invert(1) hue-rotate(180deg)' : 'none' }))

const ph = (name: string) => '{' + '{' + name + '}' + '}'
function insertPlaceholder(name: string) { const k = lastField.value; (draft as any)[k] = `${(draft as any)[k]}${ph(name)}` }
const setHex = (obj: any, key: string, v: string) => { if (/^#[0-9a-fA-F]{6}$/.test(v)) obj[key] = v.toLowerCase() }
function usePreset(key: string) { Object.assign(draft, applyPreset(resolveInviteConfig(draft), key)); say(`Stilvorlage „${STYLE_PRESETS[key].label}“ angewendet (noch nicht gespeichert).`) }

async function save() {
  saving.value = true; errorField.value = ''
  try { const r: any = await api('invite', { method: 'PUT', body: plain(draft) }); apply(resolveInviteConfig(r.config)); server.customized = true; say('Vorlage gespeichert.') }
  catch (e: any) { errorField.value = e?.data?.data?.field || ''; say(errText(e, 'Speichern fehlgeschlagen.'), false) }
  finally { saving.value = false }
}
async function resetAll() {
  if (!confirm('Vorlage und eigenes Logo wirklich auf den Standard zurücksetzen?')) return
  try { await api('invite', { method: 'DELETE' }); await load(); say('Auf Standard zurückgesetzt.') } catch (e: any) { say(errText(e, 'Zurücksetzen fehlgeschlagen.'), false) }
}
async function sendTest() {
  testing.value = true
  try { const r: any = await api('invite-test', { method: 'POST', body: { config: plain(draft) } }); say(r.status === 'sent' ? `Testmail an ${r.to} gesendet. Der Link darin ist absichtlich nicht gültig.` : `Testmail nicht gesendet (${r.status}).`, r.status === 'sent') }
  catch (e: any) { errorField.value = e?.data?.data?.field || ''; say(errText(e, 'Testmail fehlgeschlagen.'), false) }
  finally { testing.value = false }
}
async function onFile(ev: Event) {
  const f = (ev.target as HTMLInputElement).files?.[0]; (ev.target as HTMLInputElement).value = ''
  if (!f) return
  if (!['image/png', 'image/jpeg'].includes(f.type)) return say('Nur PNG und JPG sind erlaubt (kein SVG, GIF oder WebP).', false)
  if (f.size > LOGO_UPLOAD_MAX_BYTES) return say('Die Datei ist zu groß (höchstens 3 MB).', false)
  uploading.value = true
  try {
    const b64: string = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error('Datei nicht lesbar')); r.readAsDataURL(f) })
    const up: any = await api('logo', { method: 'POST', body: { fileBase64: b64, fileName: f.name } })
    const r: any = await api('invite'); const c = resolveInviteConfig(r.config)
    Object.assign(draft.logo, { mode: 'custom', file: c.logo.file, w: c.logo.w, h: c.logo.h }); server.customLogoUrl = r.customLogoUrl || ''
    say('Logo hochgeladen (Metadaten entfernt, in der Mail höchstens 250 × 100 Pixel groß). Zum Übernehmen der übrigen Einstellungen bitte speichern.' + (up?.warning ? ' ' + up.warning : ''), true, !!up?.warning)
  } catch (e: any) { say(errText(e, 'Upload fehlgeschlagen.'), false) }
  finally { uploading.value = false }
}
async function removeLogo() {
  try { await api('logo', { method: 'DELETE' }); Object.assign(draft.logo, { mode: 'none', file: '', w: 0, h: 0 }); server.customLogoUrl = ''; say('Eigenes Logo entfernt.') } catch (e: any) { say(errText(e, 'Entfernen fehlgeschlagen.'), false) }
}
watch(() => draft.logo.mode, (m) => { if (m === 'custom' && !draft.logo.file) say('Bitte ein Logo hochladen.', false) })
</script>

<template>
  <div class="card">
    <div class="card-header">
      <span class="card-title"><i class="ti ti-mail-cog" style="margin-right:8px;color:var(--accent)"></i>E-Mail-Vorlagen</span>
      <div v-if="!forbidden && !loading" style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn-secondary" style="height:28px;font-size:12px;padding:0 12px" :disabled="disabled || testing || !canSave" @click="sendTest"><i class="ti" :class="testing ? 'ti-loader-2 spin' : 'ti-send'"></i> Testmail an mich</button>
        <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" :disabled="!canSave" @click="save"><i class="ti" :class="saving ? 'ti-loader-2 spin' : 'ti-device-floppy'"></i> Speichern</button>
      </div>
    </div>
    <div class="card-body">
      <div v-if="loading" style="font-size:13px;color:var(--text-muted)">Lädt …</div>
      <div v-else-if="forbidden" class="mt-note"><i class="ti ti-lock"></i> Nur der Inhaber des Kontos kann E-Mail-Vorlagen ansehen und ändern.</div>
      <template v-else>
        <div v-if="disabled" class="mt-note"><i class="ti ti-lock"></i> Im Demo-Zugang kannst du die Vorlage ansehen, aber nicht speichern oder Testmails senden.</div>
        <div v-if="msg.text" class="mt-msg" :class="{ bad: !msg.ok, warn: msg.warn }" role="status">{{ msg.text }}</div>

        <div class="mt-grid">
          <div class="mt-form">
            <div class="mt-sec">
              <div class="mt-h">Vorlage <span class="mt-sub">Einladung</span></div>
              <div class="mt-row">
                <button v-for="(p, k) in STYLE_PRESETS" :key="k" type="button" class="theme-opt" :disabled="disabled" @click="usePreset(String(k))">{{ p.label }}</button>
                <button type="button" class="theme-opt" :disabled="disabled" @click="resetAll"><i class="ti ti-restore"></i> Auf Standard zurücksetzen</button>
              </div>
              <div class="mt-hint">Stilvorlagen ersetzen Farben, Schrift, Button und Layout; deine Texte und das Logo bleiben.</div>
            </div>

            <div class="mt-sec">
              <div class="mt-h">Texte</div>
              <div class="mt-note small"><i class="ti ti-shield-check"></i> Reiner Text. Links und Adressen sind nicht erlaubt; der Annahme-Link und ein Sicherheitshinweis werden <strong>immer fest</strong> eingefügt und lassen sich nicht ändern.</div>
              <div v-for="f in TEXT_FIELDS" :key="f.key" class="mt-field" :class="{ err: fieldProblems[f.key] || errorField === f.key }">
                <label :for="`mt-${f.key}`">{{ f.label }} <span class="mt-count">{{ String((draft as any)[f.key] || '').length }}/{{ f.max }}</span></label>
                <textarea v-if="f.multi" :id="`mt-${f.key}`" v-model="(draft as any)[f.key]" class="field-input" rows="5" :maxlength="f.max" :disabled="disabled" @focus="lastField = f.key"></textarea>
                <input v-else :id="`mt-${f.key}`" v-model="(draft as any)[f.key]" class="field-input" :maxlength="f.max" :disabled="disabled" @focus="lastField = f.key" />
                <div v-if="fieldProblems[f.key]" class="mt-err">{{ fieldProblems[f.key] }}</div>
                <div v-if="unknown[f.key].length" class="mt-warn"><i class="ti ti-alert-triangle"></i> Unbekannter Platzhalter, erscheint als Text: {{ unknown[f.key].join(', ') }}</div>
              </div>
              <div class="mt-hint">Platzhalter (klicken fügt ihn ins zuletzt bearbeitete Feld ein):
                <button v-for="p in PLACEHOLDERS" :key="p" type="button" class="mt-chip" :title="PLACEHOLDER_LABELS[p]" :disabled="disabled" @click="insertPlaceholder(p)">{{ ph(p) }}</button></div>
            </div>

            <div class="mt-sec">
              <div class="mt-h">Farben</div>
              <div class="mt-colors">
                <label v-for="(label, k) in { page: 'Seitenhintergrund', card: 'Kartenhintergrund', heading: 'Überschrift', text: 'Text', button: 'Button-Hintergrund', buttonText: 'Button-Schrift', footer: 'Fußzeile' }" :key="k">{{ label }}
                  <span class="mt-color"><input type="color" :value="(draft.colors as any)[k]" :disabled="disabled" @input="setHex(draft.colors, String(k), ($event.target as HTMLInputElement).value)" /><input class="field-input" :value="(draft.colors as any)[k]" maxlength="7" :disabled="disabled" @change="setHex(draft.colors, String(k), ($event.target as HTMLInputElement).value)" /></span></label>
                <label>Button-Rahmen (optional)
                  <span class="mt-color"><input type="checkbox" :checked="!!draft.colors.buttonBorder" :disabled="disabled" @change="draft.colors.buttonBorder = ($event.target as HTMLInputElement).checked ? '#1f2937' : ''" />
                    <input type="color" :value="draft.colors.buttonBorder || '#1f2937'" :disabled="disabled || !draft.colors.buttonBorder" @input="setHex(draft.colors, 'buttonBorder', ($event.target as HTMLInputElement).value)" /></span></label>
              </div>
              <div v-for="w in warnings" :key="w.key" class="mt-warn"><i class="ti ti-alert-triangle"></i> {{ w.message }} Das Speichern ist trotzdem möglich.</div>
            </div>

            <div class="mt-sec">
              <div class="mt-h">Schrift und Button</div>
              <div class="mt-colors">
                <label>Schrift<select v-model="draft.font.family" class="field-input" :disabled="disabled"><option v-for="(l, k) in FONT_LABELS" :key="k" :value="k">{{ l }}</option></select></label>
                <label>Überschrift {{ draft.font.headingSize }} px<input type="range" v-model.number="draft.font.headingSize" min="16" max="40" :disabled="disabled" /></label>
                <label>Text {{ draft.font.textSize }} px<input type="range" v-model.number="draft.font.textSize" min="12" max="20" :disabled="disabled" /></label>
                <label>Button-Schrift {{ draft.font.buttonSize }} px<input type="range" v-model.number="draft.font.buttonSize" min="12" max="22" :disabled="disabled" /></label>
                <label>Überschrift<select v-model="draft.font.headingWeight" class="field-input" :disabled="disabled"><option value="normal">normal</option><option value="bold">fett</option></select></label>
                <label>Text<select v-model="draft.font.textWeight" class="field-input" :disabled="disabled"><option value="normal">normal</option><option value="bold">fett</option></select></label>
                <label>Button-Schrift<select v-model="draft.font.buttonWeight" class="field-input" :disabled="disabled"><option value="normal">normal</option><option value="bold">fett</option></select></label>
                <label>Eckenradius {{ draft.button.radius }} px<input type="range" v-model.number="draft.button.radius" min="0" max="40" :disabled="disabled" /></label>
                <label>Abstand oben/unten {{ draft.button.padV }} px<input type="range" v-model.number="draft.button.padV" min="6" max="28" :disabled="disabled" /></label>
                <label>Abstand links/rechts {{ draft.button.padH }} px<input type="range" v-model.number="draft.button.padH" min="12" max="60" :disabled="disabled" /></label>
                <label>Rahmenbreite {{ draft.button.borderWidth }} px<input type="range" v-model.number="draft.button.borderWidth" min="0" max="6" :disabled="disabled" /></label>
                <label>Breite<select v-model="draft.button.width" class="field-input" :disabled="disabled"><option value="auto">automatisch</option><option value="full">volle Breite</option></select></label>
                <label>Ausrichtung<select v-model="draft.button.align" class="field-input" :disabled="disabled"><option value="left">links</option><option value="center">mittig</option><option value="right">rechts</option></select></label>
                <label>Kartenbreite {{ draft.layout.cardWidth }} px<input type="range" v-model.number="draft.layout.cardWidth" min="320" max="640" :disabled="disabled" /></label>
                <label class="mt-check"><input type="checkbox" v-model="draft.layout.divider" :disabled="disabled" /> Trennlinie</label>
              </div>
            </div>

            <div class="mt-sec">
              <div class="mt-h">Logo im Mailkopf</div>
              <div class="mt-row">
                <label class="mt-check"><input type="radio" value="none" v-model="draft.logo.mode" :disabled="disabled" /> Kein Logo</label>
                <label class="mt-check"><input type="radio" value="branding" v-model="draft.logo.mode" :disabled="disabled" /> Logo aus dem Branding</label>
                <label class="mt-check"><input type="radio" value="custom" v-model="draft.logo.mode" :disabled="disabled" /> Eigenes Logo (nur für die Mail)</label>
              </div>
              <div v-if="draft.logo.mode === 'branding' && !server.brandingLogoUrl" class="mt-warn"><i class="ti ti-alert-triangle"></i> Das Branding-Logo liegt nicht bei Plexora oder ist kein PNG/JPG. Es wird dann nicht angezeigt; stattdessen steht der Produktname im Kopf. Bitte ein eigenes Logo hochladen.</div>
              <div v-if="draft.logo.mode === 'custom'" class="mt-row">
                <label class="theme-opt" :class="{ off: disabled || uploading }"><i class="ti" :class="uploading ? 'ti-loader-2 spin' : 'ti-upload'"></i> {{ draft.logo.file ? 'Logo ersetzen' : 'Logo hochladen' }}
                  <input type="file" accept="image/png,image/jpeg" style="display:none" :disabled="disabled || uploading" @change="onFile" /></label>
                <button v-if="draft.logo.file" type="button" class="theme-opt" :disabled="disabled" @click="removeLogo"><i class="ti ti-trash"></i> Entfernen</button>
                <span class="mt-hint">PNG oder JPG, bis 3 MB und 2000 × 2000 Pixel; das Bild wird automatisch verkleinert (gespeichert höchstens 300 KB). <strong>Empfohlen: mindestens 250 × 100 Pixel, besser 500 × 200</strong> (scharf auf hochauflösenden Bildschirmen). In der Mail wird es höchstens 250 × 100 Pixel groß gezeigt, ohne Metadaten neu gespeichert und nie vergrößert.</span>
              </div>
              <div class="mt-colors">
                <label :class="{ err: fieldProblems.alt }">Alternativtext (Pflicht) <span class="mt-count">{{ draft.logo.alt.length }}/{{ MAIL_LIMITS.alt }}</span><input v-model="draft.logo.alt" class="field-input" :maxlength="MAIL_LIMITS.alt" :disabled="disabled" /><span v-if="fieldProblems.alt" class="mt-err">{{ fieldProblems.alt }}</span></label>
                <label>Ausrichtung<select v-model="draft.logo.align" class="field-input" :disabled="disabled"><option value="left">links</option><option value="center">mittig</option><option value="right">rechts</option></select></label>
                <label class="mt-check"><input type="checkbox" v-model="draft.logo.plate" :disabled="disabled" /> Helle Platte hinter dem Logo</label>
                <label v-if="draft.logo.plate">Farbe der Platte<span class="mt-color"><input type="color" :value="draft.logo.plateColor" :disabled="disabled" @input="setHex(draft.logo, 'plateColor', ($event.target as HTMLInputElement).value)" /></span></label>
              </div>
            </div>
          </div>

          <div class="mt-preview">
            <div class="mt-row">
              <button type="button" class="theme-opt" :class="{ active: !view.dark }" @click="view.dark = false"><i class="ti ti-sun"></i> Hell</button>
              <button type="button" class="theme-opt" :class="{ active: view.dark }" @click="view.dark = true"><i class="ti ti-moon"></i> Dunkel (invertiert)</button>
              <button type="button" class="theme-opt" :class="{ active: !view.mobile }" @click="view.mobile = false"><i class="ti ti-device-desktop"></i> Desktop</button>
              <button type="button" class="theme-opt" :class="{ active: view.mobile }" @click="view.mobile = true"><i class="ti ti-device-mobile"></i> Handy</button>
            </div>
            <iframe title="Vorschau der Einladungsmail" sandbox="" :srcdoc="preview" :style="previewStyle"></iframe>
            <div class="mt-hint">Vorschau mit Beispieldaten. „Dunkel“ kehrt die Farben um, wie es manche Mail-Programme bei automatischer Abdunkelung tun. Der gelbe Sicherheitskasten bleibt in beiden Fällen lesbar.</div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.mt-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 20px; align-items: start; }
@media (max-width: 1100px) { .mt-grid { grid-template-columns: 1fr; } }
.mt-preview { position: sticky; top: 8px; display: flex; flex-direction: column; gap: 8px; }
.mt-sec { display: flex; flex-direction: column; gap: 8px; padding-bottom: 14px; margin-bottom: 14px; border-bottom: 0.5px solid var(--border); }
.mt-h { font-size: 13px; font-weight: 700; }
.mt-sub { font-weight: 400; color: var(--text-muted); font-size: 11px; margin-left: 6px; }
.mt-row { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.mt-field label, .mt-colors label { font-size: 12px; color: var(--text-muted); display: flex; flex-direction: column; gap: 3px; }
.mt-field { display: flex; flex-direction: column; gap: 3px; }
.mt-field > label { flex-direction: row; justify-content: space-between; }
.mt-field .field-input, .mt-colors .field-input, .mt-colors select, .mt-color .field-input { width: 100%; box-sizing: border-box; }
.mt-field textarea.field-input { resize: vertical; min-height: 110px; line-height: 1.45; }
.mt-field.err .field-input, .mt-colors label.err .field-input { border-color: var(--danger); }
.mt-colors { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; }
.mt-color { display: flex; gap: 6px; align-items: center; }
.mt-color input[type=color] { width: 34px; height: 30px; padding: 0; border: 1px solid var(--border); border-radius: 6px; background: none; }
.mt-check { flex-direction: row !important; align-items: center; gap: 6px !important; color: var(--text) !important; }
.mt-count { font-size: 11px; }
.mt-hint { font-size: 11px; color: var(--text-muted); }
.mt-note { font-size: 12px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; }
.mt-note.small { font-size: 11px; }
.mt-err { font-size: 11px; color: var(--danger); }
.mt-warn { font-size: 11px; background: #f59e0b14; border: 1px solid #f59e0b55; border-radius: 8px; padding: 6px 8px; }
.mt-msg { font-size: 12px; border-radius: 8px; padding: 8px 10px; margin-bottom: 10px; background: #16a34a14; border: 1px solid #16a34a55; }
.mt-msg.bad { background: #dc262614; border-color: #dc262655; }
.mt-msg.warn { background: #f59e0b14; border-color: #f59e0b55; }
.mt-chip { font-family: monospace; font-size: 11px; border: 1px solid var(--border); border-radius: 999px; padding: 1px 8px; margin: 2px 2px 0 0; background: var(--bg-elevated); color: var(--text); cursor: pointer; }
.theme-opt.off { opacity: .5; pointer-events: none; }
iframe { display: block; margin: 0 auto; }
</style>
