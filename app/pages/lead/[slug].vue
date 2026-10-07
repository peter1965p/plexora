<template>
  <div v-if="customHtml" ref="customRoot" v-html="customHtml"></div>

  <div v-else class="lp-root" :style="rootStyle">

    <!-- BG Layer -->
    <div class="lp-bg" :style="bgStyle"></div>
    <div class="lp-bg-overlay" :style="overlayStyle"></div>

    <!-- DESKTOP: Split — hero left / form right -->
    <div class="lp-layout">

      <!-- LEFT HERO -->
      <div class="lp-hero">
        <!-- Logo -->
        <div class="lp-logo">
          <img v-if="campaign?.logoUrl || branding.logoUrl"
            :src="campaign?.logoUrl || branding.logoUrl"
            style="max-height:48px;max-width:180px;object-fit:contain" />
          <div v-else class="lp-logo-text">
            {{ brandFirst }}<span :style="`color:${accent}`">{{ brandLast }}</span>
          </div>
        </div>

        <!-- Headline -->
        <h1 class="lp-headline">{{ campaign?.headline || form?.title || '' }}</h1>
        <p v-if="campaign?.subtext" class="lp-subtext">{{ campaign.subtext }}</p>

        <!-- Banner Card -->
        <div v-if="campaign?.headerImageUrl" class="lp-banner-card">
          <img :src="campaign.headerImageUrl" />
          <!-- Overlays (Sticker) nur über dem Hero-Bild, nie über Formular oder Button -->
          <LeadOverlays :overlays="overlays" />
        </div>

        <!-- Content Block -->
        <div v-if="contentItems.length" class="lp-benefits">
          <div v-if="campaign?.contentTitle" class="lp-benefits-title">{{ campaign.contentTitle }}</div>
          <div v-for="(item, i) in contentItems" :key="i" class="lp-benefit-item">
            <span class="lp-benefit-check" :style="`background:${accent}22;color:${accent};border:1px solid ${accent}44`">
              <i class="ti ti-check"></i>
            </span>
            {{ item }}
          </div>
        </div>

        <!-- Trust badges -->
        <div v-if="trustItems.length" class="lp-trust">
          <div v-for="t in trustItems" :key="t.id" class="lp-trust-item"><i class="ti" :class="TRUST_ICONS[t.icon]"></i> {{ t.text }}</div>
        </div>
      </div>

      <!-- RIGHT FORM -->
      <div class="lp-form-col">
        <div class="lp-form-card">

          <div v-if="!submitted">
            <div class="lp-form-title">{{ form?.title || campaign?.headline || 'Jetzt anfragen' }}</div>
            <div v-if="form?.description" class="lp-form-desc">{{ form.description }}</div>

            <div v-if="form" style="display:flex;flex-direction:column;gap:12px;margin-top:16px">
              <template v-for="field in form.fields" :key="field.id">
                <div class="lp-field" v-if="field.type === 'checkbox'">
                  <label class="lp-toggle-row" @click.prevent="formData[field.label] = !formData[field.label]">
                    <span class="lp-toggle" :class="{ on: !!formData[field.label] }" :style="formData[field.label] ? `background:${accent}` : ''">
                      <span class="lp-toggle-dot"></span>
                    </span>
                    <span class="lp-toggle-label">{{ field.label }}<span v-if="field.required" :style="`color:${accent}`"> *</span></span>
                  </label>
                </div>
                <div class="lp-field" v-else>
                  <label class="lp-label">{{ field.label }}<span v-if="field.required" :style="`color:${accent}`"> *</span></label>
                  <textarea v-if="field.type === 'textarea'" v-model="formData[field.label]"
                    :placeholder="field.placeholder || ''" rows="4" class="lp-input lp-textarea"></textarea>
                  <select v-else-if="field.type === 'select'" v-model="formData[field.label]" class="lp-input lp-select">
                    <option value="">— bitte wählen —</option>
                    <option v-for="opt in (field.options || [])" :key="opt" :value="opt">{{ opt }}</option>
                  </select>
                  <input v-else v-model="formData[field.label]"
                    :type="field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'"
                    :placeholder="field.placeholder || ''" class="lp-input" />
                </div>
              </template>

              <TurnstileWidget v-if="botProtection" ref="turnstileRef" v-model="turnstileToken"
                :site-key="botProtection.siteKey" :mode="botProtection.mode" theme="dark" style="margin:4px 0 12px" />
              <div v-if="errorMsg" role="alert" style="margin-bottom:10px;font-size:13px;color:#f87171">{{ errorMsg }}</div>

              <button class="lp-submit-btn" :disabled="sending"
                :style="`background:${accent};box-shadow:0 4px 24px ${accent}55`"
                @click="submit">
                <span v-if="sending"><i class="ti ti-loader-2 spin"></i></span>
                <span v-else>{{ form.submitLabel || 'Jetzt anfragen' }} <i class="ti ti-arrow-right" style="margin-left:6px"></i></span>
              </button>

              <div v-if="privacyLine.on" class="lp-privacy">
                <i class="ti ti-lock"></i> {{ privacyLine.text }}
              </div>
            </div>

            <div v-if="!form && !loading" class="lp-no-form">
              <i class="ti ti-file-off"></i>
              <span>Formular nicht gefunden</span>
            </div>
          </div>

          <!-- SUCCESS -->
          <div v-if="submitted" class="lp-success">
            <div class="lp-success-icon" :style="`background:${accent}22;color:${accent}`">
              <i class="ti ti-circle-check"></i>
            </div>
            <h2 class="lp-success-title">{{ successMsg }}</h2>
            <p class="lp-success-sub">Wir melden uns bald bei dir!</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Sticker, die frei auf der Seite liegen (nie klickbar, Formular und Button bleiben bedienbar) -->
    <LeadOverlays :overlays="overlays" layer="page" />
  </div>
