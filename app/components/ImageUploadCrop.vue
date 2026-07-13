<template>
  <div>
    <div v-if="cropSrc" style="margin-bottom:10px">
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">Zuschneiden — dann "Übernehmen" klicken:</div>
      <div style="position:relative;overflow:hidden;border-radius:8px;border:0.5px solid var(--border);background:#000">
        <img ref="cropImgRef" :src="cropSrc" style="width:100%;max-height:220px;object-fit:contain;display:block" />
        <div v-if="cropRect" :style="`position:absolute;border:2px solid #fff;box-shadow:0 0 0 9999px rgba(0,0,0,0.5);pointer-events:none;left:${cropRect.x}px;top:${cropRect.y}px;width:${cropRect.w}px;height:${cropRect.h}px`"></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;align-items:center">
        <button v-for="r in ratios" :key="`${r[0]}:${r[1]}`" class="icon-btn" style="font-size:11px;padding:4px 10px;height:auto" @click="setCropRatio(r[0], r[1])">{{ r[0] }}:{{ r[1] }}</button>
        <button class="icon-btn" style="font-size:11px;padding:4px 10px;height:auto" @click="cropRect=null">Original</button>
        <button class="accent-btn" style="height:28px;font-size:12px;padding:0 14px;margin-left:auto" :disabled="uploading" @click="confirmCropAndUpload">
          <i class="ti" :class="uploading ? 'ti-loader-2 spin' : 'ti-check'"></i>
          {{ uploading ? 'Lädt...' : 'Übernehmen' }}
        </button>
        <button class="icon-btn" style="color:var(--danger)" @click="cropSrc=null;cropRect=null"><i class="ti ti-x"></i></button>
      </div>
    </div>

    <div v-if="modelValue && !cropSrc" style="margin-bottom:10px;border-radius:8px;overflow:hidden;border:0.5px solid var(--border);position:relative">
      <img :src="modelValue" style="width:100%;max-height:160px;object-fit:cover;display:block" />
      <div style="position:absolute;top:6px;right:6px;display:flex;gap:4px">
        <label style="cursor:pointer">
          <input type="file" accept="image/*" style="display:none" @change="selectFile" />
          <span class="icon-btn" style="background:rgba(0,0,0,0.6);display:inline-flex;align-items:center;justify-content:center;pointer-events:none"><i class="ti ti-pencil"></i></span>
        </label>
        <button class="icon-btn" style="background:rgba(0,0,0,0.6);color:var(--danger)" @click="emit('update:modelValue', '')"><i class="ti ti-trash"></i></button>
      </div>
    </div>

    <label v-if="!modelValue && !cropSrc" style="cursor:pointer;display:block">
      <input type="file" accept="image/*" style="display:none" @change="selectFile" />
      <span class="accent-btn" style="height:32px;font-size:12px;padding:0 14px;display:inline-flex;align-items:center;gap:6px;pointer-events:none"><i class="ti ti-photo-up"></i> Bild hochladen</span>
    </label>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string
  s3Prefix: string
  fileNamePrefix?: string
  ratios?: [number, number][]
}>(), {
  fileNamePrefix: 'img',
  ratios: () => [[16, 9], [3, 1]],
})
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const uploading = ref(false)
const cropSrc    = ref<string | null>(null)
const cropRect   = ref<{ x: number; y: number; w: number; h: number } | null>(null)
const cropImgRef = ref<HTMLImageElement | null>(null)
let _cropFile: File | null = null

function selectFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  _cropFile = file
  const reader = new FileReader()
  reader.onload = ev => { cropSrc.value = ev.target?.result as string; cropRect.value = null }
  reader.readAsDataURL(file)
}

function setCropRatio(rw: number, rh: number) {
  const img = cropImgRef.value
  if (!img) return
  const dw = img.clientWidth, dh = img.clientHeight
  const ratio = rw / rh
  let w = dw, h = Math.round(w / ratio)
  if (h > dh) { h = dh; w = Math.round(h * ratio) }
  cropRect.value = { x: Math.round((dw - w) / 2), y: Math.round((dh - h) / 2), w, h }
}

async function confirmCropAndUpload() {
  if (!_cropFile) return
  uploading.value = true
  try {
    let uploadFile: File = _cropFile
    if (cropRect.value && cropImgRef.value) {
      const img = cropImgRef.value
      const sx = img.naturalWidth / img.clientWidth
      const sy = img.naturalHeight / img.clientHeight
      const { x, y, w, h } = cropRect.value
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(w * sx)
      canvas.height = Math.round(h * sy)
      canvas.getContext('2d')!.drawImage(img, Math.round(x*sx), Math.round(y*sy), canvas.width, canvas.height, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob>(r => canvas.toBlob(b => r(b!), 'image/jpeg', 0.92))
      uploadFile = new File([blob], _cropFile.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
    }
    const base64 = await new Promise<string>(r => {
      const reader = new FileReader()
      reader.onload = e => r(e.target!.result as string)
      reader.readAsDataURL(uploadFile)
    })
    const { useAuthHeader } = await import('~/composables/useAuth')
    const res: any = await $fetch(useApiUrl('/api/aws/s3-upload'), {
      method: 'POST',
      headers: await useAuthHeader(),
      body: { fileBase64: base64, fileName: `${props.fileNamePrefix}-${Date.now()}.jpg`, prefix: props.s3Prefix }
    })
    const url = res?.url || (res?.key ? `https://plexora-files.s3.eu-central-1.amazonaws.com/${res.key}` : '')
    if (url) emit('update:modelValue', url)
    cropSrc.value = null; cropRect.value = null; _cropFile = null
  } catch {
    alert('Upload fehlgeschlagen — bitte erneut versuchen.')
  } finally {
    uploading.value = false
  }
}
</script>
