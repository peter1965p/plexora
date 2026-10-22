<template>
    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-cloud" style="margin-right:8px;color:var(--accent)"></i>AWS Controlcenter</span>
        <button class="accent-btn" style="height:32px;font-size:12px" @click="loadAws" :disabled="awsLoading">
          <i class="ti" :class="awsLoading ? 'ti-loader-2 spin' : 'ti-refresh'"></i> {{ awsLoading ? 'Lädt...' : 'Aktualisieren' }}
        </button>
      </div>
      <div class="card-body">
        <!-- Status Pills -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px">
          <div class="infra-pill"><i class="ti ti-shield-check" style="color:#00D4B4"></i><div><div style="font-size:12px;font-weight:600;color:var(--text-primary)">AWS Cognito</div><div style="font-size:11px;color:var(--text-muted)">Auth — Frankfurt</div></div></div>
          <div class="infra-pill"><i class="ti ti-database" style="color:var(--accent)"></i><div><div style="font-size:12px;font-weight:600;color:var(--text-primary)">DynamoDB</div><div style="font-size:11px;color:var(--text-muted)">{{ awsData.tables.length }} Tabellen aktiv</div></div></div>
          <div class="infra-pill"><i class="ti ti-world" style="color:#F0B428"></i><div><div style="font-size:12px;font-weight:600;color:var(--text-primary)">Cloudflare</div><div style="font-size:11px;color:var(--text-muted)">app.plexora.eu</div></div></div>
        </div>
        <!-- DynamoDB -->
        <div style="margin-bottom:24px">
          <div style="font-size:13px;font-weight:700;margin-bottom:12px"><i class="ti ti-database" style="color:var(--accent);margin-right:6px"></i>DynamoDB Tabellen</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
            <div v-for="t in awsData.tables" :key="t.name" style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:10px;padding:12px">
              <div style="font-size:12px;font-weight:600;margin-bottom:4px">{{ t.name.replace('plexora-','') }}</div>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-size:11px;color:var(--text-muted)">{{ t.itemCount }} Items</span>
                <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:var(--bg-surface);color:#00D4B4">{{ t.status }}</span>
              </div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:4px">{{ (t.sizeBytes/1024).toFixed(1) }} KB</div>
            </div>
          </div>
        </div>
        <!-- Lambda -->
        <div style="margin-bottom:24px">
          <div style="font-size:13px;font-weight:700;margin-bottom:12px"><i class="ti ti-bolt" style="color:var(--accent);margin-right:6px"></i>Lambda Functions</div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
            <div v-for="f in awsData.functions" :key="f.name" style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:10px;padding:12px">
              <div style="font-size:12px;font-weight:600;margin-bottom:6px">{{ f.name }}</div>
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                <span style="font-size:10px;padding:2px 8px;border-radius:4px;background:var(--bg-surface);color:var(--text-muted)">{{ f.runtime }}</span>
                <span style="font-size:10px;padding:2px 8px;border-radius:4px;background:var(--bg-surface);color:var(--text-muted)">{{ f.memory }} MB</span>
                <span style="font-size:10px;padding:2px 8px;border-radius:4px;background:var(--bg-surface);color:var(--text-muted)">{{ f.timeout }}s</span>
                <span style="font-size:10px;padding:2px 8px;border-radius:4px;background:var(--bg-surface);color:var(--text-muted)">{{ (f.codeSize/1024/1024).toFixed(1) }} MB</span>
              </div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:6px">{{ new Date(f.lastModified).toLocaleString('de-DE') }}</div>
            </div>
          </div>
        </div>
        <!-- Logs -->
        <div style="margin-bottom:24px">
          <div style="font-size:13px;font-weight:700;margin-bottom:12px"><i class="ti ti-terminal" style="color:var(--accent);margin-right:6px"></i>Letzte Lambda Logs</div>
          <div style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:10px;padding:16px;font-family:monospace;font-size:11px;max-height:200px;overflow-y:auto">
            <div v-if="!awsData.logs.length" style="color:var(--text-muted)">Keine Logs — klick Aktualisieren</div>
            <div v-for="(e,i) in awsData.logs" :key="i" style="margin-bottom:4px;line-height:1.5">
              <span style="color:var(--text-muted)">{{ new Date(e.timestamp).toLocaleTimeString('de-DE') }}</span>
              <span :style="`margin-left:8px;color:${e.message?.includes('ERROR') ? '#E05C5C' : e.message?.includes('REPORT') ? '#F0B428' : 'var(--text-primary)'}`">{{ e.message?.trim() }}</span>
            </div>
          </div>
        </div>

        <!-- S3 Filemanager -->
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <div style="font-size:13px;font-weight:700"><i class="ti ti-folder" style="color:var(--accent);margin-right:6px"></i>S3 Filemanager — plexora-files</div>
            <div style="display:flex;gap:8px">
              <input ref="s3FileInput" type="file" style="display:none" @change="onS3FileChange" />
              <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" :disabled="s3Uploading" @click="s3FileInput?.click()">
                <span v-if="s3Uploading"><i class="ti ti-loader-2 spin"></i></span>
                <span v-else><i class="ti ti-upload"></i> Datei hochladen</span>
              </button>
            </div>
          </div>

          <!-- Breadcrumb -->
          <div style="display:flex;align-items:center;gap:4px;margin-bottom:12px;font-size:12px;color:var(--text-muted)">
            <button style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:12px;padding:0" @click="s3GoTo('')">
              <i class="ti ti-folder"></i> plexora-files
            </button>
            <template v-for="(part, i) in s3Breadcrumbs" :key="i">
              <span>/</span>
              <button style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:12px;padding:0" @click="s3GoTo(s3Breadcrumbs.slice(0,i+1).join('/') + '/')">{{ part }}</button>
            </template>
          </div>

          <div v-if="s3Loading" style="text-align:center;padding:24px;color:var(--text-muted)"><i class="ti ti-loader-2 spin"></i> Lädt...</div>

          <div v-else style="border:0.5px solid var(--border);border-radius:10px;overflow:hidden">
            <div v-if="!s3Data.folders.length && !s3Data.files.length" style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">
              Dieser Ordner ist leer.
            </div>

            <div v-for="f in s3Data.folders" :key="f.prefix"
              style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:0.5px solid var(--border);cursor:pointer;transition:background 0.1s"
              @click="s3GoTo(f.prefix)"
              @mouseenter="e => e.currentTarget.style.background='var(--bg-elevated)'"
              @mouseleave="e => e.currentTarget.style.background='transparent'">
              <i class="ti ti-folder-filled" style="color:var(--accent);font-size:18px"></i>
              <span style="font-size:13px;font-weight:600">{{ f.name }}</span>
            </div>

            <div v-for="o in s3Data.files" :key="o.key"
              style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:0.5px solid var(--border)">
              <i class="ti ti-file" style="color:var(--text-muted);font-size:18px"></i>
              <span style="font-size:13px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ o.name }}</span>
              <span style="font-size:11px;color:var(--text-muted);white-space:nowrap">{{ formatBytes(o.size) }}</span>
              <span style="font-size:11px;color:var(--text-muted);white-space:nowrap">{{ o.lastModified ? new Date(o.lastModified).toLocaleDateString('de-DE') : '' }}</span>
              <button style="background:none;border:0.5px solid var(--border);border-radius:6px;color:var(--text-muted);cursor:pointer;padding:4px 8px;font-size:11px" @click="copyS3Url(o.url)" title="URL kopieren">
                <i class="ti ti-link"></i>
              </button>
              <a :href="o.url" target="_blank" style="background:none;border:0.5px solid var(--border);border-radius:6px;color:var(--text-muted);cursor:pointer;padding:4px 8px;font-size:11px;text-decoration:none;display:inline-flex" title="Öffnen">
                <i class="ti ti-external-link"></i>
              </a>
              <button style="background:none;border:0.5px solid var(--border);border-radius:6px;color:#E05C5C;cursor:pointer;padding:4px 8px;font-size:11px" @click="deleteS3Object(o.key)" title="Löschen">
                <i class="ti ti-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
