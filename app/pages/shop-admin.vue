<template>
  <div class="page">
    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:32px">
      <div>
        <h1 style="font-size:22px;font-weight:800;margin:0">Shop <span style="color:var(--accent)">Admin</span></h1>
        <p style="color:var(--text-muted);font-size:13px;margin:4px 0 0">Produkte & Kategorien verwalten</p>
      </div>
      <NuxtLink to="/shop" target="_blank">
        <button class="accent-btn"><i class="ti ti-external-link"></i> Shop ansehen</button>
      </NuxtLink>
    </div>

    <!-- Tabs -->
    <div style="display:flex;gap:8px;margin-bottom:24px">
      <button v-for="t in ['Produkte','Kategorien']" :key="t"
        @click="tab = t"
        :style="`padding:8px 20px;border-radius:8px;border:0.5px solid var(--border);cursor:pointer;font-size:13px;font-weight:600;transition:all 0.15s;
          background:${tab===t ? 'var(--accent)' : 'var(--bg-surface)'};
          color:${tab===t ? 'white' : 'var(--text-muted)'}`">
        {{ t }}
      </button>
    </div>

    <!-- TAB: Produkte -->
    <template v-if="tab === 'Produkte'">
      <!-- Neues Produkt -->
      <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;padding:24px;margin-bottom:32px">
        <h2 style="font-size:15px;font-weight:700;margin:0 0 16px">Neues Produkt anlegen</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px">
          <div class="auth-field"><label>Name</label><input v-model="form.name" placeholder="Produktname" /></div>
          <div class="auth-field"><label>Preis (€)</label><input v-model="form.price" type="number" placeholder="29" /></div>
          <div class="auth-field">
            <label>Kategorie</label>
            <select v-model="form.category" class="form-select">
              <option v-for="k in categories" :key="k" :value="k">{{ k }}</option>
            </select>
          </div>
          <div class="auth-field"><label>Stock</label><input v-model="form.stock" type="number" placeholder="999" /></div>
          <div class="auth-field" style="grid-column:span 2">
            <label>Beschreibung</label>
            <textarea v-model="form.description" placeholder="Kurze Beschreibung..." style="height:72px;resize:none;width:100%" class="form-select"></textarea>
          </div>
          <div class="auth-field">
            <label>MwSt.-Satz</label>
            <select v-model.number="form.vatRate" class="form-select">
              <option :value="19">19% (Standard)</option>
              <option :value="7">7% (ermäßigt)</option>
              <option :value="0">0% (steuerfrei)</option>
            </select>
          </div>
          <div class="auth-field">
            <label>Produktbild</label>
            <div v-if="form.image" style="margin-bottom:6px;position:relative;display:inline-block">
              <img :src="form.image" style="height:48px;width:48px;object-fit:cover;border-radius:6px;border:0.5px solid var(--border)" />
              <button @click="form.image=''" style="position:absolute;top:-4px;right:-4px;background:#E05C5C;border:none;border-radius:50%;width:16px;height:16px;cursor:pointer;color:#fff;font-size:10px;display:flex;align-items:center;justify-content:center">×</button>
            </div>
            <label style="cursor:pointer;display:block">
              <input type="file" accept="image/*" style="display:none" @change="uploadProductImage" :disabled="imageUploading" />
              <span class="accent-btn" style="height:28px;font-size:12px;padding:0 12px;display:inline-flex;align-items:center;gap:6px;pointer-events:none">
                <i class="ti" :class="imageUploading ? 'ti-loader-2 spin' : 'ti-photo-up'"></i>
                {{ imageUploading ? 'Lädt...' : form.image ? 'Ändern' : 'Bild hochladen' }}
              </span>
            </label>
          </div>
        </div>
        <button class="accent-btn" style="margin-top:8px" @click="createProduct" :disabled="saving">
          <i class="ti ti-plus"></i> {{ saving ? 'Speichern...' : 'Produkt anlegen' }}
        </button>
      </div>

      <!-- Produkt Grid -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
        <div v-for="p in products" :key="p.productId"
          style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;overflow:hidden">
          <div style="height:120px;background:var(--bg-elevated);display:flex;align-items:center;justify-content:center;overflow:hidden">
            <img v-if="p.image" :src="p.image" style="width:100%;height:100%;object-fit:cover" />
            <i v-else class="ti ti-package" style="font-size:36px;color:var(--text-muted)"></i>
          </div>
          <div style="padding:14px">
            <div style="font-size:10px;color:var(--accent);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">{{ p.category }}</div>
            <div style="font-weight:700;font-size:14px;margin-bottom:4px">{{ p.name }}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;line-height:1.4">{{ p.description?.slice(0,60) }}{{ p.description?.length > 60 ? '...' : '' }}</div>
            <div style="display:flex;align-items:center;justify-content:space-between">
              <span style="font-weight:800;color:var(--accent)">€ {{ p.price }}</span>
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
          <button class="accent-btn" @click="addCategory" :disabled="!newCat">
            <i class="ti ti-plus"></i> Hinzufügen
          </button>
        </div>
      </div>
      <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;overflow:hidden">
        <div style="padding:16px 24px;border-bottom:0.5px solid var(--border);font-weight:700;font-size:14px">
          Kategorien ({{ categories.length }})
        </div>
        <div v-for="k in categories" :key="k"
          style="padding:14px 24px;border-bottom:0.5px solid var(--border);display:flex;align-items:center;justify-content:space-between">
          <span style="font-weight:600">{{ k }}</span>
          <button v-if="!['SOFTWARE','SERVICE'].includes(k)" @click="removeCategory(k)"
            style="background:none;border:none;color:#E05C5C;cursor:pointer;font-size:16px">
            <i class="ti ti-trash"></i>
          </button>
          <span v-else style="font-size:11px;color:var(--text-muted)">Standard</span>
        </div>
      </div>
    </template>

    <div v-if="toast" class="toast-success"><i class="ti ti-circle-check"></i> {{ toast }}</div>
  </div>
</template>

<script setup lang="ts">
const tab    = ref('Produkte')
const saving = ref(false)
const toast  = ref('')
const newCat = ref('')
const form   = reactive({ name: '', price: '', category: 'SOFTWARE', description: '', stock: '999', image: '', vatRate: 19 })
const imageUploading = ref(false)

async function uploadProductImage(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  imageUploading.value = true
  try {
    const reader = new FileReader()
    const base64 = await new Promise<string>(r => { reader.onload = e => r(e.target!.result as string); reader.readAsDataURL(file) })
    const res: any = await $fetch(useApiUrl('/api/aws/s3-upload'), {
      method: 'POST',
      body: { fileBase64: base64, fileName: `product-${Date.now()}.jpg`, prefix: 'products/' }
    })
    if (res?.url) form.image = res.url
    else if (res?.key) form.image = `https://plexora-files.s3.eu-central-1.amazonaws.com/${res.key}`
  } catch (err) { console.error('Upload fehlgeschlagen:', err) }
  finally { imageUploading.value = false }
}

const categories = ref(['SOFTWARE', 'SERVICE'])

const { data, refresh } = await useFetch(useApiUrl('/api/shop/products'))
const products = computed(() => (data.value as any)?.products || [])

async function createProduct() {
  if (!form.name || !form.price) return
  saving.value = true
  await $fetch(useApiUrl('/api/shop/products'), {
    method: 'POST',
    body: { ...form, price: Number(form.price), stock: Number(form.stock) }
  })
  Object.assign(form, { name: '', price: '', description: '', image: '', stock: '999' })
  await refresh()
  toast.value = 'Produkt angelegt!'
  setTimeout(() => toast.value = '', 2500)
  saving.value = false
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
