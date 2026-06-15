<template>
  <div v-if="enabled" class="session-badge" :class="{ warn: showWarning }" title="Automatische Abmeldung nach Inaktivität">
    <i class="ti ti-clock"></i>
    <span>{{ formatTime(remainingSeconds) }}</span>
  </div>

  <Teleport to="body">
    <div v-if="showWarning" class="modal-overlay" style="z-index:9999">
      <div class="modal-card" style="max-width:380px;text-align:center">
        <div class="modal-body" style="display:flex;flex-direction:column;gap:14px;align-items:center;padding:32px 24px">
          <i class="ti ti-clock-exclamation" style="font-size:40px;color:var(--accent)"></i>
          <div>
            <div style="font-weight:700;font-size:16px;margin-bottom:6px">Bist du noch da?</div>
            <div style="font-size:13px;color:var(--text-secondary)">
              Aus Sicherheitsgründen wirst du wegen Inaktivität abgemeldet in
            </div>
            <div style="font-size:32px;font-weight:800;color:var(--accent);margin:8px 0">{{ formatTime(remainingSeconds) }}</div>
          </div>
          <button class="auth-btn" @click="stayLoggedIn">Angemeldet bleiben</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const { enabled, remainingSeconds, showWarning, stayLoggedIn, formatTime } = useIdleTimer()
</script>

<style scoped>
.session-badge {
  display:flex; align-items:center; gap:6px;
  padding:6px 12px; border-radius:8px;
  border:0.5px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-muted);
  font-size:13px; font-weight:600;
  font-family:'JetBrains Mono','Fira Code',monospace;
  transition: color .2s, border-color .2s;
}
.session-badge i { font-size:14px; }
.session-badge.warn {
  color: #E8534F;
  border-color: #E8534F;
  animation: session-pulse 1s infinite;
}
@keyframes session-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
