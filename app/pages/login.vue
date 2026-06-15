<template>
  <div class="auth-wrap">
    <div class="auth-card">
      <div class="auth-logo">Plexo<span>ra</span></div>

      <div v-if="idleLogout" class="auth-info" style="margin-bottom:12px">
        <i class="ti ti-clock-exclamation"></i>
        Du wurdest aus Sicherheitsgründen automatisch abgemeldet.
      </div>

      <template v-if="isForgot">
        <div class="auth-title">Passwort vergessen?</div>
        <div class="auth-sub">
          {{ forgotSent ? "E-Mail ist unterwegs" : "Wir senden dir einen Link zum Zurücksetzen" }}
        </div>

        <div v-if="error" class="auth-error">
          <i class="ti ti-alert-circle"></i> {{ error }}
        </div>

        <div class="auth-form">
          <template v-if="!forgotSent">
            <div class="auth-field">
              <label>E-Mail</label>
              <input v-model="email" type="email" placeholder="max@firma.de" />
            </div>
            <button class="auth-btn" :disabled="loading" @click="sendResetLink">
              <span v-if="loading"><i class="ti ti-loader-2 spin"></i></span>
              <span v-else>Link senden</span>
            </button>
          </template>
          <template v-else>
            <div class="auth-info">
              <i class="ti ti-mail"></i>
              Falls ein Konto mit <strong>{{ email }}</strong> existiert, wurde ein Link zum
              Zurücksetzen des Passworts gesendet — bitte auch Spam prüfen!
            </div>
          </template>
          <button class="auth-btn-secondary" @click="backToLogin">← Zurück zum Login</button>
        </div>
      </template>

      <template v-else>
        <div class="auth-title">
          {{ isRegister ? "Konto erstellen" : "Willkommen zurück" }}
        </div>
        <div class="auth-sub">
          {{ isRegister ? "Starten Sie kostenlos" : "Melden Sie sich an" }}
        </div>

        <div v-if="error" class="auth-error">
          <i class="ti ti-alert-circle"></i> {{ error }}
        </div>

        <div class="auth-form">
          <template v-if="isRegister && !needsConfirm">
            <div class="auth-row">
              <div class="auth-field">
                <label>Vorname</label>
                <input v-model="firstName" type="text" placeholder="Max" />
              </div>
              <div class="auth-field">
                <label>Nachname</label>
                <input v-model="lastName" type="text" placeholder="Mustermann" />
              </div>
            </div>
          </template>

          <template v-if="!needsConfirm">
            <div class="auth-field">
              <label>E-Mail</label>
              <input v-model="email" type="email" placeholder="max@firma.de" />
            </div>
            <div class="auth-field">
              <label>Passwort</label>
              <div class="auth-pw-wrap">
                <input
                  v-model="password"
                  :type="showPw ? 'text' : 'password'"
                  placeholder="••••••••"
                />
                <button class="auth-pw-toggle" @click="showPw = !showPw">
                  <i class="ti" :class="showPw ? 'ti-eye-off' : 'ti-eye'"></i>
                </button>
              </div>
            </div>
            <div v-if="!isRegister" class="auth-switch" style="margin:-4px 0 4px;text-align:right">
              <span @click="isForgot = true; error = ''">Passwort vergessen?</span>
            </div>
            <button
              class="auth-btn"
              :disabled="loading"
              @click="isRegister ? register() : login()"
            >
              <span v-if="loading"><i class="ti ti-loader-2 spin"></i></span>
              <span v-else>{{ isRegister ? "Registrieren" : "Anmelden" }}</span>
            </button>
          </template>

          <template v-else>
            <div class="auth-info">
              <i class="ti ti-mail"></i>
              Bestätigungscode wurde an <strong>{{ email }}</strong> gesendet —
              bitte auch Spam prüfen!
            </div>
            <div class="auth-field">
              <label>Bestätigungscode</label>
              <input
                v-model="confirmCode"
                type="text"
                placeholder="123456"
                maxlength="6"
              />
            </div>
            <button class="auth-btn" :disabled="loading" @click="confirmSignUp">
              <span v-if="loading"><i class="ti ti-loader-2 spin"></i></span>
              <span v-else>Code bestätigen ↗</span>
            </button>
            <button class="auth-btn-secondary" @click="needsConfirm = false">
              ← Zurück
            </button>
          </template>
        </div>

        <div v-if="!needsConfirm" class="auth-switch">
          {{ isRegister ? "Bereits ein Konto?" : "Noch kein Konto?" }}
          <span
            @click="
              isRegister = !isRegister;
              error = '';
            "
          >
            {{ isRegister ? "Anmelden" : "Kostenlos registrieren" }}
          </span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  signIn,
  signUp,
  confirmSignUp as amplifyConfirmSignUp,
  resetPassword,
} from "aws-amplify/auth";

definePageMeta({ layout: "default" });

const router = useRouter();
const route  = useRoute();
const idleLogout = computed(() => route.query.reason === 'idle');

const isRegister = ref(false);
const isForgot = ref(false);
const forgotSent = ref(false);
const email = ref("");
const password = ref("");
const firstName = ref("");
const lastName = ref("");
const confirmCode = ref("");
const showPw = ref(false);
const loading = ref(false);
const error = ref("");
const needsConfirm = ref(false);
const generatedUsername = ref(sessionStorage.getItem("plx_reg_user") || "");

async function login() {
  loading.value = true;
  error.value = "";
  try {
    await signIn({ username: email.value, password: password.value });
    router.push("/dashboard");
  } catch (e: any) {
    error.value = e.message || "Anmeldung fehlgeschlagen";
  } finally {
    loading.value = false;
  }
}

async function register() {
  loading.value = true;
  error.value = "";
  try {
    generatedUsername.value =
      email.value.replace("@", "_").replace(/\./g, "_") + "_" + Date.now();
    sessionStorage.setItem("plx_reg_user", generatedUsername.value);
    await signUp({
      username: generatedUsername.value,
      password: password.value,
      options: {
        userAttributes: {
          email: email.value,
          given_name: firstName.value,
          family_name: lastName.value,
        },
      },
    });
    needsConfirm.value = true;
  } catch (e: any) {
    error.value = e.message || "Registrierung fehlgeschlagen";
  } finally {
    loading.value = false;
  }
}

async function confirmSignUp() {
  loading.value = true;
  error.value = "";
  try {
    await amplifyConfirmSignUp({
      username: generatedUsername.value,
      confirmationCode: confirmCode.value,
    });
    sessionStorage.removeItem("plx_reg_user");
    router.push("/dashboard");
  } catch (e: any) {
    error.value = e.message || "Code ungültig — bitte prüfen";
  } finally {
    loading.value = false;
  }
}

async function sendResetLink() {
  loading.value = true;
  error.value = "";
  try {
    await resetPassword({ username: email.value });
    forgotSent.value = true;
  } catch (e: any) {
    if (e.name === "LimitExceededException") {
      error.value = "Zu viele Versuche — bitte später erneut versuchen.";
    } else {
      forgotSent.value = true;
    }
  } finally {
    loading.value = false;
  }
}

function backToLogin() {
  isForgot.value = false;
  forgotSent.value = false;
  error.value = "";
}
</script>
