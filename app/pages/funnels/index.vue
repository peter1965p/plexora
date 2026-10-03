<template>
  <div class="fn-page">
    <div class="fn-head">
      <div>
        <div class="fn-title">Funnels & Sequenzen</div>
        <div class="fn-sub">Mehrstufige Abläufe für Leads: E-Mails, Termin-Links, Warte-Schritte und Verzweigungen</div>
      </div>
      <div v-if="!editing" style="display:flex;gap:8px">
        <button class="accent-btn" style="height:32px;font-size:12px;padding:0 14px" @click="openNew">
          <i class="ti ti-plus"></i> Neue Sequenz
        </button>
      </div>
      <div v-else style="display:flex;gap:8px">
        <button class="btn-secondary" style="height:32px;font-size:12px" @click="closeEditor">Zurück</button>
        <button class="accent-btn" style="height:32px;font-size:12px;padding:0 14px" :disabled="saving" @click="saveSequence">
          <i class="ti" :class="saving ? 'ti-loader-2' : 'ti-device-floppy'"></i> Speichern
        </button>
      </div>
    </div>

    <!-- LISTE -->
    <div v-if="!editing" class="fn-list">
      <div v-if="!sequences.length" class="fn-empty">
        <i class="ti ti-route" style="font-size:28px;color:var(--accent)"></i>
        <div>Noch keine Sequenz angelegt.</div>
        <button class="accent-btn" style="height:32px;font-size:12px;margin-top:10px" @click="openNew">Erste Sequenz bauen</button>
      </div>
      <div v-for="s in sequences" :key="s.sequenceId" class="fn-card">
        <div style="flex:1;min-width:0;cursor:pointer" @click="openEdit(s)">
          <div class="fn-card-name">{{ s.name }}</div>
          <div class="fn-card-meta">
            Auslöser: {{ triggerLabel(s.trigger) }} · {{ s.graph?.nodes?.length || 0 }} Schritte
            <span v-if="runCounts[s.sequenceId]"> · {{ runCounts[s.sequenceId].waiting }} wartend, {{ runCounts[s.sequenceId].done }} fertig</span>
          </div>
        </div>
        <button class="fn-toggle" :class="{ on: s.enabled }" @click="toggleSequence(s)" :title="s.enabled ? 'Aktiv' : 'Pausiert'">
          <span></span>
        </button>
        <button class="icon-btn" style="color:var(--accent)" title="Bearbeiten" @click="openEdit(s)"><i class="ti ti-edit"></i></button>
        <button class="icon-btn" style="color:#ef4444" title="Löschen" @click="removeSequence(s)"><i class="ti ti-trash"></i></button>
      </div>
    </div>

    <!-- EDITOR -->
    <div v-else class="fn-editor">
      <div class="fn-bar">
        <input v-model="editName" class="field-input" placeholder="Name der Sequenz" style="flex:1;max-width:320px" />
        <div class="fn-palette">
          <span class="fn-hint" style="align-self:center;margin:0 4px">Knoten wählen, dann Schritt einfügen:</span>
          <button v-for="p in palette" :key="p.kind" class="fn-pal-btn" :style="{ '--c': KINDS[p.kind].color }" @click="addNode(p.kind)">
            <i class="ti" :class="KINDS[p.kind].icon"></i> {{ p.label }}
          </button>
        </div>
      </div>

      <div class="fn-main">
        <div class="fn-canvas">
          <ClientOnly>
            <VueFlow id="funnel" v-model:nodes="nodes" v-model:edges="edges"
              :default-edge-options="{ type: 'smoothstep', markerEnd: 'arrowclosed' }"
              :delete-key-code="['Backspace', 'Delete']"
              fit-view-on-init
              @node-click="(e: any) => (selectedId = e.node.id)"
              @pane-click="selectedId = null">
              <template #node-seq="props">
                <div class="fn-node" :class="{ sel: props.selected }" :style="{ '--c': KINDS[props.data.kind].color }">
                  <Handle v-if="props.data.kind !== 'trigger'" type="target" :position="Position.Top" />
                  <div class="fn-node-head"><i class="ti" :class="KINDS[props.data.kind].icon"></i> {{ KINDS[props.data.kind].label }}</div>
                  <div class="fn-node-body">{{ nodeSummary(props.data) }}</div>
                  <template v-if="props.data.kind === 'condition'">
                    <Handle id="yes" type="source" :position="Position.Bottom" style="left:28%" />
                    <Handle id="no" type="source" :position="Position.Bottom" style="left:72%" />
                    <span class="fn-lbl" style="left:20%">Ja</span>
                    <span class="fn-lbl" style="left:64%">Nein</span>
                  </template>
                  <Handle v-else-if="props.data.kind !== 'end'" type="source" :position="Position.Bottom" />
                </div>
              </template>
              <Background />
            </VueFlow>
          </ClientOnly>
        </div>

        <aside v-if="selectedNode" class="fn-panel">
          <div class="fn-panel-title" :style="{ color: KINDS[selectedNode.data.kind].color }">
            <i class="ti" :class="KINDS[selectedNode.data.kind].icon"></i> {{ KINDS[selectedNode.data.kind].label }}
          </div>

          <template v-if="selectedNode.data.kind === 'trigger'">
            <label class="fn-lab">Auslöser</label>
            <select v-model="selectedNode.data.trigger" class="form-select">
              <option value="new_lead">Neuer Lead (mit E-Mail)</option>
              <option value="form_submitted">Formular abgeschickt</option>
            </select>
            <label class="fn-lab">Formular</label>
            <select v-model="selectedNode.data.formId" class="form-select">
              <option value="">Alle Formulare</option>
              <option v-for="f in forms" :key="f.formId" :value="f.formId">{{ f.title }}</option>
            </select>
            <div class="fn-hint">Nur Abgaben dieses Formulars starten die Sequenz.</div>
          </template>

          <template v-else-if="selectedNode.data.kind === 'send_email_template'">
            <label class="fn-lab">Vorlage</label>
            <select v-model="selectedNode.data.templateId" class="form-select">
              <option value="" disabled>Vorlage wählen…</option>
              <option v-for="tpl in emailTemplates" :key="tpl.templateId" :value="tpl.templateId">{{ tpl.name }}</option>
            </select>
            <div v-if="!emailTemplates.length" class="fn-hint">Noch keine Vorlagen — unter Newsletter anlegen.</div>
          </template>

          <template v-else-if="selectedNode.data.kind === 'send_booking_link'">
            <label class="fn-lab">Terminart (optional)</label>
            <select v-model="selectedNode.data.appointmentTypeId" class="form-select">
              <option value="">Alle Terminarten</option>
              <option v-for="tp in appointmentTypes" :key="tp.typeId" :value="tp.typeId">{{ tp.name }}</option>
            </select>
          </template>

          <template v-else-if="selectedNode.data.kind === 'set_lead_status'">
            <label class="fn-lab">Neuer Lead-Status</label>
            <select v-model="selectedNode.data.leadStatus" class="form-select">
              <option v-for="(label, key) in LEAD_STATUSES" :key="key" :value="key">{{ label }}</option>
            </select>
          </template>

          <template v-else-if="selectedNode.data.kind === 'wait'">
            <label class="fn-lab">Warten (Tage)</label>
            <input v-model.number="selectedNode.data.days" type="number" min="0" class="field-input" />
            <div class="fn-hint">Danach läuft der Lead ab dem nächsten Schritt weiter.</div>
          </template>

          <template v-else-if="selectedNode.data.kind === 'condition'">
            <label class="fn-lab">Wenn Lead-Status ist…</label>
            <select v-model="selectedNode.data.equals" class="form-select">
              <option v-for="(label, key) in LEAD_STATUSES" :key="key" :value="key">{{ label }}</option>
            </select>
            <div class="fn-hint">Ja-Ausgang bei Treffer, Nein-Ausgang sonst. Beide Ausgänge mit Schritten verbinden.</div>
          </template>

          <template v-else-if="selectedNode.data.kind === 'end'">
            <div class="fn-hint">Hier endet der Ablauf für den Lead.</div>
          </template>

          <button v-if="selectedNode.data.kind !== 'trigger'" class="btn-secondary" style="margin-top:14px;height:30px;font-size:12px;color:#ef4444" @click="removeSelected">
            <i class="ti ti-trash"></i> Schritt entfernen
          </button>
        </aside>
      </div>

      <div v-if="message" class="fn-msg">{{ message }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { VueFlow, Handle, Position } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const { idToken } = await useAuthUser()
const authHeaders = { Authorization: `Bearer ${idToken}` }

const KINDS: Record<string, { label: string; icon: string; color: string }> = {
  trigger:              { label: 'Start',          icon: 'ti-bolt',           color: '#f97316' },
  send_email_template:  { label: 'E-Mail senden',  icon: 'ti-mail',           color: '#6C3FE8' },
  send_booking_link:    { label: 'Termin-Link',    icon: 'ti-calendar-event', color: '#0ea5e9' },
  set_lead_status:      { label: 'Lead-Status',    icon: 'ti-user-check',     color: '#10b981' },
  wait:                 { label: 'Warten',         icon: 'ti-clock',          color: '#f59e0b' },
  condition:            { label: 'Bedingung',      icon: 'ti-git-branch',     color: '#ec4899' },
  end:                  { label: 'Ende',           icon: 'ti-flag',           color: '#64748b' },
}
const palette = [
  { kind: 'send_email_template', label: 'E-Mail' },
  { kind: 'send_booking_link',   label: 'Termin-Link' },
  { kind: 'set_lead_status',     label: 'Status' },
  { kind: 'wait',                label: 'Warten' },
  { kind: 'condition',           label: 'Bedingung' },
  { kind: 'end',                 label: 'Ende' },
]
const LEAD_STATUSES: Record<string, string> = { new: 'Neu', contacted: 'Kontaktiert', qualified: 'Qualifiziert', unqualified: 'Unqualifiziert' }

const sequences = ref<any[]>([])
const runCounts = ref<Record<string, any>>({})
const emailTemplates = ref<any[]>([])
const forms = ref<any[]>([])
const appointmentTypes = ref<any[]>([])

const editing = ref(false)
const editingId = ref<string | null>(null)
const editName = ref('')
const nodes = ref<any[]>([])
const edges = ref<any[]>([])
const selectedId = ref<string | null>(null)
const saving = ref(false)
const message = ref('')

const selectedNode = computed(() => nodes.value.find(n => n.id === selectedId.value) || null)

function triggerLabel(t: string) {
  return t === 'form_submitted' ? 'Formular abgeschickt' : 'Neuer Lead'
}

function nodeSummary(d: any): string {
  switch (d.kind) {
    case 'trigger':
      return triggerLabel(d.trigger)
    case 'send_email_template':
      return emailTemplates.value.find(t => t.templateId === d.templateId)?.name || 'Vorlage wählen'
    case 'send_booking_link':
      return appointmentTypes.value.find(t => t.typeId === d.appointmentTypeId)?.name || 'Alle Terminarten'
    case 'set_lead_status':
      return LEAD_STATUSES[d.leadStatus] || 'Status wählen'
    case 'wait':
      return `${d.days ?? 1} Tag(e)`
    case 'condition':
      return `Status ist „${LEAD_STATUSES[d.equals] || '?'}“?`
    case 'end':
      return 'Ablauf endet'
    default:
      return ''
  }
}

function defaultData(kind: string): Record<string, any> {
  switch (kind) {
    case 'send_email_template': return { templateId: '' }
    case 'send_booking_link': return { appointmentTypeId: '' }
    case 'set_lead_status': return { leadStatus: 'contacted' }
    case 'wait': return { days: 2 }
    case 'condition': return { equals: 'contacted' }
    default: return {}
  }
}

function outgoing(id: string) {
  return edges.value.filter(e => e.source === id)
}

function relayout() {
  const trigger = nodes.value.find(n => n.data.kind === 'trigger')
  if (!trigger) return
  const depth = new Map<string, number>([[trigger.id, 0]])
  const queue = [trigger.id]
  while (queue.length) {
    const id = queue.shift() as string
    for (const e of outgoing(id)) {
      if (!depth.has(e.target)) {
        depth.set(e.target, depth.get(id)! + 1)
        queue.push(e.target)
      }
    }
  }
  const maxDepth = Math.max(0, ...depth.values())
  for (const n of nodes.value) if (!depth.has(n.id)) depth.set(n.id, maxDepth + 1)

  const rows = new Map<number, any[]>()
  for (const n of nodes.value) {
    const d = depth.get(n.id)!
    rows.set(d, [...(rows.get(d) || []), n])
  }
  for (const [d, row] of rows) {
    row.forEach((n, i) => {
      n.position = { x: 260 + (i - (row.length - 1) / 2) * 260, y: 40 + d * 150 }
    })
  }
}

function addNode(kind: string) {
  const id = crypto.randomUUID()
  const parent = selectedNode.value || nodes.value.find(n => n.data.kind === 'trigger')
  nodes.value.push({ id, type: 'seq', position: { x: 0, y: 0 }, data: { kind, ...defaultData(kind) } })

  if (parent && parent.data.kind === 'end') {
    const incoming = edges.value.find(e => e.target === parent.id)
    if (incoming) {
      edges.value = edges.value.filter(e => e !== incoming)
      edges.value.push({ id: crypto.randomUUID(), source: incoming.source, target: id, sourceHandle: incoming.sourceHandle ?? null, type: 'smoothstep', markerEnd: 'arrowclosed' })
    }
    edges.value.push({ id: crypto.randomUUID(), source: id, target: parent.id, sourceHandle: null, type: 'smoothstep', markerEnd: 'arrowclosed' })
  } else if (parent) {
    const handle = parent.data.kind === 'condition' ? 'yes' : null
    const existing = edges.value.find(e => e.source === parent.id && (e.sourceHandle ?? null) === handle)
    if (existing) {
      edges.value = edges.value.filter(e => e !== existing)
      edges.value.push({ id: crypto.randomUUID(), source: parent.id, target: id, sourceHandle: handle, type: 'smoothstep', markerEnd: 'arrowclosed' })
      edges.value.push({ id: crypto.randomUUID(), source: id, target: existing.target, sourceHandle: null, type: 'smoothstep', markerEnd: 'arrowclosed' })
    } else {
      edges.value.push({ id: crypto.randomUUID(), source: parent.id, target: id, sourceHandle: handle, type: 'smoothstep', markerEnd: 'arrowclosed' })
    }
  }
  relayout()
  selectedId.value = id
}

function removeSelected() {
  if (!selectedNode.value) return
  const id = selectedNode.value.id
  const incoming = edges.value.filter(e => e.target === id)
  const out = edges.value.filter(e => e.source === id)
  edges.value = edges.value.filter(e => e.source !== id && e.target !== id)
  if (out.length === 1) {
    for (const inc of incoming) {
      edges.value.push({ id: crypto.randomUUID(), source: inc.source, target: out[0].target, sourceHandle: inc.sourceHandle ?? null, type: 'smoothstep', markerEnd: 'arrowclosed' })
    }
  }
  nodes.value = nodes.value.filter(n => n.id !== id)
  selectedId.value = null
  relayout()
}

function toFlowNodes(graph: any) {
  return (graph?.nodes || []).map((n: any) => ({
    id: n.id,
    type: 'seq',
    position: n.position,
    deletable: n.type !== 'trigger',
    data: { kind: n.type, ...(n.data || {}) },
  }))
}

function toFlowEdges(graph: any) {
  return (graph?.edges || []).map((e: any) => ({ ...e, sourceHandle: e.sourceHandle ?? null }))
}

function serializeGraph() {
  return {
    nodes: nodes.value.map(n => {
      const { kind, ...rest } = n.data
      return { id: n.id, type: kind, position: n.position, data: rest }
    }),
    edges: edges.value.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? null })),
  }
}

