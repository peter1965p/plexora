<template>
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg-base)">
    <LangFlags />
    <div style="width:100%;max-width:460px;padding:40px;background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;text-align:center">

      <div style="width:64px;height:64px;border-radius:50%;background:var(--accent)22;display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
        <i class="ti ti-users" style="font-size:28px;color:var(--accent)"></i>
      </div>

      <!-- Laden -->
      <template v-if="state === 'loading'">
        <i class="ti ti-loader-2 spin" style="font-size:24px;color:var(--accent)"></i>
        <p style="color:var(--text-muted);margin-top:12px">{{ tr('Einladung wird geprüft...') }}</p>
      </template>

      <!-- Fehler -->
      <template v-else-if="state === 'error'">
        <h2 style="margin-bottom:8px">{{ tr('Einladung nicht möglich') }}</h2>
        <p style="color:var(--text-muted);margin-bottom:24px">{{ errorMsg }}</p>
        <NuxtLink to="/dashboard" class="accent-btn">{{ tr('Zum Dashboard') }}</NuxtLink>
      </template>

      <!-- Nicht angemeldet: Konto wählen -->
      <template v-else-if="state === 'view' && view.view === 'login'">
        <h2 style="margin-bottom:8px">{{ tr('Du wurdest eingeladen!') }}</h2>
        <p style="color:var(--text-muted);margin-bottom:20px">{{ tr('Melde dich mit') }} <strong>{{ tr('der Adresse an, an die die Einladung geschickt wurde') }}</strong>{{ tr(', um beizutreten.') }}</p>
        <div style="display:flex;flex-direction:column;gap:10px;align-items:stretch">
          <button class="accent-btn" :disabled="busy" @click="googleSignIn"><i class="ti ti-brand-google"></i> {{ tr('Mit Google anmelden (Konto auswählen)') }}</button>
          <button class="btn-secondary" :disabled="busy" @click="passwordLogin"><i class="ti ti-mail"></i> {{ tr('Mit E-Mail und Passwort anmelden oder registrieren') }}</button>
        </div>
        <p style="color:var(--text-muted);font-size:12px;margin-top:16px">{{ tr('Bei Google wirst du immer gefragt, welches Konto verwendet werden soll.') }}</p>
      </template>

      <!-- Falsches Konto -->
      <template v-else-if="state === 'view' && view.view === 'mismatch'">
        <div style="width:48px;height:48px;border-radius:50%;background:#f59e0b22;display:flex;align-items:center;justify-content:center;margin:-8px auto 14px"><i class="ti ti-alert-triangle" style="font-size:24px;color:#f59e0b"></i></div>
        <h2 style="margin-bottom:10px">{{ tr('Falsches Konto') }}</h2>
        <p style="margin-bottom:18px;line-height:1.5">{{ tr('Diese Einladung gilt für') }} <strong>{{ view.invitedEmail }}</strong>{{ tr(', du bist als') }} <strong>{{ view.signedInAs }}</strong> {{ tr('angemeldet.') }}</p>
        <button class="accent-btn" :disabled="busy" @click="switchAccount"><i class="ti ti-logout"></i> {{ tr('Abmelden und mit dem richtigen Konto fortfahren') }}</button>
        <p style="color:var(--text-muted);font-size:12px;margin-top:14px">{{ tr('Danach kommst du hierher zurück und kannst bei Google das passende Konto wählen.') }}</p>
      </template>

      <template v-else-if="state === 'view' && view.view === 'expired'">
        <h2 style="margin-bottom:8px">{{ tr('Einladung abgelaufen') }}</h2>
        <p style="color:var(--text-muted);margin-bottom:24px">{{ tr('Diese Einladung war 7 Tage gültig. Bitte lass dir eine neue schicken.') }}</p>
        <NuxtLink to="/dashboard" class="accent-btn">{{ tr('Zum Dashboard') }}</NuxtLink>
      </template>
      <template v-else-if="state === 'view' && view.view === 'own-workspace'">
        <h2 style="margin-bottom:8px">{{ tr('Eigener Arbeitsbereich vorhanden') }}</h2>
        <p style="color:var(--text-muted);margin-bottom:24px">{{ tr('Mit dieser E-Mail-Adresse nutzt du Plexora bereits mit eigenen Daten. Eine Einladung würde deinen Arbeitsbereich ersetzen. Bitte nimm die Einladung mit einer anderen E-Mail-Adresse an oder bitte um eine Einladung an eine neue Adresse.') }}</p>
        <NuxtLink to="/dashboard" class="accent-btn">{{ tr('Zum Dashboard') }}</NuxtLink>
      </template>
      <template v-else-if="state === 'view' && view.view === 'unverified'">
        <h2 style="margin-bottom:8px">{{ tr('E-Mail-Adresse nicht bestätigt') }}</h2>
        <p style="color:var(--text-muted);margin-bottom:24px">{{ tr('Deine E-Mail-Adresse ist noch nicht bestätigt. Bitte bestätige sie und versuche es erneut.') }}</p>
      </template>

      <!-- Annehmen -->
      <template v-else-if="state === 'view' && view.view === 'accept'">
        <h2 style="margin-bottom:8px">{{ tr('Einladung annehmen') }}</h2>
        <p style="color:var(--text-muted);margin-bottom:8px"><strong>{{ preview.inviter }}</strong> {{ tr('lädt dich in sein Team ein (') }}{{ preview.role === 'admin' ? tr('Admin') : tr('Mitglied') }}).</p>
        <p style="color:var(--text-muted);margin-bottom:8px;font-size:13px">
          {{ tr('Du hast danach Zugriff auf alle geteilten Daten dieses Kontos. Angemeldet als') }} <strong>{{ userEmail }}</strong>.
          <template v-if="preview.expiresAt"> {{ tr('Die Einladung gilt bis') }} {{ new Date(preview.expiresAt).toLocaleDateString('de-DE') }}.</template>
        </p>
        <p style="color:var(--text-muted);margin-bottom:24px;font-size:12px">{{ tr('Nicht du?') }} <a href="#" style="color:var(--accent)" @click.prevent="switchAccount">{{ tr('Abmelden und anderes Konto wählen') }}</a>.</p>
        <button class="accent-btn" :disabled="accepting" @click="acceptInvite">
          <i class="ti" :class="accepting ? 'ti-loader-2 spin' : 'ti-check'"></i>
          {{ accepting ? tr('Wird verarbeitet...') : tr('Einladung annehmen') }}
        </button>
      </template>

      <!-- Erfolg -->
      <template v-else-if="state === 'success'">
        <div style="width:48px;height:48px;border-radius:50%;background:#00C85322;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
          <i class="ti ti-check" style="font-size:24px;color:#00C853"></i>
        </div>
        <h2 style="margin-bottom:8px">{{ tr('Willkommen im Team!') }}</h2>
        <p style="color:var(--text-muted);margin-bottom:24px">{{ tr('Du hast die Einladung angenommen.') }}</p>
        <NuxtLink to="/dashboard" class="accent-btn">{{ tr('Zum Dashboard') }}</NuxtLink>
      </template>

    </div>
  </div>
