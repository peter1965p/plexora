<template>
  <div style="max-width:720px">
    <div class="topbar-title" style="margin-bottom:20px">Mein Konto</div>

    <!-- PROFIL / AVATAR -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-user-circle" style="margin-right:8px;color:var(--accent)"></i>Profil</span>
        <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" :disabled="saving" @click="saveProfile">
          <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
          <span v-else><i class="ti ti-device-floppy"></i> Speichern</span>
        </button>
      </div>
      <div class="card-body" style="display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap">
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
          <div style="position:relative">
            <img v-if="avatarUrl" :src="avatarUrl" style="width:88px;height:88px;border-radius:50%;object-fit:cover" referrerpolicy="no-referrer" />
            <div v-else class="avatar" style="width:88px;height:88px;font-size:28px">{{ initials }}</div>
            <label style="position:absolute;bottom:0;right:0;width:28px;height:28px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;cursor:pointer;border:2px solid var(--bg-surface)">
              <i class="ti" :class="avatarUploading ? 'ti-loader-2 spin' : 'ti-camera'" style="color:#fff;font-size:14px"></i>
              <input type="file" accept="image/*" style="display:none" :disabled="avatarUploading" @change="uploadAvatar" />
            </label>
          </div>
          <span style="font-size:11px;color:var(--text-muted)">Bild ändern</span>
        </div>
        <div style="flex:1;min-width:240px;display:flex;flex-direction:column;gap:14px">
          <div class="auth-field">
            <label>Name</label>
            <input v-model="profileForm.name" placeholder="Dein Name" />
          </div>
          <div class="auth-field">
            <label>E-Mail</label>
            <input :value="userEmail" disabled style="opacity:.6;cursor:not-allowed" />
          </div>
          <div class="auth-field">
            <label>Rolle</label>
            <input :value="userRole" disabled style="opacity:.6;cursor:not-allowed" />
          </div>
        </div>
      </div>
    </div>

    <!-- SICHERHEIT -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-shield-lock" style="margin-right:8px;color:var(--accent)"></i>Sicherheit</span>
      </div>
      <div class="card-body" style="display:flex;flex-direction:column;gap:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:10px">
          <div style="display:flex;align-items:center;gap:10px">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.09-1.8 2.73v2.27h2.91c1.7-1.57 2.69-3.87 2.69-6.64z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.91-2.27c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.34C2.44 15.98 5.48 18 9 18z"/>
              <path fill="#FBBC05" d="M3.96 10.7A5.4 5.4 0 013.68 9c0-.59.1-1.17.28-1.7V4.96H.96A9 9 0 000 9c0 1.45.35 2.83.96 4.04l3-2.34z"/>
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l3 2.34C4.67 5.16 6.66 3.58 9 3.58z"/>
            </svg>
            <span style="font-size:13px;font-weight:600">Google-Konto</span>
          </div>
          <span v-if="googleLinked" style="padding:4px 12px;background:#22c55e18;border:1px solid #22c55e44;border-radius:20px;font-size:11px;font-weight:600;color:#22c55e">
            <i class="ti ti-check"></i> Verbunden
          </span>
          <span v-else style="font-size:12px;color:var(--text-muted)">Nicht verbunden</span>
        </div>

        <div>
          <div class="settings-label" style="margin-bottom:10px">Passwort ändern</div>
          <div v-if="pwError" class="auth-error" style="margin-bottom:10px"><i class="ti ti-alert-circle"></i> {{ pwError }}</div>
          <div v-if="pwSuccess" style="font-size:12px;color:#22c55e;margin-bottom:10px"><i class="ti ti-circle-check"></i> Passwort geändert!</div>
          <div style="display:flex;flex-direction:column;gap:10px;max-width:340px">
            <div class="auth-field">
              <label>Aktuelles Passwort</label>
              <input v-model="pwForm.oldPassword" type="password" placeholder="••••••••" />
            </div>
            <div class="auth-field">
              <label>Neues Passwort</label>
              <input v-model="pwForm.newPassword" type="password" placeholder="••••••••" />
            </div>
            <div class="auth-field">
              <label>Neues Passwort bestätigen</label>
              <input v-model="pwForm.confirmPassword" type="password" placeholder="••••••••" />
            </div>
            <button class="accent-btn" style="height:32px;font-size:12px" :disabled="pwSaving" @click="changePassword">
              <span v-if="pwSaving"><i class="ti ti-loader-2 spin"></i></span>
              <span v-else>Passwort ändern</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <PasskeyManager style="margin-bottom:16px" />

    <!-- ABRECHNUNG -->
    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-credit-card" style="margin-right:8px;color:var(--accent)"></i>Abrechnung</span>
      </div>
      <div class="card-body">
        <div v-if="store.license" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
          <div style="flex:1;min-width:160px">
            <div style="font-size:20px;font-weight:800">{{ TIER_LABELS[store.license.tier] || store.license.tier }}</div>
            <div style="font-size:13px;color:var(--text-muted);margin-top:2px">{{ TIER_PRICES[store.license.tier] ? `€${TIER_PRICES[store.license.tier]}/Monat` : '' }}</div>
          </div>
          <button class="accent-btn" style="height:32px;font-size:12px" @click="navigateTo('/settings?tab=billing')">
            <i class="ti ti-external-link" style="margin-right:4px"></i> Abrechnung verwalten
          </button>
        </div>
        <div v-else style="color:var(--text-muted);font-size:13px">Keine aktive Lizenz gefunden.</div>
      </div>
    </div>

    <div v-if="toast" :style="toastErr ? 'position:fixed;bottom:28px;right:28px;z-index:9999;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px;box-shadow:0 4px 20px rgba(0,0,0,0.3);background:#E05C5C;color:#fff' : 'position:fixed;bottom:28px;right:28px;z-index:9999;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px;box-shadow:0 4px 20px rgba(0,0,0,0.3);background:#00C853;color:#fff'">
      <i class="ti" :class="toastErr ? 'ti-alert-circle' : 'ti-circle-check'"></i>
      {{ toast }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { getCurrentUser, updatePassword } from 'aws-amplify/auth'
import { useAppStore } from '~/stores/app'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const store = useAppStore()

const TIER_LABELS: Record<string, string> = { starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' }
const TIER_PRICES: Record<string, number>  = { starter: 49, pro: 149, enterprise: 299 }

const userEmail = ref('–')
const userRole  = ref('–')
const initials  = ref('U')

const profileForm = reactive({ name: '' })
const avatarUrl = ref('')
const avatarUploading = ref(false)
const saving = ref(false)
const googleLinked = ref(false)

const pwForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
const pwSaving = ref(false)
const pwError = ref('')
const pwSuccess = ref(false)

const toast = ref('')
const toastErr = ref(false)
function showToast(msg: string, isError = false) {
  toast.value = msg
  toastErr.value = isError
  setTimeout(() => toast.value = '', 2800)
}

async function loadProfile() {
  try {
    const { useAuthHeader } = await import('~/composables/useAuth')
    const res = await $fetch(useApiUrl('/api/settings/account'), { headers: await useAuthHeader() }) as any
    profileForm.name = res?.profile?.name || ''
    if (res?.profile?.avatarUrl) avatarUrl.value = res.profile.avatarUrl
    googleLinked.value = !!res?.googleLinked
  } catch {}
}

onMounted(async () => {
  try {
    const user = await getCurrentUser()
    userEmail.value = user.signInDetails?.loginId || user.username || '–'
    initials.value = userEmail.value.slice(0, 2).toUpperCase()

    const { useAuthUser } = await import('~/composables/useAuth')
    const authUser = await useAuthUser()
    userRole.value = authUser.role === 'admins' ? 'Administrator' : 'Kunde'

    if (!avatarUrl.value) {
      const { fetchAuthSession } = await import('aws-amplify/auth')
      const session = await fetchAuthSession()
      const picture = session.tokens?.idToken?.payload?.picture as string | undefined
      if (picture) avatarUrl.value = picture
    }
  } catch {}

  await loadProfile()
})

async function saveProfile() {
  saving.value = true
  try {
    const { useAuthHeader } = await import('~/composables/useAuth')
    await $fetch(useApiUrl('/api/settings/account'), {
      method: 'POST',
      headers: await useAuthHeader(),
      body: { name: profileForm.name },
    })
    showToast('Profil gespeichert!')
  } catch (e: any) {
    showToast('Fehler: ' + (e?.data?.message || e?.message || 'Speichern fehlgeschlagen'), true)
  } finally {
    saving.value = false
  }
}

async function uploadAvatar(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  avatarUploading.value = true
  try {
    const reader = new FileReader()
    const fileBase64 = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`
    const { useAuthHeader } = await import('~/composables/useAuth')
    const authHeader = await useAuthHeader()
    const res = await $fetch(useApiUrl('/api/aws/s3-upload'), {
      method: 'POST',
      headers: authHeader,
      body: { fileBase64, fileName: uniqueName, prefix: 'avatars/' },
    }) as any
    if (res?.url) {
      avatarUrl.value = res.url
      await $fetch(useApiUrl('/api/settings/account'), {
        method: 'POST',
        headers: authHeader,
        body: { avatarUrl: res.url },
      })
      showToast('Profilbild gespeichert!')
    }
  } catch (err: any) {
    showToast('Upload fehlgeschlagen: ' + (err?.message || ''), true)
  } finally {
    avatarUploading.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}

async function changePassword() {
  pwError.value = ''
  pwSuccess.value = false
  if (!pwForm.oldPassword || !pwForm.newPassword) {
    pwError.value = 'Bitte beide Passwortfelder ausfüllen'
    return
  }
  if (pwForm.newPassword !== pwForm.confirmPassword) {
    pwError.value = 'Neue Passwörter stimmen nicht überein'
    return
  }
  pwSaving.value = true
  try {
    await updatePassword({ oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword })
    pwSuccess.value = true
    pwForm.oldPassword = ''
    pwForm.newPassword = ''
    pwForm.confirmPassword = ''
  } catch (e: any) {
    pwError.value = e.message || 'Passwort konnte nicht geändert werden'
  } finally {
    pwSaving.value = false
  }
}
</script>
