<template>
  <div class="nlte-wrap">
    <div class="nlte-toolbar">
      <button type="button" class="nlte-btn" :class="{ active: editor?.isActive('bold') }" title="Fett" @click="editor?.chain().focus().toggleBold().run()"><i class="ti ti-bold"></i></button>
      <button type="button" class="nlte-btn" :class="{ active: editor?.isActive('italic') }" title="Kursiv" @click="editor?.chain().focus().toggleItalic().run()"><i class="ti ti-italic"></i></button>
      <button type="button" class="nlte-btn" :class="{ active: editor?.isActive('underline') }" title="Unterstrichen" @click="editor?.chain().focus().toggleUnderline().run()"><i class="ti ti-underline"></i></button>
      <span class="nlte-sep"></span>
      <button type="button" class="nlte-btn" :class="{ active: editor?.isActive('heading', { level: 1 }) }" title="Überschrift 1" @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()">H1</button>
      <button type="button" class="nlte-btn" :class="{ active: editor?.isActive('heading', { level: 2 }) }" title="Überschrift 2" @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()">H2</button>
      <span class="nlte-sep"></span>
      <button type="button" class="nlte-btn" :class="{ active: editor?.isActive('bulletList') }" title="Aufzählung" @click="editor?.chain().focus().toggleBulletList().run()"><i class="ti ti-list"></i></button>
      <button type="button" class="nlte-btn" :class="{ active: editor?.isActive('orderedList') }" title="Nummerierte Liste" @click="editor?.chain().focus().toggleOrderedList().run()"><i class="ti ti-list-numbers"></i></button>
      <button type="button" class="nlte-btn" :class="{ active: editor?.isActive('blockquote') }" title="Zitat" @click="editor?.chain().focus().toggleBlockquote().run()"><i class="ti ti-blockquote"></i></button>
      <span class="nlte-sep"></span>
      <button type="button" class="nlte-btn" :class="{ active: editor?.isActive('link') }" title="Link" @click="toggleLink"><i class="ti ti-link"></i></button>
      <button type="button" class="nlte-btn" title="Bild einfügen" :disabled="uploading" @click="fileInputRef?.click()">
        <i class="ti" :class="uploading ? 'ti-loader-2 spin' : 'ti-photo-up'"></i>
      </button>
      <button type="button" class="nlte-btn" title="Button einfügen" @click="insertButton"><i class="ti ti-square-rounded-plus"></i></button>
      <span class="nlte-sep"></span>
      <button type="button" class="nlte-btn" title="Rückgängig" @click="editor?.chain().focus().undo().run()"><i class="ti ti-arrow-back-up"></i></button>
      <button type="button" class="nlte-btn" title="Wiederholen" @click="editor?.chain().focus().redo().run()"><i class="ti ti-arrow-forward-up"></i></button>
    </div>

    <div v-if="selectedImage" class="nlte-context-toolbar">
      <span class="nlte-context-label"><i class="ti ti-photo"></i> Bild ausrichten</span>
      <button type="button" class="nlte-btn" title="Links, Text fließt rechts vorbei" @click="setImageAlign('left')"><i class="ti ti-align-left"></i></button>
      <button type="button" class="nlte-btn" title="Zentriert, kein Textumfluss" @click="setImageAlign('center')"><i class="ti ti-align-center"></i></button>
      <button type="button" class="nlte-btn" title="Rechts, Text fließt links vorbei" @click="setImageAlign('right')"><i class="ti ti-align-right"></i></button>
      <span class="nlte-sep"></span>
      <button type="button" class="nlte-btn danger" title="Bild entfernen" @click="editor?.chain().focus().deleteSelection().run()"><i class="ti ti-trash"></i></button>
    </div>

    <div v-if="selectedButton" class="nlte-context-toolbar">
      <span class="nlte-context-label"><i class="ti ti-square-rounded-plus"></i> Button</span>
      <button type="button" class="nlte-btn" title="Bearbeiten" @click="editButton"><i class="ti ti-pencil"></i> Bearbeiten</button>
      <span class="nlte-sep"></span>
      <button type="button" class="nlte-btn danger" title="Button entfernen" @click="editor?.chain().focus().deleteSelection().run()"><i class="ti ti-trash"></i></button>
    </div>

    <ClientOnly>
      <EditorContent :editor="editor" class="nlte-content" />
      <template #fallback>
        <div class="nlte-loading"><i class="ti ti-loader-2 spin"></i></div>
      </template>
    </ClientOnly>

    <input ref="fileInputRef" type="file" accept="image/*" style="display:none" @change="onFileSelected" />
  </div>
</template>

<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { FileHandler } from '@tiptap/extension-file-handler'
import { ImageAlign } from '../blog/extensions/imageAlign'
import { ButtonNode } from './extensions/buttonNode'

const model = defineModel<string>({ default: '' })

const fileInputRef = ref<HTMLInputElement | null>(null)
const uploading   = ref(false)

async function uploadFile(file: File): Promise<string | null> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
  uploading.value = true
  try {
    const { useAuthHeader } = await import('~/composables/useAuth')
    const res = await $fetch<{ success: boolean; url?: string; key?: string }>(useApiUrl('/api/aws/s3-upload'), {
      method:  'POST',
      headers: await useAuthHeader(),
      body:    { fileBase64: base64, fileName: file.name, prefix: 'newsletter/' },
    })
    if (res?.url) return res.url
    if (res?.key) return `https://plexora-files.s3.eu-central-1.amazonaws.com/${res.key}`
    return null
  } catch (err) {
    console.error('Bild-Upload fehlgeschlagen:', err)
    return null
  } finally {
    uploading.value = false
  }
}

