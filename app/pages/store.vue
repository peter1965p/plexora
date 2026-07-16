<template>
  <div class="page">

    <!-- Header -->
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px">
      <div style="width:36px;height:36px;background:var(--accent);border-radius:10px;display:flex;align-items:center;justify-content:center">
        <i class="ti ti-building-store" style="font-size:18px;color:#fff"></i>
      </div>
      <div>
        <div style="font-size:18px;font-weight:700">Modul-Store</div>
        <div style="font-size:12px;color:var(--text-muted)">Erweitere Plexora mit Branchen-Modulen & Add-ons</div>
      </div>
    </div>

    <!-- Erfolg Banner nach Stripe Checkout -->
    <div v-if="successModule" style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding:14px 18px;background:#22c55e18;border:1px solid #22c55e55;border-radius:10px">
      <i class="ti ti-circle-check" style="color:#22c55e;font-size:20px;flex-shrink:0"></i>
      <div>
        <div style="font-weight:700;color:#22c55e">Modul erfolgreich gekauft!</div>
        <div style="font-size:12px;color:var(--text-muted)">Deine Lizenz wird in Kürze aktualisiert. Bitte neu einloggen falls das Modul noch nicht erscheint.</div>
      </div>
    </div>

    <!-- Aktueller Plan Banner -->
    <div v-if="currentPlan" style="display:flex;align-items:center;gap:14px;margin-bottom:20px;padding:14px 18px;background:var(--bg-elevated);border:1px solid var(--accent)44;border-radius:10px">
      <div style="width:34px;height:34px;background:var(--accent)18;border:1px solid var(--accent)44;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <i class="ti ti-rosette" style="color:var(--accent);font-size:16px"></i>
      </div>
      <div>
        <div style="font-size:12px;color:var(--text-muted)">Dein aktueller Plan</div>
        <div style="font-size:14px;font-weight:700">{{ currentPlan.label }} <span style="font-size:12px;color:var(--text-muted);font-weight:400">· €{{ currentPlan.price }}/Monat</span></div>
      </div>
      <div style="margin-left:auto;font-size:11px;color:#22c55e;background:#22c55e18;border:1px solid #22c55e44;border-radius:20px;padding:3px 12px;font-weight:600">
        <i class="ti ti-check"></i> Aktiv
      </div>
    </div>

    <!-- Tab Navigation -->
    <div style="display:flex;gap:8px;margin-bottom:24px;border-bottom:1px solid var(--border);padding-bottom:0">
      <button
        v-for="tab in tabs" :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
        style="padding:8px 16px;background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;font-size:13px;font-weight:500;color:var(--text-muted);transition:all .15s;margin-bottom:-1px"
        :style="activeTab === tab.key ? 'color:var(--accent);border-bottom-color:var(--accent)' : ''"
      >
        <i class="ti" :class="tab.icon" style="margin-right:6px"></i>{{ tab.label }}
      </button>
    </div>

    <!-- ADD-ONS TAB -->
    <template v-if="activeTab === 'addons'">
      <div class="store-grid">
        <div v-for="mod in addons" :key="mod.key" class="store-card" :class="{ owned: mod.owned }">
          <div class="store-card-header">
            <div class="store-icon" :style="mod.owned ? 'background:var(--success-bg)' : ''">
              <i class="ti" :class="mod.icon" :style="mod.owned ? 'color:#22c55e' : 'color:var(--accent)'"></i>
            </div>
            <div v-if="mod.owned" class="badge-owned"><i class="ti ti-check"></i> Aktiv</div>
            <div v-else-if="mod.badge" class="badge-new">{{ mod.badge }}</div>
          </div>
          <div class="store-card-name">{{ mod.name }}</div>
          <div class="store-card-desc">{{ mod.desc }}</div>
          <div class="store-card-features">
            <span v-for="f in mod.features" :key="f" class="feature-tag">{{ f }}</span>
          </div>
          <div class="store-card-footer">
            <div class="store-price">
              <span v-if="mod.owned" style="color:#22c55e;font-weight:600;font-size:13px"><i class="ti ti-check"></i> Inklusive</span>
              <template v-else>
                <span style="font-size:18px;font-weight:700;color:var(--text)">{{ mod.price }}</span>
                <span style="font-size:11px;color:var(--text-muted)">/Monat</span>
              </template>
            </div>
            <button v-if="!mod.owned" class="btn-buy" @click="openBuy(mod)">Hinzufügen</button>
            <NuxtLink v-else-if="mod.key === 'nexora'" to="/website" class="btn-manage">Verwalten</NuxtLink>
            <button v-else class="btn-manage" disabled>Verwalten</button>
          </div>
        </div>
      </div>
    </template>

    <!-- BRANCHEN TAB -->
    <template v-else-if="activeTab === 'branchen'">
      <div style="margin-bottom:20px;padding:14px 18px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;font-size:13px;color:var(--text-muted);display:flex;gap:10px;align-items:center">
        <i class="ti ti-info-circle" style="color:var(--accent);font-size:16px;flex-shrink:0"></i>
        Branchen-Pakete erweitern Plexora um spezifische Module und Vorlagen für deine Branche. Alle Basis-Module bleiben erhalten.
      </div>
      <div class="store-grid">
        <div v-for="pkg in branchenPakete" :key="pkg.key" class="store-card" :class="{ owned: activeBranchPackages.includes(pkg.key) }">
          <div class="store-card-header">
            <div class="store-icon" :style="activeBranchPackages.includes(pkg.key) ? 'background:var(--success-bg)' : ''">
              <i class="ti" :class="pkg.icon" :style="activeBranchPackages.includes(pkg.key) ? 'color:#22c55e' : 'color:var(--accent)'"></i>
            </div>
            <div v-if="activeBranchPackages.includes(pkg.key)" class="badge-owned"><i class="ti ti-check"></i> Aktiv</div>
            <div v-else class="badge-new">Branchen-Paket</div>
          </div>
          <div class="store-card-name">{{ pkg.name }}</div>
          <div class="store-card-desc">{{ pkg.desc }}</div>
          <div class="store-card-features">
            <span v-for="f in pkg.features" :key="f" class="feature-tag">{{ f }}</span>
          </div>
          <div class="store-card-footer">
            <div class="store-price">
              <span v-if="activeBranchPackages.includes(pkg.key)" style="color:#22c55e;font-weight:600;font-size:13px"><i class="ti ti-check"></i> Inklusive</span>
              <template v-else>
                <span style="font-size:18px;font-weight:700;color:var(--text)">{{ pkg.price }}</span>
                <span style="font-size:11px;color:var(--text-muted)">/Monat</span>
              </template>
            </div>
            <button v-if="!activeBranchPackages.includes(pkg.key)" class="btn-buy" @click="openBuy(pkg)">Hinzufügen</button>
            <NuxtLink v-else :to="`/${pkg.key}`" class="btn-manage">Verwalten</NuxtLink>
          </div>
        </div>
      </div>
    </template>


    <!-- BUY MODAL -->
    <div v-if="buyItem" class="modal-overlay" @click.self="buyItem = null">
      <div class="modal">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <div style="font-size:16px;font-weight:700">{{ buyItem.name }} hinzufügen</div>
          <button class="icon-btn" @click="buyItem = null"><i class="ti ti-x"></i></button>
        </div>
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:20px">{{ buyItem.desc }}</div>
        <div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:20px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:13px">{{ buyItem.name }}</span>
            <span style="font-weight:700">{{ buyItem.price }}/Monat</span>
          </div>
        </div>
        <div style="display:flex;gap:10px">
          <button class="btn-secondary" style="flex:1" @click="buyItem = null">Abbrechen</button>
          <button class="btn-accent" style="flex:2" @click="checkout" :disabled="checkoutLoading">
            <i class="ti" :class="checkoutLoading ? 'ti-loader-2 spin' : 'ti-credit-card'" style="margin-right:6px"></i>
            {{ checkoutLoading ? 'Weiterleitung...' : 'Jetzt kaufen' }}
          </button>
        </div>
        <div style="text-align:center;margin-top:12px;font-size:11px;color:var(--text-muted)">
          <i class="ti ti-lock" style="margin-right:4px"></i>Sicher bezahlen via Stripe
        </div>
      </div>
    </div>

    <!-- NOTIFY MODAL -->
    <div v-if="notifyItem" class="modal-overlay" @click.self="notifyItem = null">
      <div class="modal" style="max-width:420px">
        <div style="text-align:center;padding:8px 0 20px">
          <div style="width:52px;height:52px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 14px">
            <i class="ti" :class="notifyItem.icon" style="font-size:24px;color:var(--accent)"></i>
          </div>
          <div style="font-size:16px;font-weight:700;margin-bottom:8px">{{ notifyItem.name }}</div>
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:20px">Wir benachrichtigen dich sobald dieses Modul verfügbar ist.</div>
          <button class="btn-accent" style="width:100%" @click="notifyItem = null">
            <i class="ti ti-bell" style="margin-right:6px"></i>Ja, benachrichtigen!
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const store = useAppStore()
const activeTab = ref('addons')

