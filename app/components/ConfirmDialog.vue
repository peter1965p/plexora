<template>
  <Transition name="plx-confirm-fade">
    <div v-if="state.visible" class="plx-confirm-overlay" @click.self="_answer(false)">
      <div class="plx-confirm-card">
        <div class="plx-confirm-glow"></div>
        <div class="plx-confirm-icon">
          <i class="ti" :class="state.icon"></i>
        </div>
        <div class="plx-confirm-title">{{ state.title }}</div>
        <div v-if="state.name" class="plx-confirm-name">{{ state.name }}</div>
        <div v-if="state.sub" class="plx-confirm-sub">{{ state.sub }}</div>
        <div class="plx-confirm-actions">
          <button class="plx-confirm-cancel" @click="_answer(false)">Abbrechen</button>
          <button class="plx-confirm-ok" @click="_answer(true)">
            <i class="ti" :class="state.icon"></i> Ja, weiter
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const { _state: state, _answer } = useConfirm()
</script>

<style scoped>
.plx-confirm-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}

.plx-confirm-card {
  position: relative;
  background: rgba(10, 12, 26, 0.95);
  border: 1px solid rgba(220,38,38,0.25);
  border-radius: 24px;
  padding: 40px 32px 30px;
  width: 100%; max-width: 340px;
  text-align: center;
  box-shadow: 0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04);
  overflow: hidden;
}

.plx-confirm-glow {
  position: absolute; top: -60px; left: 50%; transform: translateX(-50%);
  width: 200px; height: 200px;
  background: radial-gradient(circle, rgba(220,38,38,0.2), transparent 70%);
  pointer-events: none;
}

.plx-confirm-icon {
  position: relative;
  width: 64px; height: 64px;
  margin: 0 auto 20px;
  background: rgba(220,38,38,0.1);
  border: 1px solid rgba(220,38,38,0.25);
  border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
  font-size: 26px; color: #ef4444;
}

.plx-confirm-title {
  position: relative;
  font-size: 18px; font-weight: 800;
  color: #fff; margin-bottom: 10px;
  letter-spacing: -0.3px;
}

.plx-confirm-name {
  position: relative;
  font-size: 13px; font-weight: 600;
  color: rgba(255,255,255,0.5);
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; padding: 6px 14px;
  display: inline-block; margin-bottom: 12px;
  max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.plx-confirm-sub {
  position: relative;
  font-size: 12px; color: rgba(255,255,255,0.28);
  margin-bottom: 28px; line-height: 1.5;
}

.plx-confirm-actions {
  position: relative;
  display: flex; gap: 10px;
}

.plx-confirm-cancel {
  flex: 1; padding: 11px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  font-size: 13px; font-weight: 600;
  color: rgba(255,255,255,0.5);
  cursor: pointer; transition: all 0.15s;
  font-family: inherit;
}
.plx-confirm-cancel:hover { background: rgba(255,255,255,0.09); color: #fff; }

.plx-confirm-ok {
  flex: 1; padding: 11px;
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  border: none; border-radius: 12px;
  font-size: 13px; font-weight: 700;
  color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  transition: opacity 0.15s, transform 0.15s;
  box-shadow: 0 4px 20px rgba(220,38,38,0.35);
  font-family: inherit;
}
.plx-confirm-ok:hover { opacity: 0.88; transform: translateY(-1px); }
.plx-confirm-ok:active { transform: translateY(0); }

.plx-confirm-fade-enter-active { transition: all 0.2s ease; }
.plx-confirm-fade-leave-active { transition: all 0.15s ease; }
.plx-confirm-fade-enter-from, .plx-confirm-fade-leave-to { opacity: 0; }
.plx-confirm-fade-enter-from .plx-confirm-card { transform: scale(0.93) translateY(10px); }
.plx-confirm-fade-leave-to   .plx-confirm-card { transform: scale(0.96); }
</style>
