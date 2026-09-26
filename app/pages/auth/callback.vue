<template>
  <div class="auth-wrap">
    <div class="auth-card" style="text-align: center">
      <div class="auth-logo auth-logo-boot">Plexo<span>ra</span></div>
      <div v-if="!error" class="auth-sub" style="margin-top: 12px">
        <i class="ti ti-loader-2 spin"></i> Anmeldung wird abgeschlossen …
      </div>
      <template v-else>
        <div class="auth-error"><i class="ti ti-alert-circle"></i> {{ error }}</div>
        <NuxtLink to="/login" class="auth-btn-secondary" style="display: block; text-align: center">
          ← Zurück zum Login
        </NuxtLink>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "default" });

const router = useRouter();
const error = ref("");
let settled = false;
const mountedAt = Date.now();
// Kurze Mindestanzeigedauer, damit die Logo-Animation nicht nur aufblitzt,
// wenn die Anmeldung technisch sofort durch ist ("Microsoft-Stil", aber dezent).
const MIN_DISPLAY_MS = 1800;

function finish(path: string, message?: string) {
  if (settled) return;
  settled = true;
  if (message) {
    error.value = message;
    return;
  }
  const wait = Math.max(0, MIN_DISPLAY_MS - (Date.now() - mountedAt));
  setTimeout(() => router.replace(path), wait);
}

onMounted(async () => {
  const { Hub } = await import("aws-amplify/utils");
  const { fetchAuthSession } = await import("aws-amplify/auth");

  // Amplify tauscht den OAuth-Code im Hintergrund gegen Tokens — der Abschluss wird
  // über den Hub-Auth-Channel gemeldet, nicht als Rückgabewert eines Aufrufs hier.
  const stopListening = Hub.listen("auth", ({ payload }) => {
    if (payload.event === "signInWithRedirect") {
      finish("/dashboard");
    } else if (payload.event === "signInWithRedirect_failure") {
      finish("", "Google-Anmeldung fehlgeschlagen — bitte erneut versuchen.");
    }
  });

  // Falls der Code-Austausch bereits vor der Hub-Registrierung abgeschlossen war,
  // zusätzlich direkt auf eine bestehende Session prüfen.
  fetchAuthSession()
    .then((session) => {
      if (session.tokens?.idToken) finish("/dashboard");
    })
    .catch(() => {});

  setTimeout(() => {
    stopListening();
    finish("", "Die Anmeldung dauert ungewöhnlich lange — bitte erneut versuchen.");
  }, 10000);
});
</script>

<style scoped>
/* Boot-Screen-artiger Puls, wie bei einem Linux-Splash (z.B. CachyOS) —
   nur auf dieser Anmelde-Ladeseite, nicht global auf .auth-logo. */
.auth-logo-boot {
  color: #2c6690;
  animation: boot-pulse 2.2s ease-in-out infinite;
}
.auth-logo-boot span {
  color: #f5c518;
}
@keyframes boot-pulse {
  0%, 100% {
    opacity: 0.7;
    filter: drop-shadow(0 0 2px rgba(44, 102, 144, 0.25));
  }
  50% {
    opacity: 1;
    filter: drop-shadow(0 0 14px rgba(44, 102, 144, 0.65)) drop-shadow(0 0 6px rgba(245, 197, 24, 0.4));
  }
}
</style>