const TIER_INFO: Record<string, { label: string; price: number }> = {
  starter:    { label: 'Starter',    price: 49 },
  pro:        { label: 'Pro',        price: 149 },
  enterprise: { label: 'Enterprise', price: 299 },
}

const currentPlan = computed(() => {
  const tier = store.license?.tier
  return tier ? TIER_INFO[tier] || null : null
})

const tabs = [
  { key: 'addons',   label: 'Add-on Module',   icon: 'ti-puzzle' },
  { key: 'branchen', label: 'Branchen-Pakete', icon: 'ti-building-factory-2' },
]

// licenseModules = Quelle der Wahrheit ob ein Modul gekauft/freigeschaltet ist
const owned = (key: string) =>
  store.licenseModules ? store.licenseModules.includes(key) : !!store.modules.find(m => m.key === key)?.on

const addons = computed(() => [
  {
    key: 'crm', name: 'CRM', icon: 'ti-users', price: '€9', badge: null,
    owned: owned('crm'),
    desc: 'Kontakte, Deals & Lead-Tracking für dein Vertriebsteam.',
    features: ['Kontakte & Deals', 'Pipeline-View', 'CSV Import/Export', 'Firmen-Verwaltung'],
  },
  {
    key: 'finance', name: 'Finanzen', icon: 'ti-receipt', price: '€12', badge: null,
    owned: owned('finance'),
    desc: 'Rechnungen, Angebote, Mahnwesen und Cashflow-Übersicht.',
    features: ['PDF-Rechnungen', 'Angebote', 'Mahnwesen', 'DATEV-Export'],
  },
  {
    key: 'projects', name: 'Projekte', icon: 'ti-layout-kanban', price: '€10', badge: null,
    owned: owned('projects'),
    desc: 'Kanban-Board, Deadlines und Team-Zuordnung für Kundenprojekte.',
    features: ['Kanban-Board', 'Deadlines', 'Team-Zuordnung', 'Fortschritts-Tracking'],
  },
  {
    key: 'hr', name: 'HR', icon: 'ti-id-badge', price: '€10', badge: 'NEU',
    owned: owned('hr'),
    desc: 'Mitarbeiterverwaltung, Urlaubsplanung und Onboarding.',
    features: ['Mitarbeiter-Daten', 'Urlaub & Abwesenheit', 'Recruiting', 'Onboarding-Checklisten'],
  },
  {
    key: 'support', name: 'Support', icon: 'ti-headset', price: '€8', badge: null,
    owned: owned('support'),
    desc: 'Ticket-System mit SLA-Tracking und Kunden-Portal.',
    features: ['Ticket-System', 'SLA-Tracking', 'Kunden-Portal', 'Prioritäten'],
  },
  {
    key: 'marketing', name: 'Marketing', icon: 'ti-speakerphone', price: '€14', badge: 'PRO',
    owned: owned('marketing'),
    desc: 'Lead-Kampagnen, UTM-Tracking, QR-Codes und Auswertungen.',
    features: ['Kampagnen', 'UTM-Tracking', 'QR-Codes', 'Conversion-Stats'],
  },
  {
    key: 'shop', name: 'Shop', icon: 'ti-shopping-cart', price: '€15', badge: null,
    owned: owned('shop'),
    desc: 'Produkt-Verwaltung mit Stripe-Checkout und Bestellverfolgung.',
    features: ['Produktkatalog', 'Stripe-Checkout', 'Bestellungen', 'Lieferanten'],
  },
  {
    key: 'forms', name: 'Formulare', icon: 'ti-forms', price: '€7', badge: null,
    owned: owned('forms'),
    desc: 'Formular-Builder zum Einbetten in jede Website.',
    features: ['Drag & Drop', 'Einbettbar', 'Submissions-Übersicht', 'E-Mail-Benachrichtigung'],
  },
  {
    key: 'nexora', name: 'Unternehmens-Webseite', icon: 'ti-world', price: '€19', badge: 'NEU',
    owned: owned('nexora'),
    desc: 'Professionelle Firmenwebseite, komplett aus Plexora verwaltet. Auto-Provisioning via API.',
    features: ['Auto-Provisioning', 'API-gesteuert', 'Inhalts-Editor', 'DSGVO-konform', 'Nexora-Frontend'],
  },
  {
    key: 'termine', name: 'Termine', icon: 'ti-calendar-event', price: '€15', badge: 'NEU',
    owned: owned('termine'),
    desc: 'Öffentliche Buchungsseite für Kunden, mit Google-Calendar- und Meet-Anbindung.',
    features: ['Öffentliche Buchungsseite', 'Terminarten & Arbeitszeiten', 'Google-Calendar-Sync', 'Automatischer Meet-Link'],
  },
  {
    key: 'newsletter', name: 'Newsletter', icon: 'ti-mail', price: '€12', badge: 'NEU',
    owned: owned('newsletter'),
    desc: 'Mandantenfähiger Newsletter mit Double-Opt-In-Anmeldung, Kampagnen-Versand und Tracking.',
    features: ['Double-Opt-In', 'One-Click-Abmeldung', 'CSV-Import', 'Öffnungs- & Klick-Tracking'],
  },
])

