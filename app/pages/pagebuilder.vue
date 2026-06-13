<template>
  <div class="page">
    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:32px">
      <div>
        <h1 style="font-size:22px;font-weight:800;margin:0">Page<span style="color:var(--accent)">builder</span></h1>
        <p style="color:var(--text-muted);font-size:13px;margin:4px 0 0">Seiten erstellen & verwalten</p>
      </div>
      <button class="accent-btn" @click="openNew"><i class="ti ti-plus"></i> Neue Seite</button>
    </div>

    <!-- Seiten Liste -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px" v-if="!editing">
      <div v-if="!pages.length" style="grid-column:span 3;text-align:center;color:var(--text-muted);padding:60px">
        Noch keine Seiten — erstelle deine erste!
      </div>
      <div v-for="p in pages" :key="p.pageId"
        style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;overflow:hidden">
        <div style="padding:20px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span :style="`font-size:10px;padding:2px 8px;border-radius:4px;font-weight:600;
              background:${p.status==='published' ? '#00D4B420' : 'var(--bg-elevated)'};
              color:${p.status==='published' ? '#00D4B4' : 'var(--text-muted)'}`">
              {{ p.status === 'published' ? 'LIVE' : 'ENTWURF' }}
            </span>
            <span v-if="p.inNav" style="font-size:10px;color:var(--accent)"><i class="ti ti-navigation"></i> In Nav</span>
          </div>
          <div style="font-weight:700;font-size:16px;margin-bottom:4px">{{ p.title }}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">/p/{{ p.slug }}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">{{ p.blocks?.length || 0 }} Blöcke</div>
          <div style="display:flex;gap:8px">
            <button class="accent-btn" style="flex:1;height:32px;font-size:12px" @click="editPage(p)">
              <i class="ti ti-edit"></i> Bearbeiten
            </button>
            <a :href="`/p/${p.slug}`" target="_blank">
              <button style="height:32px;padding:0 12px;border-radius:8px;border:0.5px solid var(--border);background:var(--bg-elevated);color:var(--text-muted);cursor:pointer;font-size:12px">
                <i class="ti ti-external-link"></i>
              </button>
            </a>
            <button @click="deletePage(p)" style="height:32px;padding:0 12px;border-radius:8px;border:none;background:none;color:#E05C5C;cursor:pointer;font-size:16px">
              <i class="ti ti-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Editor -->
    <div v-if="editing" style="display:grid;grid-template-columns:320px 1fr;gap:24px">
      <!-- Linke Spalte: Settings + Block-Auswahl -->
      <div>
        <!-- Page Settings -->
        <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;padding:20px;margin-bottom:16px">
          <div style="font-weight:700;font-size:14px;margin-bottom:16px">Seiten-Einstellungen</div>
          <div class="auth-field"><label>Titel</label><input v-model="current.title" placeholder="Meine Seite" /></div>
          <div class="auth-field"><label>Slug (URL)</label><input v-model="current.slug" placeholder="meine-seite" /></div>
          <div class="auth-field"><label>Nav-Label</label><input v-model="current.navLabel" placeholder="Menü-Text" /></div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
            <input type="checkbox" v-model="current.inNav" id="innav" style="width:16px;height:16px;accent-color:var(--accent)" />
            <label for="innav" style="font-size:13px;cursor:pointer">In Navigation anzeigen</label>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <input type="checkbox" :checked="current.status==='published'" @change="current.status = $event.target.checked ? 'published' : 'draft'" id="published" style="width:16px;height:16px;accent-color:var(--accent)" />
            <label for="published" style="font-size:13px;cursor:pointer">Veröffentlicht</label>
          </div>
        </div>

        <!-- Block hinzufügen -->
        <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;padding:20px">
          <div style="font-weight:700;font-size:14px;margin-bottom:16px">Block hinzufügen</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <button v-for="bt in blockTypes" :key="bt.type" @click="addBlock(bt.type)"
              style="padding:10px;border-radius:10px;border:0.5px solid var(--border);background:var(--bg-elevated);cursor:pointer;text-align:left;transition:all 0.15s"
              @mouseenter="e => e.currentTarget.style.borderColor='var(--accent)'"
              @mouseleave="e => e.currentTarget.style.borderColor='var(--border)'">
              <i class="ti" :class="bt.icon" style="color:var(--accent);display:block;font-size:18px;margin-bottom:4px"></i>
              <span style="font-size:11px;font-weight:600;color:var(--text-primary)">{{ bt.label }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Rechte Spalte: Canvas -->
      <div>
        <div style="display:flex;gap:8px;margin-bottom:16px">
          <button class="accent-btn" @click="savePage" :disabled="saving">
            <i class="ti ti-device-floppy"></i> {{ saving ? 'Speichern...' : 'Speichern' }}
          </button>
          <button @click="editing=false" style="padding:0 16px;height:36px;border-radius:8px;border:0.5px solid var(--border);background:var(--bg-surface);color:var(--text-muted);cursor:pointer;font-size:13px">
            <i class="ti ti-arrow-left"></i> Zurück
          </button>
        </div>

        <!-- Blöcke Canvas -->
        <div v-if="!current.blocks.length" style="background:var(--bg-surface);border:2px dashed var(--border);border-radius:16px;padding:60px;text-align:center;color:var(--text-muted)">
          <i class="ti ti-layout-2" style="font-size:48px;display:block;margin-bottom:12px"></i>
          Füge Blöcke aus der linken Spalte hinzu
        </div>

        <div v-for="(block, idx) in current.blocks" :key="block.id"
          style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;margin-bottom:12px;overflow:hidden">
          <!-- Block Header -->
          <div style="padding:12px 16px;border-bottom:0.5px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--bg-elevated)">
            <span style="font-size:12px;font-weight:700;color:var(--accent)">
              <i class="ti" :class="blockTypes.find(b=>b.type===block.type)?.icon"></i>
              {{ blockTypes.find(b=>b.type===block.type)?.label }}
            </span>
            <div style="display:flex;gap:4px">
              <button @click="moveBlock(idx,-1)" :disabled="idx===0" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:14px"><i class="ti ti-arrow-up"></i></button>
              <button @click="moveBlock(idx,1)" :disabled="idx===current.blocks.length-1" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:14px"><i class="ti ti-arrow-down"></i></button>
              <button @click="removeBlock(idx)" style="background:none;border:none;cursor:pointer;color:#E05C5C;font-size:14px"><i class="ti ti-trash"></i></button>
            </div>
          </div>
          <!-- Block Editor -->
          <div style="padding:16px">
            <!-- Hero -->
            <template v-if="block.type==='hero'">
              <div class="auth-field"><label>Headline</label><input v-model="block.data.headline" placeholder="Deine Headline" /></div>
              <div class="auth-field"><label>Subline</label><input v-model="block.data.subline" placeholder="Kurze Beschreibung" /></div>
              <div class="auth-field"><label>Button Text</label><input v-model="block.data.btnText" placeholder="Jetzt starten" /></div>
              <div class="auth-field"><label>Button URL</label><input v-model="block.data.btnUrl" placeholder="/shop" /></div>
            </template>
            <!-- Text -->
            <template v-if="block.type==='text'">
              <div class="auth-field"><label>Überschrift</label><input v-model="block.data.heading" placeholder="Überschrift (optional)" /></div>
              <div class="auth-field"><label>Text</label><textarea v-model="block.data.body" placeholder="Dein Text..." class="form-select" style="height:120px;resize:none;width:100%"></textarea></div>
            </template>
            <!-- Bild -->
            <template v-if="block.type==='image'">
              <div class="auth-field"><label>Bild URL</label><input v-model="block.data.url" placeholder="https://..." /></div>
              <div class="auth-field"><label>Caption</label><input v-model="block.data.caption" placeholder="Bildbeschreibung" /></div>
            </template>
            <!-- 2-Spalten -->
            <template v-if="block.type==='two-col'">
              <div class="auth-field"><label>Linke Spalte</label><textarea v-model="block.data.left" class="form-select" style="height:80px;resize:none;width:100%"></textarea></div>
              <div class="auth-field"><label>Rechte Spalte</label><textarea v-model="block.data.right" class="form-select" style="height:80px;resize:none;width:100%"></textarea></div>
            </template>
            <!-- CTA -->
            <template v-if="block.type==='cta'">
              <div class="auth-field"><label>Titel</label><input v-model="block.data.title" placeholder="Bereit loszulegen?" /></div>
              <div class="auth-field"><label>Untertitel</label><input v-model="block.data.subtitle" placeholder="Starte noch heute" /></div>
              <div class="auth-field"><label>Button Text</label><input v-model="block.data.btnText" placeholder="Jetzt kaufen" /></div>
              <div class="auth-field"><label>Button URL</label><input v-model="block.data.btnUrl" placeholder="/shop" /></div>
            </template>
            <!-- Form -->
            <template v-if="block.type==='form'">
              <div class="auth-field">
                <label>Formular auswählen</label>
                <select v-model="block.data.formId" class="form-select">
                  <option value="">— Formular wählen —</option>
                  <option v-for="f in availableForms" :key="f.formId" :value="f.formId">{{ f.title }}</option>
                </select>
              </div>
            </template>
            <!-- Divider -->
            <template v-if="block.type==='divider'">
              <div style="color:var(--text-muted);font-size:13px">Trennlinie — keine weiteren Einstellungen</div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div v-if="toast" class="toast-success"><i class="ti ti-circle-check"></i> {{ toast }}</div>
  </div>
</template>

<script setup lang="ts">
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)
const saving  = ref(false)
const editing = ref(false)
const toast   = ref('')
const isNew   = ref(false)

