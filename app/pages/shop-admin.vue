<template>
  <div class="page">

    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <div>
        <h1 style="font-size:22px;font-weight:800;margin:0">Shop <span style="color:var(--accent)">Admin</span></h1>
        <p style="color:var(--text-muted);font-size:13px;margin:4px 0 0">Produkte, Kategorien, Lieferanten & Bestand</p>
      </div>
      <div style="display:flex;gap:10px">
        <NuxtLink to="/shop" target="_blank">
          <button class="icon-btn"><i class="ti ti-external-link"></i></button>
        </NuxtLink>
        <button v-if="tab==='produkte'" class="accent-btn" @click="openModal">
          <i class="ti ti-plus"></i> Neues Produkt
        </button>
        <button v-if="tab==='lieferanten'" class="accent-btn" @click="openSupplierModal">
          <i class="ti ti-plus"></i> Neuer Lieferant
        </button>
      </div>
    </div>

    <!-- Settings-Style Tabs -->
    <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
      <button v-for="t in tabs" :key="t.key" class="theme-opt" :class="{ active: tab === t.key }" @click="tab=t.key">
        <i class="ti" :class="t.icon"></i> {{ t.label }}
      </button>
    </div>

    <!-- TAB: Produkte -->
    <div v-if="tab === 'produkte'">
      <div v-if="!products.length" style="text-align:center;padding:60px;color:var(--text-muted)">
        <i class="ti ti-package" style="font-size:48px;display:block;margin-bottom:12px"></i>
        Noch keine Produkte — leg das erste an!
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
        <div v-for="p in products" :key="p.productId"
          style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;overflow:hidden;transition:border-color .15s;display:flex;flex-direction:column"
          @mouseenter="e => e.currentTarget.style.borderColor='var(--accent)'"
          @mouseleave="e => e.currentTarget.style.borderColor='var(--border)'">
          <div style="height:140px;background:var(--bg-elevated);display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative">
            <img v-if="p.image" :src="p.image" style="width:100%;height:100%;object-fit:cover" />
            <i v-else class="ti ti-package" style="font-size:40px;color:var(--text-muted)"></i>
            <span style="position:absolute;top:8px;left:8px;background:rgba(0,0,0,0.6);color:#fff;font-size:10px;padding:2px 7px;border-radius:4px;font-weight:600">
              {{ p.vatRate ?? 19 }}% MwSt.
            </span>
            <span v-if="p.stock <= (p.minStock || 10)" style="position:absolute;top:8px;right:8px;background:#E05C5C;color:#fff;font-size:10px;padding:2px 7px;border-radius:4px;font-weight:600">
              ⚠ Niedrig
            </span>
          </div>
          <div style="padding:14px;flex:1;display:flex;flex-direction:column">
            <div style="font-size:10px;color:var(--accent);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;font-weight:700">{{ p.category }}</div>
            <div style="font-weight:700;font-size:14px;margin-bottom:6px">{{ p.name }}</div>
            <div style="font-size:12px;color:var(--text-muted);line-height:1.5;flex:1">{{ p.description?.slice(0,80) }}{{ p.description?.length > 80 ? '...' : '' }}</div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding-top:12px;border-top:0.5px solid var(--border)">
              <div>
                <span style="font-weight:800;font-size:16px;color:var(--accent)">€ {{ p.price }}</span>
                <span style="font-size:11px;color:var(--text-muted);margin-left:8px">Stock: {{ p.stock ?? '∞' }}</span>
              </div>
              <div style="display:flex;gap:4px">
                <button @click="openEditModal(p)" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:16px;padding:4px">
                  <i class="ti ti-pencil"></i>
                </button>
                <button @click="deleteProduct(p.productId)" style="background:none;border:none;color:#E05C5C;cursor:pointer;font-size:16px;padding:4px">
                  <i class="ti ti-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: Kategorien -->
    <div v-if="tab === 'kategorien'">
      <div class="card" style="margin-bottom:16px">
        <div class="card-header">
          <span class="card-title">Neue Kategorie</span>
        </div>
        <div class="card-body">
          <div style="display:flex;gap:12px;align-items:flex-end">
            <div class="auth-field" style="flex:1;margin:0"><label>Name</label><input v-model="newCat" placeholder="z.B. ADDON" /></div>
            <button class="accent-btn" @click="addCategory" :disabled="!newCat"><i class="ti ti-plus"></i> Hinzufügen</button>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Kategorien ({{ categories.length }})</span></div>
        <div v-for="k in categories" :key="k"
          style="padding:14px 24px;border-bottom:0.5px solid var(--border);display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:10px">
            <i class="ti ti-tag" style="color:var(--accent)"></i>
            <span style="font-weight:600">{{ k }}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:11px;color:var(--text-muted)">{{ products.filter(p => p.category === k).length }} Produkte</span>
            <button v-if="!['SOFTWARE','SERVICE'].includes(k)" @click="removeCategory(k)"
              style="background:none;border:none;color:#E05C5C;cursor:pointer;font-size:16px"><i class="ti ti-trash"></i></button>
            <span v-else style="font-size:11px;color:var(--text-muted);padding:2px 8px;border:0.5px solid var(--border);border-radius:4px">Standard</span>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: Lieferanten -->
    <div v-if="tab === 'lieferanten'">
      <div v-if="!suppliers.length" style="text-align:center;padding:60px;color:var(--text-muted)">
        <i class="ti ti-truck" style="font-size:48px;display:block;margin-bottom:12px"></i>
        Noch keine Lieferanten angelegt!
      </div>
      <div class="card" v-else>
        <table class="data-table">
          <thead>
            <tr><th>Firma</th><th>Kontakt</th><th>E-Mail</th><th>Telefon</th><th>Produkte</th><th style="width:80px"></th></tr>
          </thead>
          <tbody>
            <tr v-for="s in suppliers" :key="s.supplierId">
              <td style="font-weight:700">{{ s.name }}</td>
              <td style="font-size:12px">{{ s.contact || '—' }}</td>
              <td style="font-size:12px"><a :href="`mailto:${s.email}`" style="color:var(--accent)">{{ s.email || '—' }}</a></td>
              <td style="font-size:12px">{{ s.phone || '—' }}</td>
              <td><span class="badge badge-info">{{ products.filter(p => p.supplierId === s.supplierId).length }}</span></td>
              <td>
                <button class="icon-btn" style="color:var(--danger)" @click="deleteSupplier(s.supplierId)"><i class="ti ti-trash"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB: Bestand -->
    <div v-if="tab === 'bestand'">
      <div class="card">
        <div class="card-header"><span class="card-title">Bestandsübersicht</span></div>
        <table class="data-table">
          <thead>
            <tr><th>Produkt</th><th>Kategorie</th><th>Bestand</th><th>Mindestbestand</th><th>Lieferant</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-if="!products.length">
              <td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">Keine Produkte</td>
            </tr>
            <tr v-for="p in products" :key="p.productId">
              <td style="font-weight:600">{{ p.name }}</td>
              <td style="font-size:12px">{{ p.category }}</td>
              <td>
                <span :style="`font-weight:700;color:${p.stock <= (p.minStock || 10) ? '#E05C5C' : '#00D4B4'}`">
                  {{ p.stock ?? '∞' }}
                </span>
              </td>
              <td style="font-size:12px;color:var(--text-muted)">{{ p.minStock || 10 }}</td>
              <td style="font-size:12px">{{ suppliers.find(s => s.supplierId === p.supplierId)?.name || '—' }}</td>
              <td>
                <span v-if="p.stock <= (p.minStock || 10)" class="badge badge-danger">⚠ Nachbestellen</span>
                <span v-else class="badge badge-success">OK</span>
              </td>
              <td>
                <button v-if="p.stock <= (p.minStock || 10)" class="accent-btn"
                  style="height:26px;font-size:11px;padding:0 10px"
                  @click="openReorderModal(p)">
                  <i class="ti ti-shopping-cart"></i> Bestellen
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB: Bestellungen -->
    <div v-if="tab === 'bestellungen'">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Bestellvorgänge</span>
          <span style="font-size:12px;color:var(--text-muted)">{{ purchaseOrders.filter(o => o.status === 'offen').length }} offen</span>
        </div>
        <table class="data-table">
          <thead>
            <tr><th>Bestell-Nr.</th><th>Produkt</th><th>Lieferant</th><th>Menge</th><th>Datum</th><th>Status</th><th style="width:120px"></th></tr>
          </thead>
          <tbody>
            <tr v-if="!purchaseOrders.length">
              <td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px">Keine Bestellungen vorhanden</td>
            </tr>
            <tr v-for="o in purchaseOrders" :key="o.orderId">
              <td style="font-size:12px;font-family:monospace">{{ o.orderId?.slice(0,8).toUpperCase() }}</td>
              <td style="font-weight:600">{{ o.productName }}</td>
              <td style="font-size:12px">{{ o.supplierName || '—' }}</td>
              <td><span class="badge badge-info">{{ o.quantity }} Stk.</span></td>
              <td style="font-size:12px;color:var(--text-muted)">{{ new Date(o.created).toLocaleDateString('de-DE') }}</td>
              <td>
                <span class="badge" :class="o.status === 'offen' ? 'badge-warning' : o.status === 'geliefert' ? 'badge-success' : 'badge-info'">
                  {{ o.status }}
                </span>
              </td>
              <td>
                <div style="display:flex;gap:4px">
                  <button v-if="o.status === 'offen'" class="icon-btn" title="Als bestätigt markieren"
                    @click="updateOrderStatus(o.orderId, 'bestätigt')">
                    <i class="ti ti-check"></i>
                  </button>
                  <button v-if="o.status === 'bestätigt'" class="icon-btn" title="Als geliefert markieren"
                    style="color:#00D4B4" @click="updateOrderStatus(o.orderId, 'geliefert')">
                    <i class="ti ti-package-import"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL: Neues Produkt -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal=false">
      <div class="modal-card" style="max-width:600px">
        <div class="modal-header">
          <span class="card-title">{{ editingProduct ? "Produkt bearbeiten" : "Neues Produkt anlegen" }}</span>
          <button class="icon-btn" @click="showModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body" style="display:flex;flex-direction:column;gap:14px">
          <div style="border:1.5px dashed var(--border);border-radius:12px;overflow:hidden;position:relative;height:140px;background:var(--bg-elevated);display:flex;align-items:center;justify-content:center;cursor:pointer"
            @click="$refs.fileInput.click()">
            <img v-if="form.image" :src="form.image" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0" />
            <div v-else style="text-align:center;color:var(--text-muted)">
              <i class="ti ti-photo-up" style="font-size:32px;display:block;margin-bottom:6px"></i>
              <span style="font-size:13px">{{ imageUploading ? 'Lädt...' : 'Produktbild hochladen' }}</span>
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
            <div class="auth-field"><label>Mindestbestand</label><input v-model="form.minStock" type="number" placeholder="10" /></div>
            <div class="auth-field" style="grid-column:span 2">
              <label>Lieferant</label>
              <select v-model="form.supplierId" class="form-select">
                <option value="">— kein Lieferant —</option>
                <option v-for="s in suppliers" :key="s.supplierId" :value="s.supplierId">{{ s.name }}</option>
              </select>
            </div>
          </div>
          <div class="auth-field">
            <label>Beschreibung</label>
            <textarea v-model="form.description" placeholder="Kurze Beschreibung..." style="height:80px;resize:none;width:100%" class="form-select"></textarea>
          </div>
        </div>
        <div style="padding:0 24px 24px">
          <button class="auth-btn" @click="createProduct" :disabled="saving || !form.name || !form.price">
            <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else><i class="ti ti-plus"></i> {{ editingProduct ? 'Speichern' : 'Produkt anlegen' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: Neuer Lieferant -->
    <div v-if="showSupplierModal" class="modal-overlay" @click.self="showSupplierModal=false">
      <div class="modal-card" style="max-width:500px">
        <div class="modal-header">
          <span class="card-title">Neuer Lieferant</span>
          <button class="icon-btn" @click="showSupplierModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body" style="display:flex;flex-direction:column;gap:12px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="auth-field" style="grid-column:span 2"><label>Firmenname *</label><input v-model="supplierForm.name" placeholder="Muster GmbH" /></div>
            <div class="auth-field"><label>Ansprechpartner</label><input v-model="supplierForm.contact" placeholder="Max Mustermann" /></div>
            <div class="auth-field"><label>Telefon</label><input v-model="supplierForm.phone" placeholder="+49 123 456789" /></div>
            <div class="auth-field"><label>E-Mail</label><input v-model="supplierForm.email" placeholder="info@lieferant.de" /></div>
            <div class="auth-field"><label>Website</label><input v-model="supplierForm.website" placeholder="https://..." /></div>
            <div class="auth-field" style="grid-column:span 2"><label>Adresse</label><input v-model="supplierForm.address" placeholder="Musterstraße 1, 12345 Musterstadt" /></div>
          </div>
        </div>
        <div style="padding:0 24px 24px">
          <button class="auth-btn" @click="createSupplier" :disabled="supplierSaving || !supplierForm.name">
            <span v-if="supplierSaving"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else><i class="ti ti-plus"></i> Lieferant anlegen</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: Nachbestellung -->
    <div v-if="showReorderModal" class="modal-overlay" @click.self="showReorderModal=false">
      <div class="modal-card" style="max-width:460px">
        <div class="modal-header">
          <span class="card-title"><i class="ti ti-shopping-cart" style="margin-right:8px;color:var(--accent)"></i>Nachbestellung</span>
          <button class="icon-btn" @click="showReorderModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body" style="display:flex;flex-direction:column;gap:14px">
          <div style="background:var(--bg-elevated);border-radius:10px;padding:14px">
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">Produkt</div>
            <div style="font-weight:700">{{ reorderProduct?.name }}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:4px">
              Aktueller Bestand: <span style="color:#E05C5C;font-weight:700">{{ reorderProduct?.stock }}</span>
              · Mindestbestand: {{ reorderProduct?.minStock || 10 }}
              · Lieferant: {{ suppliers.find(s => s.supplierId === reorderProduct?.supplierId)?.name || '—' }}
            </div>
          </div>
          <div class="auth-field">
            <label>Bestellmenge</label>
            <input v-model.number="reorderForm.quantity" type="number" min="1" placeholder="10" />
          </div>
          <div class="auth-field">
            <label>Hinweise an Lieferant (optional)</label>
            <textarea v-model="reorderForm.notes" rows="3"
              style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:8px;padding:10px 14px;font-size:14px;color:var(--text-primary);width:100%;outline:none;resize:none;font-family:inherit"
              placeholder="Lieferdatum, Besonderheiten..."></textarea>
          </div>
          <div v-if="suppliers.find(s => s.supplierId === reorderProduct?.supplierId)?.email"
            style="font-size:12px;color:var(--text-muted);padding:10px;background:rgba(var(--accent-rgb),0.08);border-radius:8px">
            <i class="ti ti-mail" style="color:var(--accent)"></i>
            Bestellmail wird automatisch an {{ suppliers.find(s => s.supplierId === reorderProduct?.supplierId)?.email }} gesendet
          </div>
        </div>
        <div style="padding:0 24px 24px">
          <button class="auth-btn" @click="createPurchaseOrder" :disabled="reorderSaving">
            <span v-if="reorderSaving"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else><i class="ti ti-send"></i> Bestellung aufgeben</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="toast" class="toast-success"><i class="ti ti-circle-check"></i> {{ toast }}</div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const tab  = ref('produkte')
const tabs = [
  { key: 'produkte',     label: 'Produkte',     icon: 'ti-package'        },
  { key: 'kategorien',   label: 'Kategorien',   icon: 'ti-tag'            },
  { key: 'lieferanten',  label: 'Lieferanten',  icon: 'ti-truck'          },
  { key: 'bestand',      label: 'Bestand',      icon: 'ti-chart-bar'      },
  { key: 'bestellungen', label: 'Bestellungen', icon: 'ti-clipboard-list' },
]

const saving         = ref(false)
const supplierSaving = ref(false)
const toast          = ref('')
const newCat         = ref('')
const showModal         = ref(false)
const showSupplierModal = ref(false)
const fileInput      = ref<HTMLInputElement | null>(null)
const imageUploading = ref(false)

const form = reactive({ name: '', price: '', category: 'SOFTWARE', description: '', stock: '999', minStock: '10', image: '', vatRate: 19, supplierId: '' })
const supplierForm = reactive({ name: '', contact: '', email: '', phone: '', website: '', address: '' })

const categories = ref(['SOFTWARE', 'SERVICE'])
const suppliers  = ref<any[]>([])

const { data, refresh } = await useFetch(useApiUrl('/api/shop/products'))
const products = computed(() => (data.value as any)?.products || [])

const { data: suppData, refresh: refreshSuppliers } = await useFetch(useApiUrl('/api/shop/suppliers'))
onMounted(() => {
  if ((suppData.value as any)?.suppliers) suppliers.value = (suppData.value as any).suppliers
})
watch(suppData, v => { if ((v as any)?.suppliers) suppliers.value = (v as any).suppliers })

const editingProduct = ref<any>(null)

function openModal() {
  editingProduct.value = null
  Object.assign(form, { name: '', price: '', category: 'SOFTWARE', description: '', stock: '999', minStock: '10', image: '', vatRate: 19, supplierId: '' })
  showModal.value = true
}

function openEditModal(p: any) {
  editingProduct.value = p
  Object.assign(form, {
    name: p.name, price: String(p.price), category: p.category || 'SOFTWARE',
    description: p.description || '', stock: String(p.stock ?? 999),
    minStock: String(p.minStock ?? 10), image: p.image || '',
    vatRate: p.vatRate ?? 19, supplierId: p.supplierId || ''
  })
  showModal.value = true
}

function openSupplierModal() {
  Object.assign(supplierForm, { name: '', contact: '', email: '', phone: '', website: '', address: '' })
  showSupplierModal.value = true
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
    if (editingProduct.value) {
      await $fetch(useApiUrl(`/api/shop/products/${editingProduct.value.productId}`), {
        method: 'PATCH',
        body: { ...form, price: Number(form.price), stock: Number(form.stock), minStock: Number(form.minStock) }
      })
      showToast('Produkt gespeichert!')
    } else {
      await $fetch(useApiUrl('/api/shop/products'), {
        method: 'POST',
        body: { ...form, price: Number(form.price), stock: Number(form.stock), minStock: Number(form.minStock) }
      })
      showToast('Produkt angelegt!')
    }
    await refresh()
    showModal.value = false
  } finally { saving.value = false }
}

async function deleteProduct(id: string) {
  await $fetch(useApiUrl(`/api/shop/products/${id}`), { method: 'DELETE' })
  await refresh()
  showToast('Produkt gelöscht!')
}

async function createSupplier() {
  if (!supplierForm.name) return
  supplierSaving.value = true
  try {
    await $fetch(useApiUrl('/api/shop/suppliers'), { method: 'POST', body: { ...supplierForm } })
    await refreshSuppliers()
    showSupplierModal.value = false
    showToast('Lieferant angelegt!')
  } finally { supplierSaving.value = false }
}

async function deleteSupplier(id: string) {
  await $fetch(useApiUrl(`/api/shop/suppliers/${id}`), { method: 'DELETE' })
  await refreshSuppliers()
  showToast('Lieferant gelöscht!')
}

function addCategory() {
  const v = newCat.value.trim().toUpperCase()
  if (v && !categories.value.includes(v)) categories.value.push(v)
  newCat.value = ''
  showToast('Kategorie hinzugefügt!')
}

function removeCategory(k: string) {
  categories.value = categories.value.filter(c => c !== k)
}

function showToast(msg: string) {
  toast.value = msg
  setTimeout(() => toast.value = '', 2500)
}

// ── Purchase Orders ───────────────────────────────────────────────────────────
const purchaseOrders    = ref<any[]>([])
const showReorderModal  = ref(false)
const reorderProduct    = ref<any>(null)
const reorderForm       = reactive({ quantity: 10, notes: '' })
const reorderSaving     = ref(false)

const { data: poData, refresh: refreshPO } = await useFetch(useApiUrl('/api/shop/purchase-orders'))
watch(poData, v => { if ((v as any)?.orders) purchaseOrders.value = (v as any).orders }, { immediate: true })

function openReorderModal(product: any) {
  reorderProduct.value = product
  reorderForm.quantity = product.reorderQty || 10
  reorderForm.notes    = ''
  showReorderModal.value = true
}

async function createPurchaseOrder() {
  if (!reorderProduct.value) return
  reorderSaving.value = true
  try {
    await $fetch(useApiUrl('/api/shop/purchase-orders'), {
      method: 'POST',
      body: {
        productId:   reorderProduct.value.productId,
        productName: reorderProduct.value.name,
        supplierId:  reorderProduct.value.supplierId || '',
        quantity:    reorderForm.quantity,
        notes:       reorderForm.notes,
      }
    })
    await refreshPO()
    showReorderModal.value = false
    showToast('Bestellung aufgegeben!')
  } finally { reorderSaving.value = false }
}

async function updateOrderStatus(orderId: string, status: string) {
  await $fetch(useApiUrl(`/api/shop/purchase-orders/${orderId}`), {
    method: 'PATCH',
    body: { status }
  })
  await refreshPO()
  showToast(`Status auf "${status}" gesetzt!`)
}
</script>