const branchenPakete = [
  { key: 'automotive',   name: 'Automotive',          icon: 'ti-car',              price: '€59', desc: 'Fahrzeugverwaltung, Probefahrten, KFZ-Dokumente und Werkstatt-Aufträge.',      features: ['Fahrzeug-DB', 'Probefahrten', 'Werkstatt-Aufträge', 'TÜV-Erinnerungen', 'Verkaufs-Tracking'] },
  { key: 'einzelhandel', name: 'Einzelhandel',         icon: 'ti-building-store',   price: '€49', desc: 'Kassensystem, Lager-Tracking, Lieferanten-Verwaltung und Retouren.',           features: ['Kassensystem', 'Lagerverwaltung', 'Lieferanten', 'Retouren', 'Tagesabschluss'] },
  { key: 'gastro',       name: 'Gastronomie',          icon: 'ti-tools-kitchen-2',  price: '€59', desc: 'Tischreservierung, Speisekarte, Bestellmanagement und Lieferdienst.',          features: ['Tisch-Reservierung', 'Speisekarte', 'Bestellmanagement', 'Lieferdienst', 'Trinkgeld-Tracking'] },
  { key: 'handwerk',     name: 'Handwerk',             icon: 'ti-hammer',           price: '€39', desc: 'Aufmaß-Erfassung, Materialplanung, Stundenzettel und Baustellenverwaltung.',   features: ['Aufmaß-Erfassung', 'Materialplanung', 'Stundenzettel', 'Baustellen', 'Auftragszettel-PDF'] },
  { key: 'immobilien',   name: 'Immobilien',           icon: 'ti-home',             price: '€59', desc: 'Objekt-Verwaltung, Besichtigungen, Mieter-Daten und Nebenkostenabrechnungen.', features: ['Objekt-Verwaltung', 'Besichtigungen', 'Mieter-CRM', 'Nebenkostenabrechnung', 'Dokumente'] },
  { key: 'gesundheit',   name: 'Gesundheit / Praxis',  icon: 'ti-stethoscope',      price: '€79', desc: 'Patientenverwaltung, Terminplanung, Rezepte und DSGVO-konforme Dokumentation.', features: ['Patienten-Verwaltung', 'Terminplanung', 'Rezepte', 'DSGVO-konform', 'Karteikartenansicht'] },
]