</template>

<script setup lang="ts">
// Infrastruktur im PSC Manager: AWS-Überblick (Tabellen, Funktionen, Protokolle) und Dateiverwaltung des Speichers. Aus den Einstellungen hierher verschoben.
const { openConfirm } = useConfirm()
const awsLoading = ref(false)
const awsData = reactive({ tables: [], functions: [], logs: [] })

// ── S3 Filemanager ──────────────────────────────────
const s3Loading = ref(false)
const s3Uploading = ref(false)
const s3Prefix = ref('')
const s3FileInput = ref<HTMLInputElement | null>(null)
const s3Data = reactive({ folders: [] as any[], files: [] as any[] })
const s3Breadcrumbs = computed(() => s3Prefix.value.split('/').filter(Boolean))

function formatBytes(bytes: number) {
  if (!bytes) return '0 B'
  const units = ['B','KB','MB','GB']
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++ }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

async function loadS3() {
  s3Loading.value = true
  try {
    const { useAuthHeader } = await import('~/composables/useAuth')
    const res = await $fetch(useApiUrl('/api/aws/s3'), { query: { prefix: s3Prefix.value }, headers: await useAuthHeader() }) as any
    s3Data.folders = res.folders || []
    s3Data.files = res.files || []
  } catch(e) { console.error(e) }
  s3Loading.value = false
}

function s3GoTo(prefix: string) {
  s3Prefix.value = prefix
  loadS3()
}

async function onS3FileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  s3Uploading.value = true
  try {
    const reader = new FileReader()
    const fileBase64 = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    const { useAuthHeader } = await import('~/composables/useAuth')
    await $fetch(useApiUrl('/api/aws/s3-upload'), {
      method: 'POST',
      headers: await useAuthHeader(),
      body: { fileBase64, fileName: file.name, prefix: s3Prefix.value }
    })
    await loadS3()
  } finally {
    s3Uploading.value = false
    if (s3FileInput.value) s3FileInput.value.value = ''
  }
}

async function deleteS3Object(key: string) {
  if (!await openConfirm({ title: 'Datei löschen?', name: key, icon: 'ti-file-off' })) return
  const { useAuthHeader } = await import('~/composables/useAuth')
  await $fetch(useApiUrl('/api/aws/s3-delete'), { method: 'POST', headers: await useAuthHeader(), body: { key } })
  await loadS3()
}

function copyS3Url(url: string) {
  navigator.clipboard.writeText(url)
}

async function loadAws() {
  awsLoading.value = true
  try {
    const { useAuthHeader } = await import('~/composables/useAuth')
    const authHeaders = await useAuthHeader()
    const [dynamo, lambda, logs] = await Promise.all([
      $fetch(useApiUrl('/api/aws/dynamo'), { headers: authHeaders }),
      $fetch(useApiUrl('/api/aws/lambda'), { headers: authHeaders }),
      $fetch(useApiUrl('/api/aws/logs'), { headers: authHeaders }),
    ])
    awsData.tables    = (dynamo as any).tables    || []
    awsData.functions = (lambda as any).functions || []
    awsData.logs      = (logs as any).events      || []
  } catch(e) { console.error(e) }
  awsLoading.value = false
}

onMounted(() => { if (tab.value === 'infra') { loadAws(); loadS3() } })
onMounted(() => { loadAws(); loadS3() })
</script>
