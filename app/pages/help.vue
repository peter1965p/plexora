<template>
  <div class="page">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:22px;font-weight:800;margin:0">{{ ui.title }} <span style="color:var(--accent)">{{ ui.titleAccent }}</span></h1>
        <p style="color:var(--text-muted);font-size:13px;margin:4px 0 0">{{ ui.subtitle }}</p>
      </div>
      <button class="accent-btn" @click="startTour"><i class="ti ti-player-play"></i> {{ ui.tour }}</button>
    </div>

    <input v-model="query" class="help-search" type="search" :placeholder="ui.search" :aria-label="ui.searchLabel" />

    <div class="help-layout">
      <nav class="help-nav" :aria-label="ui.topics">
        <button class="help-nav-item" :class="{ on: !group }" @click="group = ''"><i class="ti ti-list"></i> {{ ui.all }}</button>
        <button v-for="g in help.groups" :key="g.id" class="help-nav-item" :class="{ on: group === g.id }" @click="group = g.id">
          <i class="ti" :class="g.icon"></i> {{ g.title }}
        </button>
      </nav>

      <div class="help-main">
        <div v-if="!results.length" class="card" style="padding:24px;text-align:center;color:var(--text-muted)">
          {{ ui.none }}
        </div>
        <div v-for="t in results" :id="'t-' + t.id" :key="t.id" class="card help-topic" :class="{ focus: t.id === open }">
          <button class="help-head" :aria-expanded="t.id === open" @click="toggle(t.id)">
            <span class="help-ico"><i class="ti" :class="t.icon"></i></span>
            <span style="flex:1;text-align:left">
              <span class="help-title">{{ t.title }}</span>
              <span class="help-sum">{{ t.summary }}</span>
            </span>
            <span v-if="t.role" class="help-role">{{ ui.from }} {{ t.roleLabel }}</span>
            <i class="ti" :class="t.id === open ? 'ti-chevron-up' : 'ti-chevron-down'" style="color:var(--text-muted)"></i>
          </button>
          <div v-if="t.id === open" class="help-body">
            <h3>{{ ui.how }}</h3>
            <ol><li v-for="(s, i) in t.steps" :key="i">{{ s }}</li></ol>
            <template v-if="t.tips?.length">
              <h3>{{ ui.good }}</h3>
              <ul><li v-for="(s, i) in t.tips" :key="i">{{ s }}</li></ul>
            </template>
            <template v-if="t.faq?.length">
              <h3>{{ ui.faq }}</h3>
              <div v-for="(f, i) in t.faq" :key="i" class="help-faq"><strong>{{ f.q }}</strong><div>{{ f.a }}</div></div>
            </template>
            <NuxtLink v-if="t.route" :to="t.route" class="accent-btn" style="display:inline-flex;margin-top:12px;text-decoration:none"><i class="ti ti-arrow-right"></i> {{ ui.goto }}</NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
import { localizeHelp, searchHelp } from '~~/shared/helpContent'
import { HELP_UI } from '~~/shared/helpContent.en'
const { lang } = useLang()
const help = computed(() => localizeHelp(lang.value))
const ui = computed(() => HELP_UI[lang.value])
const route = useRoute()
const query = ref(''), group = ref(''), open = ref(typeof route.query.topic === 'string' ? route.query.topic : '')
const results = computed(() => searchHelp(query.value, help.value.topics).filter(t => !group.value || t.group === group.value))
const toggle = (id: string) => { open.value = open.value === id ? '' : id }
const startTour = () => window.dispatchEvent(new Event('plexora:start-tour'))
onMounted(() => {
  if (open.value && help.value.topics.some(t => t.id === open.value)) nextTick(() => document.getElementById('t-' + open.value)?.scrollIntoView({ block: 'start' }))
})
</script>

<style scoped>
.help-search { width: 100%; height: 42px; padding: 0 14px; border-radius: 12px; border: 0.5px solid var(--border); background: var(--bg-elevated); color: var(--text-primary); font-size: 14px; margin-bottom: 16px; box-sizing: border-box }
.help-layout { display: grid; grid-template-columns: 220px 1fr; gap: 16px; align-items: start }
.help-nav { display: flex; flex-direction: column; gap: 4px; position: sticky; top: 8px }
.help-nav-item { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 10px; border: 0; background: transparent; color: var(--text-primary); font-size: 13px; cursor: pointer; text-align: left }
.help-nav-item:hover { background: var(--bg-hover) }
.help-nav-item.on { background: var(--accent-dim, rgba(124,92,255,.15)); color: var(--accent); font-weight: 700 }
.help-main { display: flex; flex-direction: column; gap: 10px }
.help-topic.focus { border-color: var(--accent) }
.help-head { display: flex; align-items: center; gap: 12px; width: 100%; padding: 14px 16px; background: transparent; border: 0; color: var(--text-primary); cursor: pointer }
.help-ico { width: 38px; height: 38px; border-radius: 10px; background: var(--accent-dim, rgba(124,92,255,.15)); color: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 19px; flex-shrink: 0 }
.help-title { display: block; font-weight: 700; font-size: 14px }
.help-sum { display: block; font-size: 12px; color: var(--text-secondary); margin-top: 2px; line-height: 1.4 }
.help-role { font-size: 11px; padding: 2px 8px; border-radius: 99px; border: 0.5px solid var(--border); color: var(--text-muted); white-space: nowrap }
.help-body { padding: 0 18px 16px 66px; font-size: 13px; line-height: 1.55 }
.help-body h3 { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); margin: 14px 0 6px }
.help-body ol, .help-body ul { margin: 0; padding-left: 20px }
.help-body li { margin-bottom: 4px }
.help-faq { margin-bottom: 8px }
.help-faq div { color: var(--text-secondary) }
@media (max-width: 800px) {
  .help-layout { grid-template-columns: 1fr }
  .help-nav { flex-direction: row; flex-wrap: wrap; position: static }
  .help-body { padding-left: 18px }
}
</style>
