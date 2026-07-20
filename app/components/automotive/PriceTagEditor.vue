<template>
  <div class="pte-wrap">
    <div class="pte-toolbar">
      <button type="button" class="pte-btn" :class="{ active: editor?.isActive('bold') }" title="Fett" @click="editor?.chain().focus().toggleBold().run()"><i class="ti ti-bold"></i></button>
      <button type="button" class="pte-btn" :class="{ active: editor?.isActive('italic') }" title="Kursiv" @click="editor?.chain().focus().toggleItalic().run()"><i class="ti ti-italic"></i></button>
      <span class="pte-sep"></span>
      <button type="button" class="pte-btn" :class="{ active: editor?.isActive('heading', { level: 2 }) }" title="Überschrift" @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()">H2</button>
      <button type="button" class="pte-btn" :class="{ active: editor?.isActive('bulletList') }" title="Aufzählung" @click="editor?.chain().focus().toggleBulletList().run()"><i class="ti ti-list"></i></button>
      <span class="pte-sep"></span>
      <button type="button" class="pte-btn" title="Rückgängig" @click="editor?.chain().focus().undo().run()"><i class="ti ti-arrow-back-up"></i></button>
      <button type="button" class="pte-btn" title="Wiederholen" @click="editor?.chain().focus().redo().run()"><i class="ti ti-arrow-forward-up"></i></button>
    </div>

    <div v-if="selectedField" class="pte-context-toolbar">
      <span class="pte-context-label"><i class="ti ti-variable"></i> Feld ausgewählt</span>
      <button type="button" class="pte-btn danger" title="Feld entfernen" @click="editor?.chain().focus().deleteSelection().run()"><i class="ti ti-trash"></i></button>
    </div>

    <div class="pte-catalog">
      <div v-for="group in FIELD_CATALOG" :key="group.label" class="pte-catalog-group">
        <div class="pte-catalog-label">{{ group.label }}</div>
        <div class="pte-catalog-chips">
          <button
            v-for="f in group.fields" :key="f.field" type="button" class="pte-catalog-chip"
            :class="{ image: f.kind === 'image' }"
            @click="insertField(f)">
            <i class="ti" :class="f.kind === 'image' ? 'ti-photo' : 'ti-tag'"></i> {{ f.label }}
          </button>
        </div>
      </div>
    </div>

    <ClientOnly>
      <EditorContent :editor="editor" class="pte-content" />
      <template #fallback>
        <div class="pte-loading"><i class="ti ti-loader-2 spin"></i></div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { PriceTagTextField } from './extensions/priceTagTextField'
import { PriceTagImageField } from './extensions/priceTagImageField'

const model = defineModel<string>({ default: '' })

const FIELD_CATALOG = [
  {
    label: 'Fahrzeug',
    fields: [
      { field: 'fahrzeug.kraftstoff',  label: 'Kraftstoff',    kind: 'text' },
      { field: 'fahrzeug.getriebe',    label: 'Getriebe',      kind: 'text' },
      { field: 'fahrzeug.leistung',    label: 'Leistung',      kind: 'text' },
      { field: 'fahrzeug.km',          label: 'Kilometerstand', kind: 'text' },
      { field: 'fahrzeug.farbe',       label: 'Farbe',         kind: 'text' },
      { field: 'fahrzeug.kennzeichen', label: 'Kennzeichen',   kind: 'text' },
      { field: 'fahrzeug.zustand',          label: 'Fahrzeugzustand',  kind: 'text' },
      { field: 'fahrzeug.typ',              label: 'Fahrzeugtyp',      kind: 'text' },
      { field: 'fahrzeug.tueren',           label: 'Türen',            kind: 'text' },
      { field: 'fahrzeug.umweltplakette',   label: 'Umweltplakette',   kind: 'text' },
      { field: 'fahrzeug.schadstoffklasse', label: 'Schadstoffklasse', kind: 'text' },
      { field: 'fahrzeug.innenausstattung', label: 'Innenausstattung', kind: 'text' },
      { field: 'fahrzeug.ausstattung',      label: 'Ausstattungsliste', kind: 'text' },
      { field: 'fahrzeug.beschreibung', label: 'Beschreibung', kind: 'text' },
      { field: 'fahrzeug.foto',        label: 'Fahrzeugfoto',  kind: 'image' },
    ],
  },
  {
    label: 'Händler',
    fields: [
      { field: 'haendler.telefon', label: 'Telefon',  kind: 'text' },
      { field: 'haendler.email',   label: 'E-Mail',   kind: 'text' },
      { field: 'haendler.adresse', label: 'Adresse',  kind: 'text' },
      { field: 'haendler.logo',    label: 'Logo',     kind: 'image' },
    ],
  },
] as const