const activeBranchPackages = ref<string[]>([])
const userEmail = ref('')
const authToken = ref('')
const userId = ref('demo-user')
const isAdmin = ref(false)
const isDemo = computed(() => userEmail.value === 'demo@plexora.eu' || userId.value === 'demo-user')
const branchApiUrl = useApiUrl('/api/settings/branch-packages')
const checkoutApiUrl = useApiUrl('/api/store/checkout')

onMounted(async () => {
  try {
    const { useAuthUser } = await import('~/composables/useAuth')
    const u = await useAuthUser()
    userEmail.value = u.email || ''
  authToken.value = u.idToken || ''
    userId.value = u.userId || 'demo-user'
    isAdmin.value = u.role === 'admins'
    if (!u.email) return
    const res = await $fetch<{ branchPackages: string[] }>(branchApiUrl, {
      headers: { 'x-user-email': u.email, Authorization: `Bearer ${u.idToken}` },
    })
    activeBranchPackages.value = res.branchPackages || []
  } catch {}
})

const buyItem    = ref<any>(null)
const notifyItem = ref<any>(null)
const checkoutLoading = ref(false)

const route = useRoute()
const successModule = computed(() => route.query.success === '1' ? route.query.module as string : null)

function openBuy(item: any) { buyItem.value = item }
function notify(item: any)  { notifyItem.value = item }