const { data: formsData } = await useFetch(useApiUrl('/api/forms'))
const availableForms = computed(() => (formsData.value as any)?.forms || [])
const { data, refresh } = await useFetch(useApiUrl('/api/pages'))
const pages = computed(() => (data.value as any)?.pages || [])

const current = reactive({
  pageId: '', title: '', slug: '', navLabel: '', inNav: false,
  status: 'draft', blocks: [] as any[]
})

const blockTypes = [
  { type: 'hero',    label: 'Hero',       icon: 'ti-layout-navbar' },
  { type: 'text',    label: 'Text',       icon: 'ti-typography'    },
  { type: 'image',   label: 'Bild',       icon: 'ti-photo'         },
  { type: 'two-col', label: '2 Spalten',  icon: 'ti-layout-columns'},
  { type: 'cta',     label: 'CTA Banner', icon: 'ti-speakerphone'  },
  { type: 'divider', label: 'Trennlinie', icon: 'ti-minus'         },
  { type: 'form',    label: 'Formular',   icon: 'ti-forms'         },
]

function openNew() {
  Object.assign(current, { pageId: '', title: '', slug: '', navLabel: '', inNav: false, status: 'draft', blocks: [] })
  isNew.value = true
  editing.value = true
}

function editPage(p: any) {
  Object.assign(current, JSON.parse(JSON.stringify(p)))
  isNew.value = false
  editing.value = true
}

