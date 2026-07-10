<template>
  <div class="page">

    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:22px;font-weight:800;margin:0">Einzelhandel <span style="color:var(--accent)">Manager</span></h1>
        <p style="color:var(--text-muted);font-size:13px;margin:4px 0 0">Kassensystem, Lagerverwaltung & Tagesabschluss</p>
      </div>
      <button v-if="activeTab==='lager'" class="accent-btn" @click="openNewProduct">
        <i class="ti ti-plus"></i> Produkt anlegen
      </button>
    </div>

    <!-- Tabs -->
    <div style="display:flex;gap:8px;margin-bottom:20px;border-bottom:0.5px solid var(--border);padding-bottom:0">
      <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
        style="padding:10px 16px;border:none;background:none;cursor:pointer;font-size:13px;font-weight:600;border-bottom:2px solid transparent;display:flex;align-items:center;gap:6px"
        :style="activeTab===tab.key ? 'color:var(--accent);border-bottom-color:var(--accent)' : 'color:var(--text-muted)'">
        <i :class="'ti ' + tab.icon"></i> {{ tab.label }}
      </button>
    </div>

    <!-- KASSE -->
    <div v-if="activeTab==='kasse'" style="display:grid;grid-template-columns:1fr 340px;gap:20px;align-items:start">
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px">
        <div v-for="p in activeProducts" :key="p.productId" @click="addToCart(p)"
          style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:12px;padding:14px;cursor:pointer;transition:border-color .15s"
          :style="p.stock<=0 ? 'opacity:0.4;pointer-events:none' : ''">
          <div style="font-size:13px;font-weight:700;margin-bottom:4px">{{ p.name }}</div>
          <div style="font-size:12px;color:var(--text-muted)">{{ p.stock }} {{ p.unit }} auf Lager</div>
          <div style="font-size:15px;font-weight:800;color:var(--accent);margin-top:6px">€ {{ p.price.toFixed(2) }}</div>
        </div>
        <div v-if="!activeProducts.length" style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">
          Keine aktiven Produkte. Lege welche im Tab "Lager" an.
        </div>
      </div>

      <!-- Warenkorb -->
      <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;padding:18px;position:sticky;top:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div style="font-weight:700;font-size:14px"><i class="ti ti-shopping-cart" style="color:var(--accent)"></i> Warenkorb</div>
          <button class="icon-btn" style="width:28px;height:28px" :title="showDisplay ? 'Anzeige ausblenden' : 'Anzeige einblenden'" @click="toggleDisplay">
            <i class="ti" :class="showDisplay ? 'ti-eye' : 'ti-eye-off'"></i>
          </button>
        </div>

        <!-- Digitalanzeige + Ziffernblock -->
        <div v-if="showDisplay" style="margin-bottom:14px">
          <div style="background:#0a1a0f;border:1px solid #1a3324;border-radius:10px;padding:10px 14px;margin-bottom:8px;overflow:hidden">
            <div style="font-family:'VT323',monospace;font-size:12px;letter-spacing:.1em;color:#4ade80;opacity:.75;text-align:right">MENGE</div>
            <div style="font-family:'VT323',monospace;font-size:34px;line-height:1;letter-spacing:.05em;color:#4ade80;text-shadow:0 0 8px rgba(74,222,128,.65);text-align:right">
              {{ numpadBuffer || pendingQty }}<span style="opacity:.35">×</span>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
            <button v-for="n in ['7','8','9','4','5','6','1','2','3']" :key="n" class="icon-btn"
              style="height:38px;font-family:'VT323',monospace;font-size:20px" @click="numpadPress(n)">{{ n }}</button>
            <button class="icon-btn" style="height:38px;font-size:13px;color:#ef4444" @click="numpadClear">C</button>
            <button class="icon-btn" style="height:38px;font-family:'VT323',monospace;font-size:20px" @click="numpadPress('0')">0</button>
            <button class="icon-btn" style="height:38px" @click="numpadBackspace"><i class="ti ti-backspace"></i></button>
          </div>
        </div>

        <div v-if="!cart.length" style="text-align:center;padding:24px 0;color:var(--text-muted);font-size:13px">Leer</div>
        <div v-for="c in cart" :key="c.productId" style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <div style="flex:1;font-size:13px">{{ c.name }}</div>
          <button class="icon-btn" style="width:24px;height:24px" @click="changeQty(c, -1)">−</button>
          <span style="min-width:18px;text-align:center;font-size:13px">{{ c.qty }}</span>
          <button class="icon-btn" style="width:24px;height:24px" @click="changeQty(c, 1)">+</button>
          <div style="font-size:13px;font-weight:700;min-width:60px;text-align:right">€ {{ (c.price*c.qty).toFixed(2) }}</div>
        </div>
        <div v-if="cart.length" style="border-top:0.5px solid var(--border);margin-top:12px;padding-top:12px">
          <div v-if="showDisplay" style="background:#0a1a0f;border:1px solid #1a3324;border-radius:10px;padding:10px 14px;margin-bottom:12px;overflow:hidden">
            <div style="font-family:'VT323',monospace;font-size:12px;letter-spacing:.1em;color:#4ade80;opacity:.75;text-align:right">SUMME EUR</div>
            <div style="font-family:'VT323',monospace;font-size:40px;line-height:1;letter-spacing:.03em;color:#4ade80;text-shadow:0 0 10px rgba(74,222,128,.7);text-align:right">
              {{ cartTotal.toFixed(2) }}
            </div>
          </div>
          <div v-else style="display:flex;justify-content:space-between;font-weight:800;font-size:16px;margin-bottom:12px">
            <span>Summe</span><span style="color:var(--accent)">€ {{ cartTotal.toFixed(2) }}</span>
          </div>
          <div style="display:flex;gap:8px;margin-bottom:12px">
            <button class="form-select" style="flex:1" :style="paymentMethod==='bar' ? 'border-color:var(--accent);color:var(--accent)' : ''" @click="paymentMethod='bar'">Bar</button>
            <button class="form-select" style="flex:1" :style="paymentMethod==='karte' ? 'border-color:var(--accent);color:var(--accent)' : ''" @click="paymentMethod='karte'">Karte</button>
          </div>
          <button class="auth-btn" :disabled="checkingOut" @click="checkout">
            <i class="ti ti-check" style="margin-right:6px"></i>{{ checkingOut ? 'Speichere…' : 'Verkauf abschließen' }}
          </button>
        </div>
      </div>
    </div>

    <!-- LAGER -->
    <div v-if="activeTab==='lager'">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="text-align:left;font-size:11px;color:var(--text-muted);text-transform:uppercase">
            <th style="padding:8px">Name</th><th style="padding:8px">SKU</th><th style="padding:8px">Kategorie</th>
            <th style="padding:8px">Preis</th><th style="padding:8px">Bestand</th><th style="padding:8px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in products" :key="p.productId" style="border-top:0.5px solid var(--border)">
            <td style="padding:8px;font-weight:600">{{ p.name }}</td>
            <td style="padding:8px;color:var(--text-muted)">{{ p.sku }}</td>
            <td style="padding:8px;color:var(--text-muted)">{{ p.category }}</td>
            <td style="padding:8px">€ {{ p.price.toFixed(2) }}</td>
            <td style="padding:8px" :style="p.stock<=0 ? 'color:#ef4444' : ''">{{ p.stock }} {{ p.unit }}</td>
            <td style="padding:8px;text-align:right">
              <button class="icon-btn" style="width:28px;height:28px" @click="openEditProduct(p)"><i class="ti ti-edit"></i></button>
              <button class="icon-btn" style="width:28px;height:28px" @click="deleteProduct(p)"><i class="ti ti-trash"></i></button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!products.length" style="text-align:center;padding:40px;color:var(--text-muted)">Noch keine Produkte angelegt.</div>
    </div>

    <!-- TAGESABSCHLUSS -->
    <div v-if="activeTab==='abschluss'">
      <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;padding:20px;margin-bottom:20px;max-width:420px">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">Heute ({{ todayKey }})</div>
        <div style="font-size:28px;font-weight:900;color:var(--accent);margin-bottom:12px">€ {{ todayTotal.toFixed(2) }}</div>
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px">{{ todaySales.length }} Verkäufe</div>
        <button class="accent-btn" :disabled="closingDay" @click="closeDay">
          <i class="ti ti-lock" style="margin-right:6px"></i>{{ closingDay ? 'Speichere…' : 'Tag abschließen' }}
        </button>
      </div>

      <div style="font-size:13px;font-weight:700;margin-bottom:10px">Historie</div>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="text-align:left;font-size:11px;color:var(--text-muted);text-transform:uppercase">
            <th style="padding:8px">Datum</th><th style="padding:8px">Verkäufe</th><th style="padding:8px">Bar</th><th style="padding:8px">Karte</th><th style="padding:8px">Summe</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in closings" :key="c.closingId" style="border-top:0.5px solid var(--border)">
            <td style="padding:8px;font-weight:600">{{ c.closingId }}</td>
            <td style="padding:8px">{{ c.saleCount }}</td>
            <td style="padding:8px">€ {{ c.totalByMethod.bar.toFixed(2) }}</td>
            <td style="padding:8px">€ {{ c.totalByMethod.karte.toFixed(2) }}</td>
            <td style="padding:8px;font-weight:700">€ {{ c.totalGross.toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="!closings.length" style="text-align:center;padding:24px;color:var(--text-muted)">Noch kein Tag abgeschlossen.</div>
    </div>

    <!-- VERKÄUFE -->
    <div v-if="activeTab==='verkaeufe'">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="text-align:left;font-size:11px;color:var(--text-muted);text-transform:uppercase">
            <th style="padding:8px">Datum</th><th style="padding:8px">Produkt</th><th style="padding:8px">Menge</th><th style="padding:8px">Summe</th><th style="padding:8px">Zahlart</th><th style="padding:8px"></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="s in sales" :key="s.saleId">
            <tr v-for="(line, i) in s.items" :key="s.saleId + '-' + i" style="border-top:0.5px solid var(--border)">
              <td style="padding:8px;color:var(--text-muted)" v-if="i===0">{{ formatDateTime(s.createdAt) }}</td>
              <td style="padding:8px" v-else></td>
              <td style="padding:8px;font-weight:600">{{ line.name }}</td>
              <td style="padding:8px">{{ line.qty }}</td>
              <td style="padding:8px">€ {{ line.lineTotal.toFixed(2) }}</td>
              <td style="padding:8px" v-if="i===0">{{ s.paymentMethod }}</td>
              <td style="padding:8px" v-else></td>
              <td style="padding:8px;text-align:right">
                <button class="icon-btn" style="width:28px;height:28px" title="Retoure" @click="openReturnModal(s, line)"><i class="ti ti-rotate-2"></i></button>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <div v-if="!sales.length" style="text-align:center;padding:40px;color:var(--text-muted)">Noch keine Verkäufe.</div>
    </div>

    <!-- RETOURE MODAL -->
    <div v-if="showReturnModal" class="modal-overlay" @click.self="showReturnModal=false">
      <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;padding:24px;width:100%;max-width:400px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <div style="font-size:16px;font-weight:700">Retoure erfassen</div>
          <button class="icon-btn" @click="showReturnModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div style="font-size:13px;font-weight:600;margin-bottom:12px">{{ returnForm.productName }}</div>
        <div class="auth-field" style="margin-bottom:12px"><label>Menge</label><input v-model="returnForm.qty" type="number" min="1" :max="returnForm.maxQty" /></div>
        <div class="auth-field" style="margin-bottom:20px"><label>Grund (optional)</label><input v-model="returnForm.reason" /></div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px"><i class="ti ti-info-circle"></i> POS-Verkäufe haben keine Stripe-Zahlung — nur Bestand wird zurückgebucht, keine automatische Erstattung.</div>
        <button class="auth-btn" :disabled="returnSaving || !returnForm.qty" @click="submitReturn">
          <i class="ti ti-rotate-2" style="margin-right:6px"></i>{{ returnSaving ? 'Speichere…' : 'Retoure abschließen' }}
        </button>
      </div>
    </div>

    <!-- PRODUKT MODAL -->
    <div v-if="showProductModal" class="modal-overlay" @click.self="showProductModal=false">
      <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;padding:24px;width:100%;max-width:440px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <div style="font-size:16px;font-weight:700">{{ editingProductId ? 'Produkt bearbeiten' : 'Produkt anlegen' }}</div>
          <button class="icon-btn" @click="showProductModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="auth-field" style="margin-bottom:12px"><label>Name</label><input v-model="pForm.name" placeholder="Produktname" /></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
          <div class="auth-field"><label>SKU</label><input v-model="pForm.sku" placeholder="ABC-123" /></div>
          <div class="auth-field"><label>Kategorie</label><input v-model="pForm.category" placeholder="Kategorie" /></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px">
          <div class="auth-field"><label>Preis (€)</label><input v-model="pForm.price" type="number" step="0.01" placeholder="9.99" /></div>
          <div class="auth-field"><label>Bestand</label><input v-model="pForm.stock" type="number" placeholder="10" /></div>
          <div class="auth-field"><label>Einheit</label><input v-model="pForm.unit" placeholder="Stk" /></div>
        </div>
        <button class="auth-btn" :disabled="savingProduct || !pForm.name" @click="saveProduct">
          <i class="ti ti-device-floppy" style="margin-right:6px"></i>{{ editingProductId ? 'Speichern' : 'Anlegen' }}
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

useHead({
  link: [{ rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=VT323&display=swap' }],
})

const userEmail = ref('')
const authToken = ref('')
const activeTab = ref('kasse')
const products  = ref<any[]>([])
const sales     = ref<any[]>([])
const closings  = ref<any[]>([])

const tabs = [
  { key: 'kasse',    label: 'Kasse',          icon: 'ti-cash-register' },
  { key: 'lager',    label: 'Lager',          icon: 'ti-boxes' },
  { key: 'abschluss', label: 'Tagesabschluss', icon: 'ti-report-money' },
  { key: 'verkaeufe', label: 'Verkäufe',       icon: 'ti-receipt' },
]

function authHeaders() { return { 'x-user-email': userEmail.value, Authorization: `Bearer ${authToken.value}` } }

async function loadProducts() {
  try { const r = await $fetch<any>(useApiUrl('/api/shop/products'), { headers: authHeaders() }); products.value = r.products || [] } catch {}
}
async function loadSales() {
  try { const r = await $fetch<any>(useApiUrl('/api/retail/sales'), { headers: authHeaders() }); sales.value = r.sales || [] } catch {}
}
async function loadClosings() {
  try { const r = await $fetch<any>(useApiUrl('/api/retail/closings'), { headers: authHeaders() }); closings.value = r.closings || [] } catch {}
}

const activeProducts = computed(() => products.value.filter(p => p.status === 'active'))

// Kasse
const cart = ref<{ productId: string; name: string; price: number; qty: number }[]>([])
const paymentMethod = ref<'bar'|'karte'>('bar')
const checkingOut = ref(false)

// Ziffernblock + Digitalanzeige — Menge vor dem Antippen eines Produkts eingeben
const pendingQty = ref(1)
const numpadBuffer = ref('')
const showDisplay = ref(true)

onMounted(() => {
  const saved = localStorage.getItem('retail-kasse-display')
  if (saved !== null) showDisplay.value = saved === '1'
})
function toggleDisplay() {
  showDisplay.value = !showDisplay.value
  localStorage.setItem('retail-kasse-display', showDisplay.value ? '1' : '0')
}

function numpadPress(digit: string) {
  if (numpadBuffer.value.length >= 3) return
  numpadBuffer.value += digit
  pendingQty.value = Math.max(1, parseInt(numpadBuffer.value, 10) || 1)
}
function numpadBackspace() {
  numpadBuffer.value = numpadBuffer.value.slice(0, -1)
  pendingQty.value = numpadBuffer.value ? parseInt(numpadBuffer.value, 10) : 1
}
function numpadClear() {
  numpadBuffer.value = ''
  pendingQty.value = 1
}

function addToCart(p: any) {
  const qty = pendingQty.value
  const existing = cart.value.find(c => c.productId === p.productId)
  if (existing) existing.qty += qty
  else cart.value.push({ productId: p.productId, name: p.name, price: p.price, qty })
  numpadClear()
}
function changeQty(c: any, delta: number) {
  c.qty += delta
  if (c.qty <= 0) cart.value = cart.value.filter(i => i.productId !== c.productId)
}
const cartTotal = computed(() => cart.value.reduce((s, c) => s + c.price * c.qty, 0))

async function checkout() {
  if (!cart.value.length) return
  checkingOut.value = true
  try {
    await $fetch(useApiUrl('/api/retail/sales'), {
      method: 'POST',
      headers: authHeaders(),
      body: { items: cart.value.map(c => ({ productId: c.productId, qty: c.qty })), paymentMethod: paymentMethod.value },
    })
    cart.value = []
    await Promise.all([loadProducts(), loadSales()])
  } catch { alert('Verkauf fehlgeschlagen.') }
  checkingOut.value = false
}

// Lager
const showProductModal = ref(false)
const editingProductId  = ref('')
const savingProduct     = ref(false)
const pForm = reactive({ name: '', sku: '', category: '', price: '', stock: '', unit: 'Stk' })

function openNewProduct() {
  Object.assign(pForm, { name: '', sku: '', category: '', price: '', stock: '', unit: 'Stk' })
  editingProductId.value = ''
  showProductModal.value = true
}
function openEditProduct(p: any) {
  Object.assign(pForm, { name: p.name, sku: p.sku, category: p.category, price: p.price, stock: p.stock, unit: p.unit })
  editingProductId.value = p.productId
  showProductModal.value = true
}
async function saveProduct() {
  savingProduct.value = true
  try {
    const existing = editingProductId.value ? products.value.find(p => p.productId === editingProductId.value) : null
    // Mit dem bestehenden Datensatz mergen, damit ein einfaches Retail-Edit nicht
    // Felder überschreibt, die nur shop-admin.vue pflegt (description, vatRate, ...).
    const body = { ...(existing || {}), ...pForm, price: Number(pForm.price) || 0, stock: Number(pForm.stock) || 0 }
    if (editingProductId.value) {
      await $fetch(useApiUrl(`/api/shop/products/${editingProductId.value}`), { method: 'PATCH', headers: authHeaders(), body })
    } else {
      await $fetch(useApiUrl('/api/shop/products'), { method: 'POST', headers: authHeaders(), body })
    }
    showProductModal.value = false
    await loadProducts()
  } catch {}
  savingProduct.value = false
}
async function deleteProduct(p: any) {
  if (!confirm(`"${p.name}" wirklich löschen?`)) return
  await $fetch(useApiUrl(`/api/shop/products/${p.productId}`), { method: 'DELETE', headers: authHeaders() })
  await loadProducts()
}

// Tagesabschluss
const todayKey = new Date().toISOString().slice(0, 10)
const todaySales = computed(() => sales.value.filter(s => s.dayKey === todayKey))
const todayTotal = computed(() => todaySales.value.reduce((s, x) => s + (Number(x.totalGross) || 0), 0))
const closingDay = ref(false)

async function closeDay() {
  closingDay.value = true
  try {
    await $fetch(useApiUrl('/api/retail/closings'), { method: 'POST', headers: authHeaders(), body: { dayKey: todayKey } })
    await loadClosings()
  } catch {}
  closingDay.value = false
}

function formatDateTime(d?: string) {
  if (!d) return ''
  return new Date(d).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// Verkäufe & Retouren (POS — keine Stripe-Zahlung, nur Bestandsrückbuchung)
const showReturnModal = ref(false)
const returnSaving    = ref(false)
const returnForm = reactive({ originId: '', productId: '', productName: '', qty: 1, maxQty: 1, reason: '' })

function openReturnModal(sale: any, line: any) {
  returnForm.originId    = sale.saleId
  returnForm.productId   = line.productId
  returnForm.productName = line.name
  returnForm.qty         = line.qty
  returnForm.maxQty      = line.qty
  returnForm.reason      = ''
  showReturnModal.value  = true
}

async function submitReturn() {
  returnSaving.value = true
  try {
    await $fetch(useApiUrl('/api/returns'), {
      method: 'POST',
      headers: authHeaders(),
      body: {
        source: 'pos',
        originId: returnForm.originId,
        items: [{ productId: returnForm.productId, qty: Number(returnForm.qty) }],
        reason: returnForm.reason,
      }
    })
    showReturnModal.value = false
    await Promise.all([loadProducts(), loadSales()])
  } catch { alert('Retoure fehlgeschlagen.') }
  returnSaving.value = false
}

onMounted(async () => {
  const { useAuthUser } = await import('~/composables/useAuth')
  const u = await useAuthUser()
  userEmail.value = u.email || ''
  authToken.value = u.idToken || ''
  await Promise.all([loadProducts(), loadSales(), loadClosings()])
})
</script>
