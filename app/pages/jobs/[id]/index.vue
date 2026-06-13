<template>
  <div style="min-height:100vh;background:var(--bg-base);display:flex;align-items:center;justify-content:center;padding:24px">
    <div style="max-width:680px;width:100%">

      <!-- Header -->
      <div style="text-align:center;margin-bottom:40px">
        <div class="logo-text" style="font-size:28px;margin-bottom:8px">
          {{ brandFirst }}<span class="logo-accent">{{ brandLast }}</span>
        </div>
        <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.1em">Karriere</div>
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
          <button class="auth-btn" :disabled="sending" @click="apply">
            <span v-if="sending"><i class="ti ti-loader-2 spin"></i> Wird gesendet...</span>
            <span v-else><i class="ti ti-send"></i> Bewerbung absenden</span>
          </button>
        </div>
      </div>

      <!-- Erfolg -->
      <div v-if="submitted" class="card" style="text-align:center;padding:48px">
        <i class="ti ti-circle-check" style="font-size:48px;color:#00D4B4"></i>
        <h2 style="margin:16px 0 8px">Bewerbung eingegangen!</h2>
        <p style="color:var(--text-muted)">Wir haben Ihre Bewerbung erhalten und melden uns bald bei Ihnen.</p>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const route      = useRoute()
const campaignId = route.params.id as string

const typeLabel: Record<string, string> = {
  fulltime:  'Vollzeit',
  parttime:  'Teilzeit',
  internship:'Praktikum',
  freelance: 'Freelance',
}

const { data } = await useFetch(`/api/jobs/${campaignId}`)
const campaign = computed(() => (data.value as any)?.campaign)

const { branding, loadBranding } = useBranding()
const brandFirst = computed(() => branding.value.brandName.slice(0, -1))
const brandLast  = computed(() => branding.value.brandName.slice(-1))
onMounted(() => loadBranding())

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
</script>