</template>

<script setup lang="ts">
import { mountTurnstile, type TurnstileHandle } from '~/utils/turnstile'
import { resolveTrustItems, resolvePrivacyLine, resolveOverlays, TRUST_ICONS } from '~~/shared/leadDecor'
import { buildLeadTemplateDataClient, renderCampaignHtmlClient } from '~/utils/campaignTemplateClient'

definePageMeta({ layout: 'default' })

const route = useRoute()
const slug  = route.params.slug as string

const utmSource   = route.query.utm_source   as string || ''
const utmMedium   = route.query.utm_medium   as string || ''
const utmCampaign = route.query.utm_campaign as string || ''
const utmContent  = route.query.utm_content  as string || ''
const utmTerm     = route.query.utm_term     as string || ''

const { data: publicData, pending: loading } = await useFetch(useApiUrl(`/api/marketing/public/${slug}`))
const campaign = computed(() => (publicData.value as any)?.campaign || null)
const form     = computed(() => (publicData.value as any)?.form || null)
// Bot-Schutz: Widget nur, wenn der Server das Formular auch prüft (Sitekey + Modus, nie ein Secret)
const botProtection = computed<{ siteKey: string; mode: string } | null>(() => (publicData.value as any)?.botProtection || null)

const { branding } = useBranding()
watchEffect(() => { if ((publicData.value as any)?.branding) Object.assign(branding.value, (publicData.value as any).branding) })
const brandFirst = computed(() => branding.value.brandName.slice(0, -2))
const brandLast  = computed(() => branding.value.brandName.slice(-2))

const accent = computed(() => campaign.value?.accentColor || '#6C3FE8')
// Vertrauenspunkte, Datenschutzzeile und Overlays: Standardwerte, wenn die Kampagne nichts gespeichert hat; nur reiner Text, Icons/Formen als IDs
const trustItems = computed(() => resolveTrustItems(campaign.value?.trustItems).filter(t => t.on))
const privacyLine = computed(() => resolvePrivacyLine(campaign.value?.privacyLine))
const overlays = computed(() => resolveOverlays(campaign.value?.overlays))