const editor = useEditor({
  content: model.value,
  extensions: [
    StarterKit,
    PriceTagTextField,
    PriceTagImageField,
  ],
  onUpdate: ({ editor: ed }) => { model.value = ed.getHTML() },
})

watch(model, (v) => {
  if (!editor.value) return
  if (v === editor.value.getHTML()) return
  editor.value.commands.setContent(v || '', { emitUpdate: false })
})

onBeforeUnmount(() => { editor.value?.destroy() })

const selectedField = computed(() => (editor.value?.isActive('priceTagTextField') || editor.value?.isActive('priceTagImageField')) ?? false)

function insertField(f: { field: string; label: string; kind: 'text' | 'image' }) {
  if (!editor.value) return
  if (f.kind === 'image') {
    editor.value.chain().focus().insertPriceTagImageField({ field: f.field, label: f.label }).run()
  } else {
    editor.value.chain().focus().insertPriceTagTextField({ field: f.field, label: f.label }).run()
  }
}
</script>

<style scoped>
.pte-wrap { display: flex; flex-direction: column; min-height: 0; height: 100%; }
.pte-toolbar, .pte-context-toolbar {
  display: flex; align-items: center; gap: 2px; padding: 8px 12px;
  border-bottom: 0.5px solid var(--border); background: var(--bg-elevated); flex-shrink: 0; flex-wrap: wrap;
}
.pte-context-toolbar { background: color-mix(in srgb, var(--accent) 10%, var(--bg-elevated)); }
.pte-context-label { font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; margin-right: 4px; }
.pte-btn {
  height: 28px; min-width: 28px; padding: 0 8px; display: inline-flex; align-items: center; justify-content: center; gap: 4px;
  background: transparent; border: none; border-radius: 6px; color: var(--text-muted); cursor: pointer;
  font-size: 12px; font-weight: 700; font-family: inherit; transition: background .15s, color .15s;
}
.pte-btn:hover { background: var(--bg-surface); color: var(--text); }
.pte-btn.active { background: var(--accent); color: #fff; }
.pte-btn.danger:hover { background: rgba(239,68,68,.15); color: #ef4444; }
.pte-sep { width: 0.5px; height: 18px; background: var(--border); margin: 0 4px; flex-shrink: 0; }
.pte-loading { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text-muted); }

.pte-catalog { border-bottom: 0.5px solid var(--border); padding: 10px 12px; display: flex; flex-wrap: wrap; gap: 14px; flex-shrink: 0; }
.pte-catalog-group { display: flex; flex-direction: column; gap: 5px; }
.pte-catalog-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .04em; }
.pte-catalog-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.pte-catalog-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; background: var(--bg-elevated); border: 0.5px solid var(--border); border-radius: 6px; padding: 4px 8px; cursor: pointer; color: var(--text); }
.pte-catalog-chip:hover { border-color: var(--accent); color: var(--accent); }
.pte-catalog-chip.image { color: #B84A16; }
.pte-catalog-chip.image:hover { border-color: #B84A16; color: #B84A16; }

.pte-content { flex: 1; min-height: 0; overflow-y: auto; }
.pte-content :deep(.tiptap) { padding: 20px 24px; outline: none; min-height: 100%; font-size: 14px; line-height: 1.7; color: var(--text); }
.pte-content :deep(.tiptap > * + *) { margin-top: 0.7em; }
.pte-content :deep(h2) { font-size: 17px; font-weight: 700; }
.pte-content :deep(p) { margin: 0; }
.pte-content :deep(ul), .pte-content :deep(ol) { padding-left: 20px; }
.pte-content :deep(li) { margin-bottom: 4px; }
.pte-content :deep([data-pricetag-field-text].ProseMirror-selectednode),
.pte-content :deep([data-pricetag-field-image].ProseMirror-selectednode) { outline: 2px solid var(--accent); outline-offset: 2px; }
</style>
