<template>
  <div class="page">

    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:22px;font-weight:800;margin:0">Blog <span style="color:var(--accent)">Admin</span></h1>
        <p style="color:var(--text-muted);font-size:13px;margin:4px 0 0">Beiträge erstellen, bearbeiten und veröffentlichen</p>
      </div>
      <button class="accent-btn" @click="openNew">
        <i class="ti ti-plus"></i> Neuer Beitrag
      </button>
    </div>

    <!-- Tabs -->
    <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
      <button v-for="tab in tabs" :key="tab.key" class="theme-opt" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
        <i class="ti" :class="tab.icon"></i> {{ tab.label }}
        <span v-if="tabCount(tab.key)" style="margin-left:6px;font-size:10px;background:var(--accent);color:#fff;padding:1px 6px;border-radius:20px">{{ tabCount(tab.key) }}</span>
      </button>
    </div>

    <!-- Kategorie Filter -->
    <div v-if="allCategories.length" style="display:flex;align-items:center;gap:6px;margin-bottom:14px;flex-wrap:wrap">
      <span style="font-size:11px;color:var(--text-muted);margin-right:2px">Kategorie:</span>
      <button class="theme-opt" :class="{ active: !categoryFilter }" @click="categoryFilter = ''" style="font-size:11px;padding:3px 10px">Alle</button>
      <button v-for="cat in allCategories" :key="cat" class="theme-opt" :class="{ active: categoryFilter === cat }" @click="categoryFilter = cat" style="font-size:11px;padding:3px 10px">{{ cat }}</button>
    </div>

    <!-- Loading -->
    <div v-if="loading" style="display:flex;justify-content:center;padding:60px;color:var(--text-muted)">
      <i class="ti ti-loader-2 spin" style="font-size:28px"></i>
    </div>

    <!-- Empty -->
    <div v-else-if="!filteredPosts.length" style="text-align:center;padding:80px 20px;color:var(--text-muted)">
      <i class="ti ti-pencil-off" style="font-size:48px;display:block;margin-bottom:12px;opacity:.3"></i>
      <p style="font-size:14px;margin-bottom:16px">{{ activeTab === 'live' ? 'Noch keine veröffentlichten Beiträge.' : activeTab === 'draft' ? 'Keine Entwürfe vorhanden.' : 'Noch keine Beiträge.' }}</p>
      <button class="accent-btn" @click="openNew"><i class="ti ti-plus" style="margin-right:6px"></i>Ersten Beitrag erstellen</button>
    </div>

    <!-- Post Grid -->
    <div v-else style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">
      <div v-for="p in filteredPosts" :key="p.postId"
        style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;overflow:hidden;transition:border-color .15s;display:flex;flex-direction:column"
        @mouseenter="e => (e.currentTarget as HTMLElement).style.borderColor='var(--accent)'"
        @mouseleave="e => (e.currentTarget as HTMLElement).style.borderColor='var(--border)'">
        <!-- Cover -->
        <div style="height:140px;background:var(--bg-elevated);display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative">
          <img v-if="p.coverImageUrl" :src="p.coverImageUrl" style="width:100%;height:100%;object-fit:cover" />
          <i v-else class="ti ti-article" style="font-size:40px;color:var(--text-muted);opacity:.3"></i>
          <span style="position:absolute;top:8px;left:8px;font-size:10px;padding:2px 8px;border-radius:20px;font-weight:700;letter-spacing:.05em;text-transform:uppercase"
            :style="p.status === 'published' ? 'background:#22c55e22;color:#22c55e;border:1px solid #22c55e44' : 'background:var(--bg-elevated);color:var(--text-muted);border:1px solid var(--border)'">
            {{ p.status === 'published' ? '● Live' : '○ Entwurf' }}
          </span>
          <span v-if="p.tags?.length" style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,.6);color:#fff;font-size:10px;padding:2px 7px;border-radius:4px;font-weight:600">
            {{ p.tags[0] }}
          </span>
        </div>
        <!-- Body -->
        <div style="padding:14px;flex:1;display:flex;flex-direction:column">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <div style="font-size:10px;color:var(--accent);text-transform:uppercase;letter-spacing:.05em;font-weight:700">/blog/{{ p.slug }}</div>
            <span v-if="p.category" style="font-size:10px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:20px;padding:1px 8px;color:var(--text-muted);white-space:nowrap">{{ p.category }}</span>
          </div>
          <div style="font-weight:700;font-size:15px;margin-bottom:6px;color:var(--text);line-height:1.3">{{ p.title }}</div>
          <div style="font-size:12px;color:var(--text-muted);line-height:1.5;flex:1">{{ p.excerpt?.slice(0,100) }}{{ (p.excerpt?.length || 0) > 100 ? '...' : '' }}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding-top:12px;border-top:0.5px solid var(--border)">
            <span style="font-size:11px;color:var(--text-muted)">{{ formatDate(p.publishedAt || p.updatedAt) }}</span>
            <div style="display:flex;gap:4px">
              <button @click="openEdit(p)" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:16px;padding:4px 6px;border-radius:6px;transition:background .15s"
                onmouseover="this.style.background='var(--bg-elevated)'" onmouseout="this.style.background='none'">
                <i class="ti ti-edit"></i>
              </button>
              <button @click="deletePost(p)" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:16px;padding:4px 6px;border-radius:6px;transition:background .15s"
                onmouseover="this.style.background='rgba(239,68,68,.1)'" onmouseout="this.style.background='none'">
                <i class="ti ti-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL: Beitrag erstellen / bearbeiten -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal=false">
      <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;width:100%;max-width:1100px;height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.5)">
        <!-- Modal Header -->
        <div class="modal-header">
          <input v-model="form.title" @input="titleToSlug"
            style="background:transparent;border:none;outline:none;font-size:16px;font-weight:700;color:var(--text);font-family:inherit;flex:1;min-width:0"
            placeholder="Beitragstitel..." />
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
            <code style="font-size:11px;color:var(--text-muted)">/blog/{{ form.slug }}</code>
            <button @click="showModal=false" class="icon-btn"><i class="ti ti-x"></i></button>
          </div>
        </div>

        <!-- Zweispaltiger Bereich: Meta+Cover links, Editor rechts -->
        <div class="blog-editor-grid">

          <!-- Linke Spalte: Meta-Felder + Cover -->
          <div class="blog-meta-col">
            <div class="blog-field">
              <label>Excerpt</label>
              <input v-model="form.excerpt" placeholder="Kurzbeschreibung..." />
            </div>
            <div class="blog-field">
              <label>Tags</label>
              <input v-model="tagsInput" placeholder="tag1, tag2" />
            </div>
            <div class="blog-field">
              <label>Kategorie
                <NuxtLink to="/settings" style="color:var(--text-muted);margin-left:4px" title="Kategorien verwalten">
                  <i class="ti ti-settings" style="font-size:11px"></i>
                </NuxtLink>
              </label>
              <select v-model="form.category">
                <option value="">Keine</option>
                <option v-for="cat in blogCategories" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>

            <!-- Cover -->
            <div class="blog-field">
              <label>Cover-Bild</label>
              <ImageUploadCrop v-model="form.coverImageUrl" s3-prefix="blog/" file-name-prefix="blog" :ratios="[[16, 9], [1, 1]]" />
            </div>
          </div>

          <!-- Rechte Spalte: Editor -->
          <div class="blog-editor-col">
            <div style="display:flex;justify-content:flex-end;gap:8px;padding:10px 20px;border-bottom:0.5px solid var(--border);background:var(--bg-elevated);flex-shrink:0">
              <div style="display:flex;background:var(--bg);border:1px solid var(--border);border-radius:6px;overflow:hidden;flex-shrink:0">
                <button v-for="ct in ['markdown','html']" :key="ct" @click="form.contentType = ct"
                  style="padding:4px 10px;font-size:11px;font-weight:600;border:none;cursor:pointer;transition:all .15s;font-family:inherit;text-transform:uppercase;letter-spacing:.05em"
                  :style="form.contentType === ct ? 'background:var(--accent);color:#fff' : 'background:transparent;color:var(--text-muted)'">
                  {{ ct }}
                </button>
              </div>
              <select v-model="monacoTheme" style="background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:11px;color:var(--text);font-family:inherit;cursor:pointer;flex-shrink:0">
                <option v-for="t in monacoThemes" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </div>

            <ClientOnly>
              <VueMonacoEditor
                v-model:value="form.content"
                :language="form.contentType === 'markdown' ? 'markdown' : 'html'"
                :theme="monacoTheme"
                :options="{ fontSize:13, lineHeight:22, minimap:{enabled:false}, wordWrap:'on', tabSize:2, scrollBeyondLastLine:false, fontFamily:'\'JetBrains Mono\',\'Fira Code\',monospace', padding:{top:16,bottom:16} }"
                style="flex:1;min-height:0"
              />
              <template #fallback>
                <div style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--text-muted)">
                  <i class="ti ti-loader-2 spin"></i>
                </div>
              </template>
            </ClientOnly>
          </div>

          <!-- Rechte Spalte: Live-Vorschau -->
          <div class="blog-preview-col">
            <div style="padding:10px 20px;border-bottom:0.5px solid var(--border);background:var(--bg-elevated);flex-shrink:0;font-size:11px;font-weight:600;color:var(--text-muted);display:flex;align-items:center;gap:6px">
              <i class="ti ti-eye"></i> Live-Vorschau
            </div>
            <div class="blog-preview-body">
              <div v-if="form.coverImageUrl" class="blog-preview-cover"><img :src="form.coverImageUrl" alt="" /></div>
              <h1 class="blog-preview-title">{{ form.title || 'Beitragstitel...' }}</h1>
              <p v-if="form.excerpt" class="blog-preview-excerpt">{{ form.excerpt }}</p>
              <div class="prose-content" v-html="renderedPreview"></div>
            </div>
          </div>

        </div>

        <!-- Modal Footer -->
        <div style="padding:14px 20px;border-top:0.5px solid var(--border);background:var(--bg-elevated);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
          <button @click="form.status = form.status === 'published' ? 'draft' : 'published'"
            style="padding:6px 16px;font-size:12px;font-weight:700;border-radius:8px;border:none;cursor:pointer;transition:all .15s;font-family:inherit"
            :style="form.status === 'published' ? 'background:#22c55e22;color:#22c55e;border:1px solid #22c55e44' : 'background:var(--border);color:var(--text-muted)'">
            {{ form.status === 'published' ? '● Live' : '○ Entwurf' }}
          </button>
          <div style="display:flex;gap:16px">
            <button @click="showModal=false" class="icon-btn" style="padding:0 16px;font-size:12px">Abbrechen</button>
            <button class="accent-btn" :disabled="saving || !form.title" @click="savePost">
              <i v-if="saving" class="ti ti-loader-2 spin"></i>
              <span v-else><i class="ti ti-device-floppy" style="margin-right:4px"></i>Speichern</span>
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { VueMonacoEditor } from '@guolao/vue-monaco-editor'
import { marked } from 'marked'
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const userEmail = ref('')
const authToken = ref('')

