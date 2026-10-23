<template>
  <div class="auth-wrap">
    <LangFlags />
    <div class="auth-card">
      <div class="auth-logo">Plexo<span>ra</span></div>
      <div class="auth-title">{{ tr('Passwort festlegen') }}</div>
      <div class="auth-sub">{{ done ? tr('Fertig') : (hasToken ? tr('Wähle ein sicheres Passwort für dein Konto') : tr('Link ungültig oder abgelaufen')) }}</div>

      <div v-if="error" class="auth-error"><i class="ti ti-alert-circle"></i> {{ error }}</div>

      <!-- 1) Passwort festlegen -->
      <div v-if="hasToken && !done" class="auth-form">
        <div class="auth-field">
          <label>{{ tr('Neues Passwort') }}</label>
          <div class="auth-pw-wrap">
            <input v-model="password" :type="showPw ? 'text' : 'password'" autocomplete="new-password" :placeholder="tr('mindestens 12 Zeichen')" @keyup.enter="submit" />
            <button class="auth-pw-toggle" type="button" @click="showPw = !showPw"><i class="ti" :class="showPw ? 'ti-eye-off' : 'ti-eye'"></i></button>
          </div>
          <div v-if="password" style="font-size:12px;margin-top:6px" :style="{ color: problem ? '#E05C5C' : '#16a34a' }">{{ problem || tr('Das Passwort erfüllt alle Regeln.') }}</div>
        </div>
        <div class="auth-field">
          <label>{{ tr('Passwort wiederholen') }}</label>
          <input v-model="confirm" :type="showPw ? 'text' : 'password'" autocomplete="new-password" :placeholder="tr('Passwort wiederholen')" @keyup.enter="submit" />
        </div>
        <button class="auth-btn" :disabled="loading" @click="submit">
          <span v-if="loading"><i class="ti ti-loader-2 spin"></i></span><span v-else>{{ tr('Passwort festlegen') }}</span>
        </button>
      </div>

      <!-- 2) fertig -->
      <div v-else-if="done" class="auth-info"><i class="ti ti-circle-check"></i> {{ tr('Dein Passwort ist festgelegt. Du kannst dich jetzt anmelden.') }}</div>
      <div v-if="done" class="auth-switch"><NuxtLink to="/login">{{ tr('Jetzt anmelden →') }}</NuxtLink></div>

      <!-- 3) Link ungültig oder abgelaufen: neuen anfordern -->
      <div v-if="!hasToken && !done" class="auth-form">
        <div v-if="!requested" style="font-size:13px;line-height:1.5;color:var(--text-muted);margin-bottom:12px">
          {{ tr('Links zum Festlegen des Passworts gelten 60 Minuten und nur einmal. Gib die E-Mail-Adresse deines Kontos ein, dann schicken wir dir einen neuen Link.') }}
        </div>
        <div v-if="!requested" class="auth-field">
          <label>{{ tr('E-Mail') }}</label>
          <input v-model="email" type="email" autocomplete="email" :placeholder="tr('name@firma.de')" @keyup.enter="requestLink" />
        </div>
        <button v-if="!requested" class="auth-btn" :disabled="loading || !email" @click="requestLink">
          <span v-if="loading"><i class="ti ti-loader-2 spin"></i></span><span v-else>{{ tr('Neuen Link anfordern') }}</span>
        </button>
        <div v-else class="auth-info"><i class="ti ti-mail"></i> {{ requestedMessage }}</div>
      </div>

      <div v-if="!done" class="auth-switch"><NuxtLink to="/login">{{ tr('← Zurück zum Login') }}</NuxtLink></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { passwordProblem } from '~~/shared/passwordRules'

// Passwort per Einmal-Link festlegen (Link aus der Willkommensmail nach dem Kauf). Das Token steht im Fragment (#t=…): es geht nie an einen Server
// und nie als Referrer weiter; die Seite liest es und entfernt es sofort aus der Adresszeile.
definePageMeta({ layout: 'default' })

const token = ref('')
const hasToken = computed(() => !!token.value)
const password = ref(''), confirm = ref(''), showPw = ref(false)
const loading = ref(false), error = ref(''), done = ref(false)
const email = ref(''), requested = ref(false), requestedMessage = ref('')
const problem = computed(() => passwordProblem(password.value))

onMounted(() => {
  const m = /(?:^|[#&])t=([A-Za-z0-9_-]{43})(?:&|$)/.exec(window.location.hash)
  if (m) token.value = m[1]
  else error.value = tr('Dieser Link ist unvollständig oder abgelaufen.')
  if (window.location.hash) window.history.replaceState(null, '', window.location.pathname)
})

const errOf = (e: any, fallback: string) => String(e?.data?.message || e?.data?.statusMessage || fallback)
async function submit() {
  error.value = ''
  if (problem.value) { error.value = problem.value; return }
  if (password.value !== confirm.value) { error.value = tr('Die beiden Passwörter stimmen nicht überein.'); return }
  loading.value = true
  try {
    await $fetch(useApiUrl('/api/auth/set-password'), { method: 'POST', body: { token: token.value, password: password.value } })
    password.value = ''; confirm.value = ''; token.value = ''; done.value = true
  } catch (e: any) {
    const code = e?.data?.data?.code
    error.value = errOf(e, tr('Das Passwort konnte nicht gesetzt werden.'))
    if (code === 'LINK_INVALID' || code === 'ALREADY_SET') { token.value = ''; password.value = ''; confirm.value = '' }   // Link verbraucht oder abgelaufen: neuen anfordern
  } finally { loading.value = false }
}
async function requestLink() {
  error.value = ''; loading.value = true
  try {
    const r: any = await $fetch(useApiUrl('/api/auth/request-set-password'), { method: 'POST', body: { email: email.value } })
    requestedMessage.value = String(r?.message || tr('Falls auf diese Adresse ein Konto wartet, ist eine E-Mail unterwegs.')); requested.value = true
  } catch (e: any) { error.value = errOf(e, tr('Das hat gerade nicht geklappt. Bitte versuche es gleich noch einmal.')) }
  finally { loading.value = false }
}
</script>
