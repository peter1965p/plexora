<template>
  <div class="lp-root" :style="rootStyle">

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
        <div class="lp-trust">
          <div class="lp-trust-item"><i class="ti ti-shield-check"></i> 100% kostenlos</div>
          <div class="lp-trust-item"><i class="ti ti-lock"></i> SSL gesichert</div>
          <div class="lp-trust-item"><i class="ti ti-clock"></i> Antwort in 24h</div>
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
                <div class="lp-field">
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

              <button class="lp-submit-btn" :disabled="sending"
                :style="`background:${accent};box-shadow:0 4px 24px ${accent}55`"
                @click="submit">
                <span v-if="sending"><i class="ti ti-loader-2 spin"></i></span>
                <span v-else>{{ form.submitLabel || 'Jetzt anfragen' }} <i class="ti ti-arrow-right" style="margin-left:6px"></i></span>
              </button>

              <div class="lp-privacy">
                <i class="ti ti-lock"></i> Deine Daten sind sicher. Keine Weitergabe an Dritte.
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

  </div>
</template>

<script setup lang="ts">
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

const { branding, loadBranding } = useBranding()
const brandFirst = computed(() => branding.value.brandName.slice(0, -2))
const brandLast  = computed(() => branding.value.brandName.slice(-2))
onMounted(() => loadBranding())

const accent = computed(() => campaign.value?.accentColor || '#6C3FE8')

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

const formData  = reactive<Record<string, string>>({})
const sending   = ref(false)
const submitted = ref(false)
const successMsg = ref('Vielen Dank!')

async function submit() {
  sending.value = true
  try {
    const formId = form.value?.formId || slug
    const res = await $fetch(useApiUrl(`/api/forms/${formId}/submit`), {
      method: 'POST',
      body: { data: { ...formData }, utmSource, utmMedium, utmCampaign, utmContent, utmTerm }
    }) as any
    successMsg.value = res.message || 'Vielen Dank!'
    submitted.value  = true
  } finally {
    sending.value = false
  }
}
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