interface BlogPost {
  postId:        string
  title:         string
  slug:          string
  excerpt:       string
  content:       string
  contentType:   string
  status:        string
  coverImageUrl: string
  category:      string
  tags:          string[]
  publishedAt:   string
  createdAt:     string
  updatedAt:     string
}

const posts      = ref<BlogPost[]>([])
const loading         = ref(true)
const saving          = ref(false)
const showModal       = ref(false)
const activeTab       = ref('all')
const editingId       = ref('')
const categoryFilter  = ref('')

const tabs = [
  { key: 'all',   label: 'Alle',     icon: 'ti-list' },
  { key: 'live',  label: 'Live',     icon: 'ti-circle-check' },
  { key: 'draft', label: 'Entwürfe', icon: 'ti-pencil' },
]

const form = reactive({
  title:        '',
  slug:         '',
  excerpt:      '',
  content:      '# Neuer Beitrag\n\nHier beginnt dein Text...',
  contentType:  'markdown',
  status:       'draft',
  coverImageUrl:'',
  category:     '',
  tags:         [] as string[],
})

const tagsInput = computed({
  get: () => form.tags.join(', '),
  set: (v: string) => { form.tags = v.split(',').map(t => t.trim()).filter(Boolean) },
})

const renderedPreview = computed(() => {
  if (form.contentType === 'markdown') return marked.parse(form.content || '') as string
  return form.content || ''
})

