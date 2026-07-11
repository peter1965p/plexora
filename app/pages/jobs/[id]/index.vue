<template>
  <div v-if="customHtml" ref="customRoot" v-html="customHtml"></div>

  <div v-else :style="pageStyle" style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px">
    <div style="max-width:680px;width:100%">

      <!-- Header-Bild -->
      <div v-if="campaign?.headerImageUrl" style="border-radius:16px;overflow:hidden;margin-bottom:24px;height:200px">
        <img :src="campaign.headerImageUrl" style="width:100%;height:100%;object-fit:cover" alt="Header" />
      </div>

      <!-- Logo / Firmenname -->
      <div style="text-align:center;margin-bottom:40px">
        <div v-if="campaign?.logoUrl" style="margin-bottom:12px">
          <img :src="campaign.logoUrl" style="max-height:60px;max-width:200px;object-fit:contain" alt="Logo" />
        </div>
        <div v-else class="logo-text" style="font-size:28px;margin-bottom:8px">
          {{ campaign?.companyName || brandFirst }}<span :style="`color:${accentColor}`">{{ campaign?.companyName ? '' : brandLast }}</span>
        </div>
        <div v-if="campaign?.companyName && !campaign?.logoUrl" style="font-size:20px;font-weight:700;color:var(--text-primary)">
          {{ campaign.companyName }}
        </div>
        <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.1em;margin-top:4px">Karriere</div>
      </div>

      <div v-if="campaign" class="card" style="margin-bottom:16px">
        <div class="card-body" style="padding:32px">
          <div style="display:flex;align-items:start;justify-content:space-between;margin-bottom:24px">
            <div>
              <h1 style="font-size:24px;font-weight:800;margin:0 0 8px">{{ campaign.title }}</h1>
              <div style="display:flex;gap:12px;flex-wrap:wrap">
                <span class="badge badge-info"><i class="ti ti-building"></i> {{ campaign.department }}</span>
                <span class="badge badge-info"><i class="ti ti-map-pin"></i> {{ campaign.location }}</span>
                <span class="badge badge-success"><i class="ti ti-clock"></i> {{ typeLabel[campaign.type] || campaign.type }}</span>
              </div>
            </div>
          </div>
          <div style="font-size:14px;color:var(--text-secondary);line-height:1.7;white-space:pre-wrap">{{ campaign.description }}</div>
          <div v-if="campaign.requirements" style="margin-top:24px">
            <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Anforderungen</div>
            <div style="font-size:14px;color:var(--text-secondary);line-height:1.7;white-space:pre-wrap">{{ campaign.requirements }}</div>
          </div>
        </div>
      </div>

      <!-- Bewerbungsformular -->
      <div v-if="!submitted" class="card">
        <div class="card-header"><span class="card-title">Jetzt bewerben</span></div>
        <div class="modal-body">
          <div class="auth-row">
            <div class="auth-field"><label>Vorname</label><input v-model="form.firstName" placeholder="Max" /></div>
            <div class="auth-field"><label>Nachname</label><input v-model="form.lastName" placeholder="Mustermann" /></div>
          </div>
          <div class="auth-row">
            <div class="auth-field"><label>E-Mail</label><input v-model="form.email" placeholder="max@email.de" /></div>
            <div class="auth-field"><label>Telefon</label><input v-model="form.phone" placeholder="+49 89 123456" /></div>
          </div>
          <div class="auth-field">
            <label>Motivationsschreiben</label>
            <textarea v-model="form.message" placeholder="Warum möchten Sie bei uns arbeiten?" rows="5"
              style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:8px;padding:10px 14px;font-size:14px;color:var(--text-primary);width:100%;outline:none;resize:vertical;font-family:inherit"></textarea>
          </div>
          <button class="auth-btn" :disabled="sending" @click="apply"
            :style="accentColor ? `background:${accentColor}` : ''">
            <span v-if="sending"><i class="ti ti-loader-2 spin"></i> Wird gesendet...</span>
            <span v-else><i class="ti ti-send"></i> Bewerbung absenden</span>
          </button>
        </div>
      </div>

      <!-- Erfolg -->
      <div v-if="submitted" class="card" style="text-align:center;padding:48px">
        <i class="ti ti-circle-check" :style="`font-size:48px;color:${accentColor || '#00D4B4'}`"></i>
        <h2 style="margin:16px 0 8px">Bewerbung eingegangen!</h2>
        <p style="color:var(--text-muted)">Wir haben Ihre Bewerbung erhalten und melden uns bald bei Ihnen.</p>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { buildJobTemplateDataClient, renderCampaignHtmlClient } from '~/utils/campaignTemplateClient'