</template>

<script setup lang="ts">
import { decideInviteView, rememberInviteReturn, type InviteView } from '~/utils/inviteFlow'
definePageMeta({ layout: false })

const route = useRoute()
const token = route.query.token as string

const state = ref<'loading' | 'view' | 'success' | 'error'>('loading')
const view = ref<InviteView>({ view: 'login' })
const errorMsg = ref('')
const accepting = ref(false)
const busy = ref(false)
const userEmail = ref('')
const preview = ref<{ inviter: string; role: string; expiresAt: string | null }>({ inviter: '', role: 'member', expiresAt: null })
const returnPath = `/invite?token=${encodeURIComponent(token || '')}`

// Die Annahme braucht eine Anmeldung mit der eingeladenen Adresse. Die Vorschau sagt vorher, ob es klappen kann
// (falsches Konto, abgelaufen, eigener Arbeitsbereich, Adresse nicht bestätigt) – ohne dass etwas geändert wird.
onMounted(async () => {
  if (!token) { errorMsg.value = tr('Kein Token gefunden.'); state.value = 'error'; return }
  try {
    const { useAuthUser, useAuthHeader } = await import('~/composables/useAuth')
    const u = await useAuthUser()
    if (!u.email) { view.value = { view: 'login' }; state.value = 'view'; return }
    userEmail.value = u.email
    try {
      const p = await $fetch<any>(useApiUrl('/api/team/invite-preview'), { method: 'POST', headers: await useAuthHeader(), body: { token } })
      preview.value = { inviter: p.inviter, role: p.role, expiresAt: p.expiresAt }
      view.value = decideInviteView(u.email, p)
      state.value = 'view'
    } catch (e: any) { errorMsg.value = e?.data?.message || tr('Die Einladung konnte nicht geprüft werden.'); state.value = 'error' }
  } catch { view.value = { view: 'login' }; state.value = 'view' }
})

// Google: immer mit Kontenwähler (prompt=select_account), damit nicht stillschweigend ein anderes, im Browser angemeldetes Google-Konto verwendet wird.
// Der Einladungslink wird nur im Browser gemerkt (sessionStorage), er geht nie in die Anmelde-Adresse zu Cognito oder Google.
async function googleSignIn() {
  busy.value = true
  try {
    rememberInviteReturn(returnPath)
    const { signInWithRedirect } = await import('aws-amplify/auth')
    await signInWithRedirect({ provider: 'Google', options: { prompt: 'SELECT_ACCOUNT' } })
  } catch (e: any) { errorMsg.value = e?.message || 'Google-Anmeldung fehlgeschlagen.'; state.value = 'error'; busy.value = false }
}
function passwordLogin() { rememberInviteReturn(returnPath); navigateTo('/login') }
// Abmelden und mit dem richtigen Konto weitermachen. Die Rückkehr zur Einladung ist vorgemerkt (bei Google-Sitzungen führt das Abmelden über /login).
async function switchAccount() {
  busy.value = true
  try { rememberInviteReturn(returnPath); const { signOut } = await import('aws-amplify/auth'); await signOut() } catch {}
  userEmail.value = ''; view.value = { view: 'login' }; state.value = 'view'; busy.value = false
}

async function acceptInvite() {
  accepting.value = true
  try {
    const { useAuthHeader } = await import('~/composables/useAuth')
    // Die Adresse kommt serverseitig aus der Anmeldung; gesendet wird nur der Einladungs-Token
    await $fetch(useApiUrl('/api/team/accept'), { method: 'POST', headers: await useAuthHeader(), body: { token } })
    state.value = 'success'
  } catch (e: any) { errorMsg.value = e?.data?.message || tr('Fehler beim Annehmen der Einladung.'); state.value = 'error' }
  finally { accepting.value = false }
}
</script>
