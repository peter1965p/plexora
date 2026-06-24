<template>
  <div class="lp-layout">
    <nav class="lp-nav">
      <div class="lp-nav-inner">
        <NuxtLink to="/" class="lp-logo">Plexo<span>ra</span></NuxtLink>
        <div class="lp-nav-links">
          <NuxtLink to="/impressum" class="lp-nav-link" :class="{ active: route.path === '/impressum' }">Impressum</NuxtLink>
          <NuxtLink to="/datenschutz" class="lp-nav-link" :class="{ active: route.path === '/datenschutz' }">Datenschutz</NuxtLink>
          <NuxtLink to="/agb" class="lp-nav-link" :class="{ active: route.path === '/agb' }">AGB</NuxtLink>
          <NuxtLink to="/login"><button class="lp-btn-ghost">Anmelden</button></NuxtLink>
          <NuxtLink to="/"><button class="lp-btn-home">← Startseite</button></NuxtLink>
        </div>
      </div>
    </nav>

    <main class="lp-main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
</script>

<style scoped>
@import url("https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css");

.lp-layout {
  min-height: 100vh;
  background: #0a0e1a;
  background-image:
    radial-gradient(ellipse 70% 40% at 50% 0%, rgba(234,88,12,0.10) 0%, transparent 65%),
    linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px);
  background-size: 100% 100%, 52px 52px, 52px 52px;
  color: #f0eef9;
  font-family: "Exo 2", sans-serif;
}

.lp-nav {
  border-bottom: 0.5px solid rgba(255,255,255,0.07);
  padding: 20px 0;
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(10,14,26,0.85);
  backdrop-filter: blur(12px);
}
.lp-nav-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.lp-logo {
  font-family: "Space Grotesk", sans-serif;
  font-weight: 800;
  font-size: 22px;
  letter-spacing: -0.5px;
  text-decoration: none;
  color: #f0eef9;
}
.lp-logo span {
  background: linear-gradient(160deg, #ffb347 0%, #ea580c 50%, #c2390a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.lp-nav-links {
  display: flex;
  align-items: center;
  gap: 4px;
}
.lp-nav-link {
  text-decoration: none;
  color: #8b8fa8;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 14px;
  border-radius: 8px;
  transition: color 0.15s;
}
.lp-nav-link:hover { color: #f0eef9; }
.lp-nav-link.active { color: #ea580c; font-weight: 600; }

.lp-btn-ghost {
  background: transparent;
  color: #f0eef9;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 18px;
  border-radius: 40px;
  border: 0.5px solid rgba(240,238,249,0.2);
  cursor: pointer;
  font-family: "Exo 2", sans-serif;
  transition: background 0.2s;
}
.lp-btn-ghost:hover { background: rgba(240,238,249,0.06); }

.lp-btn-home {
  background: #ea580c;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 18px;
  border-radius: 40px;
  border: none;
  cursor: pointer;
  font-family: "Exo 2", sans-serif;
  transition: opacity 0.2s;
}
.lp-btn-home:hover { opacity: 0.88; }

.lp-main {
  max-width: 760px;
  margin: 0 auto;
  padding: 60px 24px 100px;
}
</style>