const editor = useEditor({
  content: model.value,
  extensions: [
    StarterKit.configure({ link: { protocols: ['http', 'https', 'mailto'] } }),
    ImageAlign.configure({
      resize: { enabled: true, directions: ['top-left', 'top-right', 'bottom-left', 'bottom-right'], minWidth: 80, minHeight: 80 },
    }),
    ButtonNode,
    FileHandler.configure({
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
      onDrop: async (ed, files, pos) => {
        for (const file of files) {
          const url = await uploadFile(file)
          if (url) ed.chain().insertContentAt(pos, { type: 'image', attrs: { src: url } }).focus().run()
        }
      },
      onPaste: async (ed, files) => {
        for (const file of files) {
          const url = await uploadFile(file)
          if (url) ed.chain().focus().setImage({ src: url }).run()
        }
      },
    }),
  ],
  onUpdate: ({ editor: ed }) => { model.value = ed.getHTML() },
})

watch(model, (v) => {
  if (!editor.value) return
  if (v === editor.value.getHTML()) return
  editor.value.commands.setContent(v || '', { emitUpdate: false })
})

onBeforeUnmount(() => { editor.value?.destroy() })

const selectedImage  = computed(() => editor.value?.isActive('image') ?? false)
const selectedButton = computed(() => editor.value?.isActive('newsletterButton') ?? false)

function setImageAlign(align: 'left' | 'center' | 'right') {
  editor.value?.chain().focus().updateAttributes('image', { align }).run()
}

function toggleLink() {
  if (!editor.value) return
  if (editor.value.isActive('link')) {
    editor.value.chain().focus().unsetLink().run()
    return
  }
  const url = window.prompt('Link-URL:')
  if (!url) return
  editor.value.chain().focus().setLink({ href: url }).run()
}

function insertButton() {
  if (!editor.value) return
  const label = window.prompt('Button-Text:', 'Jetzt ansehen')
  if (!label) return
  const href = window.prompt('Ziel-URL:', 'https://')
  if (!href) return
  editor.value.chain().focus().setButton({ href, label }).run()
}

function editButton() {
  if (!editor.value) return
  const attrs = editor.value.getAttributes('newsletterButton')
  const label = window.prompt('Button-Text:', attrs.label || '')
  if (!label) return
  const href = window.prompt('Ziel-URL:', attrs.href || 'https://')
  if (!href) return
  editor.value.chain().focus().updateButton({ href, label }).run()
}

async function onFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const url = await uploadFile(file)
  if (url) editor.value?.chain().focus().setImage({ src: url }).run()
  ;(e.target as HTMLInputElement).value = ''
}
</script>

<style scoped>
.nlte-wrap { display: flex; flex-direction: column; min-height: 0; height: 100%; }
.nlte-toolbar, .nlte-context-toolbar {
  display: flex; align-items: center; gap: 2px; padding: 8px 12px;
  border-bottom: 0.5px solid var(--border); background: var(--bg-elevated); flex-shrink: 0; flex-wrap: wrap;
}
.nlte-context-toolbar { background: color-mix(in srgb, var(--accent) 10%, var(--bg-elevated)); }
.nlte-context-label { font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; margin-right: 4px; }
.nlte-btn {
  height: 28px; min-width: 28px; padding: 0 8px; display: inline-flex; align-items: center; justify-content: center; gap: 4px;
  background: transparent; border: none; border-radius: 6px; color: var(--text-muted); cursor: pointer;
  font-size: 12px; font-weight: 700; font-family: inherit; transition: background .15s, color .15s;
}
.nlte-btn:hover { background: var(--bg-surface); color: var(--text); }
.nlte-btn.active { background: var(--accent); color: #fff; }
.nlte-btn.danger:hover { background: rgba(239,68,68,.15); color: #ef4444; }
.nlte-btn:disabled { opacity: .5; cursor: default; }
.nlte-sep { width: 0.5px; height: 18px; background: var(--border); margin: 0 4px; flex-shrink: 0; }
.nlte-loading { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text-muted); }

.nlte-content { flex: 1; min-height: 0; overflow-y: auto; }
.nlte-content :deep(.tiptap) { padding: 24px 28px; outline: none; min-height: 100%; font-size: 14px; line-height: 1.7; color: var(--text); }
.nlte-content :deep(.tiptap > * + *) { margin-top: 0.9em; }
.nlte-content :deep(h1) { font-size: 24px; font-weight: 800; line-height: 1.25; }
.nlte-content :deep(h2) { font-size: 19px; font-weight: 700; }
.nlte-content :deep(p) { margin: 0; }
.nlte-content :deep(ul), .nlte-content :deep(ol) { padding-left: 22px; }
.nlte-content :deep(li) { margin-bottom: 4px; }
.nlte-content :deep(a) { color: var(--accent); }
.nlte-content :deep(blockquote) { border-left: 3px solid var(--accent); padding-left: 14px; color: var(--text-muted); }
.nlte-content :deep(img) { border-radius: 8px; cursor: pointer; }
.nlte-content :deep(img.ProseMirror-selectednode) { outline: 2px solid var(--accent); outline-offset: 2px; }
.nlte-content :deep(a[data-newsletter-button]) { cursor: pointer; }
.nlte-content :deep(a[data-newsletter-button].ProseMirror-selectednode) { outline: 2px solid var(--accent); outline-offset: 3px; }
.nlte-content :deep(.tiptap)::after { content: ''; display: table; clear: both; }
</style>
