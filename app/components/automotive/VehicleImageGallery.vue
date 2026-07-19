<template>
  <div class="vig-wrap">
    <div
      class="vig-dropzone" :class="{ active: dragActive }"
      @dragover.prevent="dragActive = true" @dragleave.prevent="dragActive = false"
      @drop.prevent="onDrop" @click="fileInputRef?.click()">
      <i class="ti" :class="uploading ? 'ti-loader-2 spin' : 'ti-photo-plus'"></i>
      <div class="vig-dropzone-text">
        <template v-if="uploading">{{ uploadDone }}/{{ uploadTotal }} hochgeladen...</template>
        <template v-else>Bilder hierher ziehen oder klicken — auch als ZIP-Datei möglich</template>
      </div>
    </div>
    <input ref="fileInputRef" type="file" accept="image/*,.zip" multiple style="display:none" @change="onFileSelected" />

    <div v-if="model.length" class="vig-grid">
      <div v-for="(url, idx) in model" :key="url" class="vig-thumb" :class="{ cover: idx === 0 }">
        <img :src="url" loading="lazy" />
        <span v-if="idx === 0" class="vig-cover-badge"><i class="ti ti-star-filled"></i> Titelbild</span>
        <div class="vig-thumb-actions">
          <button v-if="idx !== 0" type="button" title="Als Titelbild setzen" @click="makeCover(idx)"><i class="ti ti-star"></i></button>
          <button type="button" class="danger" title="Entfernen" @click="removeImage(idx)"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    </div>
    <div v-else class="vig-empty">Noch keine Bilder — erstes Bild wird automatisch Titelbild.</div>
  </div>
</template>

<script setup lang="ts">
import JSZip from 'jszip'

const model = defineModel<string[]>({ default: () => [] })

const MAX_IMAGES = 60
const BATCH_SIZE = 4
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif']

const fileInputRef = ref<HTMLInputElement | null>(null)
const dragActive    = ref(false)
const uploading      = ref(false)
const uploadTotal    = ref(0)
const uploadDone     = ref(0)

async function extractZipImages(zipFile: File): Promise<File[]> {
  const zip = await JSZip.loadAsync(zipFile)
  const out: File[] = []
  for (const [relPath, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue
    const ext = relPath.split('.').pop()?.toLowerCase() || ''
    if (!IMAGE_EXTENSIONS.includes(ext)) continue
    const blob = await entry.async('blob')
    const name = relPath.split('/').pop() || relPath
    out.push(new File([blob], name, { type: blob.type || `image/${ext === 'jpg' ? 'jpeg' : ext}` }))
  }
  return out
}

async function uploadOne(file: File, headers: Record<string, string>): Promise<string | null> {
  try {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload  = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    // Eindeutiger Dateiname nötig — /api/aws/s3-upload dedupliziert nicht selbst,
    // Kamera-/Handy-Fotos heißen sehr oft identisch (IMG_0001.jpg) und würden sich sonst
    // gegenseitig in S3 überschreiben.
    const uniqueName = `${crypto.randomUUID()}-${file.name}`
    const res = await $fetch<{ success: boolean; url?: string; key?: string }>(useApiUrl('/api/aws/s3-upload'), {
      method:  'POST',
      headers,
      body:    { fileBase64: base64, fileName: uniqueName, prefix: 'automotive/' },
    })
    if (res?.url) return res.url
    if (res?.key) return `https://plexora-files.s3.eu-central-1.amazonaws.com/${res.key}`
    return null
  } catch (err) {
    console.error('Bild-Upload fehlgeschlagen:', file.name, err)
    return null
  }
}

async function uploadFiles(files: File[]) {
  const remaining = MAX_IMAGES - model.value.length
  if (remaining <= 0) return
  const toUpload = files.slice(0, remaining)
  if (!toUpload.length) return

  uploading.value   = true
  uploadTotal.value = toUpload.length
  uploadDone.value  = 0
  try {
    const { useAuthHeader } = await import('~/composables/useAuth')
    const headers = await useAuthHeader()
    for (let i = 0; i < toUpload.length; i += BATCH_SIZE) {
      const chunk = toUpload.slice(i, i + BATCH_SIZE)
      const urls = await Promise.all(chunk.map(f => uploadOne(f, headers)))
      const ok = urls.filter((u): u is string => !!u)
      if (ok.length) model.value = [...model.value, ...ok]
      uploadDone.value += chunk.length
    }
  } finally {
    uploading.value = false
  }
}

async function processDropped(fileList: FileList | File[]) {
  const files = Array.from(fileList)
  const imageFiles: File[] = []
  for (const f of files) {
    if (f.name.toLowerCase().endsWith('.zip') || f.type === 'application/zip') {
      try {
        imageFiles.push(...await extractZipImages(f))
      } catch (err) {
        console.error('ZIP konnte nicht entpackt werden:', f.name, err)
      }
    } else if (f.type.startsWith('image/')) {
      imageFiles.push(f)
    }
  }
  if (imageFiles.length) await uploadFiles(imageFiles)
}

function onDrop(e: DragEvent) {
  dragActive.value = false
  if (e.dataTransfer?.files?.length) processDropped(e.dataTransfer.files)
}

function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.length) processDropped(input.files)
  input.value = ''
}

function makeCover(idx: number) {
  if (idx === 0) return
  const arr = [...model.value]
  const [item] = arr.splice(idx, 1)
  arr.unshift(item)
  model.value = arr
}

function removeImage(idx: number) {
  const arr = [...model.value]
  arr.splice(idx, 1)
  model.value = arr
}
</script>

<style scoped>
.vig-wrap { display: flex; flex-direction: column; gap: 12px; }
.vig-dropzone {
  display: flex; align-items: center; gap: 10px; justify-content: center;
  border: 1.5px dashed var(--border); border-radius: 10px; padding: 18px;
  cursor: pointer; color: var(--text-muted); font-size: 13px; transition: border-color .15s, background .15s;
}
.vig-dropzone:hover, .vig-dropzone.active { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 6%, transparent); color: var(--text); }
.vig-dropzone i { font-size: 20px; }

.vig-empty { font-size: 12px; color: var(--text-muted); text-align: center; padding: 8px; }

.vig-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 8px; }
.vig-thumb { position: relative; aspect-ratio: 4/3; border-radius: 8px; overflow: hidden; background: var(--bg-elevated); border: 1.5px solid transparent; }
.vig-thumb.cover { border-color: var(--accent); }
.vig-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.vig-cover-badge {
  position: absolute; top: 4px; left: 4px; background: var(--accent); color: #fff; font-size: 9px; font-weight: 700;
  padding: 2px 6px; border-radius: 20px; display: flex; align-items: center; gap: 3px;
}
.vig-thumb-actions {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 6px;
  background: rgba(0,0,0,.45); opacity: 0; transition: opacity .15s;
}
.vig-thumb:hover .vig-thumb-actions { opacity: 1; }
.vig-thumb-actions button {
  width: 28px; height: 28px; border-radius: 50%; border: none; background: rgba(255,255,255,.9); color: #1a1a1a;
  cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 13px;
}
.vig-thumb-actions button.danger:hover { background: #ef4444; color: #fff; }
.vig-thumb-actions button:hover { background: var(--accent); color: #fff; }
</style>
