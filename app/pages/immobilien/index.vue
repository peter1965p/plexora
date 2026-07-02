<template>
  <div class="page">

    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:22px;font-weight:800;margin:0">Immobilien <span style="color:var(--accent)">Manager</span></h1>
        <p style="color:var(--text-muted);font-size:13px;margin:4px 0 0">Objekte, Besichtigungen, Mieter & Nebenkosten</p>
      </div>
      <div style="display:flex;gap:8px">
        <button class="icon-btn" title="Webseiten-Einstellungen" @click="openSettings"><i class="ti ti-settings"></i></button>
        <button v-if="activeTab === 'objekte'" class="accent-btn" @click="openNewProperty"><i class="ti ti-plus"></i> Objekt anlegen</button>
        <button v-else-if="activeTab === 'besichtigungen'" class="accent-btn" @click="openNewViewing"><i class="ti ti-plus"></i> Besichtigung planen</button>
        <button v-else-if="activeTab === 'mieter'" class="accent-btn" @click="openNewRenter"><i class="ti ti-plus"></i> Mieter anlegen</button>
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
          Zeigt deine freien Objekte öffentlich auf deiner Nexora-Webseite an.
        </div>
        <div style="border-top:0.5px solid var(--border);margin:0 0 20px;padding-top:20px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div style="font-size:13px;font-weight:700"><i class="ti ti-world" style="margin-right:6px;color:var(--accent)"></i>Objekt-Seite</div>
            <button @click="settingsForm.propertiesEnabled = !settingsForm.propertiesEnabled"
              style="width:42px;height:24px;border-radius:12px;border:none;cursor:pointer;transition:all .2s;position:relative;flex-shrink:0"
              :style="settingsForm.propertiesEnabled ? 'background:var(--accent)' : 'background:var(--border)'">
              <span style="position:absolute;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .2s"
                :style="settingsForm.propertiesEnabled ? 'left:21px' : 'left:3px'"></span>
            </button>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">
            Objekte mit Status "frei" erscheinen automatisch mit Kaltmiete, Nebenkosten und Warmmiete getrennt ausgewiesen — praktisch für Anfragen vom Amt.
          </div>
          <div class="auth-field" v-if="settingsForm.propertiesEnabled">
            <label>Seitentitel (Navigation & Überschrift)</label>
            <input v-model="settingsForm.propertiesTitle" placeholder="Immobilien" />
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
            <i class="ti ti-building-estate" style="color:var(--accent);font-size:20px"></i>
          </div>
          <div>
            <div style="font-size:22px;font-weight:800">{{ properties.length }}</div>
            <div style="font-size:12px;color:var(--text-muted)">Objekte gesamt</div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:40px;height:40px;border-radius:10px;background:#22c55e22;display:flex;align-items:center;justify-content:center">
            <i class="ti ti-key" style="color:#22c55e;font-size:20px"></i>
          </div>
          <div>
            <div style="font-size:22px;font-weight:800">{{ properties.filter(p => p.status === 'frei').length }}</div>
            <div style="font-size:12px;color:var(--text-muted)">Frei</div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:40px;height:40px;border-radius:10px;background:#3b82f622;display:flex;align-items:center;justify-content:center">
            <i class="ti ti-calendar-event" style="color:#3b82f6;font-size:20px"></i>
          </div>
          <div>
            <div style="font-size:22px;font-weight:800">{{ viewings.filter(v => v.status === 'geplant').length }}</div>
            <div style="font-size:12px;color:var(--text-muted)">Besichtigungen geplant</div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:40px;height:40px;border-radius:10px;background:#f59e0b22;display:flex;align-items:center;justify-content:center">
            <i class="ti ti-file-invoice" style="color:#f59e0b;font-size:20px"></i>
          </div>
          <div>
            <div style="font-size:22px;font-weight:800">{{ renters.filter(r => r.utilityStatus !== 'abgerechnet').length }}</div>
            <div style="font-size:12px;color:var(--text-muted)">Nebenkosten offen</div>
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

    <!-- ── TAB: OBJEKTE ── -->
    <div v-if="activeTab === 'objekte'">
      <div v-if="loadingProperties" style="display:flex;justify-content:center;padding:60px;color:var(--text-muted)">
        <i class="ti ti-loader-2 spin" style="font-size:28px"></i>
      </div>
      <div v-else-if="!properties.length" style="text-align:center;padding:80px;color:var(--text-muted)">
        <i class="ti ti-building-off" style="font-size:48px;display:block;margin-bottom:12px;opacity:.3"></i>
        <p style="font-size:14px;margin-bottom:16px">Noch keine Objekte angelegt.</p>
        <button class="accent-btn" @click="openNewProperty"><i class="ti ti-plus" style="margin-right:6px"></i>Erstes Objekt anlegen</button>
      </div>
      <div v-else style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">
        <div v-for="p in properties" :key="p.propertyId"
          style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;overflow:hidden;transition:border-color .15s;display:flex;flex-direction:column"
          @mouseenter="e => (e.currentTarget as HTMLElement).style.borderColor='var(--accent)'"
          @mouseleave="e => (e.currentTarget as HTMLElement).style.borderColor='var(--border)'">
          <div style="height:160px;background:var(--bg-elevated);display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative">
            <img v-if="p.imageUrl" :src="p.imageUrl" style="width:100%;height:100%;object-fit:cover" />
            <i v-else class="ti ti-building-estate" style="font-size:48px;color:var(--text-muted);opacity:.2"></i>
            <span style="position:absolute;top:8px;left:8px;font-size:10px;padding:2px 8px;border-radius:20px;font-weight:700;letter-spacing:.05em;text-transform:uppercase" :style="propertyStatusStyle(p.status)">{{ p.status || 'unbekannt' }}</span>
            <span style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,.6);color:#fff;font-size:10px;padding:2px 8px;border-radius:20px;font-weight:600">{{ p.type }}</span>
          </div>
          <div style="padding:14px;flex:1;display:flex;flex-direction:column">
            <div style="font-size:10px;color:var(--accent);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;font-weight:700">{{ p.street }}</div>
            <div style="font-weight:700;font-size:15px;margin-bottom:4px">{{ p.zipCity }}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">{{ p.size ? p.size + ' m²' : '—' }} · {{ p.rooms ? p.rooms + ' Zimmer' : '—' }}</div>

            <div v-if="p.priceType === 'miete'" style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:10px;padding:10px 12px;margin-top:auto;display:flex;flex-direction:column;gap:3px">
              <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted)"><span>Kaltmiete</span><span>{{ formatEuro(p.kaltmiete) }}</span></div>
              <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted)"><span>Nebenkosten</span><span>{{ formatEuro(p.nebenkosten) }}</span></div>
              <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:800;color:var(--accent);border-top:0.5px solid var(--border);margin-top:3px;padding-top:5px"><span>Warmmiete</span><span>{{ formatEuro(warmmiete(p)) }}</span></div>
            </div>
            <div v-else style="margin-top:auto;padding-top:12px;border-top:0.5px solid var(--border)">
              <span style="font-weight:800;font-size:17px;color:var(--accent)">{{ formatEuro(p.kaufpreis) }}</span>
              <span style="font-size:11px;color:var(--text-muted)"> Kaufpreis</span>
            </div>

            <div style="display:flex;gap:4px;justify-content:flex-end;margin-top:10px">
              <button @click="openEditProperty(p)" class="icon-btn" title="Bearbeiten"><i class="ti ti-edit"></i></button>
              <button @click="deleteProperty(p)" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:16px;padding:4px 6px;border-radius:6px;transition:background .15s"
                onmouseover="this.style.background='rgba(239,68,68,.1)'" onmouseout="this.style.background='none'" title="Löschen"><i class="ti ti-trash"></i></button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── TAB: BESICHTIGUNGEN ── -->
    <div v-else-if="activeTab === 'besichtigungen'">
      <div v-if="!viewings.length" style="text-align:center;padding:60px;color:var(--text-muted)">
        <i class="ti ti-calendar-off" style="font-size:48px;display:block;margin-bottom:12px;opacity:.3"></i>
        <p>Noch keine Besichtigungen eingetragen.</p>
      </div>
      <div v-else class="data-table">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="border-bottom:1px solid var(--border)">
              <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">Objekt</th>
              <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">Interessent</th>
              <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">Termin</th>
              <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">Status</th>
              <th style="padding:10px 12px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in viewings" :key="v.viewingId" style="border-bottom:0.5px solid var(--border);transition:background .1s"
              onmouseover="this.style.background='var(--bg-elevated)'" onmouseout="this.style.background='transparent'">
              <td style="padding:12px;font-size:13px;font-weight:600;color:var(--text)">{{ v.propertyName }}</td>
              <td style="padding:12px;font-size:13px;color:var(--text-muted)">{{ v.customerName }}</td>
              <td style="padding:12px;font-size:13px;color:var(--text-muted)">{{ formatDate(v.date) }}</td>
              <td style="padding:12px">
                <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:.05em"
                  :style="v.status === 'abgeschlossen' ? 'background:#22c55e22;color:#22c55e' : v.status === 'geplant' ? 'background:var(--accent)22;color:var(--accent)' : 'background:var(--border);color:var(--text-muted)'">{{ v.status }}</span>
              </td>
              <td style="padding:12px;text-align:right;display:flex;gap:4px;justify-content:flex-end">
                <button @click="openEditViewing(v)" class="icon-btn" title="Bearbeiten"><i class="ti ti-edit"></i></button>
                <button @click="deleteViewing(v)" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:14px;padding:4px 6px;border-radius:6px"
                  onmouseover="this.style.background='rgba(239,68,68,.1)'" onmouseout="this.style.background='none'"><i class="ti ti-trash"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── TAB: MIETER ── -->
    <div v-else-if="activeTab === 'mieter'">
      <div v-if="!renters.length" style="text-align:center;padding:60px;color:var(--text-muted)">
        <i class="ti ti-users" style="font-size:48px;display:block;margin-bottom:12px;opacity:.3"></i>
        <p>Noch keine Mieter angelegt.</p>
      </div>
      <div v-else class="data-table">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="border-bottom:1px solid var(--border)">
              <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">Mieter</th>
              <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">Objekt</th>
              <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">Kaltmiete</th>
              <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">Nebenkosten</th>
              <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">Warmmiete</th>
              <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">NK-Status</th>
              <th style="padding:10px 12px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in renters" :key="r.renterId" style="border-bottom:0.5px solid var(--border);transition:background .1s"
              onmouseover="this.style.background='var(--bg-elevated)'" onmouseout="this.style.background='transparent'">
              <td style="padding:12px;font-size:13px;font-weight:600;color:var(--text)">{{ r.name }}</td>
              <td style="padding:12px;font-size:13px;color:var(--text-muted)">{{ r.propertyName }}</td>
              <td style="padding:12px;font-size:13px;color:var(--text-muted)">{{ formatEuro(r.kaltmiete) }}</td>
              <td style="padding:12px;font-size:13px;color:var(--text-muted)">{{ formatEuro(r.nebenkosten) }}</td>
              <td style="padding:12px;font-size:13px;font-weight:700;color:var(--accent)">{{ formatEuro(renterWarmmiete(r)) }}</td>
              <td style="padding:12px">
                <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:.05em"
                  :style="r.utilityStatus === 'abgerechnet' ? 'background:#22c55e22;color:#22c55e' : 'background:#f59e0b22;color:#f59e0b'">{{ r.utilityStatus === 'abgerechnet' ? 'Abgerechnet' : 'Offen' }}</span>
              </td>
              <td style="padding:12px;text-align:right;display:flex;gap:4px;justify-content:flex-end">
                <button @click="openEditRenter(r)" class="icon-btn" title="Bearbeiten"><i class="ti ti-edit"></i></button>
                <button @click="deleteRenter(r)" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:14px;padding:4px 6px;border-radius:6px"
                  onmouseover="this.style.background='rgba(239,68,68,.1)'" onmouseout="this.style.background='none'"><i class="ti ti-trash"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── TAB: NEBENKOSTEN ── -->
    <div v-else-if="activeTab === 'nebenkosten'">
      <div v-if="!renters.length" style="text-align:center;padding:60px;color:var(--text-muted)">
        <i class="ti ti-file-invoice" style="font-size:48px;display:block;margin-bottom:12px;opacity:.3"></i>
        <p style="font-size:14px;margin-bottom:16px">Noch keine Nebenkosten-Daten — lege zuerst einen Mieter mit Nebenkosten-Vorauszahlung an.</p>
        <button class="accent-btn" @click="openNewRenter"><i class="ti ti-plus" style="margin-right:6px"></i>Mieter anlegen</button>
      </div>
      <div v-else style="display:flex;flex-direction:column;gap:8px">
        <div v-for="r in rentersSortedByUtility" :key="r.renterId"
          style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:12px;padding:16px;display:flex;align-items:center;gap:16px;transition:border-color .15s"
          :style="r.utilityStatus !== 'abgerechnet' ? 'border-color:#f59e0b66' : ''">
          <div style="width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0"
            :style="r.utilityStatus === 'abgerechnet' ? 'background:#22c55e22' : 'background:#f59e0b22'">
            <i class="ti ti-file-invoice" style="font-size:22px" :style="r.utilityStatus === 'abgerechnet' ? 'color:#22c55e' : 'color:#f59e0b'"></i>
          </div>
          <div style="flex:1">
            <div style="font-weight:700;font-size:14px">{{ r.name }}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px">{{ r.propertyName || 'Kein Objekt zugeordnet' }}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:13px;font-weight:700">{{ formatEuro(r.nebenkosten) }} / Monat</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px">Vorauszahlung</div>
          </div>
          <button @click="toggleUtilityStatus(r)" class="icon-btn" style="flex-shrink:0" :title="r.utilityStatus === 'abgerechnet' ? 'Als offen markieren' : 'Als abgerechnet markieren'">
            <i class="ti" :class="r.utilityStatus === 'abgerechnet' ? 'ti-rotate' : 'ti-check'"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: Objekt -->
    <div v-if="showPropertyModal" class="modal-overlay" @click.self="showPropertyModal=false">
      <div class="modal-card" style="max-width:640px">
        <div class="modal-header">
          <span class="card-title">{{ editingPropertyId ? 'Objekt bearbeiten' : 'Objekt anlegen' }}</span>
          <button class="icon-btn" @click="showPropertyModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="auth-field" style="grid-column:span 2"><label>Straße & Hausnummer *</label><input v-model="pForm.street" placeholder="Musterstraße 12" /></div>
            <div class="auth-field"><label>PLZ & Ort *</label><input v-model="pForm.zipCity" placeholder="54534 Musterdorf" /></div>
            <div class="auth-field"><label>Typ</label>
              <select v-model="pForm.type" class="form-select">
                <option>Wohnung</option><option>Haus</option><option>Gewerbe</option><option>Grundstück</option>
              </select>
            </div>
            <div class="auth-field"><label>Größe (m²)</label><input v-model="pForm.size" type="number" placeholder="75" /></div>
            <div class="auth-field"><label>Zimmer</label><input v-model="pForm.rooms" type="number" placeholder="3" /></div>
            <div class="auth-field"><label>Status</label>
              <select v-model="pForm.status" class="form-select">
                <option>frei</option><option>vermietet</option><option>verkauft</option><option>reserviert</option>
              </select>
            </div>
            <div class="auth-field"><label>Angebotsart</label>
              <select v-model="pForm.priceType" class="form-select">
                <option value="miete">Miete</option><option value="kauf">Kauf</option>
              </select>
            </div>
            <template v-if="pForm.priceType === 'miete'">
              <div class="auth-field"><label>Kaltmiete (€) *</label><input v-model="pForm.kaltmiete" type="number" step="0.01" placeholder="650" /></div>
              <div class="auth-field"><label>Nebenkosten (€)</label><input v-model="pForm.nebenkosten" type="number" step="0.01" placeholder="180" /></div>
              <div class="auth-field" style="grid-column:span 2">
                <label>Warmmiete (automatisch berechnet)</label>
                <input :value="formatEuro((Number(pForm.kaltmiete)||0) + (Number(pForm.nebenkosten)||0))" disabled style="opacity:.7" />
              </div>
            </template>
            <div class="auth-field" v-else style="grid-column:span 2"><label>Kaufpreis (€) *</label><input v-model="pForm.kaufpreis" type="number" step="0.01" placeholder="285000" /></div>
            <div class="auth-field" style="grid-column:span 2"><label>Bild-URL</label><input v-model="pForm.imageUrl" placeholder="https://..." /></div>
            <div class="auth-field" style="grid-column:span 2"><label>Beschreibung</label>
              <textarea v-model="pForm.description" style="height:80px;resize:none;width:100%" class="form-select" placeholder="Balkon, EBK, Stellplatz..."></textarea>
            </div>
          </div>
        </div>
        <div style="padding:0 24px 24px">
          <button class="auth-btn" @click="saveProperty" :disabled="savingProperty || !pForm.street || !pForm.zipCity">
            <span v-if="savingProperty"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else><i class="ti ti-device-floppy" style="margin-right:6px"></i>{{ editingPropertyId ? 'Speichern' : 'Objekt anlegen' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: Besichtigung -->
    <div v-if="showViewingModal" class="modal-overlay" @click.self="showViewingModal=false">
      <div class="modal-card" style="max-width:500px">
        <div class="modal-header">
          <span class="card-title">Besichtigung planen</span>
          <button class="icon-btn" @click="showViewingModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-field"><label>Objekt *</label>
            <select v-model="vForm.propertyName" class="form-select">
              <option value="">— Objekt wählen —</option>
              <option v-for="p in properties" :key="p.propertyId" :value="`${p.street}, ${p.zipCity}`">{{ p.street }}, {{ p.zipCity }}</option>
            </select>
          </div>
          <div class="auth-field"><label>Interessent *</label><input v-model="vForm.customerName" placeholder="Max Mustermann" /></div>
          <div class="auth-field"><label>Telefon</label><input v-model="vForm.phone" placeholder="+49 123 456789" /></div>
          <div class="auth-field"><label>Termin *</label><input v-model="vForm.date" type="datetime-local" /></div>
          <div class="auth-field"><label>Status</label>
            <select v-model="vForm.status" class="form-select">
              <option>geplant</option><option>abgeschlossen</option><option>storniert</option>
            </select>
          </div>
        </div>
        <div style="padding:0 24px 24px">
          <button class="auth-btn" @click="saveViewing" :disabled="!vForm.propertyName || !vForm.customerName || !vForm.date">
            <i class="ti ti-device-floppy" style="margin-right:6px"></i>Besichtigung speichern
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: Mieter -->
    <div v-if="showRenterModal" class="modal-overlay" @click.self="showRenterModal=false">
      <div class="modal-card" style="max-width:520px">
        <div class="modal-header">
          <span class="card-title">{{ editingRenterId ? 'Mieter bearbeiten' : 'Mieter anlegen' }}</span>
          <button class="icon-btn" @click="showRenterModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-field"><label>Name *</label><input v-model="rForm.name" placeholder="Max Mustermann" /></div>
          <div class="auth-field"><label>Objekt</label>
            <select v-model="rForm.propertyName" class="form-select">
              <option value="">— Objekt wählen —</option>
              <option v-for="p in properties" :key="p.propertyId" :value="`${p.street}, ${p.zipCity}`">{{ p.street }}, {{ p.zipCity }}</option>
            </select>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="auth-field"><label>Telefon</label><input v-model="rForm.phone" placeholder="+49 123 456789" /></div>
            <div class="auth-field"><label>E-Mail</label><input v-model="rForm.email" placeholder="max@mail.de" /></div>
            <div class="auth-field"><label>Kaltmiete (€)</label><input v-model="rForm.kaltmiete" type="number" step="0.01" placeholder="650" /></div>
            <div class="auth-field"><label>Nebenkosten (€)</label><input v-model="rForm.nebenkosten" type="number" step="0.01" placeholder="180" /></div>
            <div class="auth-field"><label>Mietbeginn</label><input v-model="rForm.contractStart" type="date" /></div>
            <div class="auth-field"><label>Mietende</label><input v-model="rForm.contractEnd" type="date" /></div>
          </div>
          <div class="auth-field">
            <label>Nebenkosten-Status</label>
            <select v-model="rForm.utilityStatus" class="form-select">
              <option value="offen">Offen</option><option value="abgerechnet">Abgerechnet</option>
            </select>
          </div>
        </div>
        <div style="padding:0 24px 24px">
          <button class="auth-btn" @click="saveRenter" :disabled="!rForm.name">
            <i class="ti ti-device-floppy" style="margin-right:6px"></i>{{ editingRenterId ? 'Speichern' : 'Mieter anlegen' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const userEmail = ref('')
const userId = ref('demo-user')
const activeTab = ref('objekte')

const tabs = [
  { key: 'objekte',        label: 'Objekte',        icon: 'ti-building-estate' },
  { key: 'besichtigungen', label: 'Besichtigungen', icon: 'ti-calendar-event' },
  { key: 'mieter',         label: 'Mieter',         icon: 'ti-users' },
  { key: 'nebenkosten',    label: 'Nebenkosten',    icon: 'ti-file-invoice' },
]

interface Property {
  propertyId: string; street: string; zipCity: string; type: string; size: string | number; rooms: string | number
  status: string; priceType: string; kaltmiete: string | number; nebenkosten: string | number; kaufpreis: string | number
  imageUrl: string; description: string
}
interface Viewing { viewingId: string; propertyName: string; customerName: string; phone: string; date: string; status: string }
interface Renter {
  renterId: string; name: string; propertyName: string; phone: string; email: string
  kaltmiete: string | number; nebenkosten: string | number; contractStart: string; contractEnd: string; utilityStatus: string
}

const properties        = ref<Property[]>([])
const viewings           = ref<Viewing[]>([])
const renters            = ref<Renter[]>([])
const loadingProperties  = ref(true)

function warmmiete(p: Property) { return (Number(p.kaltmiete) || 0) + (Number(p.nebenkosten) || 0) }
function renterWarmmiete(r: Renter) { return (Number(r.kaltmiete) || 0) + (Number(r.nebenkosten) || 0) }

const rentersSortedByUtility = computed(() =>
  [...renters.value].sort((a, b) => (a.utilityStatus === 'abgerechnet' ? 1 : 0) - (b.utilityStatus === 'abgerechnet' ? 1 : 0))
)

function formatEuro(n: string | number) {
  const v = Number(n)
  if (!v && v !== 0) return '—'
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v)
}
function formatDate(d?: string) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function propertyStatusStyle(status: string) {
  if (status === 'frei') return 'background:#22c55e;color:#fff'
  if (status === 'vermietet' || status === 'verkauft') return 'background:var(--border);color:var(--text-muted)'
  if (status === 'reserviert') return 'background:#f59e0b;color:#fff'
  return 'background:var(--border);color:var(--text-muted)'
}

// ── Settings ──────────────────────────────────────────
const showSettingsModal = ref(false)
const savingSettings    = ref(false)
const settingsForm = reactive({ propertiesEnabled: false, propertiesTitle: 'Immobilien' })

async function openSettings() {
  showSettingsModal.value = true
  try {
    const res = await $fetch<any>(useApiUrl('/api/properties/settings'), { headers: { 'x-user-email': userEmail.value } })
    Object.assign(settingsForm, res.settings)
  } catch {}
}

async function saveSettings() {
  savingSettings.value = true
  try {
    await $fetch(useApiUrl('/api/properties/settings'), { method: 'PUT', headers: { 'x-user-email': userEmail.value }, body: { ...settingsForm } })
    showSettingsModal.value = false
  } catch { alert('Fehler beim Speichern.') } finally { savingSettings.value = false }
}

// ── Objekte ───────────────────────────────────────────
const showPropertyModal  = ref(false)
const editingPropertyId  = ref('')
const savingProperty     = ref(false)
const pForm = reactive({ street: '', zipCity: '', type: 'Wohnung', size: '', rooms: '', status: 'frei', priceType: 'miete', kaltmiete: '', nebenkosten: '', kaufpreis: '', imageUrl: '', description: '' })

function resetPropertyForm() {
  Object.assign(pForm, { street: '', zipCity: '', type: 'Wohnung', size: '', rooms: '', status: 'frei', priceType: 'miete', kaltmiete: '', nebenkosten: '', kaufpreis: '', imageUrl: '', description: '' })
  editingPropertyId.value = ''
}
function openNewProperty() { resetPropertyForm(); showPropertyModal.value = true }
function openEditProperty(p: Property) {
  Object.assign(pForm, { street: p.street, zipCity: p.zipCity, type: p.type || 'Wohnung', size: String(p.size||''), rooms: String(p.rooms||''), status: p.status || 'frei', priceType: p.priceType || 'miete', kaltmiete: String(p.kaltmiete||''), nebenkosten: String(p.nebenkosten||''), kaufpreis: String(p.kaufpreis||''), imageUrl: p.imageUrl || '', description: p.description || '' })
  editingPropertyId.value = p.propertyId
  showPropertyModal.value = true
}

async function loadProperties() {
  loadingProperties.value = true
  try {
    const res = await $fetch<{ properties: Property[] }>(useApiUrl('/api/properties'), { headers: { 'x-user-email': userEmail.value } })
    properties.value = res.properties || []
  } catch {}
  loadingProperties.value = false
}

async function saveProperty() {
  if (!pForm.street || !pForm.zipCity) return
  savingProperty.value = true
  try {
    if (editingPropertyId.value) {
      await $fetch(useApiUrl(`/api/properties/${editingPropertyId.value}`), { method: 'PUT', headers: { 'x-user-email': userEmail.value }, body: { ...pForm } })
    } else {
      await $fetch(useApiUrl('/api/properties'), { method: 'POST', headers: { 'x-user-email': userEmail.value }, body: { ...pForm } })
    }
    showPropertyModal.value = false
    await loadProperties()
  } catch {} finally { savingProperty.value = false }
}

async function deleteProperty(p: Property) {
  if (!confirm(`"${p.street}" wirklich löschen?`)) return
  await $fetch(useApiUrl(`/api/properties/${p.propertyId}`), { method: 'DELETE', headers: { 'x-user-email': userEmail.value } })
  await loadProperties()
}

// ── Besichtigungen ────────────────────────────────────
const showViewingModal = ref(false)
const editingViewingId = ref('')
const vForm = reactive({ propertyName: '', customerName: '', phone: '', date: '', status: 'geplant' })

function openNewViewing() {
  Object.assign(vForm, { propertyName: '', customerName: '', phone: '', date: '', status: 'geplant' })
  editingViewingId.value = ''
  showViewingModal.value = true
}
function openEditViewing(v: Viewing) {
  Object.assign(vForm, { propertyName: v.propertyName, customerName: v.customerName, phone: v.phone || '', date: v.date, status: v.status })
  editingViewingId.value = v.viewingId
  showViewingModal.value = true
}

async function loadViewings() {
  try {
    const res = await $fetch<{ viewings: Viewing[] }>(useApiUrl('/api/viewings'), { headers: { 'x-user-email': userEmail.value } })
    viewings.value = res.viewings || []
  } catch {}
}

async function saveViewing() {
  if (!vForm.propertyName || !vForm.customerName || !vForm.date) return
  try {
    if (editingViewingId.value) {
      await $fetch(useApiUrl(`/api/viewings/${editingViewingId.value}`), { method: 'PUT', headers: { 'x-user-email': userEmail.value }, body: { ...vForm } })
    } else {
      await $fetch(useApiUrl('/api/viewings'), { method: 'POST', headers: { 'x-user-email': userEmail.value }, body: { ...vForm } })
    }
    showViewingModal.value = false
    await loadViewings()
  } catch {}
}

async function deleteViewing(v: Viewing) {
  if (!confirm('Besichtigung wirklich löschen?')) return
  await $fetch(useApiUrl(`/api/viewings/${v.viewingId}`), { method: 'DELETE', headers: { 'x-user-email': userEmail.value } })
  await loadViewings()
}

// ── Mieter ────────────────────────────────────────────
const showRenterModal = ref(false)
const editingRenterId = ref('')
const rForm = reactive({ name: '', propertyName: '', phone: '', email: '', kaltmiete: '', nebenkosten: '', contractStart: '', contractEnd: '', utilityStatus: 'offen' })

function openNewRenter() {
  Object.assign(rForm, { name: '', propertyName: '', phone: '', email: '', kaltmiete: '', nebenkosten: '', contractStart: '', contractEnd: '', utilityStatus: 'offen' })
  editingRenterId.value = ''
  showRenterModal.value = true
}
function openEditRenter(r: Renter) {
  Object.assign(rForm, { name: r.name, propertyName: r.propertyName || '', phone: r.phone || '', email: r.email || '', kaltmiete: String(r.kaltmiete||''), nebenkosten: String(r.nebenkosten||''), contractStart: r.contractStart || '', contractEnd: r.contractEnd || '', utilityStatus: r.utilityStatus || 'offen' })
  editingRenterId.value = r.renterId
  showRenterModal.value = true
}

async function loadRenters() {
  try {
    const res = await $fetch<{ renters: Renter[] }>(useApiUrl('/api/renters'), { headers: { 'x-user-email': userEmail.value } })
    renters.value = res.renters || []
  } catch {}
}

async function saveRenter() {
  if (!rForm.name) return
  try {
    if (editingRenterId.value) {
      await $fetch(useApiUrl(`/api/renters/${editingRenterId.value}`), { method: 'PUT', headers: { 'x-user-email': userEmail.value }, body: { ...rForm } })
    } else {
      await $fetch(useApiUrl('/api/renters'), { method: 'POST', headers: { 'x-user-email': userEmail.value }, body: { ...rForm, userId: userId.value } })
    }
    showRenterModal.value = false
    await loadRenters()
  } catch {}
}

async function deleteRenter(r: Renter) {
  if (!confirm(`"${r.name}" wirklich löschen?`)) return
  await $fetch(useApiUrl(`/api/renters/${r.renterId}`), { method: 'DELETE', headers: { 'x-user-email': userEmail.value } })
  await loadRenters()
}

async function toggleUtilityStatus(r: Renter) {
  r.utilityStatus = r.utilityStatus === 'abgerechnet' ? 'offen' : 'abgerechnet'
  await $fetch(useApiUrl(`/api/renters/${r.renterId}`), { method: 'PUT', headers: { 'x-user-email': userEmail.value }, body: { utilityStatus: r.utilityStatus } })
}

onMounted(async () => {
  const { useAuthUser } = await import('~/composables/useAuth')
  const u = await useAuthUser()
  userEmail.value = u.email || ''
  userId.value = u.userId || 'demo-user'
  await Promise.all([loadProperties(), loadViewings(), loadRenters()])
})
</script>
