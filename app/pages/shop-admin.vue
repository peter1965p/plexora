<template>
  <div class="page">

    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
      <div>
        <h1 style="font-size:22px;font-weight:800;margin:0">Shop <span style="color:var(--accent)">Admin</span></h1>
        <p style="color:var(--text-muted);font-size:13px;margin:4px 0 0">Produkte & Kategorien verwalten</p>
      </div>
      <div style="display:flex;gap:10px">
        <NuxtLink to="/shop" target="_blank">
          <button class="icon-btn"><i class="ti ti-external-link"></i> Shop ansehen</button>
        </NuxtLink>
        <button class="accent-btn" @click="openModal">
          <i class="ti ti-plus"></i> Neues Produkt
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div style="display:flex;gap:8px;margin-bottom:24px">
      <button v-for="t in ['Produkte','Kategorien']" :key="t" @click="tab=t"
        :style="`padding:8px 20px;border-radius:8px;border:0.5px solid var(--border);cursor:pointer;font-size:13px;font-weight:600;transition:all 0.15s;background:${tab===t ? 'var(--accent)' : 'var(--bg-surface)'};color:${tab===t ? 'white' : 'var(--text-muted)'}`">
        {{ t }}
      </button>
    </div>

    <!-- TAB: Produkte -->
    <template v-if="tab === 'Produkte'">
      <div v-if="!products.length" style="text-align:center;padding:60px;color:var(--text-muted)">
        <i class="ti ti-package" style="font-size:48px;display:block;margin-bottom:12px"></i>
        Noch keine Produkte — leg das erste an!
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
        <div v-for="p in products" :key="p.productId"
          style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;overflow:hidden;transition:border-color .15s;display:flex;flex-direction:column"
          @mouseenter="e => e.currentTarget.style.borderColor='var(--accent)'"
          @mouseleave="e => e.currentTarget.style.borderColor='var(--border)'">
          <!-- Produktbild -->
          <div style="height:140px;background:var(--bg-elevated);display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative">
            <img v-if="p.image" :src="p.image" style="width:100%;height:100%;object-fit:cover" />
            <div v-else style="display:flex;flex-direction:column;align-items:center;gap:8px">
              <i class="ti ti-package" style="font-size:40px;color:var(--text-muted)"></i>
            </div>
            <!-- MwSt Badge -->
            <span style="position:absolute;top:8px;left:8px;background:rgba(0,0,0,0.6);color:#fff;font-size:10px;padding:2px 7px;border-radius:4px;font-weight:600">
              {{ p.vatRate ?? 19 }}% MwSt.
            </span>
          </div>
          <div style="padding:14px;flex:1;display:flex;flex-direction:column">
            <div style="font-size:10px;color:var(--accent);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;font-weight:700">{{ p.category }}</div>
            <div style="font-weight:700;font-size:14px;margin-bottom:6px">{{ p.name }}</div>
            <div style="font-size:12px;color:var(--text-muted);line-height:1.5;flex:1">{{ p.description?.slice(0,80) }}{{ p.description?.length > 80 ? '...' : '' }}</div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding-top:12px;border-top:0.5px solid var(--border)">
              <span style="font-weight:800;font-size:16px;color:var(--accent)">€ {{ p.price }}</span>
              <button @click="deleteProduct(p.productId)" style="background:none;border:none;color:#E05C5C;cursor:pointer;font-size:16px;padding:4px">
                <i class="ti ti-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- TAB: Kategorien -->
    <template v-if="tab === 'Kategorien'">
      <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;padding:24px;margin-bottom:24px">
        <h2 style="font-size:15px;font-weight:700;margin:0 0 16px">Neue Kategorie</h2>
        <div style="display:flex;gap:12px;align-items:flex-end">
          <div class="auth-field" style="flex:1;margin:0"><label>Name</label><input v-model="newCat" placeholder="z.B. ADDON" /></div>
          <button class="accent-btn" @click="addCategory" :disabled="!newCat"><i class="ti ti-plus"></i> Hinzufügen</button>
        </div>
      </div>
      <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;overflow:hidden">
        <div style="padding:16px 24px;border-bottom:0.5px solid var(--border);font-weight:700;font-size:14px">
          Kategorien ({{ categories.length }})
        </div>
        <div v-for="k in categories" :key="k"
          style="padding:14px 24px;border-bottom:0.5px solid var(--border);display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:10px">
            <i class="ti ti-tag" style="color:var(--accent)"></i>
            <span style="font-weight:600">{{ k }}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:11px;color:var(--text-muted)">{{ products.filter(p => p.category === k).length }} Produkte</span>
            <button v-if="!['SOFTWARE','SERVICE'].includes(k)" @click="removeCategory(k)"
              style="background:none;border:none;color:#E05C5C;cursor:pointer;font-size:16px">
              <i class="ti ti-trash"></i>
            </button>
            <span v-else style="font-size:11px;color:var(--text-muted);padding:2px 8px;border:0.5px solid var(--border);border-radius:4px">Standard</span>
          </div>
        </div>
      </div>
    </template>

    <!-- MODAL: Neues Produkt -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal=false">
      <div class="modal-card" style="max-width:600px">
        <div class="modal-header">
          <span class="card-title">Neues Produkt anlegen</span>
          <button class="icon-btn" @click="showModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body" style="display:flex;flex-direction:column;gap:14px">

          <!-- Bild Upload oben -->
          <div style="border:1.5px dashed var(--border);border-radius:12px;overflow:hidden;position:relative;height:140px;background:var(--bg-elevated);display:flex;align-items:center;justify-content:center;cursor:pointer"
            @click="$refs.fileInput.click()">
            <img v-if="form.image" :src="form.image" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0" />
            <div v-else style="text-align:center;color:var(--text-muted)">
              <i class="ti ti-photo-up" style="font-size:32px;display:block;margin-bottom:6px"></i>
              <span style="font-size:13px">{{ imageUploading ? 'Lädt...' : 'Produktbild hochladen' }}</span>
            </div>
            <div v-if="form.image" style="position:absolute;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s"
              @mouseenter="e => e.currentTarget.style.opacity='1'"
              @mouseleave="e => e.currentTarget.style.opacity='0'">
              <i class="ti ti-edit" style="font-size:28px;color:#fff"></i>
            </div>
            <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="uploadProductImage" />
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="auth-field"><label>Produktname *</label><input v-model="form.name" placeholder="Plexora Starter" /></div>
            <div class="auth-field"><label>Preis (€) *</label><input v-model="form.price" type="number" placeholder="29" /></div>
            <div class="auth-field">
              <label>Kategorie</label>
              <select v-model="form.category" class="form-select">
                <option v-for="k in categories" :key="k" :value="k">{{ k }}</option>
              </select>
            </div>
            <div class="auth-field">
              <label>MwSt.-Satz</label>
              <select v-model.number="form.vatRate" class="form-select">
                <option :value="19">19% (Standard)</option>
                <option :value="7">7% (ermäßigt)</option>
                <option :value="0">0% (steuerfrei)</option>
              </select>
            </div>
            <div class="auth-field"><label>Stock</label><input v-model="form.stock" type="number" placeholder="999" /></div>
          </div>
          <div class="auth-field">
            <label>Beschreibung</label>
            <textarea v-model="form.description" placeholder="Kurze Beschreibung..." style="height:80px;resize:none;width:100%" class="form-select"></textarea>
          </div>
        </div>
        <div style="padding:0 24px 24px">
          <button class="auth-btn" @click="createProduct" :disabled="saving || !form.name || !form.price">
            <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else><i class="ti ti-plus"></i> Produkt anlegen</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="toast" class="toast-success"><i class="ti ti-circle-check"></i> {{ toast }}</div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const tab       = ref('Produkte')
