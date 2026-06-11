<template>
  <div class="page">

    <!-- APPEARANCE -->
    <div class="card" style="margin-bottom:14px">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-palette" style="margin-right:8px;color:var(--accent)"></i>Darstellung</span>
      </div>
      <div class="card-body" style="display:flex;flex-direction:column;gap:28px">
        <div>
          <div class="settings-label">Farbmodus</div>
          <div class="theme-toggle">
            <button class="theme-opt" :class="{ active: store.theme === 'dark' }" @click="store.setTheme('dark')">
              <i class="ti ti-moon"></i> Dark
            </button>
            <button class="theme-opt" :class="{ active: store.theme === 'light' }" @click="store.setTheme('light')">
              <i class="ti ti-sun"></i> Light
            </button>
          </div>
        </div>
        <div>
          <div class="settings-label">Akzentfarbe — {{ store.accentColors.find(c => c.hex === store.accent)?.name }}</div>
          <div class="accent-picker">
            <div
              v-for="c in store.accentColors"
              :key="c.hex"
              class="accent-swatch"
              :class="{ active: store.accent === c.hex }"
              :style="{ background: c.hex }"
              :title="c.name"
              @click="store.setAccent(c.hex, c.rgb)"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODULES -->
    <div class="card" style="margin-bottom:14px">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-puzzle" style="margin-right:8px;color:var(--accent)"></i>Module</span>
        <span style="font-size:11px;color:var(--text-muted)">{{ store.modules.filter(m => m.on).length }} / {{ store.modules.length }} aktiv</span>
      </div>
      <div class="card-body">
        <div class="module-grid">
          <div
            v-for="m in store.modules"
            :key="m.key"
            class="module-pill"
            :class="{ on: m.on }"
            @click="store.toggleModule(m.key)"
          >
            <i class="ti pill-icon" :class="m.icon"></i>
            <span class="pill-name">{{ m.name }}</span>
            <div class="pill-toggle" :class="{ on: m.on }">
              <div class="pill-thumb"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ACCOUNT -->
    <div class="card" style="margin-bottom:14px">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-user-circle" style="margin-right:8px;color:var(--accent)"></i>Konto</span>
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div>
            <div class="settings-label">Name</div>
            <div style="font-size:13px;color:var(--text-primary);font-weight:500">{{ userName }}</div>
          </div>
          <div>
            <div class="settings-label">E-Mail</div>
            <div style="font-size:13px;color:var(--text-primary)">{{ userEmail }}</div>
          </div>
          <div>
            <div class="settings-label">Rolle</div>
            <span class="badge badge-info">Administrator</span>
          </div>
          <div>
            <div class="settings-label">Plan</div>
            <span class="badge badge-success">Plexora Pro</span>
          </div>
        </div>
      </div>
    </div>

    <!-- INFRASTRUKTUR -->
    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-cloud" style="margin-right:8px;color:var(--accent)"></i>Infrastruktur</span>
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
          <div class="infra-pill">
            <i class="ti ti-shield-check" style="color:#00D4B4"></i>
            <div>
              <div style="font-size:12px;font-weight:600;color:var(--text-primary)">AWS Cognito</div>
              <div style="font-size:11px;color:var(--text-muted)">Auth — Frankfurt</div>
            </div>
          </div>
          <div class="infra-pill">
            <i class="ti ti-database" style="color:var(--accent)"></i>
            <div>
              <div style="font-size:12px;font-weight:600;color:var(--text-primary)">DynamoDB</div>
              <div style="font-size:11px;color:var(--text-muted)">6 Tabellen aktiv</div>
            </div>
          </div>
          <div class="infra-pill">
            <i class="ti ti-world" style="color:#F0B428"></i>
            <div>
              <div style="font-size:12px;font-weight:600;color:var(--text-primary)">Cloudflare</div>
              <div style="font-size:11px;color:var(--text-muted)">Deploy pending</div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { getCurrentUser } from 'aws-amplify/auth'
import { useAppStore } from '~/stores/app'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const store     = useAppStore()
const userName  = ref('–')
const userEmail = ref('–')

onMounted(async () => {
  try {
    const user = await getCurrentUser()
    userEmail.value = user.signInDetails?.loginId || '–'
    userName.value  = user.username || '–'
  } catch {}
})
</script>