const contentItems = computed<string[]>(() => {
  const raw = campaign.value?.contentItems
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(Boolean)
  try { return JSON.parse(raw).filter(Boolean) } catch { return [] }
})

const bgStyle = computed(() => {
  if (campaign.value?.bgImageUrl) {
    return `background-image: url('${campaign.value.bgImageUrl}'); background-size: cover; background-position: center;`
  }
  if (campaign.value?.bgColor) {
    return `background: ${campaign.value.bgColor};`
  }
  if (campaign.value?.headerImageUrl) {
    return `background-image: url('${campaign.value.headerImageUrl}'); background-size: cover; background-position: center;`
  }
  return `background: linear-gradient(135deg, #050815 0%, #0f1628 60%, ${accent.value}18 100%);`
})

const overlayStyle = computed(() => {
  if (campaign.value?.headerImageUrl) {
    return `background: linear-gradient(135deg, rgba(5,8,21,0.85) 0%, rgba(5,8,21,0.6) 50%, rgba(5,8,21,0.75) 100%);`
  }
  return ''
})

const rootStyle = computed(() => `--lp-accent: ${accent.value}`)

const formData  = reactive<Record<string, string | boolean>>({})
const sending   = ref(false)
const submitted = ref(false)
const successMsg = ref('Vielen Dank!')
const errorMsg  = ref('')
const turnstileToken = ref('')
const turnstileRef = ref<{ reset: () => void } | null>(null)

const TOKEN_PENDING = 'Bitte warten Sie einen Moment, bis die Sicherheitsprüfung abgeschlossen ist, und senden Sie dann erneut.'
function submitErrorMessage(e: any) {
  return e?.data?.message || e?.data?.statusMessage || 'Da ist etwas schiefgelaufen. Bitte versuchen Sie es erneut.'
}

async function submit() {
  errorMsg.value = ''
  if (botProtection.value && !turnstileToken.value) { errorMsg.value = TOKEN_PENDING; return }
  sending.value = true
  try {
    const formId = form.value?.formId || slug
    const res = await $fetch(useApiUrl(`/api/forms/${formId}/submit`), {
      method: 'POST',
      body: { data: { ...formData }, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, ...(botProtection.value ? { turnstileToken: turnstileToken.value } : {}) }
    }) as any
    successMsg.value = res.message || 'Vielen Dank!'
    submitted.value  = true
  } catch (e: any) {
    errorMsg.value = submitErrorMessage(e)
    turnstileRef.value?.reset()          // Token ist nur einmal gültig
  } finally {
    sending.value = false
  }
}

// ── Freigestalt-Template (customTemplateHtml) ──
// Wird per v-html eingefügt, dadurch gehen Vue-Events/Reactivity verloren — das
// vorgerenderte Formular (feste IDs aus server/utils/campaignTemplate.ts) wird darum
// nach dem Rendern per Vanilla-JS verdrahtet, statt Vue-Bindings zu erwarten.
const customHtml = computed(() => {
  if (!campaign.value?.customTemplateHtml) return null
  const data = buildLeadTemplateDataClient(campaign.value, form.value, branding.value)
  return renderCampaignHtmlClient(campaign.value.customTemplateHtml, data)
})
const customRoot = ref<HTMLElement | null>(null)

// Bot-Schutz im frei gestalteten Template: Widget wird vor dem Absende-Button eingehängt
let customToken = ''
let customTurnstile: TurnstileHandle | null = null

