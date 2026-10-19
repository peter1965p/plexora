// Vorlage für ein Zero-Deploy-Plugin (siehe docs/modul-schreiben.md).
// Plexora ruft default(Vue, host) auf und zeigt die zurückgegebene Komponente unter /plugins/<key> an.
// Wichtig: Render-Funktionen (h) statt Template-Text, weil Plexora Vue ohne Template-Compiler ausliefert.
// Aussehen: nur Klassen und Farbvariablen von Plexora benutzen, damit es zu jedem Theme passt.
export default function (Vue, host) {
  const { defineComponent, h, ref, onMounted } = Vue

  return defineComponent({
    name: 'MeinModul',
    setup() {
      const items = ref([])
      const text = ref('')
      const loading = ref(true)
      const error = ref('')

      const save = async () => {
        error.value = ''
        try { await host.saveData({ items: items.value }) }
        catch (e) { error.value = e?.data?.message || e?.message || 'Speichern fehlgeschlagen' }
      }
      const add = async () => {
        const t = text.value.trim()
        if (!t) return
        items.value = [...items.value, { id: Date.now().toString(36), text: t, done: false }]
        text.value = ''
        await save()
      }
      const toggle = async (it) => { it.done = !it.done; await save() }
      const remove = async (id) => { items.value = items.value.filter(i => i.id !== id); await save() }

      onMounted(async () => {
        try { items.value = (await host.getData())?.items || [] }
        catch (e) { error.value = 'Laden fehlgeschlagen' }
        finally { loading.value = false }
      })

      return () => h('div', [
        h('h1', { style: 'font-size:22px;font-weight:800;margin:0 0 4px' }, 'Mein Modul'),
        h('p', { style: 'color:var(--text-secondary);font-size:13px;margin:0 0 16px' }, 'Eine einfache Liste als Beispiel'),
        error.value ? h('div', { style: 'color:#ef4444;font-size:13px;margin-bottom:12px' }, error.value) : null,
        h('div', { class: 'card' }, [
          h('div', { class: 'card-header' }, [h('span', { class: 'card-title' }, 'Einträge')]),
          h('div', { style: 'display:flex;gap:8px;padding:14px 16px' }, [
            h('input', {
              value: text.value, placeholder: 'Neuer Eintrag …',
              style: 'flex:1;height:36px;padding:0 12px;border-radius:10px;border:0.5px solid var(--border);background:var(--bg-elevated);color:var(--text-primary);font-size:13px',
              onInput: (e) => { text.value = e.target.value }, onKeydown: (e) => { if (e.key === 'Enter') add() },
            }),
            h('button', { class: 'accent-btn', onClick: add }, 'Hinzufügen'),
          ]),
          loading.value ? h('div', { style: 'padding:16px;color:var(--text-muted)' }, 'Lade …')
            : !items.value.length ? h('div', { style: 'padding:16px;color:var(--text-muted);font-size:13px' }, 'Noch keine Einträge.')
            : h('table', { class: 'data-table' }, [h('tbody', items.value.map(it => h('tr', { key: it.id }, [
                h('td', { style: 'width:32px' }, [h('input', { type: 'checkbox', checked: it.done, onChange: () => toggle(it) })]),
                h('td', { style: it.done ? 'text-decoration:line-through;color:var(--text-muted)' : '' }, it.text),
                h('td', { style: 'width:44px;text-align:right' }, [h('button', { class: 'icon-btn', title: 'Löschen', onClick: () => remove(it.id) }, [h('i', { class: 'ti ti-trash' })])]),
              ])))]),
        ]),
      ])
    },
  })
}
