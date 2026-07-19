<template>
  <div class="page">

    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:22px;font-weight:800;margin:0">Automotive <span style="color:var(--accent)">Manager</span></h1>
        <p style="color:var(--text-muted);font-size:13px;margin:4px 0 0">Fahrzeuge, Probefahrten, Werkstatt & TÜV-Tracking</p>
      </div>
      <div style="display:flex;gap:8px">
        <button class="icon-btn" title="Preisschild-Vorlagen" @click="navigateTo('/automotive/pricetag-design')"><i class="ti ti-id-badge-2"></i></button>
        <button class="icon-btn" title="Marktplatz-Einstellungen" @click="openSettings"><i class="ti ti-settings"></i></button>
        <a href="https://www.mobile.de" target="_blank" style="text-decoration:none">
          <button class="icon-btn" title="mobile.de öffnen"><i class="ti ti-external-link"></i></button>
        </a>
        <button class="accent-btn" @click="openNewVehicle">
          <i class="ti ti-plus"></i> Fahrzeug anlegen
        </button>
      </div>
    </div>

    <!-- SETTINGS MODAL -->
    <div v-if="showSettingsModal" class="modal-overlay" @click.self="showSettingsModal=false">
      <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;padding:24px;width:100%;max-width:460px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <div style="font-size:16px;font-weight:700">Marktplatz-Einstellungen</div>
          <button class="icon-btn" @click="showSettingsModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:20px">
          API-Keys für den automatischen Abgleich deiner Fahrzeuge mit Online-Börsen.
        </div>
        <div class="auth-field" style="margin-bottom:14px">
          <label>mobile.de API-Key</label>
          <input v-model="settingsForm.mobileDeApiKey" type="password" placeholder="API-Key einfügen..." />
        </div>
        <div class="auth-field" style="margin-bottom:20px">
          <label>AutoScout24 API-Key</label>
          <input v-model="settingsForm.autoscout24ApiKey" type="password" placeholder="API-Key einfügen..." />
        </div>

        <div style="border-top:0.5px solid var(--border);margin:0 0 20px;padding-top:20px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div style="font-size:13px;font-weight:700"><i class="ti ti-world" style="margin-right:6px;color:var(--accent)"></i>Fahrzeug-Seite auf der Webseite</div>
            <button @click="settingsForm.vehiclesEnabled = !settingsForm.vehiclesEnabled"
              style="width:42px;height:24px;border-radius:12px;border:none;cursor:pointer;transition:all .2s;position:relative;flex-shrink:0"
              :style="settingsForm.vehiclesEnabled ? 'background:var(--accent)' : 'background:var(--border)'">
              <span style="position:absolute;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .2s"
                :style="settingsForm.vehiclesEnabled ? 'left:21px' : 'left:3px'"></span>
            </button>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">
            Zeigt deine verfügbaren Fahrzeuge öffentlich auf deiner Nexora-Webseite. Fahrzeuge mit Status "verfügbar" erscheinen automatisch dort.
          </div>
          <div class="auth-field" v-if="settingsForm.vehiclesEnabled">
            <label>Seitentitel (Navigation & Überschrift)</label>
            <input v-model="settingsForm.vehiclesTitle" placeholder="Fahrzeuge" />
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

    <!-- PREISSCHILD-VORLAGE WÄHLEN -->
    <div v-if="showPriceTagPicker" class="modal-overlay" @click.self="showPriceTagPicker=false">
      <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;padding:24px;width:100%;max-width:380px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <div style="font-size:15px;font-weight:700">Vorlage wählen</div>
          <button class="icon-btn" @click="showPriceTagPicker=false"><i class="ti ti-x"></i></button>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <button v-for="t in pricetagTemplates" :key="t.templateId" class="theme-opt" style="text-align:left;justify-content:flex-start"
            @click="openPriceTagPdf(t.templateId)">
            <i class="ti ti-id-badge-2"></i> {{ t.name }}
          </button>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-grid" style="margin-bottom:20px">
      <div class="stat-card">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:40px;height:40px;border-radius:10px;background:var(--accent)22;display:flex;align-items:center;justify-content:center">
            <i class="ti ti-car" style="color:var(--accent);font-size:20px"></i>
          </div>
          <div>
            <div style="font-size:22px;font-weight:800">{{ vehicles.length }}</div>
            <div style="font-size:12px;color:var(--text-muted)">Fahrzeuge gesamt</div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:40px;height:40px;border-radius:10px;background:#22c55e22;display:flex;align-items:center;justify-content:center">
            <i class="ti ti-circle-check" style="color:#22c55e;font-size:20px"></i>
          </div>
          <div>
            <div style="font-size:22px;font-weight:800">{{ vehicles.filter(v => v.status === 'verfügbar').length }}</div>
            <div style="font-size:12px;color:var(--text-muted)">Verfügbar</div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:40px;height:40px;border-radius:10px;background:#f59e0b22;display:flex;align-items:center;justify-content:center">
            <i class="ti ti-tool" style="color:#f59e0b;font-size:20px"></i>
          </div>
          <div>
            <div style="font-size:22px;font-weight:800">{{ workshopOrders.filter(o => o.status === 'offen' || o.status === 'in Arbeit').length }}</div>
            <div style="font-size:12px;color:var(--text-muted)">Offene Aufträge</div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:40px;height:40px;border-radius:10px;background:#ef444422;display:flex;align-items:center;justify-content:center">
            <i class="ti ti-alert-triangle" style="color:#ef4444;font-size:20px"></i>
          </div>
          <div>
            <div style="font-size:22px;font-weight:800">{{ tuevAlerts.length }}</div>
            <div style="font-size:12px;color:var(--text-muted)">TÜV fällig (60 Tage)</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
      <button v-for="tab in tabs" :key="tab.key" class="theme-opt" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
        <i class="ti" :class="tab.icon"></i> {{ tab.label }}
        <span v-if="tabBadge(tab.key)" style="margin-left:6px;font-size:10px;background:var(--accent);color:#fff;padding:1px 6px;border-radius:20px">{{ tabBadge(tab.key) }}</span>
      </button>
    </div>

    <!-- ── TAB: FAHRZEUGE ── -->
    <div v-if="activeTab === 'fahrzeuge'">
      <div v-if="loadingVehicles" style="display:flex;justify-content:center;padding:60px;color:var(--text-muted)">
        <i class="ti ti-loader-2 spin" style="font-size:28px"></i>
      </div>
      <div v-else-if="!vehicles.length" style="text-align:center;padding:80px;color:var(--text-muted)">
        <i class="ti ti-car-off" style="font-size:48px;display:block;margin-bottom:12px;opacity:.3"></i>
        <p style="font-size:14px;margin-bottom:16px">Noch keine Fahrzeuge angelegt.</p>
        <button class="accent-btn" @click="openNewVehicle"><i class="ti ti-plus" style="margin-right:6px"></i>Erstes Fahrzeug anlegen</button>
      </div>
      <div v-else style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">
        <div v-for="v in vehicles" :key="v.vehicleId"
          style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;overflow:hidden;transition:border-color .15s;display:flex;flex-direction:column"
          @mouseenter="e => (e.currentTarget as HTMLElement).style.borderColor='var(--accent)'"
          @mouseleave="e => (e.currentTarget as HTMLElement).style.borderColor='var(--border)'">
          <div style="height:160px;background:var(--bg-elevated);display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative">
            <img v-if="v.imageUrl" :src="v.imageUrl" style="width:100%;height:100%;object-fit:cover" />
            <i v-else class="ti ti-car" style="font-size:48px;color:var(--text-muted);opacity:.2"></i>
            <span style="position:absolute;top:8px;left:8px;font-size:10px;padding:2px 8px;border-radius:20px;font-weight:700;letter-spacing:.05em;text-transform:uppercase"
              :style="statusStyle(v.status)">{{ v.status || 'unbekannt' }}</span>
            <span v-if="isTuevDue(v)" style="position:absolute;top:8px;right:8px;background:#ef4444;color:#fff;font-size:10px;padding:2px 8px;border-radius:20px;font-weight:700">
              ⚠ TÜV
            </span>
          </div>
          <div style="padding:14px;flex:1;display:flex;flex-direction:column">
            <div style="font-size:10px;color:var(--accent);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;font-weight:700">{{ v.make }} {{ v.model }}</div>
            <div style="font-weight:700;font-size:15px;margin-bottom:4px">{{ v.year }} · {{ v.variant || '' }}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">{{ formatKm(v.mileage) }} · {{ v.fuel || '—' }} · {{ v.transmission || '—' }}</div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:auto;padding-top:12px;border-top:0.5px solid var(--border)">
              <span style="font-weight:800;font-size:17px;color:var(--accent)">{{ formatPrice(v.price) }}</span>
              <div style="display:flex;gap:4px">
                <button @click="printPriceTag(v)" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px;padding:4px 6px;border-radius:6px;transition:background .15s,color .15s"
                  onmouseover="this.style.background='var(--bg-elevated)';this.style.color='var(--accent)'" onmouseout="this.style.background='none';this.style.color='var(--text-muted)'" title="Preisschild drucken">
                  <i class="ti ti-printer"></i>
                </button>
                <button @click="openEditVehicle(v)" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:16px;padding:4px 6px;border-radius:6px;transition:background .15s"
                  onmouseover="this.style.background='var(--bg-elevated)'" onmouseout="this.style.background='none'" title="Bearbeiten">
                  <i class="ti ti-edit"></i>
                </button>
                <button @click="deleteVehicle(v)" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:16px;padding:4px 6px;border-radius:6px;transition:background .15s"
                  onmouseover="this.style.background='rgba(239,68,68,.1)'" onmouseout="this.style.background='none'" title="Löschen">
                  <i class="ti ti-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── TAB: PROBEFAHRTEN ── -->
    <div v-else-if="activeTab === 'probefahrten'">
      <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
        <button class="accent-btn" @click="openNewTestDrive"><i class="ti ti-plus"></i> Probefahrt buchen</button>
      </div>
      <div v-if="!testDrives.length" style="text-align:center;padding:60px;color:var(--text-muted)">
        <i class="ti ti-steering-wheel" style="font-size:48px;display:block;margin-bottom:12px;opacity:.3"></i>
        <p>Noch keine Probefahrten eingetragen.</p>
      </div>
      <div v-else class="data-table">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="border-bottom:1px solid var(--border)">
              <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">Fahrzeug</th>
              <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">Kunde</th>
              <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">Datum</th>
              <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">Status</th>
              <th style="padding:10px 12px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="td in testDrives" :key="td.id" style="border-bottom:0.5px solid var(--border);transition:background .1s"
              onmouseover="this.style.background='var(--bg-elevated)'" onmouseout="this.style.background='transparent'">
              <td style="padding:12px;font-size:13px;font-weight:600;color:var(--text)">{{ td.vehicleName }}</td>
              <td style="padding:12px;font-size:13px;color:var(--text-muted)">{{ td.customerName }}</td>
              <td style="padding:12px;font-size:13px;color:var(--text-muted)">{{ formatDate(td.date) }}</td>
              <td style="padding:12px">
                <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:.05em"
                  :style="td.status === 'abgeschlossen' ? 'background:#22c55e22;color:#22c55e' : td.status === 'geplant' ? 'background:var(--accent)22;color:var(--accent)' : 'background:var(--border);color:var(--text-muted)'">
                  {{ td.status }}</span>
              </td>
              <td style="padding:12px;text-align:right">
                <button @click="deleteTestDrive(td)" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:14px;padding:4px 6px;border-radius:6px"
                  onmouseover="this.style.background='rgba(239,68,68,.1)'" onmouseout="this.style.background='none'">
                  <i class="ti ti-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── TAB: WERKSTATT ── -->
    <div v-else-if="activeTab === 'werkstatt'">
      <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
        <button class="accent-btn" @click="openNewOrder"><i class="ti ti-plus"></i> Auftrag anlegen</button>
      </div>
      <div v-if="!workshopOrders.length" style="text-align:center;padding:60px;color:var(--text-muted)">
        <i class="ti ti-tool" style="font-size:48px;display:block;margin-bottom:12px;opacity:.3"></i>
        <p>Noch keine Werkstatt-Aufträge.</p>
      </div>
      <div v-else class="data-table">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="border-bottom:1px solid var(--border)">
              <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">Auftrag</th>
              <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">Fahrzeug</th>
              <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">Kunde</th>
              <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">Status</th>
              <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">Kosten</th>
              <th style="padding:10px 12px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in workshopOrders" :key="o.orderId" style="border-bottom:0.5px solid var(--border);transition:background .1s"
              onmouseover="this.style.background='var(--bg-elevated)'" onmouseout="this.style.background='transparent'">
              <td style="padding:12px;font-size:13px;font-weight:600;color:var(--text)">{{ o.title }}</td>
              <td style="padding:12px;font-size:13px;color:var(--text-muted)">{{ o.vehicleName }}</td>
              <td style="padding:12px;font-size:13px;color:var(--text-muted)">{{ o.customerName }}</td>
              <td style="padding:12px">
                <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:.05em"
                  :style="orderStatusStyle(o.status)">{{ o.status }}</span>
              </td>
              <td style="padding:12px;font-size:13px;font-weight:700;color:var(--accent)">{{ o.cost ? `€ ${o.cost}` : '—' }}</td>
              <td style="padding:12px;text-align:right;display:flex;gap:4px;justify-content:flex-end">
                <button @click="openEditOrder(o)" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:14px;padding:4px 6px;border-radius:6px"
                  onmouseover="this.style.background='var(--bg-elevated)'" onmouseout="this.style.background='none'"><i class="ti ti-edit"></i></button>
                <button @click="deleteOrder(o)" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:14px;padding:4px 6px;border-radius:6px"
                  onmouseover="this.style.background='rgba(239,68,68,.1)'" onmouseout="this.style.background='none'"><i class="ti ti-trash"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── TAB: TÜV ── -->
    <div v-else-if="activeTab === 'tuev'">
      <div v-if="!vehicles.length" style="text-align:center;padding:60px;color:var(--text-muted)">
        <i class="ti ti-certificate" style="font-size:48px;display:block;margin-bottom:12px;opacity:.3"></i>
        <p>Keine Fahrzeuge vorhanden.</p>
      </div>
      <div v-else style="display:flex;flex-direction:column;gap:8px">
        <div v-for="v in vehiclesSortedByTuev" :key="v.vehicleId"
          style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:12px;padding:16px;display:flex;align-items:center;gap:16px;transition:border-color .15s"
          :style="isTuevDue(v) ? 'border-color:#ef444466' : issTuevSoon(v) ? 'border-color:#f59e0b66' : ''"
          @mouseenter="e => (e.currentTarget as HTMLElement).style.borderColor = isTuevDue(v) ? '#ef4444' : issTuevSoon(v) ? '#f59e0b' : 'var(--accent)'"
          @mouseleave="e => (e.currentTarget as HTMLElement).style.borderColor = isTuevDue(v) ? '#ef444466' : issTuevSoon(v) ? '#f59e0b66' : 'var(--border)'">
          <div style="width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0"
            :style="isTuevDue(v) ? 'background:#ef444422' : issTuevSoon(v) ? 'background:#f59e0b22' : 'background:#22c55e22'">
            <i class="ti ti-certificate" style="font-size:22px"
              :style="isTuevDue(v) ? 'color:#ef4444' : issTuevSoon(v) ? 'color:#f59e0b' : 'color:#22c55e'"></i>
          </div>
          <div style="flex:1">
            <div style="font-weight:700;font-size:14px">{{ v.make }} {{ v.model }} {{ v.year }}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px">{{ v.licensePlate || 'Kein Kennzeichen' }}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:13px;font-weight:700" :style="isTuevDue(v) ? 'color:#ef4444' : issTuevSoon(v) ? 'color:#f59e0b' : 'color:#22c55e'">
              {{ v.tuevDate ? formatDate(v.tuevDate) : 'Nicht eingetragen' }}
            </div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px">
              {{ v.tuevDate ? tuevDaysLeft(v.tuevDate) : '' }}
            </div>
          </div>
          <button @click="openEditVehicle(v)" class="icon-btn" style="flex-shrink:0"><i class="ti ti-edit"></i></button>
        </div>
      </div>
    </div>

    <!-- MODAL: Fahrzeug -->
    <div v-if="showVehicleModal" class="modal-overlay" @click.self="showVehicleModal=false">
      <div class="modal-card" style="max-width:680px">
        <div class="modal-header">
          <span class="card-title">{{ editingVehicleId ? 'Fahrzeug bearbeiten' : 'Fahrzeug anlegen' }}</span>
          <button class="icon-btn" @click="showVehicleModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="auth-field"><label>Marke *</label><input v-model="vForm.make" placeholder="VW, BMW, Mercedes..." /></div>
            <div class="auth-field"><label>Modell *</label><input v-model="vForm.model" placeholder="Golf, 3er, C-Klasse..." /></div>
            <div class="auth-field"><label>Variante</label><input v-model="vForm.variant" placeholder="GTI, xDrive, AMG..." /></div>
            <div class="auth-field"><label>Baujahr *</label><input v-model="vForm.year" type="number" placeholder="2022" /></div>
            <div class="auth-field"><label>Kilometerstand</label><input v-model="vForm.mileage" type="number" placeholder="45000" /></div>
            <div class="auth-field"><label>Kraftstoff</label>
              <select v-model="vForm.fuel" class="form-select">
                <option value="">— wählen —</option>
                <option>Benzin</option><option>Diesel</option><option>Elektro</option>
                <option>Hybrid</option><option>Plug-in Hybrid</option><option>LPG</option>
              </select>
            </div>
            <div class="auth-field"><label>Getriebe</label>
              <select v-model="vForm.transmission" class="form-select">
                <option value="">— wählen —</option>
                <option>Manuell</option><option>Automatik</option><option>DSG</option>
              </select>
            </div>
            <div class="auth-field"><label>Leistung (PS)</label><input v-model="vForm.power" type="number" placeholder="150" /></div>
            <div class="auth-field"><label>Preis (€) *</label><input v-model="vForm.price" type="number" placeholder="24900" /></div>
            <div class="auth-field"><label>Status</label>
              <select v-model="vForm.status" class="form-select">
                <option>verfügbar</option><option>reserviert</option><option>verkauft</option>
                <option>in Werkstatt</option><option>Probefahrt</option>
              </select>
            </div>
            <div class="auth-field"><label>Kennzeichen</label><input v-model="vForm.licensePlate" placeholder="MYK-PP 42" /></div>
            <div class="auth-field"><label>TÜV fällig</label><input v-model="vForm.tuevDate" type="date" /></div>
            <div class="auth-field" style="grid-column:span 2"><label>Farbe</label><input v-model="vForm.color" placeholder="Graphitgrau Metallic" /></div>
            <div class="auth-field" style="grid-column:span 2"><label>Bild-URL</label><input v-model="vForm.imageUrl" placeholder="https://..." /></div>
            <div class="auth-field" style="grid-column:span 2"><label>Beschreibung / Ausstattung</label>
              <textarea v-model="vForm.description" style="height:80px;resize:none;width:100%" class="form-select" placeholder="Navigationssystem, Sitzheizung, Rückfahrkamera..."></textarea>
            </div>
          </div>
        </div>
        <div style="padding:0 24px 24px">
          <button class="auth-btn" @click="saveVehicle" :disabled="savingVehicle || !vForm.make || !vForm.model || !vForm.year">
            <span v-if="savingVehicle"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else><i class="ti ti-device-floppy" style="margin-right:6px"></i>{{ editingVehicleId ? 'Speichern' : 'Fahrzeug anlegen' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: Probefahrt -->
    <div v-if="showTestDriveModal" class="modal-overlay" @click.self="showTestDriveModal=false">
      <div class="modal-card" style="max-width:500px">
        <div class="modal-header">
          <span class="card-title">Probefahrt buchen</span>
          <button class="icon-btn" @click="showTestDriveModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-field"><label>Fahrzeug *</label>
            <select v-model="tdForm.vehicleName" class="form-select">
              <option value="">— Fahrzeug wählen —</option>
              <option v-for="v in vehicles" :key="v.vehicleId" :value="`${v.make} ${v.model} ${v.year}`">{{ v.make }} {{ v.model }} {{ v.year }}</option>
            </select>
          </div>
          <div class="auth-field"><label>Kundenname *</label><input v-model="tdForm.customerName" placeholder="Max Mustermann" /></div>
          <div class="auth-field"><label>Telefon</label><input v-model="tdForm.phone" placeholder="+49 123 456789" /></div>
          <div class="auth-field"><label>Datum *</label><input v-model="tdForm.date" type="datetime-local" /></div>
          <div class="auth-field"><label>Status</label>
            <select v-model="tdForm.status" class="form-select">
              <option>geplant</option><option>abgeschlossen</option><option>storniert</option>
            </select>
          </div>
          <div class="auth-field"><label>Notiz</label>
            <textarea v-model="tdForm.notes" style="height:60px;resize:none;width:100%" class="form-select" placeholder="Besondere Wünsche..."></textarea>
          </div>
        </div>
        <div style="padding:0 24px 24px">
          <button class="auth-btn" @click="saveTestDrive" :disabled="!tdForm.vehicleName || !tdForm.customerName || !tdForm.date">
            <i class="ti ti-device-floppy" style="margin-right:6px"></i>Probefahrt speichern
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: Werkstatt-Auftrag -->
    <div v-if="showOrderModal" class="modal-overlay" @click.self="showOrderModal=false">
      <div class="modal-card" style="max-width:540px">
        <div class="modal-header">
          <span class="card-title">{{ editingOrderId ? 'Auftrag bearbeiten' : 'Werkstatt-Auftrag anlegen' }}</span>
          <button class="icon-btn" @click="showOrderModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-field"><label>Titel *</label><input v-model="oForm.title" placeholder="Inspektion, Ölwechsel, Reifenwechsel..." /></div>
          <div class="auth-field"><label>Fahrzeug</label>
            <select v-model="oForm.vehicleName" class="form-select">
              <option value="">— Fahrzeug wählen —</option>
              <option v-for="v in vehicles" :key="v.vehicleId" :value="`${v.make} ${v.model} ${v.year}`">{{ v.make }} {{ v.model }} {{ v.year }}</option>
            </select>
          </div>
          <div class="auth-field"><label>Kunde</label><input v-model="oForm.customerName" placeholder="Max Mustermann" /></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="auth-field"><label>Status</label>
              <select v-model="oForm.status" class="form-select">
                <option>offen</option><option>in Arbeit</option><option>abgeschlossen</option><option>storniert</option>
              </select>
            </div>
            <div class="auth-field"><label>Kosten (€)</label><input v-model="oForm.cost" type="number" placeholder="249" /></div>
          </div>
          <div class="auth-field"><label>Beschreibung</label>
            <textarea v-model="oForm.description" style="height:80px;resize:none;width:100%" class="form-select" placeholder="Durchgeführte Arbeiten..."></textarea>
          </div>
        </div>
        <div style="padding:0 24px 24px">
          <button class="auth-btn" @click="saveOrder" :disabled="!oForm.title">
            <i class="ti ti-device-floppy" style="margin-right:6px"></i>{{ editingOrderId ? 'Speichern' : 'Auftrag anlegen' }}
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
const activeTab    = ref('fahrzeuge')
const vehicles     = ref<any[]>([])
const workshopOrders = ref<any[]>([])
const testDrives   = ref<any[]>([])
const loadingVehicles = ref(true)

const tabs = [
  { key: 'fahrzeuge',    label: 'Fahrzeuge',    icon: 'ti-car' },
  { key: 'probefahrten', label: 'Probefahrten', icon: 'ti-steering-wheel' },
  { key: 'werkstatt',    label: 'Werkstatt',    icon: 'ti-tool' },
  { key: 'tuev',         label: 'TÜV-Tracker',  icon: 'ti-certificate' },
]

const showSettingsModal = ref(false)
const savingSettings    = ref(false)
const settingsForm = reactive({ mobileDeApiKey: '', autoscout24ApiKey: '', vehiclesEnabled: false, vehiclesTitle: 'Fahrzeuge' })

const pricetagTemplates = ref<any[]>([])
const showPriceTagPicker = ref(false)
const priceTagVehicleId = ref('')

async function loadPricetagTemplates() {
  try {
    const r = await $fetch<any>(useApiUrl('/api/automotive/pricetag-templates'), { headers: { 'x-user-email': userEmail.value, Authorization: `Bearer ${authToken.value}` } })
    pricetagTemplates.value = r?.templates || []
  } catch {}
}

function printPriceTag(v: any) {
  if (!pricetagTemplates.value.length) {
    if (confirm('Noch keine Preisschild-Vorlage angelegt. Jetzt eine erstellen?')) navigateTo('/automotive/pricetag-design')
    return
  }
  priceTagVehicleId.value = v.vehicleId
  if (pricetagTemplates.value.length === 1) {
    openPriceTagPdf(pricetagTemplates.value[0].templateId)
    return
  }
  showPriceTagPicker.value = true
}

async function openPriceTagPdf(templateId: string) {
  showPriceTagPicker.value = false
  const blob = await $fetch<Blob>(useApiUrl(`/api/automotive/${priceTagVehicleId.value}/pricetag?templateId=${templateId}`), {
    headers: { 'x-user-email': userEmail.value, Authorization: `Bearer ${authToken.value}` },
    responseType: 'blob',
  } as any)
  const blobUrl = URL.createObjectURL(blob as any)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = `Preisschild-${priceTagVehicleId.value.slice(0, 8)}.pdf`
  a.click()
  URL.revokeObjectURL(blobUrl)
}

async function openSettings() {
  showSettingsModal.value = true
  try {
    const res = await $fetch<any>(useApiUrl('/api/automotive/settings'), { headers: { 'x-user-email': userEmail.value, Authorization: `Bearer ${authToken.value}` } })
    Object.assign(settingsForm, res.settings)
  } catch {}
}

async function saveSettings() {
  savingSettings.value = true
  try {
    await $fetch(useApiUrl('/api/automotive/settings'), {
      method: 'PUT',
      headers: { 'x-user-email': userEmail.value, Authorization: `Bearer ${authToken.value}` },
      body: { ...settingsForm },
    })
    showSettingsModal.value = false
  } catch {
    alert('Fehler beim Speichern der API-Keys.')
  } finally {
    savingSettings.value = false
  }
}

// Vehicle form
const showVehicleModal  = ref(false)
const editingVehicleId  = ref('')
const savingVehicle     = ref(false)
const vForm = reactive({ make:'', model:'', variant:'', year:'', mileage:'', fuel:'', transmission:'', power:'', price:'', status:'verfügbar', licensePlate:'', tuevDate:'', color:'', imageUrl:'', description:'' })

// Test drive form
const showTestDriveModal = ref(false)
const tdForm = reactive({ vehicleName:'', customerName:'', phone:'', date:'', status:'geplant', notes:'' })

// Workshop order form
const showOrderModal   = ref(false)
const editingOrderId   = ref('')
const oForm = reactive({ title:'', vehicleName:'', customerName:'', status:'offen', cost:'', description:'' })

function tabBadge(key: string) {
  if (key === 'fahrzeuge') return vehicles.value.length || 0
  if (key === 'werkstatt') return workshopOrders.value.filter(o => o.status === 'offen' || o.status === 'in Arbeit').length || 0
  if (key === 'tuev') return tuevAlerts.value.length || 0
  return 0
}

const tuevAlerts = computed(() => vehicles.value.filter(v => isTuevDue(v) || issTuevSoon(v)))
const vehiclesSortedByTuev = computed(() => [...vehicles.value].sort((a, b) => {
  if (!a.tuevDate) return 1
  if (!b.tuevDate) return -1
  return new Date(a.tuevDate).getTime() - new Date(b.tuevDate).getTime()
}))

function isTuevDue(v: any) {
  if (!v.tuevDate) return false
  return new Date(v.tuevDate) < new Date()
}
function issTuevSoon(v: any) {
  if (!v.tuevDate) return false
  const d = new Date(v.tuevDate)
  const diff = (d.getTime() - Date.now()) / 86400000
  return diff >= 0 && diff <= 60
}
function tuevDaysLeft(date: string) {
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
  if (diff < 0) return `Überfällig seit ${Math.abs(diff)} Tagen`
  if (diff === 0) return 'Heute fällig!'
  return `Noch ${diff} Tage`
}

function formatKm(km?: number) { return km ? `${km.toLocaleString('de-DE')} km` : '—' }
function formatPrice(p?: number) { return p ? `€ ${p.toLocaleString('de-DE')}` : '—' }
function formatDate(d?: string) { if (!d) return ''; return new Date(d).toLocaleDateString('de-DE', { day:'2-digit', month:'short', year:'numeric' }) }

function statusStyle(s?: string) {
  if (s === 'verfügbar')    return 'background:#22c55e22;color:#22c55e;border:1px solid #22c55e44'
  if (s === 'reserviert')   return 'background:#f59e0b22;color:#f59e0b;border:1px solid #f59e0b44'
  if (s === 'verkauft')     return 'background:#64748b22;color:#64748b;border:1px solid #64748b44'
  if (s === 'in Werkstatt') return 'background:#6366f122;color:#6366f1;border:1px solid #6366f144'
  return 'background:var(--border);color:var(--text-muted)'
}
function orderStatusStyle(s?: string) {
  if (s === 'abgeschlossen') return 'background:#22c55e22;color:#22c55e'
  if (s === 'in Arbeit')     return 'background:var(--accent)22;color:var(--accent)'
  if (s === 'storniert')     return 'background:#ef444422;color:#ef4444'
  return 'background:var(--border);color:var(--text-muted)'
}

function resetVehicleForm() {
  Object.assign(vForm, { make:'', model:'', variant:'', year:'', mileage:'', fuel:'', transmission:'', power:'', price:'', status:'verfügbar', licensePlate:'', tuevDate:'', color:'', imageUrl:'', description:'' })
  editingVehicleId.value = ''
}
function openNewVehicle() { resetVehicleForm(); showVehicleModal.value = true }
function openEditVehicle(v: any) {
  Object.assign(vForm, { make:v.make||'', model:v.model||'', variant:v.variant||'', year:v.year||'', mileage:v.mileage||'', fuel:v.fuel||'', transmission:v.transmission||'', power:v.power||'', price:v.price||'', status:v.status||'verfügbar', licensePlate:v.licensePlate||'', tuevDate:v.tuevDate||'', color:v.color||'', imageUrl:v.imageUrl||'', description:v.description||'' })
  editingVehicleId.value = v.vehicleId
  showVehicleModal.value = true
}

function openNewTestDrive() { Object.assign(tdForm, { vehicleName:'', customerName:'', phone:'', date:'', status:'geplant', notes:'' }); showTestDriveModal.value = true }
function openNewOrder()     { Object.assign(oForm, { title:'', vehicleName:'', customerName:'', status:'offen', cost:'', description:'' }); editingOrderId.value = ''; showOrderModal.value = true }
function openEditOrder(o: any) { Object.assign(oForm, { title:o.title||'', vehicleName:o.vehicleName||'', customerName:o.customerName||'', status:o.status||'offen', cost:o.cost||'', description:o.description||'' }); editingOrderId.value = o.orderId; showOrderModal.value = true }

async function loadVehicles() {
  loadingVehicles.value = true
  try { const r = await $fetch<any>(useApiUrl('/api/automotive'), { headers:{ 'x-user-email': userEmail.value, Authorization: `Bearer ${authToken.value}` } }); vehicles.value = r.vehicles || [] } catch {}
  loadingVehicles.value = false
}
async function loadWorkshop() {
  try { const r = await $fetch<any>(useApiUrl('/api/workshop'), { headers:{ 'x-user-email': userEmail.value, Authorization: `Bearer ${authToken.value}` } }); workshopOrders.value = r.orders || [] } catch {}
}

async function saveVehicle() {
  savingVehicle.value = true
  try {
    if (editingVehicleId.value) {
      await $fetch(useApiUrl(`/api/automotive/${editingVehicleId.value}`), { method:'PUT', headers:{ 'x-user-email': userEmail.value, Authorization: `Bearer ${authToken.value}` }, body: { ...vForm } })
    } else {
      await $fetch(useApiUrl('/api/automotive'), { method:'POST', headers:{ 'x-user-email': userEmail.value, Authorization: `Bearer ${authToken.value}` }, body: { ...vForm } })
    }
    showVehicleModal.value = false
    await loadVehicles()
  } catch {}
  savingVehicle.value = false
}

async function deleteVehicle(v: any) {
  if (!confirm(`${v.make} ${v.model} wirklich löschen?`)) return
  await $fetch(useApiUrl(`/api/automotive/${v.vehicleId}`), { method:'DELETE', headers:{ 'x-user-email': userEmail.value, Authorization: `Bearer ${authToken.value}` } })
  await loadVehicles()
}

async function saveTestDrive() {
  testDrives.value.push({ id: Date.now().toString(), ...tdForm })
  showTestDriveModal.value = false
}
async function deleteTestDrive(td: any) {
  testDrives.value = testDrives.value.filter(t => t.id !== td.id)
}

async function saveOrder() {
  try {
    if (editingOrderId.value) {
      await $fetch(useApiUrl(`/api/workshop/${editingOrderId.value}`), { method:'PUT', headers:{ 'x-user-email': userEmail.value, Authorization: `Bearer ${authToken.value}` }, body: { ...oForm } })
    } else {
      await $fetch(useApiUrl('/api/workshop'), { method:'POST', headers:{ 'x-user-email': userEmail.value, Authorization: `Bearer ${authToken.value}` }, body: { ...oForm } })
    }
    showOrderModal.value = false
    await loadWorkshop()
  } catch {}
}
async function deleteOrder(o: any) {
  if (!confirm('Auftrag löschen?')) return
  await $fetch(useApiUrl(`/api/workshop/${o.orderId}`), { method:'DELETE', headers:{ 'x-user-email': userEmail.value, Authorization: `Bearer ${authToken.value}` } })
  await loadWorkshop()
}

onMounted(async () => {
  const { useAuthUser } = await import('~/composables/useAuth')
  const u = await useAuthUser()
  userEmail.value = u.email || ''
  authToken.value = u.idToken || ''
  await Promise.all([loadVehicles(), loadWorkshop(), loadPricetagTemplates()])
})
</script>
