<template>
  <div class="auth-wrap">
    <div class="auth-card">
      <div class="auth-logo">Plexo<span>ra</span></div>
      <div class="auth-title">Neues Passwort setzen</div>
      <div class="auth-sub">{{ email || "Ungültiger Link" }}</div>

      <div v-if="error" class="auth-error">
        <i class="ti ti-alert-circle"></i> {{ error }}
      </div>

      <div v-if="!done && email && code" class="auth-form">
        <div class="auth-field">
          <label>Neues Passwort</label>
          <div class="auth-pw-wrap">
            <input
              v-model="newPassword"
              :type="showPw ? 'text' : 'password'"
              placeholder="••••••••"
            />
            <button class="auth-pw-toggle" @click="showPw = !showPw">
              <i class="ti" :class="showPw ? 'ti-eye-off' : 'ti-eye'"></i>
            </button>
          </div>
        </div>
        <div class="auth-field">
          <label>Passwort bestätigen</label>
          <input
            v-model="confirmPassword"
            :type="showPw ? 'text' : 'password'"
            placeholder="••••••••"
          />
        </div>
        <button class="auth-btn" :disabled="loading" @click="submit">
          <span v-if="loading"><i class="ti ti-loader-2 spin"></i></span>
          <span v-else>Passwort setzen</span>
        </button>
      </div>

      <div v-else-if="done" class="auth-info">
        <i class="ti ti-circle-check"></i>
        Passwort erfolgreich geändert!
      </div>

      <div v-if="done" class="auth-switch">
        <NuxtLink to="/login">Jetzt anmelden →</NuxtLink>
      </div>
      <div v-else-if="!email || !code" class="auth-switch">
        <NuxtLink to="/login">← Zurück zum Login</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { confirmResetPassword } from "aws-amplify/auth";

definePageMeta({ layout: "default" });

const route = useRoute();
const email = ref((route.query.email as string) || "");
const code = ref((route.query.code as string) || "");
const newPassword = ref("");
const confirmPassword = ref("");
const showPw = ref(false);
const loading = ref(false);
const error = ref("");
const done = ref(false);

async function submit() {
  error.value = "";
  if (newPassword.value !== confirmPassword.value) {
    error.value = "Passwörter stimmen nicht überein.";
    return;
  }
  if (newPassword.value.length < 8) {
    error.value = "Passwort muss mindestens 8 Zeichen lang sein.";
    return;
  }
  loading.value = true;
  try {
    await confirmResetPassword({
      username: email.value,
      confirmationCode: code.value,
      newPassword: newPassword.value,
    });
    done.value = true;
  } catch (e: any) {
    error.value = e.message || "Code ungültig oder abgelaufen.";
  } finally {
    loading.value = false;
  }
}
</script>