const monacoTheme  = ref(import.meta.client ? (localStorage.getItem('plx_editor_theme') || 'vs-dark') : 'vs-dark')
const monacoThemes = [
  { value: 'vs-dark',  label: 'VS Dark'  },
  { value: 'vs',       label: 'VS Light' },
  { value: 'hc-black', label: 'HC Dark'  },
  { value: 'hc-light', label: 'HC Light' },
]

const allCategories = computed(() =>
  [...new Set(posts.value.map(p => p.category).filter(Boolean))]
)

const blogCategories = ref<string[]>([])

async function loadBlogCategories() {
  try {
    const { useAuthHeader } = await import('~/composables/useAuth')
    const res = await $fetch<{ categories: Record<string, string[]> }>(useApiUrl('/api/settings/categories'), { headers: await useAuthHeader() })
    blogCategories.value = res.categories?.blog || []
  } catch {}
}

const filteredPosts = computed(() => {
  let result = posts.value
  if (activeTab.value === 'live')  result = result.filter(p => p.status === 'published')
  if (activeTab.value === 'draft') result = result.filter(p => p.status !== 'published')
  if (categoryFilter.value) result = result.filter(p => p.category === categoryFilter.value)
  return result
})

function tabCount(key: string) {
  if (key === 'all')   return posts.value.length || 0
  if (key === 'live')  return posts.value.filter(p => p.status === 'published').length || 0
  if (key === 'draft') return posts.value.filter(p => p.status !== 'published').length || 0
  return 0
}