function startGraph() {
  nodes.value = [
    { id: 'start', type: 'seq', position: { x: 200, y: 40 }, deletable: false, data: { kind: 'trigger', trigger: 'new_lead' } },
    { id: 'end1', type: 'seq', position: { x: 200, y: 180 }, data: { kind: 'end' } },
  ]
  edges.value = [{ id: 'e-start-end1', source: 'start', target: 'end1', type: 'smoothstep', markerEnd: 'arrowclosed' }]
}

function openNew() {
  editingId.value = null
  editName.value = 'Neue Sequenz'
  startGraph()
  selectedId.value = null
  message.value = ''
  editing.value = true
}

function openEdit(s: any) {
  editingId.value = s.sequenceId
  editName.value = s.name
  nodes.value = toFlowNodes(s.graph)
  edges.value = toFlowEdges(s.graph)
  selectedId.value = null
  message.value = ''
  editing.value = true
}

function closeEditor() {
  editing.value = false
  loadSequences()
}

async function saveSequence() {
  const hasTrigger = nodes.value.some(n => n.data.kind === 'trigger')
  if (!hasTrigger) { message.value = 'Ein Start-Knoten fehlt.'; return }
  saving.value = true
  message.value = ''
  try {
    const body = {
      name: editName.value,
      graph: serializeGraph(),
    }
    if (editingId.value) {
      await $fetch(useApiUrl(`/api/sequences/${editingId.value}`), { method: 'PUT', headers: authHeaders, body })
    } else {
      const res = await $fetch<{ sequence: any }>(useApiUrl('/api/sequences'), { method: 'POST', headers: authHeaders, body })
      editingId.value = res.sequence.sequenceId
    }
    message.value = 'Gespeichert.'
  } catch (e: any) {
    message.value = e?.data?.message || 'Speichern fehlgeschlagen.'
  } finally {
    saving.value = false
  }
}

