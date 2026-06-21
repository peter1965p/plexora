<template>
  <div style="min-height:100vh;background:var(--bg-base)">

    <!-- FULLHEADER MIT BANNER -->
    <div v-if="campaign?.headerImageUrl"
      :style="`width:100%;height:320px;background:url('${campaign.headerImageUrl}') center/cover no-repeat;position:relative`">
      <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.15) 0%,rgba(0,0,0,0.6) 100%)"></div>
      <div style="position:relative;z-index:1;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:0 24px 80px;text-align:center">
        <img v-if="campaign.logoUrl" :src="campaign.logoUrl"
          style="max-height:56px;max-width:180px;object-fit:contain;margin-bottom:20px;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.4))" />
        <h1 style="font-size:clamp(22px,4vw,42px);font-weight:900;color:#fff;margin:0 0 10px;text-shadow:0 2px 12px rgba(0,0,0,0.5)">
          {{ campaign.headline || form?.title || '' }}
        </h1>
        <p v-if="campaign.subtext"
          style="font-size:16px;color:rgba(255,255,255,0.88);margin:0;max-width:520px;text-shadow:0 1px 6px rgba(0,0,0,0.4)">
          {{ campaign.subtext }}
        </p>
      </div>
    </div>

    <!-- KEIN BANNER -->
    <div v-else style="padding:56px 24px 32px;text-align:center">
      <div v-if="campaign?.logoUrl || branding.logoUrl" style="margin-bottom:16px">
        <img :src="campaign?.logoUrl || branding.logoUrl" style="max-height:60px;max-width:200px;object-fit:contain" />
      </div>
      <div v-else class="logo-text" style="font-size:28px;margin-bottom:8px">
        {{ brandFirst }}<span class="logo-accent">{{ brandLast }}</span>
      </div>
      <div v-if="form" style="margin-top:12px">
        <h1 style="font-size:22px;font-weight:800;margin:0 0 8px">{{ campaign?.headline || form.title }}</h1>
        <p v-if="campaign?.subtext || form.description" style="color:var(--text-secondary);font-size:14px;margin:0">
          {{ campaign?.subtext || form.description }}
        </p>
      </div>
    </div>

    <!-- FORMULAR -->
    <div style="max-width:560px;width:100%;margin:0 auto;padding:56px 24px 56px">


      <div v-if="form && !submitted" class="card">
        <div class="card-body" style="display:flex;flex-direction:column;gap:14px">
          <template v-for="field in form.fields" :key="field.id">
            <div class="auth-field">
              <label>{{ field.label }}<span v-if="field.required" style="color:var(--danger)"> *</span></label>
              <textarea v-if="field.type === 'textarea'" v-model="formData[field.label]"
                :placeholder="field.placeholder || ''" rows="4"
                style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:8px;padding:10px 14px;font-size:14px;color:var(--text-primary);width:100%;outline:none;resize:vertical;font-family:inherit"></textarea>
              <select v-else-if="field.type === 'select'" v-model="formData[field.label]" class="form-select">
                <option value="">— bitte wählen —</option>
                <option v-for="opt in (field.options || [])" :key="opt" :value="opt">{{ opt }}</option>
              </select>
              <input v-else v-model="formData[field.label]"
                :type="field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'"
                :placeholder="field.placeholder || ''" />
            </div>
          </template>
          <button class="auth-btn" :disabled="sending"
            :style="campaign?.accentColor ? `background:${campaign.accentColor};border-color:${campaign.accentColor}` : ''"
            @click="submit">
            <span v-if="sending"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else>{{ form.submitLabel || 'Absenden' }}</span>
          </button>
        </div>
      </div>

      <div v-if="submitted" class="card" style="text-align:center;padding:48px">
        <i class="ti ti-circle-check" :style="`font-size:48px;color:${campaign?.accentColor || '#00D4B4'}`"></i>
        <h2 style="margin:16px 0 8px">{{ successMsg }}</h2>
        <p style="color:var(--text-muted)">Wir melden uns bald bei dir.</p>
      </div>

      <div v-if="!form && !loading" class="card" style="text-align:center;padding:48px">
        <i class="ti ti-file-off" style="font-size:48px;color:var(--text-muted)"></i>
        <h2 style="margin:16px 0 8px">Formular nicht gefunden</h2>
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

const { data, pending: loading } = await useFetch(useApiUrl(`/api/forms/${slug}`))
const form = computed(() => (data.value as any)?.form || null)

const { data: campData } = await useFetch(useApiUrl('/api/marketing'))
const campaign = computed(() => {
  const all = (campData.value as any)?.campaigns || []
  return all.find((c: any) =>
    c.slug === slug ||
    c.formId === (data.value as any)?.form?.formId ||
    c.utmCampaign === utmCampaign
  ) || null
})

const { branding, loadBranding } = useBranding()
const brandFirst = computed(() => branding.value.brandName.slice(0, -1))
const brandLast  = computed(() => branding.value.brandName.slice(-1))
onMounted(() => loadBranding())

const formData   = reactive<Record<string, string>>({})
const sending    = ref(false)
const submitted  = ref(false)
const successMsg = ref('Vielen Dank!')

async function submit() {
  sending.value = true
  try {
    const res = await $fetch(useApiUrl(`/api/forms/${slug}/submit`), {
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
