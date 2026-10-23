<template>
  <div class="page">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:22px;font-weight:800;margin:0">{{ tr('Ferienwohnungen') }} <span style="color:var(--accent)">{{ tr('Manager') }}</span></h1>
        <p style="color:var(--text-muted);font-size:13px;margin:4px 0 0">{{ tr('Belegungsplan, Buchungen, Preise und Kalender-Abgleich mit Booking.com & Co.') }}</p>
      </div>
      <div style="display:flex;gap:8px">
        <button v-if="tab === 'units'" class="accent-btn" @click="openUnit()"><i class="ti ti-plus"></i> {{ tr('Unterkunft anlegen') }}</button>
        <button v-else class="accent-btn" :disabled="!units.length" @click="openBooking()"><i class="ti ti-plus"></i> {{ tr('Buchung anlegen') }}</button>
      </div>
    </div>

    <div class="tabs" style="margin-bottom:16px;display:flex;gap:6px;flex-wrap:wrap">
      <button v-for="t in TABS" :key="t.key" class="tab-btn" :class="{ active: tab === t.key }" @click="tab = t.key"><i class="ti" :class="t.icon"></i> {{ t.label }}</button>
    </div>

    <div v-if="loading" style="text-align:center;padding:40px;color:var(--text-muted)"><i class="ti ti-loader-2 spin"></i></div>
    <div v-else-if="loadError" class="card" style="padding:16px;color:#E05C5C">{{ loadError }}</div>

    <div v-else-if="!units.length && tab !== 'units'" class="card" style="text-align:center;padding:40px">
      <i class="ti ti-home-plus" style="font-size:40px;color:var(--accent)"></i>
      <h3 style="margin:12px 0 6px">{{ tr('Lege deine erste Unterkunft an') }}</h3>
      <p style="color:var(--text-muted);font-size:13px;margin:0 0 16px">{{ tr('Mit Preis, Personenzahl und An-/Abreisezeit. Danach kannst du Buchungen eintragen und den Kalender mit Booking.com abgleichen.') }}</p>
      <button class="accent-btn" @click="tab = 'units'; openUnit()"><i class="ti ti-plus"></i> {{ tr('Unterkunft anlegen') }}</button>
    </div>

    <!-- BELEGUNGSPLAN -->
    <div v-else-if="tab === 'plan'" class="card">
      <div class="card-header" style="flex-wrap:wrap;gap:8px">
        <span class="card-title">{{ monthLabel }}</span>
        <div style="display:flex;gap:6px;align-items:center">
          <button class="icon-btn" @click="shiftMonth(-1)"><i class="ti ti-chevron-left"></i></button>
          <button class="icon-btn" style="width:auto;padding:0 10px;font-size:12px" @click="month = thisMonth()">{{ tr('Heute') }}</button>
          <button class="icon-btn" @click="shiftMonth(1)"><i class="ti ti-chevron-right"></i></button>
        </div>
      </div>
      <div style="overflow-x:auto;padding:0 12px 12px">
        <table class="plan">
          <thead><tr><th class="unit-col"></th><th v-for="d in days" :key="d.iso" :class="{ today: d.iso === today, we: d.weekend }"><div>{{ d.n }}</div><small>{{ d.wd }}</small></th></tr></thead>
          <tbody>
            <tr v-for="u in units" :key="u.unitId">
              <th class="unit-col">{{ u.name }}</th>
              <td v-for="d in days" :key="d.iso" :class="['cell', cellClass(u.unitId, d.iso), { we: d.weekend }]" :title="cellTitle(u.unitId, d.iso)" @click="clickCell(u, d.iso)"></td>
            </tr>
          </tbody>
        </table>
        <div class="legend"><span><i class="sw confirmed"></i> {{ tr('Bestätigt') }}</span><span><i class="sw inquiry"></i> {{ tr('Anfrage') }}</span><span><i class="sw blocked"></i> {{ tr('Gesperrt / Kanal') }}</span><span><i class="sw conflict"></i> {{ tr('Doppelt belegt') }}</span></div>
      </div>
    </div>

    <!-- BUCHUNGEN -->
    <div v-else-if="tab === 'bookings'" class="card">
      <div class="card-header" style="flex-wrap:wrap;gap:8px">
        <span class="card-title">{{ tr('Buchungen') }}</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <select v-model="filterUnit" class="form-select" style="height:30px"><option value="">{{ tr('Alle Unterkünfte') }}</option><option v-for="u in units" :key="u.unitId" :value="u.unitId">{{ u.name }}</option></select>
          <select v-model="filterWhen" class="form-select" style="height:30px"><option value="upcoming">{{ tr('Anstehend') }}</option><option value="past">{{ tr('Vergangen') }}</option><option value="all">{{ tr('Alle') }}</option></select>
        </div>
      </div>
      <table class="data-table">
        <thead><tr><th>{{ tr('Zeitraum') }}</th><th>{{ tr('Unterkunft') }}</th><th>{{ tr('Gast') }}</th><th>{{ tr('Status') }}</th><th style="text-align:right">{{ tr('Preis') }}</th><th></th></tr></thead>
        <tbody>
          <tr v-if="!shownBookings.length"><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">{{ tr('Keine Buchungen.') }}</td></tr>
          <tr v-for="b in shownBookings" :key="b.bookingId">
            <td>{{ dateDe(b.checkIn) }} – {{ dateDe(b.checkOut) }}<div style="font-size:11px;color:var(--text-muted)">{{ nights(b) }} {{ tr('Nächte') }}</div></td>
            <td>{{ unitName(b.unitId) }}</td>
            <td>{{ b.guestName }}<div v-if="b.sourceName" style="font-size:11px;color:var(--text-muted)">{{ tr('über') }} {{ b.sourceName }}</div><div v-else-if="b.guests && b.status !== 'blocked'" style="font-size:11px;color:var(--text-muted)">{{ b.guests }} {{ tr('Pers.') }}</div></td>
            <td><span class="badge" :class="'st-' + b.status">{{ STATUS[b.status] || b.status }}</span><span v-if="b.conflict" class="badge" style="background:#E05C5C22;color:#E05C5C;margin-left:4px" :title="tr('Überschneidet sich mit einer anderen Belegung')">{{ tr('Doppelt!') }}</span><span v-if="b.invoiceId" class="badge" style="margin-left:4px">{{ tr('Rechnung') }}</span></td>
            <td style="text-align:right">{{ b.total != null ? eur(b.total) : '–' }}</td>
            <td style="white-space:nowrap">
              <button v-if="b.status === 'confirmed' && !b.invoiceId" class="icon-btn" :title="tr('In Rechnung umwandeln')" :disabled="busy === b.bookingId" @click="toInvoice(b)"><i class="ti ti-file-invoice"></i></button>
              <button v-if="!isChannel(b)" class="icon-btn" :title="tr('Bearbeiten')" @click="openBooking(b)"><i class="ti ti-pencil"></i></button>
              <button v-if="!isChannel(b) && !b.invoiceId" class="icon-btn" style="color:var(--danger)" :title="tr('Löschen')" @click="removeBooking(b)"><i class="ti ti-trash"></i></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- UNTERKÜNFTE -->
    <div v-else-if="tab === 'units'" style="display:grid;gap:14px">
      <div v-if="!units.length" class="card" style="padding:24px;text-align:center;color:var(--text-muted)">{{ tr('Noch keine Unterkunft angelegt.') }}</div>
      <div v-for="u in units" :key="u.unitId" class="card">
        <div class="card-header"><span class="card-title">{{ u.name }}</span>
          <div style="display:flex;gap:4px"><button class="icon-btn" :title="tr('Bearbeiten')" @click="openUnit(u)"><i class="ti ti-pencil"></i></button><button class="icon-btn" style="color:var(--danger)" :title="tr('Löschen')" @click="removeUnit(u)"><i class="ti ti-trash"></i></button></div>
        </div>
        <div class="card-body" style="padding:0 16px 16px;font-size:13px">
          <div style="color:var(--text-muted);margin-bottom:10px">{{ u.capacity }} {{ tr('Personen ·') }} {{ u.bedrooms }} {{ tr('Schlafzimmer ·') }} {{ eur(u.nightlyRate) }}{{ tr('/Nacht') }}<span v-if="u.cleaningFee"> {{ tr('· Endreinigung') }} {{ eur(u.cleaningFee) }}</span><span v-if="u.touristTax"> {{ tr('· Kurtaxe') }} {{ eur(u.touristTax) }}{{ tr('/Pers./Nacht') }}</span> {{ tr('· An') }} {{ u.checkInTime }} {{ tr('/ Ab') }} {{ u.checkOutTime }}</div>

          <div style="font-weight:700;margin:12px 0 4px"><i class="ti ti-calendar-share" style="color:var(--accent)"></i> {{ tr('Dein Kalender-Link (für Booking.com, Airbnb, Vrbo …)') }}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">{{ tr('Trage diese Adresse beim Kanal als „Kalender importieren / Kalender verbinden“ ein. Es steht nur „Belegt“ mit Datum darin, keine Gästedaten. Der Kanal liest den Link nur alle paar Stunden. Ganz ohne Verzögerung geht es nur über eine offizielle Schnittstelle.') }}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap"><input :value="u.icalUrl" readonly style="flex:1;min-width:240px;font-size:12px" @focus="($event.target as HTMLInputElement).select()" />
            <button class="icon-btn" style="width:auto;padding:0 10px;font-size:12px" @click="copy(u.icalUrl)"><i class="ti ti-copy"></i> {{ tr('Kopieren') }}</button>
            <button class="icon-btn" style="width:auto;padding:0 10px;font-size:12px" @click="rotate(u)"><i class="ti ti-refresh"></i> {{ tr('Neuer Link') }}</button></div>

          <div style="font-weight:700;margin:16px 0 4px"><i class="ti ti-plug-connected" style="color:var(--accent)"></i> {{ tr('Kanäle einlesen (damit nichts doppelt gebucht wird)') }}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">{{ tr('Füge den iCal-Link aus dem Extranet des Kanals ein (bei Booking.com: Preise & Verfügbarkeit → Kalender synchronisieren). Plexora liest ihn ein und sperrt die Tage.') }}</div>
          <div v-for="f in u.feeds" :key="f.feedId" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 0;border-top:0.5px solid var(--border)">
            <strong>{{ f.name }}</strong><span style="color:var(--text-muted);font-size:12px">{{ f.host }}</span>
            <span v-if="f.lastStatus === 'ok'" style="font-size:12px;color:#00A844">✓ {{ f.lastSyncAt ? timeDe(f.lastSyncAt) : '' }}</span>
            <span v-else-if="f.lastStatus === 'error'" style="font-size:12px;color:#E05C5C" :title="f.lastError">{{ tr('Fehler:') }} {{ f.lastError }}</span>
            <span style="flex:1"></span>
            <button class="icon-btn" style="width:auto;padding:0 8px;font-size:11px" :title="tr('Link dieses Kanals: zusätzlich mit den Belegungen der anderen Kanäle, ohne die eigenen des Kanals')" @click="copy(f.exportUrl)"><i class="ti ti-copy"></i> {{ tr('Link inkl. anderer Kanäle') }}</button>
            <button class="icon-btn" style="color:var(--danger)" @click="removeFeed(u, f)"><i class="ti ti-trash"></i></button>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
            <input v-model="feedForm(u.unitId).name" :placeholder="tr('Name (z. B. Booking.com)')" style="width:170px" />
            <input v-model="feedForm(u.unitId).url" :placeholder="tr('https://… iCal-Link des Kanals')" style="flex:1;min-width:220px" />
            <button class="accent-btn" style="height:34px;font-size:12px" :disabled="busy === 'feed' + u.unitId" @click="addFeed(u)"><i class="ti" :class="busy === 'feed' + u.unitId ? 'ti-loader-2 spin' : 'ti-plus'"></i> {{ tr('Hinzufügen') }}</button>
            <button v-if="u.feeds.length" class="icon-btn" style="width:auto;padding:0 10px;font-size:12px" :disabled="busy === 'sync' + u.unitId" @click="syncUnit(u)"><i class="ti" :class="busy === 'sync' + u.unitId ? 'ti-loader-2 spin' : 'ti-refresh'"></i> {{ tr('Jetzt abgleichen') }}</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="toast" style="position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--bg-surface);border:0.5px solid var(--border);padding:10px 18px;border-radius:10px;font-size:13px;z-index:200">{{ toast }}</div>

    <!-- UNTERKUNFT-FORMULAR -->
    <div v-if="showUnit" class="modal-overlay" @click.self="showUnit = false">
      <div class="modal-card">
        <div class="modal-header"><span class="card-title">{{ editingUnit ? tr('Unterkunft bearbeiten') : tr('Neue Unterkunft') }}</span><button class="icon-btn" @click="showUnit = false"><i class="ti ti-x"></i></button></div>
        <div class="modal-body">
          <div v-if="formError" class="err">{{ formError }}</div>
          <div class="auth-field"><label>{{ tr('Name *') }}</label><input v-model="uf.name" maxlength="100" :placeholder="tr('z. B. Seeblick, Haus 1')" /></div>
          <div class="auth-field"><label>{{ tr('Adresse (optional)') }}</label><input v-model="uf.address" maxlength="300" /></div>
          <div class="auth-row">
            <div class="auth-field"><label>{{ tr('Personen (max.)') }}</label><input v-model.number="uf.capacity" type="number" min="1" /></div>
            <div class="auth-field"><label>{{ tr('Schlafzimmer') }}</label><input v-model.number="uf.bedrooms" type="number" min="0" /></div>
            <div class="auth-field"><label>{{ tr('Mindestaufenthalt (Nächte)') }}</label><input v-model.number="uf.minNights" type="number" min="1" /></div>
          </div>
          <div class="auth-row">
            <div class="auth-field"><label>{{ tr('Preis pro Nacht (€)') }}</label><input v-model.number="uf.nightlyRate" type="number" min="0" step="0.01" /></div>
            <div class="auth-field"><label>{{ tr('Endreinigung (€)') }}</label><input v-model.number="uf.cleaningFee" type="number" min="0" step="0.01" /></div>
            <div class="auth-field"><label>{{ tr('Kurtaxe (€ je Person/Nacht)') }}</label><input v-model.number="uf.touristTax" type="number" min="0" step="0.01" /></div>
          </div>
          <div class="auth-row">
            <div class="auth-field"><label>{{ tr('Anreise ab') }}</label><input v-model="uf.checkInTime" type="time" /></div>
            <div class="auth-field"><label>{{ tr('Abreise bis') }}</label><input v-model="uf.checkOutTime" type="time" /></div>
          </div>
          <label style="font-size:12px;font-weight:600;color:var(--text-muted);display:block;margin:8px 0 6px">{{ tr('Saisonpreise (optional, je Nacht, ersetzen den Grundpreis)') }}</label>
          <div v-for="(s, i) in uf.seasons" :key="i" style="display:flex;gap:6px;align-items:flex-end;margin-bottom:6px;flex-wrap:wrap">
            <div class="auth-field" style="margin:0"><input v-model="s.from" type="date" /></div><span>{{ tr('bis') }}</span><div class="auth-field" style="margin:0"><input v-model="s.to" type="date" /></div>
            <div class="auth-field" style="margin:0;width:100px"><input v-model.number="s.rate" type="number" min="0" step="0.01" :placeholder="tr('€/Nacht')" /></div>
            <button class="icon-btn" style="color:var(--danger)" @click="uf.seasons.splice(i, 1)"><i class="ti ti-trash"></i></button>
          </div>
          <button class="icon-btn" style="font-size:12px;padding:0 10px;height:26px;margin-bottom:10px;width:auto" @click="uf.seasons.push({ from: '', to: '', rate: uf.nightlyRate })"><i class="ti ti-plus"></i> {{ tr('Saison') }}</button>
          <div class="auth-field"><label>{{ tr('Beschreibung (intern)') }}</label><textarea v-model="uf.description" rows="2" maxlength="2000"></textarea></div>
          <button class="auth-btn" :disabled="saving" style="width:100%" @click="saveUnit"><i class="ti" :class="saving ? 'ti-loader-2 spin' : 'ti-device-floppy'"></i> {{ tr('Speichern') }}</button>
        </div>
      </div>
    </div>

    <!-- BUCHUNGS-FORMULAR -->
    <div v-if="showBooking" class="modal-overlay" @click.self="showBooking = false">
      <div class="modal-card">
        <div class="modal-header"><span class="card-title">{{ editingBooking ? tr('Buchung bearbeiten') : tr('Neue Buchung') }}</span><button class="icon-btn" @click="showBooking = false"><i class="ti ti-x"></i></button></div>
        <div class="modal-body">
          <div v-if="formError" class="err">{{ formError }}</div>
          <div class="auth-row">
            <div class="auth-field"><label>{{ tr('Unterkunft') }}</label><select v-model="bf.unitId" class="form-select"><option v-for="u in units" :key="u.unitId" :value="u.unitId">{{ u.name }}</option></select></div>
            <div class="auth-field"><label>{{ tr('Art') }}</label><select v-model="bf.status" class="form-select"><option value="confirmed">{{ tr('Bestätigt') }}</option><option value="inquiry">{{ tr('Anfrage') }}</option><option value="blocked">{{ tr('Sperrzeit (Eigennutzung, Renovierung …)') }}</option><option v-if="editingBooking" value="cancelled">{{ tr('Storniert') }}</option></select></div>
          </div>
          <div class="auth-row">
            <div class="auth-field"><label>{{ tr('Anreise') }}</label><input v-model="bf.checkIn" type="date" /></div>
            <div class="auth-field"><label>{{ tr('Abreise') }}</label><input v-model="bf.checkOut" type="date" :min="bf.checkIn" /></div>
          </div>
          <template v-if="bf.status !== 'blocked'">
            <div class="auth-row">
              <div class="auth-field"><label>{{ tr('Gast *') }}</label><input v-model="bf.guestName" maxlength="120" /></div>
              <div class="auth-field"><label>{{ tr('Personen') }}</label><input v-model.number="bf.guests" type="number" min="1" /></div>
            </div>
            <div class="auth-row">
              <div class="auth-field"><label>{{ tr('E-Mail') }}</label><input v-model="bf.guestEmail" maxlength="254" /></div>
              <div class="auth-field"><label>{{ tr('Telefon') }}</label><input v-model="bf.guestPhone" maxlength="40" /></div>
            </div>
            <div style="background:var(--bg-base);border-radius:10px;padding:10px 14px;font-size:13px;margin-bottom:10px" v-if="priceInfo">
              {{ priceInfo.nights }} {{ tr('Nächte: Übernachtung') }} {{ eur(priceInfo.accommodation) }}<span v-if="priceInfo.cleaning"> {{ tr('+ Endreinigung') }} {{ eur(priceInfo.cleaning) }}</span><span v-if="priceInfo.tax"> {{ tr('+ Kurtaxe') }} {{ eur(priceInfo.tax) }}</span> = <strong>{{ eur(priceInfo.total) }}</strong>
              <div class="auth-field" style="margin:8px 0 0"><label>{{ tr('Gesamtpreis abweichend festlegen (optional)') }}</label><input v-model="bf.priceOverride" type="number" min="0" step="0.01" :placeholder="tr('leer = berechneten Preis nehmen')" /></div>
            </div>
          </template>
          <div class="auth-field"><label>{{ tr('Notiz (intern)') }}</label><textarea v-model="bf.notes" rows="2" maxlength="1000"></textarea></div>
          <button class="auth-btn" :disabled="saving" style="width:100%" @click="saveBooking"><i class="ti" :class="saving ? 'ti-loader-2 spin' : 'ti-device-floppy'"></i> {{ tr('Speichern') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { FEWO_STATUS_LABELS, priceStay, nightsBetween, addDays, todayIsoDate, isOccupying } from '~~/shared/fewo'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

// Ferienwohnungs-Verwaltung. Alle Regeln (Überschneidungen, Preise, wer was darf) setzt der Server durch; die Oberfläche zeigt nur an und fragt ab.
const TABS = [{ key: 'plan', label: tr('Belegungsplan'), icon: 'ti-calendar-month' }, { key: 'bookings', label: tr('Buchungen'), icon: 'ti-list-details' }, { key: 'units', label: tr('Unterkünfte & Kanäle'), icon: 'ti-home-cog' }]
const STATUS = FEWO_STATUS_LABELS as Record<string, string>
const tab = ref('plan')
const units = ref<any[]>([]), bookings = ref<any[]>([])
const loading = ref(true), loadError = ref(''), saving = ref(false), busy = ref(''), toast = ref(''), formError = ref('')
const today = todayIsoDate()

async function api<T = any>(path: string, opts: any = {}): Promise<T> {
  const { useAuthHeader } = await import('~/composables/useAuth')
  return await $fetch<T>(useApiUrl(`/api/fewo${path}`), { ...opts, headers: await useAuthHeader() })
}
const say = (m: string) => { toast.value = m; setTimeout(() => { if (toast.value === m) toast.value = '' }, 3500) }
const errText = (e: any) => e?.data?.message || e?.message || tr('Das hat nicht geklappt.')
async function load() {
  try {
    const [u, b] = await Promise.all([api('/units'), api('/bookings')])
    units.value = u.units || []; bookings.value = b.bookings || []; loadError.value = ''
  } catch (e: any) { loadError.value = e?.statusCode === 403 ? tr('Das Branchenpaket Ferienwohnungen ist für dein Konto nicht freigeschaltet.') : errText(e) }
  finally { loading.value = false }
}
onMounted(load)

const eur = (n: number) => Number(n || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
const dateDe = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('de-DE')
const timeDe = (iso: string) => new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const nights = (b: any) => nightsBetween(b.checkIn, b.checkOut)
const unitName = (id: string) => units.value.find(u => u.unitId === id)?.name || '–'
const isChannel = (b: any) => String(b.source || '').startsWith('ical:')
async function copy(text: string) { try { await navigator.clipboard.writeText(text); say('Kopiert.') } catch { say(tr('Kopieren nicht möglich, bitte von Hand markieren.')) } }

// ── Belegungsplan ──
const thisMonth = () => today.slice(0, 7)
const month = ref(thisMonth())
const monthLabel = computed(() => new Date(month.value + '-01T00:00:00').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }))
const days = computed(() => {
  const [y, m] = month.value.split('-').map(Number), count = new Date(y, m, 0).getDate()
  return Array.from({ length: count }, (_, i) => { const iso = `${month.value}-${String(i + 1).padStart(2, '0')}`; const wd = new Date(iso + 'T00:00:00').getDay(); return { iso, n: i + 1, wd: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][wd], weekend: wd === 0 || wd === 6 } })
})
function shiftMonth(by: number) { const [y, m] = month.value.split('-').map(Number); const d = new Date(y, m - 1 + by, 1); month.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
// Eine Nacht gilt vom Anreisetag (einschließlich) bis zum Abreisetag (ausschließlich)
const nightBookings = (unitId: string, iso: string) => bookings.value.filter(b => b.unitId === unitId && isOccupying(b) && b.checkIn <= iso && iso < b.checkOut)
const cellClass = (unitId: string, iso: string) => { const bs = nightBookings(unitId, iso); if (!bs.length) return ''; if (bs.length > 1 || bs.some(b => b.conflict)) return 'conflict'; return bs[0].status }
const cellTitle = (unitId: string, iso: string) => nightBookings(unitId, iso).map(b => `${b.guestName || 'Gesperrt'} (${STATUS[b.status]})`).join(' / ')
function clickCell(u: any, iso: string) {
  const bs = nightBookings(u.unitId, iso)
  const own = bs.find(b => !isChannel(b))
  if (own) return openBooking(own)
  if (bs.length) return say('Diese Sperrzeit kommt aus einem Kanal-Kalender.')
  openBooking(undefined, { unitId: u.unitId, checkIn: iso, checkOut: addDays(iso, Math.max(1, u.minNights || 1)) })
}

// ── Buchungen ──
const filterUnit = ref(''), filterWhen = ref('upcoming')
const shownBookings = computed(() => bookings.value.filter(b => (!filterUnit.value || b.unitId === filterUnit.value) && (filterWhen.value === 'all' || (filterWhen.value === 'upcoming' ? b.checkOut >= today : b.checkOut < today))).sort((a, b) => filterWhen.value === 'past' ? b.checkIn.localeCompare(a.checkIn) : a.checkIn.localeCompare(b.checkIn)))

const showBooking = ref(false), editingBooking = ref<any>(null)
const bf = reactive<any>({ unitId: '', status: 'confirmed', checkIn: '', checkOut: '', guestName: '', guestEmail: '', guestPhone: '', guests: 2, notes: '', priceOverride: '' })
function openBooking(b?: any, preset: any = {}) {
  formError.value = ''; editingBooking.value = b || null
  Object.assign(bf, { unitId: units.value[0]?.unitId || '', status: 'confirmed', checkIn: addDays(today, 7), checkOut: addDays(today, 10), guestName: '', guestEmail: '', guestPhone: '', guests: 2, notes: '', priceOverride: '' }, b ? { ...b, priceOverride: '' } : {}, preset)
  showBooking.value = true
}
const priceInfo = computed(() => {
  const u = units.value.find(x => x.unitId === bf.unitId)
  if (!u || !bf.checkIn || !bf.checkOut || bf.checkOut <= bf.checkIn || nightsBetween(bf.checkIn, bf.checkOut) > 366) return null
  return priceStay(u, bf.checkIn, bf.checkOut, Number(bf.guests) || 1)
})
async function saveBooking() {
  saving.value = true; formError.value = ''
  try {
    const body = { ...bf, priceOverride: bf.priceOverride === '' ? null : Number(bf.priceOverride) }
    if (editingBooking.value) await api(`/bookings/${editingBooking.value.bookingId}`, { method: 'PUT', body })
    else await api('/bookings', { method: 'POST', body })
    showBooking.value = false; await load(); say('Gespeichert.')
  } catch (e: any) { formError.value = errText(e) } finally { saving.value = false }
}
async function removeBooking(b: any) {
  if (!window.confirm(`Buchung von ${b.guestName || 'Sperrzeit'} löschen?`)) return
  try { await api(`/bookings/${b.bookingId}`, { method: 'DELETE' }); await load() } catch (e: any) { say(errText(e)) }
}
async function toInvoice(b: any) {
  busy.value = b.bookingId
  try { const r = await api(`/bookings/${b.bookingId}/to-invoice`, { method: 'POST' }); await load(); say(`Rechnung ${r.number} angelegt (Finanzen).`) } catch (e: any) { say(errText(e)) } finally { busy.value = '' }
}

// ── Unterkünfte und Kanäle ──
const showUnit = ref(false), editingUnit = ref<any>(null)
const uf = reactive<any>({ name: '', address: '', description: '', capacity: 4, bedrooms: 1, nightlyRate: 100, cleaningFee: 0, touristTax: 0, minNights: 1, checkInTime: '15:00', checkOutTime: '10:00', seasons: [] })
function openUnit(u?: any) {
  formError.value = ''; editingUnit.value = u || null
  Object.assign(uf, { name: '', address: '', description: '', capacity: 4, bedrooms: 1, nightlyRate: 100, cleaningFee: 0, touristTax: 0, minNights: 1, checkInTime: '15:00', checkOutTime: '10:00', seasons: [] }, u ? JSON.parse(JSON.stringify(u)) : {})
  showUnit.value = true
}
async function saveUnit() {
  saving.value = true; formError.value = ''
  try {
    if (editingUnit.value) await api(`/units/${editingUnit.value.unitId}`, { method: 'PUT', body: { ...uf } })
    else await api('/units', { method: 'POST', body: { ...uf } })
    showUnit.value = false; await load(); say('Gespeichert.')
  } catch (e: any) { formError.value = errText(e) } finally { saving.value = false }
}
async function removeUnit(u: any) {
  if (!window.confirm(`Unterkunft „${u.name}“ wirklich löschen? Eingelesene Kanal-Sperrzeiten werden mit entfernt.`)) return
  try { await api(`/units/${u.unitId}`, { method: 'DELETE' }); await load() } catch (e: any) { say(errText(e)) }
}
async function rotate(u: any) {
  if (!window.confirm(tr('Neuen Kalender-Link erzeugen? Der alte Link (z. B. bei Booking.com eingetragen) hört sofort auf zu funktionieren, du musst den neuen dort eintragen.'))) return
  try { await api(`/units/${u.unitId}/export-token`, { method: 'POST' }); await load(); say(tr('Neuer Link erzeugt.')) } catch (e: any) { say(errText(e)) }
}
const feedForms = reactive<Record<string, { name: string; url: string }>>({})
const feedForm = (id: string) => (feedForms[id] ||= { name: '', url: '' })
async function addFeed(u: any) {
  const f = feedForm(u.unitId); busy.value = 'feed' + u.unitId
  try { const r = await api(`/units/${u.unitId}/feeds`, { method: 'POST', body: { name: f.name, url: f.url } }); f.name = ''; f.url = ''; await load(); say(`Kanal eingelesen: ${r.result?.added ?? 0} Sperrzeiten.`) } catch (e: any) { say(errText(e)) } finally { busy.value = '' }
}
async function removeFeed(u: any, f: any) {
  if (!window.confirm(`Kanal „${f.name}“ entfernen? Seine Sperrzeiten verschwinden aus dem Plan.`)) return
  try { await api(`/units/${u.unitId}/feeds/${f.feedId}`, { method: 'DELETE' }); await load() } catch (e: any) { say(errText(e)) }
}
async function syncUnit(u: any) {
  busy.value = 'sync' + u.unitId
  try { await api(`/units/${u.unitId}/sync`, { method: 'POST' }); await load(); say('Abgleich fertig.') } catch (e: any) { say(errText(e)) } finally { busy.value = '' }
}
</script>

<style scoped>
.tab-btn { background: var(--bg-surface); border: 0.5px solid var(--border); border-radius: 10px; padding: 8px 14px; font-size: 13px; cursor: pointer; color: var(--text); display: inline-flex; gap: 6px; align-items: center }
.tab-btn.active { background: var(--accent); color: #fff; border-color: var(--accent) }
.plan { border-collapse: separate; border-spacing: 0; font-size: 11px; min-width: 100% }
.plan th, .plan td { padding: 0; text-align: center; border-bottom: 0.5px solid var(--border) }
.plan thead th { font-weight: 600; padding: 4px 0; min-width: 26px } .plan thead small { display: block; color: var(--text-muted); font-weight: 400 }
.plan .unit-col { text-align: left; padding: 0 12px 0 0; white-space: nowrap; position: sticky; left: 0; background: var(--bg-surface); font-size: 13px; min-width: 120px }
.plan .today { color: var(--accent) } .plan .we { background: #00000008 }
.cell { height: 34px; cursor: pointer; border-left: 0.5px solid var(--border) } .cell:hover { outline: 1.5px solid var(--accent); outline-offset: -1.5px }
.confirmed, .sw.confirmed { background: #00A844 } .inquiry, .sw.inquiry { background: #F0B428 } .blocked, .sw.blocked { background: #8a93a6 }
.conflict, .sw.conflict { background: repeating-linear-gradient(45deg, #E05C5C, #E05C5C 4px, #f3a0a0 4px, #f3a0a0 8px) }
.legend { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 10px; font-size: 12px; color: var(--text-muted) } .sw { display: inline-block; width: 12px; height: 12px; border-radius: 3px; vertical-align: -1px; margin-right: 4px }
.st-confirmed { background: #00A84422; color: #00A844 } .st-inquiry { background: #F0B42833; color: #B07A00 } .st-blocked { background: #8a93a633; color: #5b6478 } .st-cancelled { background: #E05C5C22; color: #E05C5C }
.err { margin-bottom: 10px; padding: 10px 14px; border-radius: 8px; background: #E05C5C18; color: #E05C5C; font-size: 13px }
</style>