async function loadSequences() {
  try {
    const res = await $fetch<{ sequences: any[] }>(useApiUrl('/api/sequences'), { headers: authHeaders })
    sequences.value = res.sequences || []
    for (const s of sequences.value) loadRunCounts(s.sequenceId)
  } catch {}
}

async function loadRunCounts(sequenceId: string) {
  try {
    const res = await $fetch<{ counts: any }>(useApiUrl('/api/sequences/runs'), { headers: authHeaders, query: { sequenceId } })
    runCounts.value = { ...runCounts.value, [sequenceId]: res.counts }
  } catch {}
}

async function toggleSequence(s: any) {
  s.enabled = !s.enabled
  try {
    await $fetch(useApiUrl(`/api/sequences/${s.sequenceId}`), {
      method: 'PUT', headers: authHeaders,
      body: { name: s.name, graph: s.graph, enabled: s.enabled },
    })
  } catch {
    s.enabled = !s.enabled
  }
}

async function removeSequence(s: any) {
  if (!confirm(`Sequenz "${s.name}" wirklich löschen?`)) return
  await $fetch(useApiUrl(`/api/sequences/${s.sequenceId}`), { method: 'DELETE', headers: authHeaders })
  loadSequences()
}

onMounted(async () => {
  loadSequences()
  try {
    const f = await $fetch<{ forms: any[] }>(useApiUrl('/api/forms'), { headers: authHeaders })
    forms.value = f.forms || []
  } catch {}
  try {
    const t = await $fetch<{ templates: any[] }>(useApiUrl('/api/newsletter/templates'), { headers: authHeaders })
    emailTemplates.value = t.templates || []
  } catch {}
  try {
    const a = await $fetch<{ types: any[] }>(useApiUrl('/api/termine/types'), { headers: authHeaders })
    appointmentTypes.value = a.types || []
  } catch {}
})
</script>

