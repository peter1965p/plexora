<template>
  <div class="auth-wrap">
    <div class="auth-card" style="text-align: center">
      <div class="auth-logo">Plexo<span>ra</span></div>
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

function finish(path: string, message?: string) {
  if (settled) return;
  settled = true;
  if (message) error.value = message;
  else router.replace(path);
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