async function mountCustomTurnstile(formEl: HTMLFormElement) {
  const cfg = botProtection.value
  if (!cfg || formEl.querySelector('.plx-turnstile')) return
  const box = document.createElement('div')
  box.className = 'plx-turnstile'
  box.style.margin = '8px 0 12px'
  const btn = formEl.querySelector('button[type="submit"]')
  btn?.parentElement?.insertBefore(box, btn)
  try { customTurnstile = await mountTurnstile(box, { ...cfg, theme: undefined }, (t) => { customToken = t }) }
  catch { box.textContent = 'Die Sicherheitsprüfung konnte nicht geladen werden. Bitte Seite neu laden oder Werbeblocker deaktivieren.'; box.style.color = '#ef4444' }
}

async function submitCustomLeadForm(formEl: HTMLFormElement) {
  const inputsEl  = formEl.querySelector('.plx-form-inputs') as HTMLElement | null
  const successEl = formEl.querySelector('#plx-lead-form-success') as HTMLElement | null
  const errorEl   = formEl.querySelector('#plx-lead-form-error') as HTMLElement | null
  const submitBtn = formEl.querySelector('button[type="submit"]') as HTMLButtonElement | null
  const showError = (msg: string) => { if (errorEl) { errorEl.textContent = msg; errorEl.style.display = 'block' } }
  if (errorEl) errorEl.style.display = 'none'
  if (botProtection.value && !customToken) { showError(TOKEN_PENDING); return }
  if (submitBtn) submitBtn.disabled = true
  try {
    const fd = new FormData(formEl)
    const data: Record<string, string | boolean> = {}
    fd.forEach((v, k) => { data[k] = String(v) })
    // Native Checkboxen landen bei FormData nur im "checked"-Zustand — unchecked
    // würde sonst stillschweigend fehlen statt false zu übermitteln.
    formEl.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((cb) => {
      if (cb.name) data[cb.name] = cb.checked
    })
    const formId = form.value?.formId || slug
    const res = await $fetch(useApiUrl(`/api/forms/${formId}/submit`), {
      method: 'POST',
      body: { data, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, ...(botProtection.value ? { turnstileToken: customToken } : {}) }
    }) as any
    if (inputsEl) inputsEl.style.display = 'none'
    if (successEl) { successEl.textContent = res.message || 'Vielen Dank!'; successEl.style.display = 'block' }
  } catch (e: any) {
    showError(submitErrorMessage(e))
    customTurnstile?.reset()             // Token ist nur einmal gültig
  } finally {
    if (submitBtn) submitBtn.disabled = false
  }
}

function wireCustomLeadForm() {
  const formEl = customRoot.value?.querySelector('#plx-lead-form') as HTMLFormElement | null
  if (!formEl || (formEl as any)._plxWired) return
  ;(formEl as any)._plxWired = true
  formEl.addEventListener('submit', (e) => { e.preventDefault(); submitCustomLeadForm(formEl) })
  mountCustomTurnstile(formEl)
}

watch(customHtml, () => { nextTick(wireCustomLeadForm) }, { immediate: true })
</script>

<style scoped>
.lp-root {
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
}

.lp-bg, .lp-bg-overlay {
  position: fixed;
  inset: 0;
  z-index: 0;
}

.lp-layout {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 480px;
  gap: 0;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 40px;
  align-items: center;
}

@media (max-width: 900px) {
  .lp-layout {
    grid-template-columns: 1fr;
    padding: 24px 16px 48px;
    gap: 28px;
    align-items: start;
  }
}

@media (max-width: 480px) {
  .lp-layout {
    padding: 20px 12px 40px;
    gap: 20px;
  }
}