<style scoped>
.fn-page { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.fn-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.fn-title { font-size: 20px; font-weight: 800; color: var(--text); }
.fn-sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.fn-list { display: flex; flex-direction: column; gap: 10px; }
.fn-empty { text-align: center; padding: 40px; color: var(--text-muted); font-size: 13px; background: var(--bg-elevated); border: 1px dashed var(--border); border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.fn-card { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 12px; }
.fn-card-name { font-weight: 700; font-size: 14px; color: var(--text); }
.fn-card-meta { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.fn-toggle { width: 38px; height: 22px; border-radius: 11px; border: none; cursor: pointer; position: relative; background: var(--border); flex-shrink: 0; transition: background .2s; }
.fn-toggle span { position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: left .2s; }
.fn-toggle.on { background: var(--accent); }
.fn-toggle.on span { left: 19px; }

.fn-editor { display: flex; flex-direction: column; gap: 12px; }
.fn-bar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.fn-palette { display: flex; gap: 6px; flex-wrap: wrap; }
.fn-pal-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 8px; border: 1px solid color-mix(in srgb, var(--c) 45%, transparent); background: color-mix(in srgb, var(--c) 12%, transparent); color: var(--c); font-size: 12px; font-weight: 600; cursor: pointer; }
.fn-pal-btn:hover { background: color-mix(in srgb, var(--c) 22%, transparent); }
.fn-main { display: flex; gap: 12px; align-items: stretch; }
.fn-canvas { flex: 1; min-width: 0; height: 620px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg-elevated); overflow: hidden; }
.fn-panel { width: 260px; flex-shrink: 0; padding: 16px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg-elevated); display: flex; flex-direction: column; gap: 8px; }
.fn-panel-title { font-weight: 800; font-size: 13px; display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.fn-lab { font-size: 11px; font-weight: 600; color: var(--text-muted); margin-top: 6px; }
.fn-hint { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
.fn-msg { font-size: 12px; color: var(--text-muted); }

.fn-node { min-width: 170px; padding: 10px 12px; border-radius: 10px; background: var(--bg); border: 2px solid var(--c); box-shadow: 0 4px 14px rgba(0,0,0,.12); position: relative; }
.fn-node.sel { box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 35%, transparent); }
.fn-node-head { font-size: 11px; font-weight: 800; color: var(--c); display: flex; align-items: center; gap: 6px; text-transform: uppercase; letter-spacing: .04em; }
.fn-node-body { font-size: 12px; color: var(--text); margin-top: 4px; }
.fn-lbl { position: absolute; bottom: -18px; font-size: 10px; font-weight: 700; color: var(--text-muted); }
</style>
