<template>
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg-base)">
    <div style="width:100%;max-width:440px;padding:40px;background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;text-align:center">

      <div style="width:64px;height:64px;border-radius:50%;background:var(--accent)22;display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
        <i class="ti ti-users" style="font-size:28px;color:var(--accent)"></i>
      </div>

      <!-- Loading -->
      <template v-if="state === 'loading'">
        <i class="ti ti-loader-2 spin" style="font-size:24px;color:var(--accent)"></i>
        <p style="color:var(--text-muted);margin-top:12px">Einladung wird geprüft...</p>
      </template>

      <!-- Error -->
      <template v-else-if="state === 'error'">
        <h2 style="margin-bottom:8px">Einladung ungültig</h2>
        <p style="color:var(--text-muted);margin-bottom:24px">{{ errorMsg }}</p>
        <NuxtLink to="/dashboard" class="accent-btn">Zum Dashboard</NuxtLink>
      </template>

      <!-- Not logged in -->
      <template v-else-if="state === 'login'">
        <h2 style="margin-bottom:8px">Du wurdest eingeladen!</h2>
        <p style="color:var(--text-muted);margin-bottom:24px">Melde dich an oder registriere dich, um der Einladung beizutreten.</p>
        <NuxtLink to="/login" class="accent-btn" style="display:inline-block">Anmelden / Registrieren</NuxtLink>
      </template>

      <!-- Accept -->
      <template v-else-if="state === 'accept'">
        <h2 style="margin-bottom:8px">Einladung annehmen</h2>
        <p style="color:var(--text-muted);margin-bottom:8px">
          <strong>{{ preview.inviter }}</strong> lädt dich in sein Team ein ({{ preview.role === 'admin' ? 'Admin' : 'Mitglied' }}).
        </p>
        <p style="color:var(--text-muted);margin-bottom:8px;font-size:13px">
          Du hast danach Zugriff auf alle geteilten Daten dieses Kontos. Angemeldet als <strong>{{ userEmail }}</strong>.
          <template v-if="preview.expiresAt"> Die Einladung gilt bis {{ new Date(preview.expiresAt).toLocaleDateString('de-DE') }}.</template>
        </p>
        <p style="color:var(--text-muted);margin-bottom:24px;font-size:12px">Nicht du? Dann melde dich ab und nimm die Einladung nicht an.</p>
        <button class="accent-btn" :disabled="accepting" @click="acceptInvite">
          <i class="ti" :class="accepting ? 'ti-loader-2 spin' : 'ti-check'"></i>
          {{ accepting ? 'Wird verarbeitet...' : 'Einladung annehmen' }}
        </button>
      </template>

      <!-- Success -->
      <template v-else-if="state === 'success'">
        <div style="width:48px;height:48px;border-radius:50%;background:#00C85322;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
          <i class="ti ti-check" style="font-size:24px;color:#00C853"></i>
        </div>
        <h2 style="margin-bottom:8px">Willkommen im Team!</h2>
        <p style="color:var(--text-muted);margin-bottom:24px">Du hast die Einladung angenommen.</p>
        <NuxtLink to="/dashboard" class="accent-btn">Zum Dashboard</NuxtLink>
      </template>

    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const token = route.query.token as string

type State = 'loading' | 'login' | 'accept' | 'accepting' | 'success' | 'error'
const state     = ref<State>('loading')
const errorMsg  = ref('')
const accepting = ref(false)
const userEmail = ref('')

const preview = ref<{ inviter: string; role: string; expiresAt: string | null }>({ inviter: '', role: 'member', expiresAt: null })

// Die Annahme braucht eine Anmeldung mit der eingeladenen Adresse. Die Vorschau sagt vorher, ob es klappen kann (abgelaufen, eigener Arbeitsbereich, falsche Adresse).
onMounted(async () => {
  if (!token) { errorMsg.value = 'Kein Token gefunden.'; state.value = 'error'; return }

  try {
    const { useAuthUser, useAuthHeader } = await import('~/composables/useAuth')
    const u = await useAuthUser()
    if (!u.email) { state.value = 'login'; return }
    userEmail.value = u.email
    try {
      const p = await $fetch<any>(useApiUrl('/api/team/invite-preview'), { method: 'POST', headers: await useAuthHeader(), body: { token } })
      if (p.expired) { errorMsg.value = 'Die Einladung ist abgelaufen (7 Tage gültig). Bitte lass dir eine neue schicken.'; state.value = 'error'; return }
      if (p.hasOwnWorkspace) { errorMsg.value = 'Mit dieser E-Mail-Adresse nutzt du Plexora bereits mit eigenen Daten. Eine Einladung würde deinen Arbeitsbereich ersetzen. Bitte nimm die Einladung mit einer anderen E-Mail-Adresse an oder bitte um eine Einladung an eine neue Adresse.'; state.value = 'error'; return }
      if (!p.emailVerified) { errorMsg.value = 'Deine E-Mail-Adresse ist noch nicht bestätigt. Bitte bestätige sie und versuche es erneut.'; state.value = 'error'; return }
      preview.value = { inviter: p.inviter, role: p.role, expiresAt: p.expiresAt }
      state.value = 'accept'
    } catch (e: any) {
      errorMsg.value = e?.data?.message || 'Die Einladung konnte nicht geprüft werden.'
      state.value = 'error'
    }
  } catch {
    state.value = 'login'
  }
})

async function acceptInvite() {
  accepting.value = true
  try {
    const { useAuthHeader } = await import('~/composables/useAuth')
    // Die Adresse kommt serverseitig aus der Anmeldung; gesendet wird nur der Einladungs-Token
    await $fetch(useApiUrl('/api/team/accept'), { method: 'POST', headers: await useAuthHeader(), body: { token } })
    state.value = 'success'
  } catch (e: any) {
    errorMsg.value = e?.data?.message || 'Fehler beim Annehmen der Einladung.'
    state.value = 'error'
  } finally {
    accepting.value = false
  }
}
</script>
