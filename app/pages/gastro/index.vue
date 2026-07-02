<template>
  <div class="page">

    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:22px;font-weight:800;margin:0">Gastronomie <span style="color:var(--accent)">Manager</span></h1>
        <p style="color:var(--text-muted);font-size:13px;margin:4px 0 0">Speisekarte, Tische & Online-Bestellungen</p>
      </div>
      <div style="display:flex;gap:8px">
        <button class="icon-btn" title="Webseiten-Einstellungen" @click="openSettings"><i class="ti ti-settings"></i></button>
        <button v-if="activeTab === 'speisekarte'" class="accent-btn" @click="openNewItem">
          <i class="ti ti-plus"></i> Gericht anlegen
        </button>
        <button v-else-if="activeTab === 'tische'" class="accent-btn" @click="openNewTable">
          <i class="ti ti-plus"></i> Tisch anlegen
        </button>
      </div>
    </div>

    <!-- SETTINGS MODAL -->
    <div v-if="showSettingsModal" class="modal-overlay" @click.self="showSettingsModal=false">
      <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;padding:24px;width:100%;max-width:460px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <div style="font-size:16px;font-weight:700">Webseiten-Einstellungen</div>
          <button class="icon-btn" @click="showSettingsModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">
          Zeigt deine Speisekarte öffentlich auf deiner Nexora-Webseite an — optional mit Online-Bestellung.
        </div>
        <div style="border-top:0.5px solid var(--border);margin:0 0 20px;padding-top:20px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div style="font-size:13px;font-weight:700"><i class="ti ti-world" style="margin-right:6px;color:var(--accent)"></i>Digitale Speisekarte</div>
            <button @click="settingsForm.menuEnabled = !settingsForm.menuEnabled"
              style="width:42px;height:24px;border-radius:12px;border:none;cursor:pointer;transition:all .2s;position:relative;flex-shrink:0"
              :style="settingsForm.menuEnabled ? 'background:var(--accent)' : 'background:var(--border)'">
              <span style="position:absolute;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .2s"
                :style="settingsForm.menuEnabled ? 'left:21px' : 'left:3px'"></span>
            </button>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">
            Verfügbare Gerichte erscheinen automatisch mit aktuellem Preis auf deiner Webseite.
          </div>
          <div class="auth-field" v-if="settingsForm.menuEnabled">
            <label>Seitentitel (Navigation & Überschrift)</label>
            <input v-model="settingsForm.menuTitle" placeholder="Speisekarte" />
          </div>
        </div>

        <div v-if="settingsForm.menuEnabled" style="border-top:0.5px solid var(--border);margin:0 0 20px;padding-top:20px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div style="font-size:13px;font-weight:700"><i class="ti ti-shopping-cart" style="margin-right:6px;color:var(--accent)"></i>Online-Bestellung</div>
            <button @click="settingsForm.orderingEnabled = !settingsForm.orderingEnabled"
              style="width:42px;height:24px;border-radius:12px;border:none;cursor:pointer;transition:all .2s;position:relative;flex-shrink:0"
              :style="settingsForm.orderingEnabled ? 'background:var(--accent)' : 'background:var(--border)'">
              <span style="position:absolute;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .2s"
                :style="settingsForm.orderingEnabled ? 'left:21px' : 'left:3px'"></span>
            </button>
          </div>
          <div style="font-size:12px;color:var(--text-muted)">
            Gäste können direkt auf deiner Speisekarte bestellen (Warenkorb + Abholzeit). Bestellungen landen im Tab <strong>Bestellungen</strong>.
          </div>
        </div>

        <div style="display:flex;gap:16px;justify-content:flex-end">
          <button class="icon-btn" style="padding:0 16px;font-size:12px" @click="showSettingsModal=false">Abbrechen</button>
          <button class="accent-btn" :disabled="savingSettings" @click="saveSettings">
            <i v-if="savingSettings" class="ti ti-loader-2 spin"></i>
            <span v-else><i class="ti ti-device-floppy" style="margin-right:4px"></i>Speichern</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-grid" style="margin-bottom:20px">
      <div class="stat-card">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:40px;height:40px;border-radius:10px;background:var(--accent)22;display:flex;align-items:center;justify-content:center">
            <i class="ti ti-tools-kitchen-2" style="color:var(--accent);font-size:20px"></i>
          </div>
          <div>
            <div style="font-size:22px;font-weight:800">{{ menuItems.length }}</div>
            <div style="font-size:12px;color:var(--text-muted)">Gerichte gesamt</div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:40px;height:40px;border-radius:10px;background:#22c55e22;display:flex;align-items:center;justify-content:center">
            <i class="ti ti-circle-check" style="color:#22c55e;font-size:20px"></i>
          </div>
          <div>
            <div style="font-size:22px;font-weight:800">{{ menuItems.filter(i => i.available).length }}</div>
            <div style="font-size:12px;color:var(--text-muted)">Verfügbar</div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:40px;height:40px;border-radius:10px;background:#3b82f622;display:flex;align-items:center;justify-content:center">
            <i class="ti ti-armchair" style="color:#3b82f6;font-size:20px"></i>
          </div>
          <div>
            <div style="font-size:22px;font-weight:800">{{ tables.length }}</div>
            <div style="font-size:12px;color:var(--text-muted)">Tische gesamt</div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:40px;height:40px;border-radius:10px;background:#22c55e22;display:flex;align-items:center;justify-content:center">
            <i class="ti ti-check" style="color:#22c55e;font-size:20px"></i>
          </div>
          <div>
            <div style="font-size:22px;font-weight:800">{{ tables.filter(t => t.status === 'frei').length }}</div>
            <div style="font-size:12px;color:var(--text-muted)">Freie Tische</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
      <button v-for="tab in tabs" :key="tab.key" class="theme-opt" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
        <i class="ti" :class="tab.icon"></i> {{ tab.label }}
        <span v-if="tab.key === 'bestellungen' && newOrdersCount" style="margin-left:6px;font-size:10px;background:var(--accent);color:#fff;padding:1px 6px;border-radius:20px">{{ newOrdersCount }}</span>
      </button>
    </div>

    <!-- ── TAB: SPEISEKARTE ── -->
    <div v-if="activeTab === 'speisekarte'">
      <div v-if="loadingMenu" style="display:flex;justify-content:center;padding:60px;color:var(--text-muted)">
        <i class="ti ti-loader-2 spin" style="font-size:28px"></i>
      </div>
      <div v-else-if="!menuItems.length" style="text-align:center;padding:80px;color:var(--text-muted)">
        <i class="ti ti-tools-kitchen-off" style="font-size:48px;display:block;margin-bottom:12px;opacity:.3"></i>
        <p style="font-size:14px;margin-bottom:16px">Noch keine Gerichte angelegt.</p>
        <button class="accent-btn" @click="openNewItem"><i class="ti ti-plus" style="margin-right:6px"></i>Erstes Gericht anlegen</button>
      </div>
      <div v-else style="display:flex;flex-direction:column;gap:24px">
        <div v-for="cat in menuByCategory" :key="cat.category">
          <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:10px">{{ cat.category }}</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <div v-for="item in cat.items" :key="item.itemId"
              style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:16px;transition:border-color .15s"
              @mouseenter="e => (e.currentTarget as HTMLElement).style.borderColor='var(--accent)'"
              @mouseleave="e => (e.currentTarget as HTMLElement).style.borderColor='var(--border)'">
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:8px">
                  <span style="font-weight:700;font-size:14px">{{ item.name }}</span>
                  <span v-if="!item.available" style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:var(--border);color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em">Ausverkauft</span>
                </div>
                <div v-if="item.description" style="font-size:12px;color:var(--text-muted);margin-top:3px">{{ item.description }}</div>
              </div>
              <div style="font-weight:800;font-size:16px;color:var(--accent);flex-shrink:0">{{ formatPrice(item.price) }}</div>
              <div style="display:flex;gap:4px;flex-shrink:0">
                <button @click="toggleAvailable(item)" class="icon-btn" :title="item.available ? 'Als ausverkauft markieren' : 'Wieder verfügbar'">
                  <i class="ti" :class="item.available ? 'ti-eye' : 'ti-eye-off'"></i>
                </button>
                <button @click="openEditItem(item)" class="icon-btn" title="Bearbeiten"><i class="ti ti-edit"></i></button>
                <button @click="deleteItem(item)" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:16px;padding:4px 6px;border-radius:6px;transition:background .15s"
                  onmouseover="this.style.background='rgba(239,68,68,.1)'" onmouseout="this.style.background='none'" title="Löschen">
                  <i class="ti ti-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── TAB: TISCHE ── -->
    <div v-else-if="activeTab === 'tische'">
      <div v-if="loadingTables" style="display:flex;justify-content:center;padding:60px;color:var(--text-muted)">
        <i class="ti ti-loader-2 spin" style="font-size:28px"></i>
      </div>
      <div v-else-if="!tables.length" style="text-align:center;padding:80px;color:var(--text-muted)">
        <i class="ti ti-armchair-off" style="font-size:48px;display:block;margin-bottom:12px;opacity:.3"></i>
        <p style="font-size:14px;margin-bottom:16px">Noch keine Tische angelegt.</p>
        <button class="accent-btn" @click="openNewTable"><i class="ti ti-plus" style="margin-right:6px"></i>Ersten Tisch anlegen</button>
      </div>
      <div v-else style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px">
        <div v-for="t in tables" :key="t.tableId"
          style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:14px;padding:18px;transition:border-color .15s;cursor:pointer"
          :style="tableBorderStyle(t.status)"
          @click="openEditTable(t)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div style="font-weight:800;font-size:16px">{{ t.name }}</div>
            <span style="font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:.05em" :style="tableBadgeStyle(t.status)">{{ t.status }}</span>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px"><i class="ti ti-users" style="margin-right:4px"></i>{{ t.seats || '—' }} Plätze</div>
          <div v-if="t.status === 'reserviert' && t.reservation" style="font-size:12px;color:var(--text);background:var(--bg-elevated);border-radius:8px;padding:8px 10px;margin-top:8px">
            <div style="font-weight:700">{{ t.reservation.customerName }}</div>
            <div style="color:var(--text-muted);margin-top:2px">{{ formatDateTime(t.reservation.time) }} · {{ t.reservation.guests }} Pers.</div>
          </div>
          <button @click.stop="deleteTable(t)" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:13px;padding:4px 0 0;opacity:.6;transition:opacity .15s"
            onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='.6'"><i class="ti ti-trash" style="margin-right:4px"></i>Löschen</button>
        </div>
      </div>
    </div>

    <!-- ── TAB: BESTELLUNGEN ── -->
    <div v-else-if="activeTab === 'bestellungen'">
      <div v-if="loadingOrders" style="display:flex;justify-content:center;padding:60px;color:var(--text-muted)">
        <i class="ti ti-loader-2 spin" style="font-size:28px"></i>
      </div>
      <div v-else-if="!orders.length" style="text-align:center;padding:80px;color:var(--text-muted)">
        <i class="ti ti-shopping-cart-off" style="font-size:48px;display:block;margin-bottom:12px;opacity:.3"></i>
        <p style="font-size:14px">Noch keine Bestellungen eingegangen.</p>
        <p v-if="!settingsForm.orderingEnabled" style="font-size:12px;margin-top:8px">Aktiviere die Online-Bestellung in den <a href="#" @click.prevent="openSettings" style="color:var(--accent)">Webseiten-Einstellungen</a>.</p>
      </div>
      <div v-else style="display:flex;flex-direction:column;gap:10px">
        <div v-for="o in orders" :key="o.orderId"
          style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:14px;padding:16px 18px;transition:border-color .15s"
          :style="o.status === 'neu' ? 'border-color:var(--accent)66' : ''">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <div>
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-weight:700;font-size:14px">{{ o.customerName }}</span>
                <span style="font-size:10px;font-weight:700;padding:2px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:.05em" :style="orderStatusStyle(o.status)">{{ ORDER_STATUS_LABEL[o.status] || o.status }}</span>
              </div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:3px">
                <i class="ti ti-phone" style="margin-right:3px"></i>{{ o.phone }}
                <span style="margin:0 6px">·</span>
                <i class="ti ti-clock" style="margin-right:3px"></i>{{ o.pickupTime === 'sofort' ? 'So schnell wie möglich' : formatOrderTime(o.pickupTime) }}
                <span style="margin:0 6px">·</span>{{ formatOrderTime(o.createdAt) }}
              </div>
            </div>
            <div style="font-weight:800;font-size:18px;color:var(--accent)">{{ formatEuro(o.total) }}</div>
          </div>
          <div style="margin-top:10px;padding-top:10px;border-top:0.5px solid var(--border);display:flex;flex-wrap:wrap;gap:6px 16px">
            <span v-for="line in o.items" :key="line.itemId" style="font-size:12px;color:var(--text)">
              <strong>{{ line.qty }}×</strong> {{ line.name }}
            </span>
          </div>
          <div v-if="o.notes" style="font-size:12px;color:var(--text-muted);margin-top:8px;font-style:italic">„{{ o.notes }}"</div>
          <div v-if="!['abgeholt','storniert'].includes(o.status)" style="display:flex;gap:8px;margin-top:12px">
            <button v-if="nextOrderStatus(o.status)" class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" @click="advanceOrder(o)">
              <i class="ti ti-arrow-right" style="margin-right:4px"></i>{{ ORDER_STATUS_LABEL[nextOrderStatus(o.status)!] }}
            </button>
            <button class="icon-btn" style="height:28px;font-size:12px;padding:0 12px;color:#ef4444" @click="cancelOrder(o)">Stornieren</button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL: Gericht -->
    <div v-if="showItemModal" class="modal-overlay" @click.self="showItemModal=false">
      <div class="modal-card" style="max-width:480px">
        <div class="modal-header">
          <span class="card-title">{{ editingItemId ? 'Gericht bearbeiten' : 'Gericht anlegen' }}</span>
          <button class="icon-btn" @click="showItemModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-field"><label>Kategorie *</label>
            <input v-model="iForm.category" placeholder="Vorspeisen, Hauptgerichte, Getränke..." list="menu-categories" />
            <datalist id="menu-categories">
              <option v-for="c in existingCategories" :key="c" :value="c" />
            </datalist>
          </div>
          <div class="auth-field"><label>Name *</label><input v-model="iForm.name" placeholder="Wiener Schnitzel" /></div>
          <div class="auth-field"><label>Beschreibung</label>
            <textarea v-model="iForm.description" style="height:60px;resize:none;width:100%" class="form-select" placeholder="mit Pommes und Salat..."></textarea>
          </div>
          <div class="auth-field"><label>Preis (€) *</label><input v-model="iForm.price" type="number" step="0.01" placeholder="14.90" /></div>
          <div class="auth-field">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" v-model="iForm.available" style="width:auto" /> Verfügbar
            </label>
          </div>
        </div>
        <div style="padding:0 24px 24px">
          <button class="auth-btn" @click="saveItem" :disabled="savingItem || !iForm.name || !iForm.category || !iForm.price">
            <span v-if="savingItem"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else><i class="ti ti-device-floppy" style="margin-right:6px"></i>{{ editingItemId ? 'Speichern' : 'Gericht anlegen' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: Tisch -->
    <div v-if="showTableModal" class="modal-overlay" @click.self="showTableModal=false">
      <div class="modal-card" style="max-width:480px">
        <div class="modal-header">
          <span class="card-title">{{ editingTableId ? 'Tisch bearbeiten' : 'Tisch anlegen' }}</span>
          <button class="icon-btn" @click="showTableModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-field"><label>Bezeichnung *</label><input v-model="tForm.name" placeholder="Tisch 1, Terrasse A..." /></div>
          <div class="auth-field"><label>Sitzplätze</label><input v-model="tForm.seats" type="number" placeholder="4" /></div>
          <div class="auth-field"><label>Status</label>
            <select v-model="tForm.status" class="form-select">
              <option>frei</option><option>belegt</option><option>reserviert</option>
            </select>
          </div>
          <template v-if="tForm.status === 'reserviert'">
            <div class="auth-field"><label>Kundenname</label><input v-model="tForm.reservation.customerName" placeholder="Max Mustermann" /></div>
            <div class="auth-field"><label>Uhrzeit</label><input v-model="tForm.reservation.time" type="datetime-local" /></div>
            <div class="auth-field"><label>Personenzahl</label><input v-model="tForm.reservation.guests" type="number" placeholder="4" /></div>
            <div class="auth-field"><label>Telefon</label><input v-model="tForm.reservation.phone" placeholder="+49 123 456789" /></div>
          </template>
        </div>
        <div style="padding:0 24px 24px">
          <button class="auth-btn" @click="saveTable" :disabled="!tForm.name">
            <i class="ti ti-device-floppy" style="margin-right:6px"></i>{{ editingTableId ? 'Speichern' : 'Tisch anlegen' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const userEmail = ref('')
const activeTab = ref('speisekarte')

const tabs = [
  { key: 'speisekarte',   label: 'Speisekarte',  icon: 'ti-tools-kitchen-2' },
  { key: 'tische',        label: 'Tische',        icon: 'ti-armchair' },
  { key: 'bestellungen',  label: 'Bestellungen',  icon: 'ti-shopping-cart' },
]

interface MenuItem {
  itemId: string; category: string; name: string; description: string; price: string | number; available: boolean
}
interface TableReservation { customerName: string; time: string; guests: string | number; phone: string }
interface RestaurantTable {
  tableId: string; name: string; seats: string | number; status: string; reservation: TableReservation | null
}

const menuItems     = ref<MenuItem[]>([])
const tables        = ref<RestaurantTable[]>([])
const loadingMenu   = ref(true)
const loadingTables = ref(true)

const menuByCategory = computed(() => {
  const groups: Record<string, MenuItem[]> = {}
  for (const item of menuItems.value) {
    if (!groups[item.category]) groups[item.category] = []
    groups[item.category].push(item)
  }
  return Object.entries(groups).map(([category, items]) => ({ category, items }))
})

const existingCategories = computed(() => [...new Set(menuItems.value.map(i => i.category))])

function formatPrice(price: string | number) {
  const n = Number(price)
  if (!n && n !== 0) return price
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)
}

function formatDateTime(d?: string) {
  if (!d) return ''
  return new Date(d).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function tableBorderStyle(status: string) {
  if (status === 'frei') return 'border-color:#22c55e66'
  if (status === 'belegt') return 'border-color:#ef444466'
  if (status === 'reserviert') return 'border-color:#f59e0b66'
  return ''
}
function tableBadgeStyle(status: string) {
  if (status === 'frei') return 'background:#22c55e22;color:#22c55e'
  if (status === 'belegt') return 'background:#ef444422;color:#ef4444'
  if (status === 'reserviert') return 'background:#f59e0b22;color:#f59e0b'
  return 'background:var(--border);color:var(--text-muted)'
}

// ── Settings ──────────────────────────────────────────
const showSettingsModal = ref(false)
const savingSettings    = ref(false)
const settingsForm = reactive({ menuEnabled: false, menuTitle: 'Speisekarte', orderingEnabled: false })

async function openSettings() {
  showSettingsModal.value = true
  try {
    const res = await $fetch<any>(useApiUrl('/api/gastro-menu/settings'), { headers: { 'x-user-email': userEmail.value } })
    Object.assign(settingsForm, res.settings)
  } catch {}
}

async function saveSettings() {
  savingSettings.value = true
  try {
    await $fetch(useApiUrl('/api/gastro-menu/settings'), {
      method: 'PUT',
      headers: { 'x-user-email': userEmail.value },
      body: { ...settingsForm },
    })
    showSettingsModal.value = false
  } catch {
    alert('Fehler beim Speichern.')
  } finally {
    savingSettings.value = false
  }
}

// ── Speisekarte ───────────────────────────────────────
const showItemModal = ref(false)
const editingItemId = ref('')
const savingItem    = ref(false)
const iForm = reactive({ category: '', name: '', description: '', price: '', available: true })

function resetItemForm() {
  iForm.category = ''; iForm.name = ''; iForm.description = ''; iForm.price = ''; iForm.available = true
  editingItemId.value = ''
}

function openNewItem() { resetItemForm(); showItemModal.value = true }

function openEditItem(item: MenuItem) {
  iForm.category = item.category; iForm.name = item.name; iForm.description = item.description || ''
  iForm.price = String(item.price); iForm.available = item.available
  editingItemId.value = item.itemId
  showItemModal.value = true
}

async function loadMenu() {
  loadingMenu.value = true
  try {
    const res = await $fetch<{ items: MenuItem[] }>(useApiUrl('/api/gastro-menu'), { headers: { 'x-user-email': userEmail.value } })
    menuItems.value = res.items || []
  } catch {}
  loadingMenu.value = false
}

async function saveItem() {
  if (!iForm.name || !iForm.category || !iForm.price) return
  savingItem.value = true
  try {
    if (editingItemId.value) {
      await $fetch(useApiUrl(`/api/gastro-menu/${editingItemId.value}`), { method: 'PUT', headers: { 'x-user-email': userEmail.value }, body: { ...iForm } })
    } else {
      await $fetch(useApiUrl('/api/gastro-menu'), { method: 'POST', headers: { 'x-user-email': userEmail.value }, body: { ...iForm } })
    }
    showItemModal.value = false
    await loadMenu()
  } catch {} finally { savingItem.value = false }
}

async function toggleAvailable(item: MenuItem) {
  item.available = !item.available
  await $fetch(useApiUrl(`/api/gastro-menu/${item.itemId}`), { method: 'PUT', headers: { 'x-user-email': userEmail.value }, body: { available: item.available } })
}

async function deleteItem(item: MenuItem) {
  if (!confirm(`"${item.name}" wirklich löschen?`)) return
  await $fetch(useApiUrl(`/api/gastro-menu/${item.itemId}`), { method: 'DELETE', headers: { 'x-user-email': userEmail.value } })
  await loadMenu()
}

// ── Tische ────────────────────────────────────────────
const showTableModal = ref(false)
const editingTableId = ref('')
const tForm = reactive({ name: '', seats: '', status: 'frei', reservation: { customerName: '', time: '', guests: '', phone: '' } })

function resetTableForm() {
  tForm.name = ''; tForm.seats = ''; tForm.status = 'frei'
  tForm.reservation = { customerName: '', time: '', guests: '', phone: '' }
  editingTableId.value = ''
}

function openNewTable() { resetTableForm(); showTableModal.value = true }

function openEditTable(t: RestaurantTable) {
  tForm.name = t.name; tForm.seats = String(t.seats || ''); tForm.status = t.status
  tForm.reservation = t.reservation ? { ...t.reservation, guests: String(t.reservation.guests || '') } : { customerName: '', time: '', guests: '', phone: '' }
  editingTableId.value = t.tableId
  showTableModal.value = true
}

async function loadTables() {
  loadingTables.value = true
  try {
    const res = await $fetch<{ tables: RestaurantTable[] }>(useApiUrl('/api/gastro-tables'), { headers: { 'x-user-email': userEmail.value } })
    tables.value = res.tables || []
  } catch {}
  loadingTables.value = false
}

async function saveTable() {
  if (!tForm.name) return
  const body: any = { name: tForm.name, seats: tForm.seats, status: tForm.status }
  body.reservation = tForm.status === 'reserviert' ? { ...tForm.reservation } : null
  try {
    if (editingTableId.value) {
      await $fetch(useApiUrl(`/api/gastro-tables/${editingTableId.value}`), { method: 'PUT', headers: { 'x-user-email': userEmail.value }, body })
    } else {
      await $fetch(useApiUrl('/api/gastro-tables'), { method: 'POST', headers: { 'x-user-email': userEmail.value }, body })
    }
    showTableModal.value = false
    await loadTables()
  } catch {}
}

async function deleteTable(t: RestaurantTable) {
  if (!confirm(`"${t.name}" wirklich löschen?`)) return
  await $fetch(useApiUrl(`/api/gastro-tables/${t.tableId}`), { method: 'DELETE', headers: { 'x-user-email': userEmail.value } })
  await loadTables()
}

// ── Bestellungen ──────────────────────────────────────
interface OrderLine { itemId: string; name: string; price: number; qty: number }
interface GastroOrder {
  orderId: string; items: OrderLine[]; total: number; customerName: string; phone: string
  pickupTime: string; notes: string; status: string; createdAt: string
}

const orders        = ref<GastroOrder[]>([])
const loadingOrders  = ref(true)
const newOrdersCount = computed(() => orders.value.filter(o => o.status === 'neu').length)

const ORDER_STATUS_FLOW = ['neu', 'in_zubereitung', 'fertig', 'abgeholt']
const ORDER_STATUS_LABEL: Record<string, string> = {
  neu: 'Neu', in_zubereitung: 'In Zubereitung', fertig: 'Fertig', abgeholt: 'Abgeholt', storniert: 'Storniert',
}
function orderStatusStyle(status: string) {
  if (status === 'neu') return 'background:var(--accent)22;color:var(--accent)'
  if (status === 'in_zubereitung') return 'background:#f59e0b22;color:#f59e0b'
  if (status === 'fertig') return 'background:#22c55e22;color:#22c55e'
  if (status === 'abgeholt') return 'background:var(--border);color:var(--text-muted)'
  if (status === 'storniert') return 'background:#ef444422;color:#ef4444'
  return 'background:var(--border);color:var(--text-muted)'
}
function nextOrderStatus(status: string) {
  const idx = ORDER_STATUS_FLOW.indexOf(status)
  return idx >= 0 && idx < ORDER_STATUS_FLOW.length - 1 ? ORDER_STATUS_FLOW[idx + 1] : null
}
function formatOrderTime(d?: string) {
  if (!d) return ''
  return new Date(d).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}
function formatEuro(n: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0)
}

async function loadOrders() {
  loadingOrders.value = true
  try {
    const res = await $fetch<{ orders: GastroOrder[] }>(useApiUrl('/api/gastro-orders'), { headers: { 'x-user-email': userEmail.value } })
    orders.value = res.orders || []
  } catch {}
  loadingOrders.value = false
}

async function advanceOrder(o: GastroOrder) {
  const next = nextOrderStatus(o.status)
  if (!next) return
  o.status = next
  await $fetch(useApiUrl(`/api/gastro-orders/${o.orderId}`), { method: 'PUT', headers: { 'x-user-email': userEmail.value }, body: { status: next } })
}

async function cancelOrder(o: GastroOrder) {
  if (!confirm('Bestellung wirklich stornieren?')) return
  o.status = 'storniert'
  await $fetch(useApiUrl(`/api/gastro-orders/${o.orderId}`), { method: 'PUT', headers: { 'x-user-email': userEmail.value }, body: { status: 'storniert' } })
}

onMounted(async () => {
  const { useAuthUser } = await import('~/composables/useAuth')
  const u = await useAuthUser()
  userEmail.value = u.email || ''
  await Promise.all([loadMenu(), loadTables(), loadOrders()])
})
</script>