const saving    = ref(false)
const toast     = ref('')
const newCat    = ref('')
const showModal = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const form      = reactive({ name: '', price: '', category: 'SOFTWARE', description: '', stock: '999', image: '', vatRate: 19 })
const imageUploading = ref(false)

const categories = ref(['SOFTWARE', 'SERVICE'])

const { data, refresh } = await useFetch(useApiUrl('/api/shop/products'))
const products = computed(() => (data.value as any)?.products || [])

function openModal() {
  Object.assign(form, { name: '', price: '', category: 'SOFTWARE', description: '', stock: '999', image: '', vatRate: 19 })
  showModal.value = true
}

async function uploadProductImage(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  imageUploading.value = true
  try {
    const reader = new FileReader()
    const base64 = await new Promise<string>(r => { reader.onload = ev => r(ev.target!.result as string); reader.readAsDataURL(file) })
    const res: any = await $fetch(useApiUrl('/api/aws/s3-upload'), {
      method: 'POST',
      body: { fileBase64: base64, fileName: `product-${Date.now()}.jpg`, prefix: 'products/' }
    })
    if (res?.url) form.image = res.url
    else if (res?.key) form.image = `https://plexora-files.s3.eu-central-1.amazonaws.com/${res.key}`
  } catch (err) { console.error('Upload fehlgeschlagen:', err) }
  finally { imageUploading.value = false }
}

async function createProduct() {
  if (!form.name || !form.price) return
  saving.value = true
  try {
    await $fetch(useApiUrl('/api/shop/products'), {
      method: 'POST',
      body: { ...form, price: Number(form.price), stock: Number(form.stock) }
    })
    await refresh()
    showModal.value = false
    toast.value = 'Produkt angelegt!'
    setTimeout(() => toast.value = '', 2500)
  } finally { saving.value = false }
}

async function deleteProduct(id: string) {
  await $fetch(useApiUrl(`/api/shop/products/${id}`), { method: 'DELETE' })
  await refresh()
  toast.value = 'Produkt gelöscht!'
  setTimeout(() => toast.value = '', 2500)
}

function addCategory() {
  const v = newCat.value.trim().toUpperCase()
  if (v && !categories.value.includes(v)) categories.value.push(v)
  newCat.value = ''
  toast.value = 'Kategorie hinzugefügt!'
  setTimeout(() => toast.value = '', 2500)
}

function removeCategory(k: string) {
  categories.value = categories.value.filter(c => c !== k)
}
</script>
