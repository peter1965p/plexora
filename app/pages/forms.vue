<template>
  <div class="page">
    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:32px">
      <div>
        <h1 style="font-size:22px;font-weight:800;margin:0">{{ t.forms.title }}</h1>
        <p style="color:var(--text-muted);font-size:13px;margin:4px 0 0">{{ t.forms.subtitle }}</p>
      </div>
      <button class="accent-btn" @click="openNew"><i class="ti ti-plus"></i> {{ t.forms.newForm }}</button>
    </div>

    <!-- Tabs -->
    <div style="display:flex;gap:8px;margin-bottom:24px">
      <button v-for="tabItem in [t.forms.tabForms, t.forms.tabSubmissions]" :key="tabItem" @click="tab=tabItem"
        :style="`padding:8px 20px;border-radius:8px;border:0.5px solid var(--border);cursor:pointer;font-size:13px;font-weight:600;transition:all 0.15s;
          background:${tab===tabItem ? 'var(--accent)' : 'var(--bg-surface)'};color:${tab===tabItem ? 'white' : 'var(--text-muted)'}`">
        {{ tabItem }}
      </button>
    </div>

    <!-- TAB: Formulare -->
    <template v-if="tab===t.forms.tabForms && !editing">
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
        <div v-if="!forms.length" style="grid-column:span 3;text-align:center;color:var(--text-muted);padding:60px">
          {{ t.forms.noForms }}
        </div>
        <div v-for="f in forms" :key="f.formId"
          style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;padding:20px">
          <div style="font-weight:700;font-size:16px;margin-bottom:4px">{{ f.title }}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">{{ f.description }}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">{{ f.fields?.length || 0 }} {{ t.forms.fields }}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:16px;font-family:monospace;background:var(--bg-elevated);padding:6px 10px;border-radius:6px">
            ID: {{ f.formId?.slice(0,16) }}...
          </div>
          <div style="display:flex;gap:8px">
            <button class="accent-btn" style="flex:1;height:32px;font-size:12px" @click="editForm(f)">
              <i class="ti ti-edit"></i> {{ t.forms.edit }}
            </button>
            <button @click="viewSubmissions(f)" style="height:32px;padding:0 12px;border-radius:8px;border:0.5px solid var(--border);background:var(--bg-elevated);color:var(--text-muted);cursor:pointer;font-size:12px">
              <i class="ti ti-inbox"></i>
            </button>
            <button @click="deleteForm(f)" style="height:32px;padding:0 12px;border-radius:8px;border:none;background:none;color:#E05C5C;cursor:pointer;font-size:16px">
              <i class="ti ti-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- TAB: Editor -->
    <template v-if="tab===t.forms.tabForms && editing">
      <div style="display:grid;grid-template-columns:320px 1fr;gap:24px">
        <!-- Links: Settings -->
        <div>
          <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;padding:20px;margin-bottom:16px">
            <div style="font-weight:700;font-size:14px;margin-bottom:16px">{{ t.forms.settings }}</div>
            <div class="auth-field"><label>{{ t.forms.titleLabel }}</label><input v-model="current.title" placeholder="Kontaktformular" /></div>
            <div class="auth-field"><label>{{ t.forms.descLabel }}</label><input v-model="current.description" placeholder="Kurze Beschreibung" /></div>
            <div class="auth-field"><label>{{ t.forms.btnText }}</label><input v-model="current.submitLabel" placeholder="Absenden" /></div>
            <div class="auth-field"><label>{{ t.forms.successMsg }}</label><input v-model="current.successMsg" placeholder="Vielen Dank!" /></div>
            <div class="auth-field"><label>{{ t.forms.notifyTo }}</label><input v-model="current.notifyEmail" placeholder="info@firma.de" /></div>
          </div>

          <!-- Feld-Typen -->
          <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;padding:20px">
            <div style="font-weight:700;font-size:14px;margin-bottom:16px">{{ t.forms.addField }}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <button v-for="ft in fieldTypes" :key="ft.type" @click="addField(ft.type)"
                style="padding:10px;border-radius:10px;border:0.5px solid var(--border);background:var(--bg-elevated);cursor:pointer;text-align:left;transition:all 0.15s"
                @mouseenter="e => e.currentTarget.style.borderColor='var(--accent)'"
                @mouseleave="e => e.currentTarget.style.borderColor='var(--border)'">
                <i class="ti" :class="ft.icon" style="color:var(--accent);display:block;font-size:16px;margin-bottom:2px"></i>
                <span style="font-size:11px;font-weight:600">{{ ft.label }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Rechts: Felder -->
        <div>
          <div style="display:flex;gap:8px;margin-bottom:16px">
            <button class="accent-btn" @click="saveForm" :disabled="saving">
              <i class="ti ti-device-floppy"></i> {{ saving ? t.common.loading : t.common.save }}
            </button>
            <button @click="editing=false" style="padding:0 16px;height:36px;border-radius:8px;border:0.5px solid var(--border);background:var(--bg-surface);color:var(--text-muted);cursor:pointer;font-size:13px">
              <i class="ti ti-arrow-left"></i> {{ t.common.back }}
            </button>
          </div>

          <!-- Preview -->
          <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;padding:24px;margin-bottom:16px">
            <div style="font-size:11px;color:var(--accent);font-weight:700;margin-bottom:12px;text-transform:uppercase">{{ t.common.preview }}</div>
            <div v-if="!current.fields.length" style="color:var(--text-muted);font-size:13px">Füge Felder hinzu...</div>
            <div v-for="field in current.fields" :key="field.id" style="margin-bottom:12px">
              <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">{{ field.label }}<span v-if="field.required" style="color:#E05C5C">*</span></label>
              <input v-if="['text','email','phone','number'].includes(field.type)" :type="field.type" :placeholder="field.placeholder" disabled
                style="width:100%;padding:8px 12px;border-radius:8px;border:0.5px solid var(--border);background:var(--bg-elevated);color:var(--text-muted);font-size:13px" />
              <textarea v-else-if="field.type==='textarea'" :placeholder="field.placeholder" disabled
                style="width:100%;padding:8px 12px;border-radius:8px;border:0.5px solid var(--border);background:var(--bg-elevated);color:var(--text-muted);font-size:13px;height:80px;resize:none"></textarea>
              <select v-else-if="field.type==='select'" disabled class="form-select">
                <option v-for="o in field.options" :key="o">{{ o }}</option>
              </select>
              <div v-else-if="field.type==='checkbox'" style="display:flex;align-items:center;gap:8px">
                <input type="checkbox" disabled />
                <span style="font-size:13px;color:var(--text-muted)">{{ field.placeholder }}</span>
              </div>
            </div>
          </div>

          <!-- Felder bearbeiten -->
          <div v-for="(field, idx) in current.fields" :key="field.id"
            style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;margin-bottom:8px;overflow:hidden">
            <div style="padding:10px 16px;border-bottom:0.5px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--bg-elevated)">
              <span style="font-size:12px;font-weight:700;color:var(--accent)">
                <i class="ti" :class="fieldTypes.find(f=>f.type===field.type)?.icon"></i>
                {{ fieldTypes.find(f=>f.type===field.type)?.label }}
              </span>
              <div style="display:flex;gap:4px">
                <button @click="moveField(idx,-1)" :disabled="idx===0" style="background:none;border:none;cursor:pointer;color:var(--text-muted)"><i class="ti ti-arrow-up"></i></button>
                <button @click="moveField(idx,1)" :disabled="idx===current.fields.length-1" style="background:none;border:none;cursor:pointer;color:var(--text-muted)"><i class="ti ti-arrow-down"></i></button>
                <button @click="removeField(idx)" style="background:none;border:none;cursor:pointer;color:#E05C5C"><i class="ti ti-trash"></i></button>
              </div>
            </div>
            <div style="padding:14px;display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div class="auth-field" style="margin:0"><label>{{ t.forms.labelField }}</label><input v-model="field.label" placeholder="Feldbezeichnung" /></div>
              <div class="auth-field" style="margin:0"><label>{{ t.forms.placeholderField }}</label><input v-model="field.placeholder" placeholder="Platzhaltertext" /></div>
              <div v-if="field.type==='select'" class="auth-field" style="margin:0;grid-column:span 2">
                <label>{{ t.forms.optionsField }}</label>
                <input :value="field.options?.join(',')" @input="field.options = $event.target.value.split(',')" placeholder="Option 1,Option 2" />
              </div>
              <div style="display:flex;align-items:center;gap:8px">
                <input type="checkbox" v-model="field.required" :id="`req-${field.id}`" style="accent-color:var(--accent)" />
                <label :for="`req-${field.id}`" style="font-size:12px;cursor:pointer">{{ t.forms.required }}</label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- TAB: Submissions -->
    <template v-if="tab===t.forms.tabSubmissions">
      <div v-if="!selectedForm" style="text-align:center;color:var(--text-muted);padding:60px">
        {{ t.forms.selectForm }}
      </div>
      <div v-else>
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
          <button @click="selectedForm=null" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:20px"><i class="ti ti-arrow-left"></i></button>
          <div>
            <div style="font-weight:700">{{ selectedForm.title }}</div>
            <div style="font-size:12px;color:var(--text-muted)">{{ submissions.length }} {{ t.forms.submissions }}</div>
          </div>
        </div>
        <div v-if="!submissions.length" style="text-align:center;color:var(--text-muted);padding:40px">{{ t.forms.noSubmissions }}</div>
        <div v-for="s in submissions" :key="s.submissionId"
          style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:12px;padding:16px;margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;margin-bottom:12px">
            <span style="font-size:12px;font-weight:600">{{ t.forms.submission }}</span>
            <span style="font-size:11px;color:var(--text-muted)">{{ new Date(s.created).toLocaleString('de-DE') }}</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
            <div v-for="(val, key) in s.data" :key="key" style="background:var(--bg-elevated);border-radius:8px;padding:10px">
              <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px">{{ key }}</div>
              <div style="font-size:13px;font-weight:600">{{ val }}</div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-if="toast" class="toast-success"><i class="ti ti-circle-check"></i> {{ toast }}</div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
const { userId, idToken } = await useAuthUser()
const authHeaders = { Authorization: `Bearer ${idToken}` }
const { t, lang } = useLang()

const tab      = ref('')
const editing  = ref(false)
const saving   = ref(false)
const toast    = ref('')
const isNew    = ref(false)
const selectedForm = ref<any>(null)
const submissions  = ref<any[]>([])

// Initialize tab after t is available
onMounted(() => { if (!tab.value) tab.value = t.value.forms.tabForms })

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)

const { data, refresh } = await useFetch(() => useApiUrl(`/api/forms?userId=${encodeURIComponent(userId)}`), { headers: authHeaders })
const forms = computed(() => (data.value as any)?.forms || [])

const current = reactive({
  formId: '', title: '', description: '', submitLabel: 'Absenden',
  successMsg: 'Vielen Dank für deine Nachricht!', notifyEmail: '', fields: [] as any[]
})

const fieldTypes = computed(() => [
  { type: 'text',     label: t.value.forms.ftText,     icon: 'ti-forms'        },
  { type: 'email',    label: t.value.forms.ftEmail,    icon: 'ti-mail'         },
  { type: 'phone',    label: t.value.forms.ftPhone,    icon: 'ti-phone'        },
  { type: 'number',   label: t.value.forms.ftNumber,   icon: 'ti-number'       },
  { type: 'textarea', label: t.value.forms.ftTextarea, icon: 'ti-align-left'   },
  { type: 'select',   label: t.value.forms.ftSelect,   icon: 'ti-chevron-down' },
  { type: 'checkbox', label: t.value.forms.ftCheckbox, icon: 'ti-checkbox'     },
])

function openNew() {
  Object.assign(current, { formId: '', title: '', description: '', submitLabel: 'Absenden', successMsg: 'Vielen Dank!', notifyEmail: '', fields: [] })
  isNew.value = true
  editing.value = true
}

function editForm(f: any) {
  Object.assign(current, JSON.parse(JSON.stringify(f)))
  isNew.value = false
  editing.value = true
}

function addField(type: string) {
  current.fields.push({ id: uid(), type, label: '', placeholder: '', required: false, options: type === 'select' ? ['Option 1'] : undefined })
}

function removeField(idx: number) { current.fields.splice(idx, 1) }
function moveField(idx: number, dir: number) {
  const f = current.fields.splice(idx, 1)[0]
  current.fields.splice(idx + dir, 0, f)
}

async function saveForm() {
  saving.value = true
  try {
    if (isNew.value) {
      await $fetch(useApiUrl('/api/forms'), { method: 'POST', headers: authHeaders, body: { ...current, userId } })
    } else {
      await $fetch(useApiUrl(`/api/forms/${current.formId}`), { method: 'PUT', headers: authHeaders, body: { ...current } })
    }
    await refresh()
    toast.value = 'Formular gespeichert!'
    setTimeout(() => { toast.value = ''; editing.value = false }, 1500)
  } catch(e) { console.error(e) }
  saving.value = false
}

async function deleteForm(f: any) {
  await $fetch(useApiUrl(`/api/forms/${f.formId}`), { method: 'DELETE', headers: authHeaders })
  await refresh()
  toast.value = 'Formular gelöscht!'
  setTimeout(() => toast.value = '', 2000)
}

async function viewSubmissions(f: any) {
  selectedForm.value = f
  tab.value = t.value.forms.tabSubmissions
  const res = await $fetch(useApiUrl(`/api/forms/${f.formId}/submissions`)) as any
  submissions.value = res.submissions || []
}
</script>