function addBlock(type: string) {
  const defaults: Record<string, any> = {
    hero:    { headline: '', subline: '', btnText: '', btnUrl: '' },
    text:    { heading: '', body: '' },
    image:   { url: '', caption: '' },
    'two-col': { left: '', right: '' },
    cta:     { title: '', subtitle: '', btnText: '', btnUrl: '' },
    divider: {},
    form:    { formId: '' },
  }
  current.blocks.push({ id: uid(), type, data: defaults[type] || {} })
}

function removeBlock(idx: number) { current.blocks.splice(idx, 1) }

function moveBlock(idx: number, dir: number) {
  const b = current.blocks.splice(idx, 1)[0]
  current.blocks.splice(idx + dir, 0, b)
}

async function savePage() {
  saving.value = true
  try {
    if (isNew.value) {
      await $fetch(useApiUrl('/api/pages'), { method: 'POST', body: { ...current } })
    } else {
      await $fetch(useApiUrl(`/api/pages/${current.slug}`), { method: 'PUT', body: { ...current } })
    }
    await refresh()
    toast.value = 'Seite gespeichert!'
    setTimeout(() => { toast.value = ''; editing.value = false }, 1500)
  } catch(e) { console.error(e) }
  saving.value = false
}

async function deletePage(p: any) {
  await $fetch(useApiUrl(`/api/pages/${p.slug}`), { method: 'DELETE' })
  await refresh()
  toast.value = 'Seite gelöscht!'
  setTimeout(() => toast.value = '', 2000)
}
</script>