function formatDate(d?: string) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function titleToSlug() {
  form.slug = form.title
    .toLowerCase()
    .replace(/[äöüß]/g, c => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }[c] || c))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function resetForm() {
  form.title = ''; form.slug = ''; form.excerpt = ''; form.content = '# Neuer Beitrag\n\nHier beginnt dein Text...'
  form.contentType = 'markdown'; form.status = 'draft'; form.coverImageUrl = ''; form.category = ''; form.tags = []
  editingId.value = ''
}

function openNew() {
  resetForm()
  showModal.value = true
}

function openEdit(p: BlogPost) {
  form.title         = p.title
  form.slug          = p.slug
  form.excerpt       = p.excerpt || ''
  form.content       = p.content || ''
  form.contentType   = p.contentType || 'markdown'
  form.status        = p.status || 'draft'
  form.coverImageUrl = p.coverImageUrl || ''
  form.category      = p.category || ''
  form.tags          = p.tags || []
  editingId.value    = p.postId
  showModal.value    = true
}


async function loadPosts() {
  loading.value = true
  try {
    const res = await $fetch<{ posts: BlogPost[] }>(useApiUrl('/api/blog'), {
      headers: { 'x-user-email': userEmail.value, Authorization: `Bearer ${authToken.value}` },
    })
    posts.value = res.posts || []
  } catch {}
  loading.value = false
}

