<template>
  <div class="auth-wrap">
    <div class="auth-card" style="text-align: center">
      <div class="auth-logo auth-logo-boot">
        Plexo<span :class="{ 'ra-pop': popping }">ra</span>
      </div>
      <div v-if="!error && !popping" class="boot-bar"><div class="boot-bar-fill"></div></div>
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
const popping = ref(false);
let settled = false;
const mountedAt = Date.now();
// Kurze Mindestanzeigedauer, damit die Logo-Animation nicht nur aufblitzt,
// wenn die Anmeldung technisch sofort durch ist ("Microsoft-Stil", aber dezent).
const MIN_DISPLAY_MS = 1800;
const POP_MS = 550; // Zeit für den "ra"-Hüpfer, bevor es zum Dashboard geht

function finish(path: string, message?: string) {
  if (settled) return;
  settled = true;
  if (message) {
    error.value = message;
    return;
  }
  const wait = Math.max(0, MIN_DISPLAY_MS - (Date.now() - mountedAt));
  setTimeout(() => {
    popping.value = true;
    setTimeout(() => router.replace(path), POP_MS);
  }, wait);
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
/* Zentrierte Ladekarte über die volle Seite, unabhängig vom Standard-Layout */
.auth-wrap {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: #0b0f19;
  z-index: 1000;
}

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

/* Fortschrittsbalken: wandert von Rot über Amber nach Neongrün */
.boot-bar {
  width: 220px;
  height: 4px;
  margin: 18px auto 0;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  overflow: hidden;
}
.boot-bar-fill {
  height: 100%;
  width: 0%;
  border-radius: 2px;
  animation: boot-fill 1.8s ease-out forwards;
}
@keyframes boot-fill {
  0%   { width: 0%;   background: #ef4444; box-shadow: 0 0 8px rgba(239, 68, 68, 0.6); }
  50%  { width: 55%;  background: #f59e0b; box-shadow: 0 0 8px rgba(245, 158, 11, 0.6); }
  100% { width: 100%; background: #39ff14; box-shadow: 0 0 10px rgba(57, 255, 20, 0.8); }
}

/* "ra" hüpft hoch, wird größer und wechselt auf Neongrün, kurz bevor's zum Dashboard geht */
.ra-pop {
  display: inline-block;
  animation: ra-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
@keyframes ra-pop {
  0%   { transform: translateY(0) scale(1); color: #f5c518; text-shadow: none; }
  45%  { transform: translateY(-12px) scale(1.25); }
  100% { transform: translateY(-6px) scale(1.7); color: #39ff14; text-shadow: 0 0 18px rgba(57, 255, 20, 0.8); }
}
</style>