definePageMeta({ layout: 'default' })

const route      = useRoute()
const campaignId = route.params.id as string

const { data } = await useFetch(`/api/jobs/${campaignId}`)
const campaign = computed(() => (data.value as any)?.campaign)

const { branding } = useBranding()
watchEffect(() => { if ((data.value as any)?.branding) Object.assign(branding.value, (data.value as any).branding) })
const brandFirst = computed(() => branding.value.brandName.slice(0, -1))
const brandLast  = computed(() => branding.value.brandName.slice(-1))

const accentColor = computed(() => campaign.value?.accentColor || '')

const pageStyle = computed(() => {
  if (!accentColor.value) return {}
  return {
    '--accent': accentColor.value,
    '--accent-rgb': accentColor.value.replace('#', '').match(/.{2}/g)
      ?.map((h: string) => parseInt(h, 16)).join(', ') || '234, 88, 12',
  }
})

const typeLabel: Record<string, string> = {
  fulltime: 'Vollzeit', parttime: 'Teilzeit',
  internship: 'Praktikum', freelance: 'Freelance',
}

const form = reactive({ firstName: '', lastName: '', email: '', phone: '', message: '' })
const sending   = ref(false)
const submitted = ref(false)

async function apply() {
  if (!form.firstName || !form.email) return
  sending.value = true
  try {
    await $fetch(`/api/jobs/${campaignId}/apply`, { method: 'POST', body: { ...form } })
    submitted.value = true
  } finally {
    sending.value = false
  }
}

// ── Freigestalt-Template (customTemplateHtml) ──
// Wird per v-html eingefügt, dadurch gehen Vue-Events/Reactivity verloren — das
// vorgerenderte Bewerbungsformular (feste IDs aus server/utils/campaignTemplate.ts) wird
// darum nach dem Rendern per Vanilla-JS verdrahtet, statt Vue-Bindings zu erwarten.
const customHtml = computed(() => {
  if (!campaign.value?.customTemplateHtml) return null
  const data = buildJobTemplateDataClient(campaign.value, branding.value)
  return renderCampaignHtmlClient(campaign.value.customTemplateHtml, data)
})
const customRoot = ref<HTMLElement | null>(null)

async function submitCustomJobForm(formEl: HTMLFormElement) {
  const inputsEl  = formEl.querySelector('.plx-form-inputs') as HTMLElement | null
  const successEl = formEl.querySelector('#plx-job-form-success') as HTMLElement | null
  const errorEl   = formEl.querySelector('#plx-job-form-error') as HTMLElement | null
  const submitBtn = formEl.querySelector('button[type="submit"]') as HTMLButtonElement | null
  if (errorEl) errorEl.style.display = 'none'
  if (submitBtn) submitBtn.disabled = true
  try {
    const fd = new FormData(formEl)
    const body: Record<string, string> = {}
    fd.forEach((v, k) => { body[k] = String(v) })
    if (!body.firstName || !body.email) throw new Error('Pflichtfelder fehlen')
    await $fetch(`/api/jobs/${campaignId}/apply`, { method: 'POST', body })
    if (inputsEl) inputsEl.style.display = 'none'
    if (successEl) { successEl.textContent = 'Bewerbung eingegangen! Wir melden uns bald bei Ihnen.'; successEl.style.display = 'block' }
  } catch {
    if (errorEl) { errorEl.textContent = 'Da ist etwas schiefgelaufen. Bitte versuche es erneut.'; errorEl.style.display = 'block' }
  } finally {
    if (submitBtn) submitBtn.disabled = false
  }
}

function wireCustomJobForm() {
  const formEl = customRoot.value?.querySelector('#plx-job-form') as HTMLFormElement | null
  if (!formEl || (formEl as any)._plxWired) return
  ;(formEl as any)._plxWired = true
  formEl.addEventListener('submit', (e) => { e.preventDefault(); submitCustomJobForm(formEl) })
}

watch(customHtml, () => { nextTick(wireCustomJobForm) }, { immediate: true })
</script>
