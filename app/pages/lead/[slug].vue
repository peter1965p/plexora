<template>
  <div :style="`min-height:100vh;background:var(--bg-base);display:flex;align-items:center;justify-content:center;padding:24px`">
    <div style="max-width:560px;width:100%">

      <!-- Branding -->
      <div style="text-align:center;margin-bottom:40px">
        <div v-if="branding.logoUrl" style="margin-bottom:16px">
          <img :src="branding.logoUrl" style="max-height:60px;max-width:200px;object-fit:contain" />
        </div>
        <div v-else class="logo-text" style="font-size:28px;margin-bottom:8px">
          {{ brandFirst }}<span class="logo-accent">{{ brandLast }}</span>
        </div>
        <div v-if="form" style="margin-top:12px">
          <h1 style="font-size:22px;font-weight:800;margin:0 0 8px">{{ form.title }}</h1>
          <p v-if="form.description" style="color:var(--text-secondary);font-size:14px;margin:0">{{ form.description }}</p>
        </div>
      </div>

      <!-- Formular -->
      <div v-if="form && !submitted" class="card">
        <div class="card-body" style="display:flex;flex-direction:column;gap:14px">
          <template v-for="field in form.fields" :key="field.id">
            <div class="auth-field">
              <label>{{ field.label }}<span v-if="field.required" style="color:var(--danger)"> *</span></label>
              <textarea v-if="field.type === 'textarea'" v-model="formData[field.label]" :placeholder="field.placeholder || ''"
                rows="4" style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:8px;padding:10px 14px;font-size:14px;color:var(--text-primary);width:100%;outline:none;resize:vertical;font-family:inherit"></textarea>
              <select v-else-if="field.type === 'select'" v-model="formData[field.label]" class="form-select">
                <option value="">— bitte wählen —</option>
                <option v-for="opt in (field.options || [])" :key="opt" :value="opt">{{ opt }}</option>
              </select>
              <input v-else v-model="formData[field.label]"
                :type="field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'"
                :placeholder="field.placeholder || ''" />
            </div>
          </template>

          <button class="auth-btn" :disabled="sending" @click="submit">
            <span v-if="sending"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else>{{ form.submitLabel || 'Absenden' }}</span>
          </button>
        </div>
      </div>

      <!-- Erfolg -->
      <div v-if="submitted" class="card" style="text-align:center;padding:48px">
        <i class="ti ti-circle-check" style="font-size:48px;color:#00D4B4"></i>
        <h2 style="margin:16px 0 8px">{{ successMsg }}</h2>
        <p style="color:var(--text-muted)">Wir melden uns bald bei dir.</p>
      </div>

      <!-- Nicht gefunden -->
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

// UTM-Parameter aus URL
const utmSource   = route.query.utm_source   as string || ''
const utmMedium   = route.query.utm_medium   as string || ''
const utmCampaign = route.query.utm_campaign as string || ''
const utmContent  = route.query.utm_content  as string || ''
const utmTerm     = route.query.utm_term     as string || ''

const { data, pending: loading } = await useFetch(useApiUrl(`/api/forms/${slug}`))
const form = computed(() => (data.value as any)?.form || null)

const { branding, loadBranding } = useBranding()
const brandFirst = computed(() => branding.value.brandName.slice(0, -1))
const brandLast  = computed(() => branding.value.brandName.slice(-1))
onMounted(() => loadBranding())

const formData   = reactive<Record<string, string>>({})
const sending    = ref(false)
const submitted  = ref(false)
const successMsg = ref('Vielen Dank!')

async function submit() {
  // Required-Felder prüfen
  const missing = (form.value?.fields || []).filter((f: any) => f.required && !formData[f.label])
  if (missing.length) return

  sending.value = true
  try {
    const res = await $fetch(useApiUrl(`/api/forms/${slug}/submit`), {
      method: 'POST',
      body: {
        data: { ...formData },
        utmSource, utmMedium, utmCampaign, utmContent, utmTerm,
      }
    }) as any
    successMsg.value = res.message || 'Vielen Dank!'
    submitted.value  = true
  } finally {
    sending.value = false
  }
}
</script>
