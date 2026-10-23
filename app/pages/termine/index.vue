<template>
  <div class="page">

    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:22px;font-weight:800;margin:0">{{ tr('Termine') }} <span style="color:var(--accent)">{{ tr('Planer') }}</span></h1>
        <p style="color:var(--text-muted);font-size:13px;margin:4px 0 0">{{ tr('Terminarten, Buchungen & öffentliche Buchungsseite') }}</p>
      </div>
      <button v-if="activeTab === 'terminarten'" class="accent-btn" @click="openNewType">
        <i class="ti ti-plus"></i> {{ tr('Terminart anlegen') }}
      </button>
      <button v-if="activeTab === 'termine' || activeTab === 'kalender'" class="accent-btn" :disabled="!types.length" @click="openManualBooking()">
        <i class="ti ti-plus"></i> {{ tr('Termin eintragen') }}
      </button>
    </div>

    <!-- Stats -->
    <div class="stats-grid" style="margin-bottom:20px">
      <div class="stat-card">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:40px;height:40px;border-radius:10px;background:var(--accent)22;display:flex;align-items:center;justify-content:center">
            <i class="ti ti-calendar-event" style="color:var(--accent);font-size:20px"></i>
          </div>
          <div>
            <div style="font-size:22px;font-weight:800">{{ types.length }}</div>
            <div style="font-size:12px;color:var(--text-muted)">{{ tr('Terminarten') }}</div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:40px;height:40px;border-radius:10px;background:#3b82f622;display:flex;align-items:center;justify-content:center">
            <i class="ti ti-calendar-time" style="color:#3b82f6;font-size:20px"></i>
          </div>
          <div>
            <div style="font-size:22px;font-weight:800">{{ upcomingCount }}</div>
            <div style="font-size:12px;color:var(--text-muted)">{{ tr('Anstehende Termine') }}</div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:40px;height:40px;border-radius:10px;background:#22c55e22;display:flex;align-items:center;justify-content:center">
            <i class="ti ti-circle-check" style="color:#22c55e;font-size:20px"></i>
          </div>
          <div>
            <div style="font-size:22px;font-weight:800">{{ bookings.length }}</div>
            <div style="font-size:12px;color:var(--text-muted)">{{ tr('Buchungen gesamt') }}</div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:40px;height:40px;border-radius:10px;background:#f59e0b22;display:flex;align-items:center;justify-content:center">
            <i class="ti ti-world" style="color:#f59e0b;font-size:20px"></i>
          </div>
          <div>
            <div style="font-size:22px;font-weight:800">{{ settingsForm.termineEnabled ? 'An' : 'Aus' }}</div>
            <div style="font-size:12px;color:var(--text-muted)">{{ tr('Öffentliche Seite') }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
      <button v-for="tab in tabs" :key="tab.key" class="theme-opt" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
        <i class="ti" :class="tab.icon"></i> {{ tab.label }}
      </button>
    </div>

    <!-- ── TAB: TERMINARTEN ── -->
    <div v-if="activeTab === 'kalender'">
      <div style="display:flex;justify-content:flex-end;margin-bottom:8px"><button class="icon-btn" style="width:auto;padding:0 12px;font-size:12px" @click="openSubscribe"><i class="ti ti-calendar-share"></i> {{ tr('Kalender abonnieren') }}</button></div>
      <TermineCalendar :bookings="bookings" :can-create="types.some(t => t.active)" @new="(d, t) => openManualBooking(d, t)" @open="openDetail" />
    </div>

    <div v-else-if="activeTab === 'terminarten'">
      <div v-if="loadingTypes" style="display:flex;justify-content:center;padding:60px;color:var(--text-muted)">
        <i class="ti ti-loader-2 spin" style="font-size:28px"></i>
      </div>
      <div v-else-if="!types.length" style="text-align:center;padding:80px;color:var(--text-muted)">
        <i class="ti ti-calendar-off" style="font-size:48px;display:block;margin-bottom:12px;opacity:.3"></i>
        <p style="font-size:14px;margin-bottom:16px">{{ tr('Noch keine Terminarten angelegt.') }}</p>
        <button class="accent-btn" @click="openNewType"><i class="ti ti-plus" style="margin-right:6px"></i>{{ tr('Erste Terminart anlegen') }}</button>
      </div>
      <div v-else style="display:flex;flex-direction:column;gap:8px">
        <div v-for="t in types" :key="t.typeId"
          style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:16px"
          :style="!t.active ? 'opacity:.5' : ''">
          <div style="flex:1;min-width:0">
            <span style="font-weight:700;font-size:14px">{{ t.name }}</span>
            <span v-if="!t.active" style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:var(--border);color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-left:8px">{{ tr('Inaktiv') }}</span>
          </div>
          <div style="font-size:13px;color:var(--text-muted);flex-shrink:0"><i class="ti ti-clock" style="margin-right:4px"></i>{{ t.durationMinutes }} {{ tr('Min.') }}</div>
          <div style="display:flex;gap:4px;flex-shrink:0">
            <button @click="toggleTypeActive(t)" class="icon-btn" :title="t.active ? 'Deaktivieren' : 'Aktivieren'">
              <i class="ti" :class="t.active ? 'ti-eye' : 'ti-eye-off'"></i>
            </button>
            <button @click="openEditType(t)" class="icon-btn" :title="tr('Bearbeiten')"><i class="ti ti-edit"></i></button>
            <button @click="deleteType(t)" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:16px;padding:4px 6px;border-radius:6px" :title="tr('Löschen')">
              <i class="ti ti-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── TAB: TERMINE ── -->
    <div v-else-if="activeTab === 'termine'">
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <button v-for="f in bookingFilters" :key="f.key" class="theme-opt" :class="{ active: bookingFilter === f.key }" @click="bookingFilter = f.key">
          {{ f.label }}
        </button>
      </div>
      <div v-if="loadingBookings" style="display:flex;justify-content:center;padding:60px;color:var(--text-muted)">
        <i class="ti ti-loader-2 spin" style="font-size:28px"></i>
      </div>
      <div v-else-if="!filteredBookings.length" style="text-align:center;padding:80px;color:var(--text-muted)">
        <i class="ti ti-calendar-off" style="font-size:48px;display:block;margin-bottom:12px;opacity:.3"></i>
        <p style="font-size:14px">{{ tr('Keine Termine in dieser Ansicht.') }}</p>
      </div>
      <div v-else style="display:flex;flex-direction:column;gap:8px">
        <div v-for="b in filteredBookings" :key="b.bookingId"
          style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap"
          :style="b.status === 'cancelled' ? 'opacity:.5' : ''">
          <div style="width:120px;flex-shrink:0">
            <div style="font-weight:700;font-size:13px">{{ formatDate(b.date) }}</div>
            <div style="font-size:12px;color:var(--text-muted)">{{ b.startTime }}–{{ b.endTime }}</div>
          </div>
          <div style="flex:1;min-width:160px">
            <div style="font-weight:600;font-size:13px;display:flex;align-items:center;gap:6px">
              {{ b.customerName }}
              <i class="ti" :class="b.channel === 'phone' ? 'ti-phone' : 'ti-video'" :title="b.channel === 'phone' ? 'Telefontermin' : 'Video-Termin'" style="color:var(--text-muted);font-size:13px"></i>
            </div>
            <div style="font-size:12px;color:var(--text-muted)">{{ b.typeName }} · {{ b.customerEmail || b.customerPhone }}</div>
          </div>
          <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:.05em;flex-shrink:0"
            :style="b.status === 'cancelled' ? 'background:#ef444422;color:#ef4444' : 'background:#22c55e22;color:#22c55e'">
            {{ b.status === 'cancelled' ? 'Storniert' : 'Bestätigt' }}
          </span>
          <a v-if="b.videoLink || b.googleMeetLink" :href="b.videoLink || b.googleMeetLink" target="_blank" rel="noopener" class="icon-btn" :title="tr('Video-Link öffnen')" style="flex-shrink:0">
            <i class="ti ti-video"></i>
          </a>
          <button v-if="b.status !== 'cancelled'" @click="cancelBooking(b)" class="icon-btn" style="color:#ef4444;flex-shrink:0" :title="tr('Stornieren')">
            <i class="ti ti-x"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- ── TAB: EINSTELLUNGEN ── -->
    <div v-else-if="activeTab === 'einstellungen'">
      <div v-if="loadingSettings" style="display:flex;justify-content:center;padding:60px;color:var(--text-muted)">
        <i class="ti ti-loader-2 spin" style="font-size:28px"></i>
      </div>
      <div v-else style="display:flex;flex-direction:column;gap:16px">
        <div class="termine-settings-grid">

          <div style="display:flex;flex-direction:column;gap:16px">

            <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:14px;padding:18px 20px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
                <div style="font-size:13px;font-weight:700"><i class="ti ti-world" style="margin-right:6px;color:var(--accent)"></i>{{ tr('Öffentliche Buchungsseite') }}</div>
                <button @click="settingsForm.termineEnabled = !settingsForm.termineEnabled"
                  style="width:42px;height:24px;border-radius:12px;border:none;cursor:pointer;transition:all .2s;position:relative;flex-shrink:0"
                  :style="settingsForm.termineEnabled ? 'background:var(--accent)' : 'background:var(--border)'">
                  <span style="position:absolute;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .2s"
                    :style="settingsForm.termineEnabled ? 'left:21px' : 'left:3px'"></span>
                </button>
              </div>
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">
                {{ tr('Kunden können auf deiner Nexora-Webseite selbst einen freien Termin buchen.') }}
              </div>
              <div class="auth-field" v-if="settingsForm.termineEnabled">
                <label>{{ tr('Seitentitel (Navigation & Überschrift)') }}</label>
                <input v-model="settingsForm.termineTitle" :placeholder="tr('Termine')" />
              </div>
            </div>

          </div>

          <div style="display:flex;flex-direction:column;gap:16px">

            <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:14px;padding:18px 20px">
              <div style="font-size:13px;font-weight:700;margin-bottom:14px"><i class="ti ti-clock-hour-4" style="margin-right:6px;color:var(--accent)"></i>{{ tr('Arbeitszeiten') }}</div>
              <div style="display:flex;flex-direction:column;gap:8px">
                <div v-for="d in weekdays" :key="d.key" style="display:flex;align-items:center;gap:10px">
                  <label style="display:flex;align-items:center;gap:8px;width:110px;flex-shrink:0;cursor:pointer;font-size:13px">
                    <input type="checkbox" v-model="settingsForm.termineWorkingHours[d.key].enabled" style="width:auto" />
                    {{ d.label }}
                  </label>
                  <template v-if="settingsForm.termineWorkingHours[d.key].enabled">
                    <input type="time" v-model="settingsForm.termineWorkingHours[d.key].start" class="form-select" style="width:110px" />
                    <span style="color:var(--text-muted);font-size:12px">{{ tr('bis') }}</span>
                    <input type="time" v-model="settingsForm.termineWorkingHours[d.key].end" class="form-select" style="width:110px" />
                  </template>
                  <span v-else style="font-size:12px;color:var(--text-muted)">{{ tr('Geschlossen') }}</span>
                </div>
              </div>
            </div>

            <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:14px;padding:18px 20px">
              <div style="font-size:13px;font-weight:700;margin-bottom:14px"><i class="ti ti-adjustments" style="margin-right:6px;color:var(--accent)"></i>{{ tr('Buchungsregeln') }}</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div class="auth-field"><label>{{ tr('Slot-Länge (Min.)') }}</label>
                  <select v-model.number="settingsForm.termineSlotStepMinutes" class="form-select">
                    <option :value="15">15</option><option :value="30">30</option><option :value="45">45</option><option :value="60">60</option>
                  </select>
                </div>
                <div class="auth-field"><label>{{ tr('Zeitzone') }}</label>
                  <select v-model="settingsForm.termineTimezone" class="form-select">
                    <option value="Europe/Berlin">{{ tr('Europe/Berlin') }}</option>
                    <option value="Europe/Vienna">{{ tr('Europe/Vienna') }}</option>
                    <option value="Europe/Zurich">{{ tr('Europe/Zurich') }}</option>
                  </select>
                </div>
                <div class="auth-field"><label>{{ tr('Mindest-Vorlauf (Stunden)') }}</label><input v-model.number="settingsForm.termineMinNoticeHours" type="number" min="0" /></div>
                <div class="auth-field"><label>{{ tr('Max. Vorausbuchung (Tage)') }}</label><input v-model.number="settingsForm.termineMaxAdvanceDays" type="number" min="1" /></div>
                <div class="auth-field"><label>{{ tr('Erinnerung vor dem Termin (Minuten, 0 = aus)') }}</label><input v-model.number="settingsForm.termineReminderMinutes" type="number" min="0" /></div>
              </div>
            </div>

          </div>

        </div>

        <button class="accent-btn" style="align-self:flex-start" :disabled="savingSettings" @click="saveSettings">
          <i v-if="savingSettings" class="ti ti-loader-2 spin"></i>
          <span v-else><i class="ti ti-device-floppy" style="margin-right:6px"></i>{{ tr('Speichern') }}</span>
        </button>
      </div>
    </div>

    <!-- MODAL: Terminart -->
    <div v-if="showTypeModal" class="modal-overlay" @click.self="showTypeModal=false">
      <div class="modal-card" style="max-width:420px">
        <div class="modal-header">
          <span class="card-title">{{ editingTypeId ? 'Terminart bearbeiten' : 'Terminart anlegen' }}</span>
          <button class="icon-btn" @click="showTypeModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-field"><label>{{ tr('Name *') }}</label><input v-model="typeForm.name" :placeholder="tr('Beratungsgespräch')" /></div>
          <div class="auth-field"><label>{{ tr('Dauer (Minuten) *') }}</label><input v-model.number="typeForm.durationMinutes" type="number" min="5" step="5" placeholder="30" /></div>
          <div class="auth-field">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" v-model="typeForm.active" style="width:auto" /> {{ tr('Aktiv') }}
            </label>
          </div>
        </div>
        <div style="padding:0 24px 24px">
          <button class="auth-btn" @click="saveType" :disabled="!typeForm.name || !typeForm.durationMinutes">
            <i class="ti ti-device-floppy" style="margin-right:6px"></i>{{ editingTypeId ? 'Speichern' : 'Terminart anlegen' }}
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: Termin manuell eintragen -->
    <!-- KALENDER ABONNIEREN (.ics) -->
    <div v-if="showSubscribe" class="modal-overlay" @click.self="showSubscribe = false">
      <div class="modal-card" style="max-width:520px">
        <div class="modal-header"><span class="card-title">{{ tr('Kalender abonnieren') }}</span><button class="icon-btn" @click="showSubscribe = false"><i class="ti ti-x"></i></button></div>
        <div class="modal-body" style="display:flex;flex-direction:column;gap:10px;font-size:13px">
          <div style="color:var(--text-muted)">{{ tr('Mit diesem Link siehst du deine Termine in Google Kalender, Apple Kalender (iPhone/Mac), Outlook oder Thunderbird. Neue Buchungen erscheinen dort automatisch (je nach App mit etwas Verzögerung). Es geht nur in eine Richtung: Plexora → dein Kalender.') }}</div>
          <div v-if="subscribeLoading"><i class="ti ti-loader-2 spin"></i></div>
          <template v-else-if="subscribeUrl">
            <div style="display:flex;gap:6px"><input :value="subscribeUrl" readonly style="flex:1;font-size:12px" @focus="($event.target as HTMLInputElement).select()" /><button class="icon-btn" style="width:auto;padding:0 10px;font-size:12px" @click="copySubscribe"><i class="ti ti-copy"></i> {{ subscribeCopied ? 'Kopiert' : 'Kopieren' }}</button></div>
            <div style="font-size:12px;color:var(--text-muted)"><strong>{{ tr('So geht\'s:') }}</strong> {{ tr('Google Kalender → „Weitere Kalender“ → „Per URL“. iPhone → Einstellungen → Kalender → Accounts → „Abonnierter Kalender“. Outlook → „Kalender hinzufügen“ → „Aus dem Internet“.') }}</div>
            <div style="font-size:12px;color:#8a5d00;background:#F0B42822;border-radius:8px;padding:8px 10px"><i class="ti ti-lock"></i> {{ tr('Der Link ist geheim: Wer ihn kennt, sieht Terminart, Zeit, Gastname, Telefon und Video-Link (keine E-Mail-Adressen, keine Notizen). Nicht weitergeben. Bei Verdacht: neuen Link erzeugen, der alte funktioniert dann nicht mehr.') }}</div>
            <div><button class="icon-btn" style="width:auto;padding:0 12px;font-size:12px" @click="createSubscribe(true)"><i class="ti ti-refresh"></i> {{ tr('Neuen Link erzeugen') }}</button></div>
          </template>
          <button v-else class="auth-btn" @click="createSubscribe(false)"><i class="ti ti-link"></i> {{ tr('Abo-Link erzeugen') }}</button>
          <div v-if="subscribeError" style="color:#E05C5C">{{ subscribeError }}</div>
        </div>
      </div>
    </div>

    <!-- TERMIN-DETAILS (Klick im Kalender) -->
    <div v-if="detail" class="modal-overlay" @click.self="detail = null">
      <div class="modal-card" style="max-width:440px">
        <div class="modal-header"><span class="card-title">{{ detail.typeName }}</span><button class="icon-btn" @click="detail = null"><i class="ti ti-x"></i></button></div>
        <div class="modal-body" style="display:flex;flex-direction:column;gap:8px;font-size:13px">
          <div><i class="ti ti-calendar" style="color:var(--accent)"></i> {{ new Date(detail.date + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) }}, {{ detail.startTime }}–{{ detail.endTime }} {{ tr('Uhr') }}</div>
          <div><i class="ti ti-user" style="color:var(--accent)"></i> <strong>{{ detail.customerName }}</strong><span v-if="detail.status === 'cancelled'" style="color:#E05C5C"> {{ tr('· storniert') }}</span></div>
          <div v-if="detail.customerEmail"><i class="ti ti-mail" style="color:var(--accent)"></i> {{ detail.customerEmail }}</div>
          <div v-if="detail.customerPhone"><i class="ti ti-phone" style="color:var(--accent)"></i> {{ detail.customerPhone }}</div>
          <div v-if="detail.channel !== 'phone' && (detail.videoLink || detail.googleMeetLink)"><i class="ti ti-video" style="color:var(--accent)"></i> <a :href="detail.videoLink || detail.googleMeetLink" target="_blank" rel="noopener" style="color:var(--accent)">{{ tr('Video-Raum öffnen') }}</a></div>
          <div v-if="detail.notes" style="padding:8px 10px;background:var(--bg-elevated);border-radius:8px;white-space:pre-line">{{ detail.notes }}</div>
          <button v-if="detail.status !== 'cancelled'" class="auth-btn" style="background:#E05C5C;margin-top:6px" @click="cancelFromDetail"><i class="ti ti-x"></i> {{ tr('Termin stornieren') }}</button>
        </div>
      </div>
    </div>

    <div v-if="showManualBookingModal" class="modal-overlay" @click.self="showManualBookingModal=false">
      <div class="modal-card" style="max-width:440px">
        <div class="modal-header">
          <span class="card-title">{{ tr('Termin eintragen') }}</span>
          <button class="icon-btn" @click="showManualBookingModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body" style="display:flex;flex-direction:column;gap:14px">
          <div class="auth-field">
            <label>{{ tr('Terminart *') }}</label>
            <select v-model="manualBooking.typeId">
              <option v-for="t in types.filter(x => x.active)" :key="t.typeId" :value="t.typeId">{{ t.name }} ({{ t.durationMinutes }} {{ tr('Min.)') }}</option>
            </select>
          </div>
          <div style="display:flex;gap:10px">
            <div class="auth-field" style="flex:1"><label>{{ tr('Datum *') }}</label><input v-model="manualBooking.date" type="date" /></div>
            <div class="auth-field" style="flex:1"><label>{{ tr('Uhrzeit *') }}</label><input v-model="manualBooking.startTime" type="time" /></div>
          </div>
          <div class="auth-field">
            <label>{{ tr('Kanal *') }}</label>
            <div style="display:flex;gap:8px">
              <button type="button" class="theme-opt" style="flex:1" :class="{ active: manualBooking.channel === 'video' }" @click="manualBooking.channel = 'video'">
                <i class="ti ti-video"></i> {{ tr('Video') }}
              </button>
              <button type="button" class="theme-opt" style="flex:1" :class="{ active: manualBooking.channel === 'phone' }" @click="manualBooking.channel = 'phone'">
                <i class="ti ti-phone"></i> {{ tr('Telefon') }}
              </button>
            </div>
          </div>
          <div class="auth-field"><label>{{ tr('Name *') }}</label><input v-model="manualBooking.customerName" :placeholder="tr('Max Mustermann')" /></div>
          <div class="auth-field">
            <label>{{ tr('E-Mail') }}{{ manualBooking.channel === 'video' ? ' *' : '' }}</label>
            <input v-model="manualBooking.customerEmail" :placeholder="tr('max@firma.de')" />
          </div>
          <div class="auth-field">
            <label>{{ tr('Telefon') }}{{ manualBooking.channel === 'phone' ? ' *' : '' }}</label>
            <input v-model="manualBooking.customerPhone" placeholder="+49 123 456789" />
          </div>
          <div class="auth-field"><label>{{ tr('Notiz') }}</label><textarea v-model="manualBooking.notes" rows="2" :placeholder="tr('Worum geht es?')"></textarea></div>
          <div v-if="manualBookingError" style="font-size:12px;color:#e05c5c">{{ manualBookingError }}</div>
        </div>
        <div style="padding:0 24px 24px">
          <button class="auth-btn" :disabled="!canSaveManualBooking || savingManualBooking" @click="saveManualBooking">
            <i class="ti" :class="savingManualBooking ? 'ti-loader-2 spin' : 'ti-device-floppy'" style="margin-right:6px"></i>{{ tr('Termin eintragen') }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const userEmail = ref('')
const authToken = ref('')
const activeTab = ref('kalender')

const tabs = [
  { key: 'kalender',     label: 'Kalender',      icon: 'ti-calendar-month' },
  { key: 'terminarten',  label: 'Terminarten',  icon: 'ti-calendar-event' },
  { key: 'termine',      label: 'Termine',       icon: 'ti-list-details' },
  { key: 'einstellungen', label: 'Einstellungen', icon: 'ti-settings' },
]

interface AppointmentType { typeId: string; name: string; durationMinutes: number; active: boolean }
interface Booking {
  bookingId: string; typeId: string; typeName: string; durationMinutes: number
  date: string; startTime: string; endTime: string
  customerName: string; customerEmail: string; customerPhone: string; notes: string
  channel?: 'video' | 'phone'
  status: string; googleMeetLink?: string; videoLink?: string; createdAt: string
}

const weekdays = [
  { key: 'mon', label: 'Montag' }, { key: 'tue', label: 'Dienstag' }, { key: 'wed', label: 'Mittwoch' },
  { key: 'thu', label: 'Donnerstag' }, { key: 'fri', label: 'Freitag' }, { key: 'sat', label: 'Samstag' }, { key: 'sun', label: 'Sonntag' },
]

function formatDate(d?: string) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// ── Terminarten ───────────────────────────────────────
const types        = ref<AppointmentType[]>([])
const loadingTypes = ref(true)
const showTypeModal = ref(false)
const editingTypeId = ref('')
const typeForm = reactive({ name: '', durationMinutes: 30, active: true })

function resetTypeForm() { typeForm.name = ''; typeForm.durationMinutes = 30; typeForm.active = true; editingTypeId.value = '' }
function openNewType() { resetTypeForm(); showTypeModal.value = true }
function openEditType(t: AppointmentType) {
  typeForm.name = t.name; typeForm.durationMinutes = t.durationMinutes; typeForm.active = t.active
  editingTypeId.value = t.typeId
  showTypeModal.value = true
}

async function loadTypes() {
  loadingTypes.value = true
  try {
    const res = await $fetch<{ types: AppointmentType[] }>(useApiUrl('/api/termine/types'), { headers: { 'x-user-email': userEmail.value, Authorization: `Bearer ${authToken.value}` } })
    types.value = res.types || []
  } catch {}
  loadingTypes.value = false
}

async function saveType() {
  if (!typeForm.name || !typeForm.durationMinutes) return
  try {
    if (editingTypeId.value) {
      await $fetch(useApiUrl(`/api/termine/types/${editingTypeId.value}`), { method: 'PUT', headers: { 'x-user-email': userEmail.value, Authorization: `Bearer ${authToken.value}` }, body: { ...typeForm } })
    } else {
      await $fetch(useApiUrl('/api/termine/types'), { method: 'POST', headers: { 'x-user-email': userEmail.value, Authorization: `Bearer ${authToken.value}` }, body: { ...typeForm } })
    }
    showTypeModal.value = false
    await loadTypes()
  } catch {}
}

async function toggleTypeActive(t: AppointmentType) {
  t.active = !t.active
  await $fetch(useApiUrl(`/api/termine/types/${t.typeId}`), { method: 'PUT', headers: { 'x-user-email': userEmail.value, Authorization: `Bearer ${authToken.value}` }, body: { active: t.active } })
}

async function deleteType(t: AppointmentType) {
  if (!confirm(`"${t.name}" wirklich löschen?`)) return
  await $fetch(useApiUrl(`/api/termine/types/${t.typeId}`), { method: 'DELETE', headers: { 'x-user-email': userEmail.value, Authorization: `Bearer ${authToken.value}` } })
  await loadTypes()
}

// ── Termine (Buchungen) ────────────────────────────────
const bookings        = ref<Booking[]>([])
const loadingBookings = ref(true)
const bookingFilter   = ref('anstehend')
const bookingFilters = [
  { key: 'alle',       label: 'Alle' },
  { key: 'anstehend',  label: 'Anstehend' },
  { key: 'vergangen',  label: 'Vergangen' },
  { key: 'storniert',  label: 'Storniert' },
]

const todayStr = new Date().toISOString().slice(0, 10)

const upcomingCount = computed(() =>
  bookings.value.filter(b => b.status !== 'cancelled' && b.date >= todayStr).length
)

const filteredBookings = computed(() => {
  const sorted = [...bookings.value].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
  if (bookingFilter.value === 'anstehend') return sorted.filter(b => b.status !== 'cancelled' && b.date >= todayStr)
  if (bookingFilter.value === 'vergangen') return sorted.filter(b => b.status !== 'cancelled' && b.date < todayStr).reverse()
  if (bookingFilter.value === 'storniert') return sorted.filter(b => b.status === 'cancelled')
  return sorted
})

async function loadBookings() {
  loadingBookings.value = true
  try {
    const res = await $fetch<{ bookings: Booking[] }>(useApiUrl('/api/termine/bookings'), { headers: { 'x-user-email': userEmail.value, Authorization: `Bearer ${authToken.value}` } })
    bookings.value = res.bookings || []
  } catch {}
  loadingBookings.value = false
}

async function cancelBooking(b: Booking) {
  if (!confirm(`Termin mit "${b.customerName}" wirklich stornieren?`)) return
  b.status = 'cancelled'
  await $fetch(useApiUrl(`/api/termine/bookings/${b.bookingId}`), { method: 'PUT', headers: { 'x-user-email': userEmail.value, Authorization: `Bearer ${authToken.value}` }, body: { status: 'cancelled' } })
}

// ── Kalender abonnieren (.ics) ──
const showSubscribe = ref(false), subscribeUrl = ref(''), subscribeLoading = ref(false), subscribeError = ref(''), subscribeCopied = ref(false)
const authHdr = () => ({ 'x-user-email': userEmail.value, Authorization: `Bearer ${authToken.value}` })
async function openSubscribe() {
  showSubscribe.value = true; subscribeError.value = ''; subscribeCopied.value = false; subscribeLoading.value = true
  try { subscribeUrl.value = (await $fetch<{ url: string | null }>(useApiUrl('/api/termine/ical-token'), { headers: authHdr() })).url || '' } catch (e: any) { subscribeError.value = e?.data?.message || 'Der Link konnte nicht geladen werden.' } finally { subscribeLoading.value = false }
}
async function createSubscribe(renew: boolean) {
  if (renew && !confirm(tr('Neuen Link erzeugen? Der alte Link (in deinen Kalender-Apps) hört sofort auf zu funktionieren, du musst den neuen dort eintragen.'))) return
  subscribeError.value = ''; subscribeLoading.value = true
  try { subscribeUrl.value = (await $fetch<{ url: string }>(useApiUrl('/api/termine/ical-token'), { method: 'POST', headers: authHdr() })).url } catch (e: any) { subscribeError.value = e?.data?.message || tr('Der Link konnte nicht erzeugt werden.') } finally { subscribeLoading.value = false }
}
async function copySubscribe() { try { await navigator.clipboard.writeText(subscribeUrl.value); subscribeCopied.value = true } catch { subscribeError.value = tr('Kopieren nicht möglich, bitte von Hand markieren.') } }

// ── Termin-Details (Kalender) ──
const detail = ref<Booking | null>(null)
function openDetail(b: Booking) { detail.value = b }
async function cancelFromDetail() {
  const b = detail.value; if (!b) return
  await cancelBooking(b)
  if (b.status === 'cancelled') detail.value = null
}

// ── Termin manuell eintragen ─────────────────────────────
const showManualBookingModal = ref(false)
const savingManualBooking    = ref(false)
const manualBookingError     = ref('')
const manualBooking = reactive({
  typeId: '', date: new Date().toISOString().slice(0, 10), startTime: '',
  channel: 'video' as 'video' | 'phone',
  customerName: '', customerEmail: '', customerPhone: '', notes: '',
})

const canSaveManualBooking = computed(() =>
  !!manualBooking.typeId && !!manualBooking.date && !!manualBooking.startTime && !!manualBooking.customerName &&
  (manualBooking.channel === 'phone' ? !!manualBooking.customerPhone : !!manualBooking.customerEmail)
)

function openManualBooking(date?: string, time?: string) {
  Object.assign(manualBooking, {
    typeId: types.value.find(t => t.active)?.typeId || '',
    date: date || new Date().toISOString().slice(0, 10), startTime: time || '',
    channel: 'video', customerName: '', customerEmail: '', customerPhone: '', notes: '',
  })
  manualBookingError.value = ''
  showManualBookingModal.value = true
}

async function saveManualBooking() {
  if (!canSaveManualBooking.value || savingManualBooking.value) return
  savingManualBooking.value = true
  manualBookingError.value = ''
  try {
    await $fetch(useApiUrl('/api/termine/bookings'), {
      method: 'POST',
      headers: { 'x-user-email': userEmail.value, Authorization: `Bearer ${authToken.value}` },
      body: { ...manualBooking },
    })
    showManualBookingModal.value = false
    await loadBookings()
  } catch (e: any) {
    manualBookingError.value = e?.data?.message || e?.message || 'Termin konnte nicht angelegt werden'
  } finally {
    savingManualBooking.value = false
  }
}

// ── Einstellungen ───────────────────────────────────────
const loadingSettings = ref(true)
const savingSettings  = ref(false)
const settingsForm = reactive({
  termineEnabled: false,
  termineTitle: 'Termine',
  termineTimezone: 'Europe/Berlin',
  termineWorkingHours: {} as Record<string, { enabled: boolean; start: string; end: string }>,
  termineSlotStepMinutes: 30,
  termineMinNoticeHours: 2,
  termineMaxAdvanceDays: 60,
  termineReminderMinutes: 60,
})

async function loadSettings() {
  loadingSettings.value = true
  try {
    const res = await $fetch<{ tenantId: string; settings: typeof settingsForm }>(useApiUrl('/api/termine/settings'), { headers: { 'x-user-email': userEmail.value, Authorization: `Bearer ${authToken.value}` } })
    Object.assign(settingsForm, res.settings)
  } catch {}
  loadingSettings.value = false
}

async function saveSettings() {
  savingSettings.value = true
  try {
    await $fetch(useApiUrl('/api/termine/settings'), {
      method: 'PUT',
      headers: { 'x-user-email': userEmail.value, Authorization: `Bearer ${authToken.value}` },
      body: { ...settingsForm },
    })
  } catch {
    alert(tr('Fehler beim Speichern.'))
  } finally {
    savingSettings.value = false
  }
}

onMounted(async () => {
  const { useAuthUser } = await import('~/composables/useAuth')
  const u = await useAuthUser()
  userEmail.value = u.email || ''
  authToken.value = u.idToken || ''
  await Promise.all([loadTypes(), loadBookings(), loadSettings()])

})
</script>

<style scoped>
.termine-settings-grid {
  display: grid;
  grid-template-columns: minmax(280px, 380px) 1fr;
  gap: 16px;
  align-items: start;
}
@media (max-width: 860px) {
  .termine-settings-grid {
    grid-template-columns: 1fr;
  }
}

</style>