async function checkout() {
  if (!buyItem.value) return
  checkoutLoading.value = true
  const isBranchPackage = branchenPakete.some(p => p.key === buyItem.value.key)
  try {
    if (isAdmin.value && isBranchPackage && !isDemo.value) {
      const res = await $fetch<{ branchPackages: string[] }>(branchApiUrl, {
        method: 'POST',
        body: { packageKey: buyItem.value.key },
        headers: { 'x-user-email': userEmail.value, Authorization: `Bearer ${authToken.value}` },
      })
      activeBranchPackages.value = res.branchPackages || []
      buyItem.value = null
      return
    }
    const { useAuthUser } = await import('~/composables/useAuth')
    const u = await useAuthUser()
    const data = await $fetch<{ url: string }>(checkoutApiUrl, {
      method: 'POST',
      body: {
        moduleKey: buyItem.value.key,
        name:      buyItem.value.name,
        priceEur:  parseFloat(buyItem.value.price.replace('€', '')),
      },
      headers: { 'x-user-email': u.email || '', Authorization: `Bearer ${u.idToken || ''}` },
    })
    if (data.url) window.location.href = data.url
  } catch (e: any) {
    alert(`Fehler beim Checkout: ${e?.message || 'Unbekannter Fehler'}`)
  } finally {
    checkoutLoading.value = false
    buyItem.value = null
  }
}
</script>

<style scoped>
.store-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
  margin-bottom: 24px;
}

.store-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color .15s, box-shadow .15s;
}

.store-card:hover {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent)22;
}

.store-card.owned {
  border-color: #22c55e44;
}

.store-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.store-icon {
  width: 40px;
  height: 40px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.badge-owned {
  font-size: 11px;
  font-weight: 600;
  color: #22c55e;
  background: #22c55e18;
  border: 1px solid #22c55e44;
  border-radius: 20px;
  padding: 2px 10px;
}

.badge-new {
  font-size: 10px;
  font-weight: 700;
  color: var(--accent);
  background: var(--accent)18;
  border: 1px solid var(--accent)44;
  border-radius: 20px;
  padding: 2px 10px;
  letter-spacing: .5px;
}

.badge-soon {
  font-size: 10px;
  font-weight: 600;
  color: #f59e0b;
  background: #f59e0b18;
  border: 1px solid #f59e0b44;
  border-radius: 20px;
  padding: 2px 10px;
}

.store-card-name {
  font-size: 15px;
  font-weight: 700;
}

.store-card-desc {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}

.store-card-features {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  flex: 1;
}

.feature-tag {
  font-size: 11px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 2px 8px;
  color: var(--text-muted);
}

.store-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.btn-buy {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 7px 16px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity .15s;
}

.btn-buy:hover { opacity: .85; }

.btn-manage {
  background: var(--bg-elevated);
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 7px 16px;
  font-size: 12px;
  font-weight: 600;
  cursor: not-allowed;
}

.btn-notify {
  background: none;
  color: var(--accent);
  border: 1px solid var(--accent);
  border-radius: 8px;
  padding: 7px 16px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all .15s;
}

.btn-notify:hover {
  background: var(--accent);
  color: #fff;
}


/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: #00000088;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 480px;
}
</style>
