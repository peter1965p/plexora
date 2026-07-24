<template>
  <div class="card">
    <div class="card-header">
      <span class="card-title"><i class="ti ti-fingerprint" style="margin-right:8px;color:var(--accent)"></i>Passkeys</span>
      <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" :disabled="disabled || passkeyBusy" @click="addPasskey">
        <span v-if="passkeyBusy"><i class="ti ti-loader-2 spin"></i></span>
        <span v-else><i class="ti ti-plus"></i> Passkey hinzufügen</span>
      </button>
    </div>
    <div class="card-body" style="display:flex;flex-direction:column;gap:12px">
      <p style="font-size:12px;color:var(--text-muted);margin:0">
        Mit einem Passkey meldest du dich ohne Passwort an — per Fingerabdruck, Gesichtserkennung oder Geräte-PIN. Passkeys werden von deinem Gerät oder Google-Konto sicher verwaltet.
      </p>
      <div v-if="passkeyError" class="auth-error"><i class="ti ti-alert-circle"></i> {{ passkeyError }}</div>
      <div v-if="passkeysLoading" style="font-size:13px;color:var(--text-muted)">
        <i class="ti ti-loader-2 spin"></i> Lade Passkeys …
      </div>
      <div v-else-if="!passkeys.length" style="font-size:13px;color:var(--text-muted)">
        Noch keine Passkeys registriert.
      </div>
      <div v-else style="display:flex;flex-direction:column;gap:8px">
        <div
          v-for="cred in passkeys"
          :key="cred.credentialId"
          style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:8px"
        >
          <div style="display:flex;align-items:center;gap:10px">
            <i class="ti ti-fingerprint" style="color:var(--accent);font-size:18px"></i>
            <div>
              <div style="font-size:13px;font-weight:600;color:var(--text-primary)">{{ cred.friendlyCredentialName || 'Passkey' }}</div>
              <div style="font-size:11px;color:var(--text-muted)">Registriert am {{ formatPasskeyDate(cred.createdAt) }}</div>
            </div>
          </div>
          <button class="auth-pw-toggle" style="color:#e05c5c" :disabled="disabled || passkeyBusy" @click="removePasskey(cred.credentialId)" title="Passkey entfernen">
            <i class="ti ti-trash"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ disabled?: boolean }>()

const passkeys = ref<any[]>([])
const passkeysLoading = ref(false)
const passkeyBusy = ref(false)
const passkeyError = ref('')

async function loadPasskeys() {
  passkeysLoading.value = true
  passkeyError.value = ''
  try {
    const { listWebAuthnCredentials } = await import('aws-amplify/auth')
    const res = await listWebAuthnCredentials()
    passkeys.value = res.credentials || []
  } catch (e: any) {
    passkeyError.value = e.message || 'Passkeys konnten nicht geladen werden'
  } finally {
    passkeysLoading.value = false
  }
}

async function addPasskey() {
  if (props.disabled) return
  passkeyBusy.value = true
  passkeyError.value = ''
  try {
    const { associateWebAuthnCredential } = await import('aws-amplify/auth')
    await associateWebAuthnCredential()
    await loadPasskeys()
  } catch (e: any) {
    passkeyError.value = e.name === 'NotAllowedError'
      ? 'Passkey-Registrierung abgebrochen'
      : (e.message || 'Passkey konnte nicht registriert werden')
  } finally {
    passkeyBusy.value = false
  }
}

async function removePasskey(credentialId: string) {
  if (props.disabled || !credentialId) return
  if (!confirm('Diesen Passkey wirklich entfernen? Er kann dann nicht mehr zum Anmelden genutzt werden.')) return
  passkeyBusy.value = true
  passkeyError.value = ''
  try {
    const { deleteWebAuthnCredential } = await import('aws-amplify/auth')
    await deleteWebAuthnCredential({ credentialId })
    await loadPasskeys()
  } catch (e: any) {
    passkeyError.value = e.message || 'Passkey konnte nicht entfernt werden'
  } finally {
    passkeyBusy.value = false
  }
}

function formatPasskeyDate(d: unknown) {
  if (!d) return '–'
  return new Date(d as string).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

onMounted(() => { loadPasskeys() })
</script>