/* HERO */
.lp-hero {
  padding: 80px 40px 80px 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@media (max-width: 900px) {
  .lp-hero { padding: 0; text-align: center; align-items: center; order: 2; }
}

.lp-logo { margin-bottom: 8px; }
.lp-logo-text { font-size: 28px; font-weight: 900; color: #fff; letter-spacing: -0.5px; }

.lp-headline {
  font-size: clamp(24px, 5vw, 52px);
  font-weight: 900;
  color: #fff;
  line-height: 1.15;
  margin: 0;
  letter-spacing: -0.5px;
}

.lp-subtext {
  font-size: 17px;
  color: rgba(255,255,255,0.72);
  margin: 0;
  line-height: 1.6;
  max-width: 480px;
}

/* BENEFITS */
.lp-benefits {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}

.lp-benefits-title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255,255,255,0.5);
  margin-bottom: 4px;
}

.lp-benefit-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 15px;
  color: rgba(255,255,255,0.88);
}

@media (max-width: 900px) {
  .lp-benefit-item { justify-content: center; }
}

.lp-benefit-check {
  width: 28px; height: 28px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

/* TRUST */
.lp-trust {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 8px;
}

@media (max-width: 900px) {
  .lp-trust { justify-content: center; }
}

.lp-trust-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(255,255,255,0.5);
}
.lp-trust-item i { color: var(--lp-accent); }

/* BANNER CARD */
.lp-banner-card {
  position: relative;
  container-type: inline-size;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: 0 16px 48px rgba(0,0,0,0.4);
  max-width: 420px;
  width: 100%;
}
.lp-banner-card img {
  width: 100%;
  display: block;
  object-fit: cover;
}

/* FORM */
.lp-form-col {
  padding: 60px 0;
}

@media (max-width: 900px) {
  .lp-form-col { padding: 0; order: 1; }
}

.lp-form-card {
  background: rgba(15, 20, 40, 0.72);
  backdrop-filter: blur(24px) saturate(1.4);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 24px;
  padding: 36px;
  box-shadow: 0 32px 80px rgba(0,0,0,0.4);
}

@media (max-width: 480px) {
  .lp-form-card { padding: 24px 20px; border-radius: 18px; }
}

.lp-form-title {
  font-size: 20px;
  font-weight: 800;
  color: #fff;
  margin-bottom: 4px;
}

.lp-form-desc {
  font-size: 13px;
  color: rgba(255,255,255,0.55);
  margin-bottom: 4px;
}

.lp-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.lp-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.65);
  letter-spacing: 0.03em;
}

.lp-input {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 14px;
  color: #fff;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.15s;
  font-family: inherit;
}
.lp-input::placeholder { color: rgba(255,255,255,0.28); }
.lp-input:focus { border-color: var(--lp-accent); background: rgba(255,255,255,0.09); }

.lp-textarea { resize: vertical; }
.lp-select { appearance: none; cursor: pointer; }
.lp-select option { background: #111827; color: #fff; }

.lp-toggle-row { display: flex; align-items: center; gap: 12px; cursor: pointer; user-select: none; }
.lp-toggle {
  position: relative; flex-shrink: 0; width: 42px; height: 24px; border-radius: 12px;
  background: rgba(255,255,255,0.15); transition: background 0.2s;
}
.lp-toggle-dot {
  position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%;
  background: #fff; transition: left 0.2s;
}
.lp-toggle.on .lp-toggle-dot { left: 21px; }
.lp-toggle-label { font-size: 13px; color: rgba(255,255,255,0.8); line-height: 1.4; }

.lp-submit-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: opacity 0.2s, transform 0.15s;
  margin-top: 4px;
}
.lp-submit-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
.lp-submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }

.lp-privacy {
  text-align: center;
  font-size: 11px;
  color: rgba(255,255,255,0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.lp-no-form {
  text-align: center;
  color: rgba(255,255,255,0.4);
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

/* SUCCESS */
.lp-success {
  text-align: center;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.lp-success-icon {
  width: 72px; height: 72px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 36px;
}

.lp-success-title {
  font-size: 22px;
  font-weight: 800;
  color: #fff;
  margin: 0;
}

.lp-success-sub {
  font-size: 14px;
  color: rgba(255,255,255,0.55);
  margin: 0;
}
</style>