async function savePost() {
  if (!form.title) return
  saving.value = true
  try {
    if (!editingId.value) {
      await $fetch(useApiUrl('/api/blog'), {
        method: 'POST',
        headers: { 'x-user-email': userEmail.value, Authorization: `Bearer ${authToken.value}` },
        body: { ...form },
      })
    } else {
      await $fetch(useApiUrl(`/api/blog/${editingId.value}`), {
        method: 'PUT',
        headers: { 'x-user-email': userEmail.value, Authorization: `Bearer ${authToken.value}` },
        body: { ...form },
      })
    }
    showModal.value = false
    await loadPosts()
  } catch {}
  saving.value = false
}

async function deletePost(p: BlogPost) {
  if (!confirm(`"${p.title}" wirklich löschen?`)) return
  await $fetch(useApiUrl(`/api/blog/${p.postId}`), {
    method: 'DELETE',
    headers: { 'x-user-email': userEmail.value, Authorization: `Bearer ${authToken.value}` },
  })
  await loadPosts()
}

onMounted(async () => {
  const { useAuthUser } = await import('~/composables/useAuth')
  const u = await useAuthUser()
  userEmail.value = u.email || ''
  authToken.value = u.idToken || ''
  await Promise.all([loadPosts(), loadBlogCategories()])
})
</script>

<style scoped>
.blog-editor-grid {
  display: grid;
  grid-template-columns: 320px 1fr 1fr;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.blog-meta-col {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 20px;
  border-right: 0.5px solid var(--border);
  background: var(--bg-elevated);
  overflow-y: auto;
}
.blog-editor-col {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 0.5px solid var(--border);
}
.blog-preview-col {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.blog-preview-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
}
.blog-preview-cover {
  border-radius: 10px;
  overflow: hidden;
  aspect-ratio: 16/9;
  margin-bottom: 20px;
  background: var(--bg-elevated);
}
.blog-preview-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
.blog-preview-title { font-size: 26px; font-weight: 800; margin: 0 0 8px; line-height: 1.2; }
.blog-preview-excerpt { font-size: 14px; color: var(--text-muted); margin: 0 0 20px; }
.prose-content { font-size: 14px; line-height: 1.7; color: var(--text); }
.prose-content :deep(h1) { font-size: 24px; font-weight: 800; margin: 28px 0 12px; }
.prose-content :deep(h2) { font-size: 20px; font-weight: 700; margin: 24px 0 10px; }
.prose-content :deep(h3) { font-size: 16px; font-weight: 700; margin: 20px 0 8px; }
.prose-content :deep(p) { margin: 0 0 14px; }
.prose-content :deep(ul),
.prose-content :deep(ol) { margin: 0 0 14px; padding-left: 22px; }
.prose-content :deep(li) { margin-bottom: 4px; }
.prose-content :deep(a) { color: var(--accent); }
.prose-content :deep(strong) { font-weight: 700; }
.prose-content :deep(blockquote) { border-left: 3px solid var(--accent); padding-left: 14px; color: var(--text-muted); margin: 0 0 14px; }
.prose-content :deep(code) { background: var(--bg-elevated); border-radius: 4px; padding: 2px 6px; font-size: 12.5px; }
.prose-content :deep(pre) { background: var(--bg-elevated); border-radius: 8px; padding: 14px; overflow-x: auto; margin: 0 0 14px; }
.prose-content :deep(img) { max-width: 100%; border-radius: 8px; }
.blog-field label {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 5px;
}
.blog-field input,
.blog-field select {
  width: 100%;
  height: 32px;
  font-size: 12px;
  font-family: inherit;
  color: var(--text);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0 10px;
}
@media (max-width: 1300px) {
  .blog-editor-grid { grid-template-columns: 280px 1fr; }
  .blog-preview-col { display: none; }
}
@media (max-width: 900px) {
  .blog-editor-grid {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }
  .blog-meta-col {
    border-right: none;
    border-bottom: 0.5px solid var(--border);
    overflow-y: visible;
  }
  .blog-editor-col {
    min-height: 400px;
    border-right: none;
  }
}
</style>
