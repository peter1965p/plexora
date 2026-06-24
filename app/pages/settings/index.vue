<template>
  <div class="page">

    <!-- DEMO BANNER -->
    <div v-if="isDemo" style="background:linear-gradient(135deg,#f59e0b22,#f59e0b11);border:1px solid #f59e0b55;border-radius:10px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:10px">
      <i class="ti ti-lock" style="color:#f59e0b;font-size:18px"></i>
      <span style="color:#f59e0b;font-weight:600;font-size:13px">Demo-Modus — Einstellungen können nicht gespeichert werden</span>
    </div>

    <!-- TAB NAV -->
    <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
      <button v-for="t in tabs" :key="t.key" class="theme-opt" :class="{ active: tab === t.key }" @click="tab=t.key">
        <i class="ti" :class="t.icon"></i> {{ t.label }}
      </button>
    </div>

    <!-- BRANDING -->
    <div v-if="tab === 'branding'" class="card">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-building" style="margin-right:8px;color:var(--accent)"></i>Branding</span>
        <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" :disabled="isDemo || brandSaving" @click="saveBranding">
          <span v-if="brandSaving"><i class="ti ti-loader-2 spin"></i></span>
          <span v-else><i class="ti ti-device-floppy"></i> Speichern</span>
        </button>
      </div>
      <div class="card-body" style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start">
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="auth-field">
            <label>Logo (Upload)</label>
            <div style="display:flex;gap:10px;align-items:center">
              <img v-if="brand.logoUrl" :src="brand.logoUrl" style="height:40px;max-width:120px;object-fit:contain;border-radius:6px;border:0.5px solid var(--border)" />
              <label style="cursor:pointer">
                <input type="file" accept="image/*" style="display:none" @change="uploadLogo" :disabled="logoUploading" />
                <span class="accent-btn" style="height:28px;font-size:12px;padding:0 12px;display:inline-flex;align-items:center;gap:6px;pointer-events:none">
                  <i class="ti" :class="logoUploading ? 'ti-loader-2 spin' : 'ti-upload'"></i>
                  {{ logoUploading ? 'Lädt...' : brand.logoUrl ? 'Ändern' : 'Logo hochladen' }}
                </span>
              </label>
              <button v-if="brand.logoUrl" class="icon-btn" style="color:var(--danger)" @click="brand.logoUrl=''" title="Logo entfernen">
                <i class="ti ti-trash"></i>
              </button>
            </div>
          </div>
          <div class="auth-field">
            <label>Produktname</label>
            <input v-model="brand.brandName" placeholder="Plexora" />
          </div>
          <div class="auth-field">
            <label>Tagline (Landing Page)</label>
            <input v-model="brand.brandTagline" placeholder="Business Platform" />
          </div>
          <div class="auth-field">
            <label>Kundenportal Titel</label>
            <input v-model="brand.portalTitle" placeholder="Kundenportal" />
          </div>
        </div>
        <div style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:12px;padding:20px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px;text-transform:uppercase;letter-spacing:.05em">Vorschau</div>
          <div style="font-size:22px;font-weight:800;letter-spacing:-0.02em">
            {{ brandFirst }}<span style="color:var(--accent)">{{ brandLast }}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:8px">
            <span style="font-size:22px;font-weight:800;letter-spacing:-0.02em">
              {{ brandFirst }}<span style="color:var(--accent)">{{ brandLast }}</span>
            </span>
            <span style="font-size:10px;color:var(--accent);font-weight:600;text-transform:uppercase;letter-spacing:.05em">{{ brand.portalTitle }}</span>
          </div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">{{ brand.brandTagline }}</div>
        </div>
      </div>
    </div>

    <!-- UNTERNEHMEN -->
    <div v-if="tab === 'company'" class="card">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-building-bank" style="margin-right:8px;color:var(--accent)"></i>Unternehmensdaten</span>
        <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" :disabled="isDemo || companySaving" @click="saveCompany">
          <span v-if="companySaving"><i class="ti ti-loader-2 spin"></i></span>
          <span v-else><i class="ti ti-device-floppy"></i> Speichern</span>
        </button>
      </div>
      <div class="card-body" style="display:flex;flex-direction:column;gap:8px">
        <p style="font-size:12px;color:var(--text-muted);margin:0 0 8px">
          Diese Angaben werden auf der öffentlichen Impressum-Seite (/impressum) angezeigt.
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="auth-field">
            <label>Firma / Inhaber</label>
            <input v-model="company.legalName" placeholder="Päffgen IT" />
          </div>
          <div class="auth-field">
            <label>Vertreten durch</label>
            <input v-model="company.representedBy" placeholder="Peter Päffgen" />
          </div>
          <div class="auth-field">
            <label>Straße & Hausnummer</label>
            <input v-model="company.street" placeholder="Musterstraße 1" />
          </div>
          <div class="auth-field">
            <label>PLZ & Ort</label>
            <input v-model="company.zipCity" placeholder="54531 Manderscheid" />
          </div>
          <div class="auth-field">
            <label>Land</label>
            <input v-model="company.country" placeholder="Deutschland" />
          </div>
          <div class="auth-field">
            <label>USt-IdNr.</label>
            <input v-model="company.vatId" placeholder="DE123456789" />
          </div>
          <div class="auth-field">
            <label>E-Mail</label>
            <input v-model="company.email" placeholder="kontakt@paeffgen-it.de" />
          </div>
          <div class="auth-field">
            <label>Telefon</label>
            <input v-model="company.phone" placeholder="+49 123 456789" />
          </div>
          <div class="auth-field">
            <label>Handelsregister (optional)</label>
            <input v-model="company.register" placeholder="HRB 12345" />
          </div>
          <div class="auth-field">
            <label>Registergericht (optional)</label>
            <input v-model="company.registerCourt" placeholder="Amtsgericht Wittlich" />
          </div>
        </div>
      </div>
    </div>

    <!-- AGB -->
    <div v-if="tab === 'agb'" class="card">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-file-text" style="margin-right:8px;color:var(--accent)"></i>Allgemeine Geschäftsbedingungen</span>
        <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" :disabled="isDemo || agbSaving" @click="saveAgb">
          <span v-if="agbSaving"><i class="ti ti-loader-2 spin"></i></span>
          <span v-else><i class="ti ti-device-floppy"></i> Speichern</span>
        </button>
      </div>
      <div class="card-body">
        <p style="font-size:12px;color:var(--text-muted);margin:0 0 12px">
          Markdown-Editor — # für Überschriften, **fett** für Hervorhebungen. Der Inhalt wird auf der öffentlichen Seite /agb angezeigt.
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;height:600px">
          <textarea v-model="agb.content"
            style="width:100%;height:100%;background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:12px;padding:16px;color:var(--text-primary);font-family:'JetBrains Mono','Fira Code',monospace;font-size:13px;line-height:1.6;resize:none;outline:none"
            spellcheck="false"></textarea>
          <div class="agb-preview" style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:12px;padding:16px 24px;overflow-y:auto;font-size:14px;line-height:1.8" v-html="agbPreview"></div>
        </div>
      </div>
    </div>

    <!-- DARSTELLUNG -->
    <div v-if="tab === 'appearance'" class="card">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-palette" style="margin-right:8px;color:var(--accent)"></i>Theme</span>
        <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" :disabled="isDemo || appearanceSaving" @click="saveAppearance">
          <span v-if="appearanceSaving"><i class="ti ti-loader-2 spin"></i></span>
          <span v-else><i class="ti ti-device-floppy"></i> Speichern</span>
        </button>
      </div>
      <div class="card-body" style="display:flex;flex-direction:column;gap:24px">
        <p style="font-size:12px;color:var(--text-muted);margin:0">
          Gilt für Dashboard <strong style="color:var(--text-secondary)">und</strong> öffentliche Seiten — alles zieht am gleichen Strang.
        </p>

        <!-- Theme Grid -->
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px">
          <button
            v-for="(t, key) in THEMES" :key="key"
            @click="store.setTheme(key)"
            :style="`
              border: 1.5px solid ${store.theme === key ? t.accent : 'var(--border)'};
              border-radius: 14px;
              padding: 0;
              overflow: hidden;
              cursor: pointer;
              background: none;
              transition: all .15s;
              position: relative;
            `"
          >
            <!-- Preview -->
            <div :style="`background:${t.bg};height:56px;display:flex;gap:0`">
              <div :style="`width:36px;background:${t.surface};height:100%;border-right:1px solid rgba(255,255,255,0.06)`">
                <div :style="`margin:8px auto 0;width:20px;height:4px;border-radius:2px;background:${t.accent};opacity:0.9`"></div>
                <div style="margin:6px auto 0;width:20px;height:3px;border-radius:2px;background:rgba(255,255,255,0.15)"></div>
                <div style="margin:4px auto 0;width:20px;height:3px;border-radius:2px;background:rgba(255,255,255,0.1)"></div>
                <div style="margin:4px auto 0;width:20px;height:3px;border-radius:2px;background:rgba(255,255,255,0.08)"></div>
              </div>
              <div style="flex:1;padding:8px">
                <div style="height:3px;border-radius:2px;background:rgba(255,255,255,0.15);margin-bottom:5px"></div>
                <div style="height:3px;border-radius:2px;background:rgba(255,255,255,0.08);margin-bottom:5px;width:70%"></div>
                <div :style="`height:18px;border-radius:6px;background:${t.accent};margin-top:8px;width:50%;opacity:0.85`"></div>
              </div>
            </div>
            <!-- Label -->
            <div :style="`
              padding: 8px 10px;
              background: ${t.surface};
              border-top: 1px solid rgba(255,255,255,0.06);
              display: flex;
              align-items: center;
              justify-content: space-between;
            `">
              <span style="font-size:12px;font-weight:700;color:#fff">{{ t.name }}</span>
              <div v-if="store.theme === key" :style="`width:16px;height:16px;border-radius:50%;background:${t.accent};display:flex;align-items:center;justify-content:center`">
                <i class="ti ti-check" style="font-size:10px;color:#fff"></i>
              </div>
              <div :style="`width:12px;height:12px;border-radius:50%;background:${t.accent}`" v-else></div>
            </div>
          </button>
        </div>

        <!-- Eigene Akzentfarbe -->
        <div style="padding-top:16px;border-top:0.5px solid var(--border)">
          <div class="settings-label" style="margin-bottom:10px">Eigene Akzentfarbe (überschreibt Theme)</div>
          <div style="display:flex;align-items:center;gap:12px">
            <label style="cursor:pointer;position:relative">
              <div :style="`width:40px;height:40px;border-radius:10px;background:${store.accent};border:0.5px solid var(--border)`"></div>
              <input type="color" v-model="customAccent" @change="applyCustomAccent" style="position:absolute;inset:0;opacity:0;cursor:pointer" />
            </label>
            <code style="font-size:13px;color:var(--text-secondary);font-weight:600">{{ store.accent }}</code>
            <span style="font-size:11px;color:var(--text-muted)">— klick auf den Farbkreis zum Ändern</span>
          </div>
        </div>
      </div>
    </div>

    <!-- SICHERHEIT -->
    <div v-if="tab === 'security'" class="card">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-shield-lock" style="margin-right:8px;color:var(--accent)"></i>Sicherheit</span>
        <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" :disabled="isDemo || securitySaving" @click="saveSecurity">
          <span v-if="securitySaving"><i class="ti ti-loader-2 spin"></i></span>
          <span v-else><i class="ti ti-device-floppy"></i> Speichern</span>
        </button>
      </div>
      <div class="card-body" style="display:flex;flex-direction:column;gap:16px">
        <div>
          <div class="settings-label">Automatische Abmeldung nach Inaktivität</div>
          <p style="font-size:12px;color:var(--text-muted);margin:0 0 8px">
            Gilt für Dashboard und Kundenportal. 60 Sekunden vor Ablauf erscheint eine Warnung mit der Möglichkeit, angemeldet zu bleiben.
          </p>
          <select v-model.number="security.timeoutMinutes" class="form-select" style="max-width:240px">
            <option :value="5">5 Minuten</option>
            <option :value="15">15 Minuten</option>
            <option :value="30">30 Minuten</option>
            <option :value="60">60 Minuten</option>
            <option :value="0">Nie</option>
          </select>
        </div>
      </div>
    </div>

    <!-- RECHNUNGEN -->
    <div v-if="tab === 'invoices'" class="card">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-receipt" style="margin-right:8px;color:var(--accent)"></i>Rechnungseinstellungen</span>
        <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" :disabled="isDemo || invoiceSaving" @click="saveInvoiceSettings">
          <span v-if="invoiceSaving"><i class="ti ti-loader-2 spin"></i></span>
          <span v-else><i class="ti ti-device-floppy"></i> Speichern</span>
        </button>
      </div>
      <div class="card-body" style="display:flex;flex-direction:column;gap:20px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
          <div class="auth-field">
            <label>Standard-Fälligkeit (Tage nach Rechnungsdatum)</label>
            <input v-model.number="invoiceSettings.dueDays" type="number" min="1" max="90" placeholder="7" />
          </div>
          <div class="auth-field">
            <label>Zahlungsziel-Text auf Rechnung</label>
            <input v-model="invoiceSettings.dueText" placeholder="Zahlbar innerhalb von 7 Tagen netto" />
          </div>
        </div>
        <div style="border-top:0.5px solid var(--border);padding-top:20px">
          <div class="settings-label" style="margin-bottom:14px">🧾 Steuer & Preisanzeige</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">
            <div class="auth-field">
              <label>MwSt.-Satz (%)</label>
              <select v-model.number="invoiceSettings.vatRate" class="form-select">
                <option :value="19">19% (Standard)</option>
                <option :value="7">7% (ermäßigte)</option>
                <option :value="0">0% (steuerfrei)</option>
              </select>
            </div>
            <div class="auth-field">
              <label>Preisanzeige im Shop</label>
              <select v-model="invoiceSettings.priceDisplay" class="form-select">
                <option value="netto">Netto (zzgl. MwSt.)</option>
                <option value="brutto">Brutto (inkl. MwSt.)</option>
              </select>
            </div>
            <div class="auth-field">
              <label>Kleinunternehmer §19 UStG</label>
              <div style="display:flex;align-items:center;gap:10px;margin-top:10px">
                <div class="pill-toggle" :class="{ on: invoiceSettings.smallBusiness }"
                  @click="invoiceSettings.smallBusiness = !invoiceSettings.smallBusiness"
                  style="cursor:pointer"><div class="pill-thumb"></div></div>
                <span style="font-size:12px;color:var(--text-muted)">
                  {{ invoiceSettings.smallBusiness ? 'Aktiv — kein MwSt.-Ausweis' : 'Inaktiv' }}
                </span>
              </div>
            </div>
          </div>
          <div v-if="invoiceSettings.smallBusiness"
            style="margin-top:12px;padding:12px;background:rgba(var(--accent-rgb),0.08);border-radius:8px;font-size:12px;color:var(--text-muted)">
            ℹ️ Gemäß §19 UStG wird keine Umsatzsteuer berechnet und ausgewiesen.
          </div>
        </div>
      </div>
    </div>

    <!-- MAHNWESEN -->
    <div v-if="tab === 'dunning'">
      <div class="card" style="margin-bottom:14px">
        <div class="card-header">
          <span class="card-title"><i class="ti ti-alert-triangle" style="margin-right:8px;color:#E05C5C"></i>Mahnwesen</span>
          <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" :disabled="isDemo || dunningSaving" @click="saveDunningSettings">
            <span v-if="dunningSaving"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else><i class="ti ti-device-floppy"></i> Speichern</span>
          </button>
        </div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:20px">

          <!-- Stufe 1 -->
          <div style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:10px;padding:16px">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
              <span class="badge badge-info">Stufe 1</span>
              <span style="font-size:13px;font-weight:600">Freundliche Erinnerung</span>
              <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
                <span style="font-size:12px;color:var(--text-muted)">Aktiv</span>
                <div class="pill-toggle" :class="{ on: dunning.level1.active }" @click="dunning.level1.active=!dunning.level1.active" style="cursor:pointer"><div class="pill-thumb"></div></div>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
              <div class="auth-field"><label>Tage nach Fälligkeit</label><input v-model.number="dunning.level1.days" type="number" min="1" placeholder="5" /></div>
              <div class="auth-field"><label>Mahngebühr (€)</label><input v-model.number="dunning.level1.fee" type="number" min="0" placeholder="0" /></div>
            </div>
            <div class="auth-field">
              <label>Mahntext</label>
              <textarea v-model="dunning.level1.text" rows="3" style="background:var(--bg-base);border:0.5px solid var(--border);border-radius:8px;padding:10px 14px;font-size:13px;color:var(--text-primary);width:100%;outline:none;resize:vertical;font-family:inherit"></textarea>
            </div>
          </div>

          <!-- Stufe 2 -->
          <div style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:10px;padding:16px">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
              <span class="badge badge-warning">Stufe 2</span>
              <span style="font-size:13px;font-weight:600">Zweite Mahnung</span>
              <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
                <span style="font-size:12px;color:var(--text-muted)">Aktiv</span>
                <div class="pill-toggle" :class="{ on: dunning.level2.active }" @click="dunning.level2.active=!dunning.level2.active" style="cursor:pointer"><div class="pill-thumb"></div></div>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
              <div class="auth-field"><label>Tage nach Fälligkeit</label><input v-model.number="dunning.level2.days" type="number" min="1" placeholder="14" /></div>
              <div class="auth-field"><label>Mahngebühr (€)</label><input v-model.number="dunning.level2.fee" type="number" min="0" placeholder="15" /></div>
            </div>
            <div class="auth-field">
              <label>Mahntext</label>
              <textarea v-model="dunning.level2.text" rows="3" style="background:var(--bg-base);border:0.5px solid var(--border);border-radius:8px;padding:10px 14px;font-size:13px;color:var(--text-primary);width:100%;outline:none;resize:vertical;font-family:inherit"></textarea>
            </div>
          </div>

          <!-- Stufe 3 -->
          <div style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:10px;padding:16px">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
              <span class="badge badge-danger">Stufe 3</span>
              <span style="font-size:13px;font-weight:600">Letzte Mahnung</span>
              <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
                <span style="font-size:12px;color:var(--text-muted)">Aktiv</span>
                <div class="pill-toggle" :class="{ on: dunning.level3.active }" @click="dunning.level3.active=!dunning.level3.active" style="cursor:pointer"><div class="pill-thumb"></div></div>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">
              <div class="auth-field"><label>Tage nach Fälligkeit</label><input v-model.number="dunning.level3.days" type="number" min="1" placeholder="30" /></div>
              <div class="auth-field"><label>Mahngebühr (€)</label><input v-model.number="dunning.level3.fee" type="number" min="0" placeholder="40" /></div>
              <div class="auth-field">
                <label>Inkasso-Androhung</label>
                <div style="display:flex;align-items:center;gap:8px;margin-top:10px">
                  <div class="pill-toggle" :class="{ on: dunning.level3.inkasso }" @click="dunning.level3.inkasso=!dunning.level3.inkasso" style="cursor:pointer"><div class="pill-thumb"></div></div>
                  <span style="font-size:12px;color:var(--text-muted)">{{ dunning.level3.inkasso ? 'Aktiv' : 'Inaktiv' }}</span>
                </div>
              </div>
            </div>
            <div class="auth-field">
              <label>Mahntext</label>
              <textarea v-model="dunning.level3.text" rows="3" style="background:var(--bg-base);border:0.5px solid var(--border);border-radius:8px;padding:10px 14px;font-size:13px;color:var(--text-primary);width:100%;outline:none;resize:vertical;font-family:inherit"></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODULE / LIZENZ-CENTER -->
    <div v-if="tab === 'modules'">
      <div class="card" style="margin-bottom:14px">
        <div class="card-header">
          <span class="card-title"><i class="ti ti-puzzle" style="margin-right:8px;color:var(--accent)"></i>Lizenz-Center</span>
          <div style="display:flex;gap:8px;align-items:center">
            <span v-if="store.license" class="badge" :class="store.license.tier==='enterprise' ? 'badge-warning' : store.license.tier==='pro' ? 'badge-info' : 'badge-success'">
              <i class="ti ti-key" style="margin-right:4px"></i>
              {{ store.license.tier === 'enterprise' ? 'Enterprise' : store.license.tier === 'pro' ? 'Pro' : 'Starter' }}
            </span>
            <span v-else class="badge badge-danger"><i class="ti ti-key-off" style="margin-right:4px"></i>Keine Lizenz</span>
            <span style="font-size:12px;color:var(--text-muted)">{{ store.modules.filter(m => m.on && !m.locked).length }} / {{ store.modules.length }} aktiv</span>
            <button v-if="modulesDirty" class="accent-btn" style="height:28px;font-size:12px;padding:0 14px;background:#00C853;border-color:#00C853"
              :disabled="isDemo || modulesSaving" @click="saveModules">
              <span v-if="modulesSaving"><i class="ti ti-loader-2 spin"></i></span>
              <span v-else><i class="ti ti-device-floppy"></i> Speichern</span>
            </button>
          </div>
        </div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px">
            <div v-for="m in store.modules" :key="m.key"
              style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px;transition:border-color .15s;position:relative;overflow:hidden"
              :style="m.locked ? 'opacity:0.5' : m.on ? 'border-color:var(--accent)' : ''">

              <!-- Lock-Overlay -->
              <div v-if="m.locked" style="position:absolute;inset:0;background:rgba(0,0,0,0.18);border-radius:12px;display:flex;align-items:center;justify-content:center;z-index:2;gap:6px;font-size:12px;font-weight:700;color:var(--text-muted)">
                <i class="ti ti-lock" style="font-size:16px"></i> Nicht in deiner Lizenz
              </div>

              <div style="display:flex;align-items:center;gap:10px">
                <div style="width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center"
                  :style="m.on && !m.locked ? 'background:rgba(var(--accent-rgb),0.15)' : 'background:var(--bg-hover)'">
                  <i class="ti" :class="m.icon" :style="m.on && !m.locked ? 'color:var(--accent)' : 'color:var(--text-muted)'"></i>
                </div>
                <div style="flex:1">
                  <div style="font-weight:700;font-size:14px">{{ m.name }}</div>
                  <span class="badge" style="font-size:10px;margin-top:2px"
                    :class="m.plan === 'basic' ? 'badge-success' : m.plan === 'pro' ? 'badge-info' : 'badge-warning'">
                    {{ m.plan === 'basic' ? 'Basic' : m.plan === 'pro' ? 'Pro' : 'Enterprise' }}
                  </span>
                </div>
                <div class="pill-toggle" :class="{ on: m.on && !m.locked }"
                  @click="!m.locked && (store.toggleModule(m.key), modulesDirty=true)"
                  :style="m.locked ? 'cursor:not-allowed;opacity:0.4' : 'cursor:pointer'" style="flex-shrink:0">
                  <div class="pill-thumb"></div>
                </div>
              </div>
              <div style="font-size:12px;color:var(--text-muted);line-height:1.5">{{ m.desc }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- LIZENZEN -->
    <div v-if="tab === 'licenses'">

      <!-- Stats-Zeile -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
        <div class="stat-card" style="padding:16px">
          <div class="stat-label">Gesamt</div>
          <div class="stat-value">{{ licenses.length }}</div>
        </div>
        <div class="stat-card" style="padding:16px">
          <div class="stat-label" style="color:#00C853">Aktiv</div>
          <div class="stat-value" style="color:#00C853">{{ licenses.filter(l=>l.status==='active').length }}</div>
        </div>
        <div class="stat-card" style="padding:16px">
          <div class="stat-label">Pro</div>
          <div class="stat-value">{{ licenses.filter(l=>l.tier==='pro').length }}</div>
        </div>
        <div class="stat-card" style="padding:16px">
          <div class="stat-label">Enterprise</div>
          <div class="stat-value">{{ licenses.filter(l=>l.tier==='enterprise').length }}</div>
        </div>
      </div>

      <!-- Lizenz-Tabelle -->
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="ti ti-key" style="margin-right:8px;color:var(--accent)"></i>Ausgestellte Lizenzen</span>
          <div style="display:flex;gap:8px">
            <button class="icon-btn" @click="loadLicenses" :disabled="licLoading" title="Aktualisieren">
              <i class="ti" :class="licLoading ? 'ti-loader-2 spin' : 'ti-refresh'"></i>
            </button>
            <button class="accent-btn" style="height:32px;font-size:12px;padding:0 14px" @click="showCreateLic=true">
              <i class="ti ti-plus"></i> Neue Lizenz
            </button>
          </div>
        </div>
        <div class="card-body" style="padding:0">
          <div v-if="licLoading && !licenses.length" style="padding:32px;text-align:center;color:var(--text-muted)">
            <i class="ti ti-loader-2 spin" style="font-size:24px"></i>
          </div>
          <div v-else-if="!licenses.length" style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px">
            <i class="ti ti-key-off" style="font-size:32px;display:block;margin-bottom:8px"></i>
            Noch keine Lizenzen ausgestellt
          </div>
          <table v-else class="data-table">
            <thead>
              <tr>
                <th>Lizenz-Key</th>
                <th>E-Mail</th>
                <th>Tier</th>
                <th>Status</th>
                <th>Gültig bis</th>
                <th>Erstellt</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="lic in licenses" :key="lic.licenseKey">
                <td>
                  <div style="display:flex;align-items:center;gap:8px">
                    <code style="font-size:11px;font-weight:700;letter-spacing:1px;color:var(--accent)">{{ lic.licenseKey }}</code>
                    <button @click="copyKey(lic.licenseKey)" class="icon-btn" style="width:20px;height:20px;font-size:11px" title="Kopieren">
                      <i class="ti ti-copy"></i>
                    </button>
                  </div>
                </td>
                <td style="font-size:12px">{{ lic.customerEmail }}</td>
                <td>
                  <span class="badge" :class="lic.tier==='enterprise' ? 'badge-warning' : lic.tier==='pro' ? 'badge-info' : 'badge-success'">
                    {{ lic.tier === 'enterprise' ? 'Enterprise' : lic.tier === 'pro' ? 'Pro' : 'Starter' }}
                  </span>
                </td>
                <td>
                  <span class="badge" :class="lic.status==='active' ? 'badge-success' : 'badge-danger'">
                    {{ lic.status === 'active' ? 'Aktiv' : 'Inaktiv' }}
                  </span>
                </td>
                <td style="font-size:12px;color:var(--text-muted)">{{ lic.validUntil ? new Date(lic.validUntil).toLocaleDateString('de-DE') : '∞ Unbegrenzt' }}</td>
                <td style="font-size:11px;color:var(--text-muted)">{{ new Date(lic.created).toLocaleDateString('de-DE') }}</td>
                <td>
                  <div style="display:flex;gap:4px">
                    <button @click="toggleLicStatus(lic)" class="icon-btn" :title="lic.status==='active' ? 'Deaktivieren' : 'Aktivieren'"
                      :style="lic.status==='active' ? 'color:#E05C5C' : 'color:#00C853'">
                      <i class="ti" :class="lic.status==='active' ? 'ti-ban' : 'ti-check'"></i>
                    </button>
                    <button @click="deleteLic(lic)" class="icon-btn" style="color:#E05C5C" title="Löschen">
                      <i class="ti ti-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal: Neue Lizenz erstellen -->
      <div v-if="showCreateLic" style="position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px">
        <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;width:100%;max-width:480px;padding:28px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
            <h3 style="margin:0;font-size:16px"><i class="ti ti-key" style="color:var(--accent);margin-right:8px"></i>Neue Lizenz erstellen</h3>
            <button class="icon-btn" @click="showCreateLic=false"><i class="ti ti-x"></i></button>
          </div>
          <div style="display:flex;flex-direction:column;gap:14px">
            <div class="auth-field">
              <label>Kunden-E-Mail *</label>
              <input v-model="newLic.customerEmail" type="email" placeholder="kunde@firma.de" />
            </div>
            <div class="auth-field">
              <label>Lizenz-Tier</label>
              <select v-model="newLic.tier" class="form-select">
                <option value="starter">Starter (CRM + Support)</option>
                <option value="pro">Pro (alle Module)</option>
                <option value="enterprise">Enterprise (inkl. Marketing)</option>
              </select>
            </div>
            <div class="auth-field">
              <label>Gültig bis (leer = unbegrenzt)</label>
              <input v-model="newLic.validUntil" type="date" />
            </div>
            <div class="auth-field">
              <label>Notiz (intern)</label>
              <input v-model="newLic.note" placeholder="z.B. Testzugang, Partnerlizenz..." />
            </div>
          </div>
          <div style="display:flex;gap:10px;margin-top:20px">
            <button class="accent-btn" style="flex:1" :disabled="licCreating || !newLic.customerEmail" @click="createLicense">
              <span v-if="licCreating"><i class="ti ti-loader-2 spin"></i> Erstelle...</span>
              <span v-else><i class="ti ti-key"></i> Lizenz erstellen</span>
            </button>
            <button class="icon-btn" style="padding:0 16px" @click="showCreateLic=false">Abbrechen</button>
          </div>
          <div v-if="createdKey" style="margin-top:16px;background:rgba(var(--accent-rgb),0.08);border:1px solid var(--accent);border-radius:10px;padding:16px;text-align:center">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">Lizenz-Key erstellt:</div>
            <code style="font-size:18px;font-weight:900;letter-spacing:3px;color:var(--accent)">{{ createdKey }}</code>
            <button @click="copyKey(createdKey)" class="icon-btn" style="margin-top:8px;display:block;width:100%;font-size:12px">
              <i class="ti ti-copy"></i> Kopieren
            </button>
          </div>
        </div>
      </div>

    </div>

    <!-- PAYMENT -->
    <div v-if="tab === 'payment'" class="card">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-credit-card" style="margin-right:8px;color:var(--accent)"></i>Payment-Gateways</span>
        <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" :disabled="isDemo || paymentSaving" @click="savePayment">
          <span v-if="paymentSaving"><i class="ti ti-loader-2 spin"></i></span>
          <span v-else><i class="ti ti-device-floppy"></i> Speichern</span>
        </button>
      </div>
      <div class="card-body" style="display:flex;flex-direction:column;gap:24px">

        <!-- Gateway Auswahl -->
        <div>
          <div class="settings-label" style="margin-bottom:12px">Aktiver Payment-Anbieter</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
            <div v-for="gw in gateways" :key="gw.key"
              @click="payment.activeGateway = gw.key"
              :style="`border:1.5px solid ${payment.activeGateway === gw.key ? 'var(--accent)' : 'var(--border)'};border-radius:10px;padding:14px;cursor:pointer;text-align:center;background:${payment.activeGateway === gw.key ? 'rgba(var(--accent-rgb),0.08)' : 'var(--bg-elevated)'};transition:all .15s`">
              <i class="ti" :class="gw.icon" :style="`font-size:24px;color:${payment.activeGateway === gw.key ? 'var(--accent)' : 'var(--text-muted)'}`"></i>
              <div style="font-size:13px;font-weight:700;margin-top:6px">{{ gw.name }}</div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:2px">{{ gw.desc }}</div>
            </div>
          </div>
        </div>

        <!-- Stripe -->
        <div v-if="payment.activeGateway === 'stripe'"
          style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:12px;padding:20px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
            <i class="ti ti-brand-stripe" style="font-size:20px;color:#635BFF"></i>
            <span style="font-weight:700">Stripe</span>
            <span class="badge badge-success" style="margin-left:4px">Aktiv</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="auth-field">
              <label>Secret Key</label>
              <input v-model="payment.stripeSecretKey" type="password" placeholder="sk_live_..." />
            </div>
            <div class="auth-field">
              <label>Publishable Key</label>
              <input v-model="payment.stripePublishableKey" placeholder="pk_live_..." />
            </div>
            <div class="auth-field">
              <label>Webhook Secret</label>
              <input v-model="payment.stripeWebhookSecret" type="password" placeholder="whsec_..." />
            </div>
          </div>
        </div>

        <!-- PayPal -->
        <div v-if="payment.activeGateway === 'paypal'"
          style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:12px;padding:20px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
            <i class="ti ti-brand-paypal" style="font-size:20px;color:#003087"></i>
            <span style="font-weight:700">PayPal</span>
            <span class="badge badge-success" style="margin-left:4px">Aktiv</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="auth-field">
              <label>Client ID</label>
              <input v-model="payment.paypalClientId" placeholder="AXxx..." />
            </div>
            <div class="auth-field">
              <label>Secret</label>
              <input v-model="payment.paypalSecret" type="password" placeholder="EXxx..." />
            </div>
            <div class="auth-field" style="grid-column:span 2">
              <label>Modus</label>
              <div style="display:flex;gap:10px;margin-top:6px">
                <button class="theme-opt" :class="{ active: payment.paypalSandbox }" @click="payment.paypalSandbox=true">
                  <i class="ti ti-test-pipe"></i> Sandbox
                </button>
                <button class="theme-opt" :class="{ active: !payment.paypalSandbox }" @click="payment.paypalSandbox=false">
                  <i class="ti ti-world"></i> Live
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Mollie -->
        <div v-if="payment.activeGateway === 'mollie'"
          style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:12px;padding:20px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
            <i class="ti ti-credit-card" style="font-size:20px;color:#FF6600"></i>
            <span style="font-weight:700">Mollie</span>
            <span class="badge badge-success" style="margin-left:4px">Aktiv</span>
          </div>
          <div class="auth-field" style="max-width:400px">
            <label>API Key</label>
            <input v-model="payment.mollieApiKey" type="password" placeholder="live_xxx oder test_xxx" />
          </div>
        </div>

        <!-- Custom -->
        <div v-if="payment.activeGateway === 'custom'"
          style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:12px;padding:20px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
            <i class="ti ti-plug" style="font-size:20px;color:var(--accent)"></i>
            <span style="font-weight:700">Custom Gateway</span>
            <span class="badge badge-success" style="margin-left:4px">Aktiv</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="auth-field">
              <label>Anbieter-Name</label>
              <input v-model="payment.customName" placeholder="z.B. Klarna, Adyen..." />
            </div>
            <div class="auth-field">
              <label>API URL</label>
              <input v-model="payment.customApiUrl" placeholder="https://api.example.com/v1" />
            </div>
            <div class="auth-field">
              <label>API Key</label>
              <input v-model="payment.customApiKey" type="password" placeholder="..." />
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- KONTO -->

    <!-- KONTO -->
    <div v-if="tab === 'account'" class="card">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-user-circle" style="margin-right:8px;color:var(--accent)"></i>Konto</span>
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div><div class="settings-label">Name</div><div style="font-size:13px;color:var(--text-primary);font-weight:500">{{ userName }}</div></div>
          <div><div class="settings-label">E-Mail</div><div style="font-size:13px;color:var(--text-primary)">{{ userEmail }}</div></div>
          <div><div class="settings-label">Rolle</div><span class="badge badge-info">Administrator</span></div>
          <div><div class="settings-label">Plan</div><span class="badge badge-success">Plexora Pro</span></div>
        </div>
      </div>
    </div>

    <!-- INFRASTRUKTUR -->
    <div v-if="tab === 'navbar'" class="card">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-navigation" style="margin-right:8px;color:var(--accent)"></i>Navigation</span>
        <span style="font-size:12px;color:var(--text-muted)">Reihenfolge per Drag & Drop ändern</span>
      </div>
      <div class="card-body">
        <div v-if="!navPages.length" style="color:var(--text-muted);font-size:13px;padding:20px 0">
          Noch keine Seiten in der Navigation — aktiviere "In Navigation anzeigen" im Pagebuilder.
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <div v-for="(p, idx) in navPages" :key="p.pageId"
            style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:10px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between">
            <div style="display:flex;align-items:center;gap:12px">
              <i class="ti ti-grip-vertical" style="color:var(--text-muted);cursor:grab"></i>
              <div>
                <div style="font-weight:600;font-size:14px">{{ p.navLabel || p.title }}</div>
                <div style="font-size:11px;color:var(--text-muted)">/p/{{ p.slug }}</div>
              </div>
            </div>
            <div style="display:flex;gap:4px;align-items:center">
              <button @click="moveNav(idx,-1)" :disabled="idx===0"
                style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:16px;padding:4px"><i class="ti ti-arrow-up"></i></button>
              <button @click="moveNav(idx,1)" :disabled="idx===navPages.length-1"
                style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:16px;padding:4px"><i class="ti ti-arrow-down"></i></button>
              <span :style="`font-size:10px;padding:2px 8px;border-radius:4px;font-weight:600;
                background:${p.status==='published' ? '#00D4B420' : 'var(--bg-surface)'};
                color:${p.status==='published' ? '#00D4B4' : 'var(--text-muted)'}`">
                {{ p.status === 'published' ? 'LIVE' : 'ENTWURF' }}
              </span>
            </div>
          </div>
        </div>
        <div style="margin-top:16px;display:flex;gap:8px">
          <button class="accent-btn" @click="saveNavOrder" :disabled="isDemo || savingNav">
            <i class="ti ti-device-floppy"></i> {{ savingNav ? 'Speichern...' : 'Reihenfolge speichern' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="tab === 'infra'" class="card">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-cloud" style="margin-right:8px;color:var(--accent)"></i>AWS Controlcenter</span>
        <button class="accent-btn" style="height:32px;font-size:12px" @click="loadAws" :disabled="awsLoading">
          <i class="ti" :class="awsLoading ? 'ti-loader-2 spin' : 'ti-refresh'"></i> {{ awsLoading ? 'Lädt...' : 'Aktualisieren' }}
        </button>
      </div>
      <div class="card-body">
        <!-- Status Pills -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px">
          <div class="infra-pill"><i class="ti ti-shield-check" style="color:#00D4B4"></i><div><div style="font-size:12px;font-weight:600;color:var(--text-primary)">AWS Cognito</div><div style="font-size:11px;color:var(--text-muted)">Auth — Frankfurt</div></div></div>
          <div class="infra-pill"><i class="ti ti-database" style="color:var(--accent)"></i><div><div style="font-size:12px;font-weight:600;color:var(--text-primary)">DynamoDB</div><div style="font-size:11px;color:var(--text-muted)">{{ awsData.tables.length }} Tabellen aktiv</div></div></div>
          <div class="infra-pill"><i class="ti ti-world" style="color:#F0B428"></i><div><div style="font-size:12px;font-weight:600;color:var(--text-primary)">Cloudflare</div><div style="font-size:11px;color:var(--text-muted)">app.plexora.eu</div></div></div>
        </div>
        <!-- DynamoDB -->
        <div style="margin-bottom:24px">
          <div style="font-size:13px;font-weight:700;margin-bottom:12px"><i class="ti ti-database" style="color:var(--accent);margin-right:6px"></i>DynamoDB Tabellen</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
            <div v-for="t in awsData.tables" :key="t.name" style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:10px;padding:12px">
              <div style="font-size:12px;font-weight:600;margin-bottom:4px">{{ t.name.replace('plexora-','') }}</div>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-size:11px;color:var(--text-muted)">{{ t.itemCount }} Items</span>
                <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:var(--bg-surface);color:#00D4B4">{{ t.status }}</span>
              </div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:4px">{{ (t.sizeBytes/1024).toFixed(1) }} KB</div>
            </div>
          </div>
        </div>
        <!-- Lambda -->
        <div style="margin-bottom:24px">
          <div style="font-size:13px;font-weight:700;margin-bottom:12px"><i class="ti ti-bolt" style="color:var(--accent);margin-right:6px"></i>Lambda Functions</div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
            <div v-for="f in awsData.functions" :key="f.name" style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:10px;padding:12px">
              <div style="font-size:12px;font-weight:600;margin-bottom:6px">{{ f.name }}</div>
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                <span style="font-size:10px;padding:2px 8px;border-radius:4px;background:var(--bg-surface);color:var(--text-muted)">{{ f.runtime }}</span>
                <span style="font-size:10px;padding:2px 8px;border-radius:4px;background:var(--bg-surface);color:var(--text-muted)">{{ f.memory }} MB</span>
                <span style="font-size:10px;padding:2px 8px;border-radius:4px;background:var(--bg-surface);color:var(--text-muted)">{{ f.timeout }}s</span>
                <span style="font-size:10px;padding:2px 8px;border-radius:4px;background:var(--bg-surface);color:var(--text-muted)">{{ (f.codeSize/1024/1024).toFixed(1) }} MB</span>
              </div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:6px">{{ new Date(f.lastModified).toLocaleString('de-DE') }}</div>
            </div>
          </div>
        </div>
        <!-- Logs -->
        <div style="margin-bottom:24px">
          <div style="font-size:13px;font-weight:700;margin-bottom:12px"><i class="ti ti-terminal" style="color:var(--accent);margin-right:6px"></i>Letzte Lambda Logs</div>
          <div style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:10px;padding:16px;font-family:monospace;font-size:11px;max-height:200px;overflow-y:auto">
            <div v-if="!awsData.logs.length" style="color:var(--text-muted)">Keine Logs — klick Aktualisieren</div>
            <div v-for="(e,i) in awsData.logs" :key="i" style="margin-bottom:4px;line-height:1.5">
              <span style="color:var(--text-muted)">{{ new Date(e.timestamp).toLocaleTimeString('de-DE') }}</span>
              <span :style="`margin-left:8px;color:${e.message?.includes('ERROR') ? '#E05C5C' : e.message?.includes('REPORT') ? '#F0B428' : 'var(--text-primary)'}`">{{ e.message?.trim() }}</span>
            </div>
          </div>
        </div>

        <!-- S3 Filemanager -->
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <div style="font-size:13px;font-weight:700"><i class="ti ti-folder" style="color:var(--accent);margin-right:6px"></i>S3 Filemanager — plexora-files</div>
            <div style="display:flex;gap:8px">
              <input ref="s3FileInput" type="file" style="display:none" @change="onS3FileChange" />
              <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" :disabled="s3Uploading" @click="s3FileInput?.click()">
                <span v-if="s3Uploading"><i class="ti ti-loader-2 spin"></i></span>
                <span v-else><i class="ti ti-upload"></i> Datei hochladen</span>
              </button>
            </div>
          </div>

          <!-- Breadcrumb -->
          <div style="display:flex;align-items:center;gap:4px;margin-bottom:12px;font-size:12px;color:var(--text-muted)">
            <button style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:12px;padding:0" @click="s3GoTo('')">
              <i class="ti ti-folder"></i> plexora-files
            </button>
            <template v-for="(part, i) in s3Breadcrumbs" :key="i">
              <span>/</span>
              <button style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:12px;padding:0" @click="s3GoTo(s3Breadcrumbs.slice(0,i+1).join('/') + '/')">{{ part }}</button>
            </template>
          </div>

          <div v-if="s3Loading" style="text-align:center;padding:24px;color:var(--text-muted)"><i class="ti ti-loader-2 spin"></i> Lädt...</div>

          <div v-else style="border:0.5px solid var(--border);border-radius:10px;overflow:hidden">
            <div v-if="!s3Data.folders.length && !s3Data.files.length" style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">
              Dieser Ordner ist leer.
            </div>

            <div v-for="f in s3Data.folders" :key="f.prefix"
              style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:0.5px solid var(--border);cursor:pointer;transition:background 0.1s"
              @click="s3GoTo(f.prefix)"
              @mouseenter="e => e.currentTarget.style.background='var(--bg-elevated)'"
              @mouseleave="e => e.currentTarget.style.background='transparent'">
              <i class="ti ti-folder-filled" style="color:var(--accent);font-size:18px"></i>
              <span style="font-size:13px;font-weight:600">{{ f.name }}</span>
            </div>

            <div v-for="o in s3Data.files" :key="o.key"
              style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:0.5px solid var(--border)">
              <i class="ti ti-file" style="color:var(--text-muted);font-size:18px"></i>
              <span style="font-size:13px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ o.name }}</span>
              <span style="font-size:11px;color:var(--text-muted);white-space:nowrap">{{ formatBytes(o.size) }}</span>
              <span style="font-size:11px;color:var(--text-muted);white-space:nowrap">{{ o.lastModified ? new Date(o.lastModified).toLocaleDateString('de-DE') : '' }}</span>
              <button style="background:none;border:0.5px solid var(--border);border-radius:6px;color:var(--text-muted);cursor:pointer;padding:4px 8px;font-size:11px" @click="copyS3Url(o.url)" title="URL kopieren">
                <i class="ti ti-link"></i>
              </button>
              <a :href="o.url" target="_blank" style="background:none;border:0.5px solid var(--border);border-radius:6px;color:var(--text-muted);cursor:pointer;padding:4px 8px;font-size:11px;text-decoration:none;display:inline-flex" title="Öffnen">
                <i class="ti ti-external-link"></i>
              </a>
              <button style="background:none;border:0.5px solid var(--border);border-radius:6px;color:#E05C5C;cursor:pointer;padding:4px 8px;font-size:11px" @click="deleteS3Object(o.key)" title="Löschen">
                <i class="ti ti-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

  <!-- TEAM -->
    <div v-if="tab === 'team'" class="card">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-users" style="margin-right:8px;color:var(--accent)"></i>Team</span>
      </div>
      <div class="card-body">

        <!-- Invite Form -->
        <div style="display:flex;gap:10px;margin-bottom:24px" v-if="!isDemo">
          <input v-model="teamInviteEmail" placeholder="E-Mail des neuen Mitglieds" style="flex:1" @keydown.enter="inviteTeamMember" />
          <select v-model="teamInviteRole" style="width:120px;padding:0 10px;height:36px;border-radius:8px;border:0.5px solid var(--border);background:var(--bg-elevated);color:var(--text-primary)">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button class="accent-btn" :disabled="teamInviting || !teamInviteEmail" @click="inviteTeamMember">
            <i class="ti" :class="teamInviting ? 'ti-loader-2 spin' : 'ti-send'"></i>
            {{ teamInviting ? 'Sendet...' : 'Einladen' }}
          </button>
        </div>

        <!-- Member List -->
        <div v-if="teamLoading" style="color:var(--text-muted);font-size:13px">Lädt...</div>
        <div v-else-if="teamMembers.length === 0" style="color:var(--text-muted);font-size:13px">Noch keine Teammitglieder.</div>
        <div v-else style="display:flex;flex-direction:column;gap:8px">
          <div v-for="m in teamMembers" :key="m.memberEmail"
            style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:10px">
            <div style="display:flex;align-items:center;gap:12px">
              <div style="width:36px;height:36px;border-radius:50%;background:var(--bg-surface);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:var(--accent)">
                {{ m.memberEmail[0].toUpperCase() }}
              </div>
              <div>
                <div style="font-size:13px;font-weight:600">{{ m.memberEmail }}</div>
                <div style="font-size:11px;color:var(--text-muted)">{{ m.role }} · {{ m.status === 'invited' ? 'Einladung ausstehend' : 'Aktiv' }}</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <span :style="m.status === 'active' ? 'font-size:11px;padding:3px 8px;border-radius:5px;background:#00C85322;color:#00C853' : 'font-size:11px;padding:3px 8px;border-radius:5px;background:#F0B42822;color:#F0B428'">
                {{ m.status === 'active' ? 'Aktiv' : 'Eingeladen' }}
              </span>
              <button v-if="m.memberEmail !== userEmail" class="icon-btn" style="color:var(--danger)" @click="removeTeamMember(m.memberEmail)" title="Entfernen">
                <i class="ti ti-trash"></i>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>

  <!-- Settings Toast -->
  <div v-if="settingsToast"
    :style="settingsToastErr ? 'position:fixed;bottom:28px;right:28px;z-index:9999;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px;box-shadow:0 4px 20px rgba(0,0,0,0.3);background:#E05C5C;color:#fff' : 'position:fixed;bottom:28px;right:28px;z-index:9999;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px;box-shadow:0 4px 20px rgba(0,0,0,0.3);background:#00C853;color:#fff'">
    <i class="ti" :class="settingsToastErr ? 'ti-alert-circle' : 'ti-circle-check'"></i>
    {{ settingsToast }}
  </div>
  </div>
</template>

<script setup lang="ts">
import { marked } from 'marked'
import { getCurrentUser } from 'aws-amplify/auth'
import { useAppStore, THEMES } from '~/stores/app'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const store = useAppStore()
const tab   = ref('branding')

const customAccent     = ref(store.accent)
const appearanceSaving = ref(false)

// ── Lizenzen ──────────────────────────────────────────────────────────────────
const licenses    = ref<any[]>([])
const licLoading  = ref(false)
const showCreateLic = ref(false)
const licCreating = ref(false)
const createdKey  = ref('')
const newLic      = reactive({ customerEmail: '', tier: 'pro', validUntil: '', note: '' })

async function loadLicenses() {
  licLoading.value = true
  try {
    const res = await $fetch(useApiUrl('/api/licenses')) as any
    licenses.value = res.licenses || []
  } catch {} finally { licLoading.value = false }
}

async function createLicense() {
  if (!newLic.customerEmail) return
  licCreating.value = true
  createdKey.value  = ''
  try {
    const res = await $fetch(useApiUrl('/api/licenses'), {
      method: 'POST',
      body: {
        customerEmail: newLic.customerEmail,
        tier:          newLic.tier,
        validUntil:    newLic.validUntil || null,
        note:          newLic.note,
      }
    }) as any
    createdKey.value = res.licenseKey
    await loadLicenses()
    Object.assign(newLic, { customerEmail: '', tier: 'pro', validUntil: '', note: '' })
  } catch (e: any) {
    showSettingsToast('Fehler: ' + e.message, true)
  } finally { licCreating.value = false }
}

async function toggleLicStatus(lic: any) {
  const newStatus = lic.status === 'active' ? 'inactive' : 'active'
  try {
    await $fetch(useApiUrl(`/api/licenses/${lic.licenseKey}`), {
      method: 'PATCH', body: { status: newStatus }
    })
    lic.status = newStatus
  } catch { showSettingsToast('Fehler beim Aktualisieren!', true) }
}

async function deleteLic(lic: any) {
  if (!confirm(`Lizenz ${lic.licenseKey} (${lic.customerEmail}) wirklich löschen?`)) return
  try {
    await $fetch(useApiUrl(`/api/licenses/${lic.licenseKey}`), { method: 'DELETE' })
    licenses.value = licenses.value.filter(l => l.licenseKey !== lic.licenseKey)
    showSettingsToast('Lizenz gelöscht')
  } catch { showSettingsToast('Fehler beim Löschen!', true) }
}

function copyKey(key: string) {
  navigator.clipboard.writeText(key)
  showSettingsToast('Lizenz-Key kopiert!')
}

watch(tab, v => { if (v === 'licenses') loadLicenses() })

function applyCustomAccent() {
  const hex = customAccent.value.replace('#', '')
  const r = parseInt(hex.substring(0,2),16)
  const g = parseInt(hex.substring(2,4),16)
  const b = parseInt(hex.substring(4,6),16)
  store.setAccent(customAccent.value, `${r}, ${g}, ${b}`)
}

async function saveAppearance() {
  if (isDemo.value) return
  appearanceSaving.value = true
  try {
    await store.saveTheme()
  } finally {
    appearanceSaving.value = false
  }
}

const security = reactive({ timeoutMinutes: 5 })
const securitySaving = ref(false)

const { data: sessionData } = await useFetch(useApiUrl('/api/settings/session'), { getCachedData: () => undefined })
if ((sessionData.value as any)?.session) {
  security.timeoutMinutes = (sessionData.value as any).session.timeoutMinutes ?? 5
}

async function saveSecurity() {
  if (isDemo.value) return
  securitySaving.value = true
  try {
    await $fetch(useApiUrl('/api/settings/session'), {
      method: 'POST',
      body: { timeoutMinutes: security.timeoutMinutes }
    })
  } finally {
    securitySaving.value = false
  }
}

const tabs = [
  { key: 'branding',    label: 'Branding',        icon: 'ti-building'        },
  { key: 'company',     label: 'Unternehmen',      icon: 'ti-building-bank'   },
  { key: 'agb',         label: 'AGB',              icon: 'ti-file-text'       },
  { key: 'appearance',  label: 'Darstellung',      icon: 'ti-palette'         },
  { key: 'security',    label: 'Sicherheit',       icon: 'ti-shield-lock'     },
  { key: 'invoices',    label: 'Rechnungen',       icon: 'ti-receipt'         },
  { key: 'dunning',     label: 'Mahnwesen',        icon: 'ti-alert-triangle'  },
  { key: 'modules',     label: 'Module',           icon: 'ti-puzzle'          },
  { key: 'licenses',    label: 'Lizenzen',         icon: 'ti-key'             },
  { key: 'payment',     label: 'Payment',          icon: 'ti-credit-card'     },
  { key: 'account',     label: 'Konto',            icon: 'ti-user-circle'     },
  { key: 'navbar',      label: 'Navigation',       icon: 'ti-navigation'      },
  { key: 'infra',       label: 'Infrastruktur',    icon: 'ti-cloud'           },
  { key: 'team',        label: 'Team',             icon: 'ti-users'           },
]

// ── Auth ──────────────────────────────────────────────
const userName  = ref('–')
const userEmail = ref('–')
const isDemo    = computed(() => userEmail.value === 'demo@plexora.eu')

// ── Branding ──────────────────────────────────────────
const brandSaving = ref(false)
const brand = reactive({ brandName: 'Plexora', brandTagline: 'Business Platform', portalTitle: 'Kundenportal' })
const brandFirst = computed(() => brand.brandName.slice(0, -1))
const brandLast  = computed(() => brand.brandName.slice(-1))

// ── Unternehmen ─────────────────────────────────────
const companySaving = ref(false)
const company = reactive({
  legalName: '', representedBy: '', street: '', zipCity: '', country: 'Deutschland',
  email: '', phone: '', vatId: '', register: '', registerCourt: ''
})

// ── AGB ─────────────────────────────────────────────
const agbSaving = ref(false)
const agb = reactive({ content: '', updated: '' })
const agbPreview = computed(() => marked.parse(agb.content || ''))

// ── Rechnungen ────────────────────────────────────────
const invoiceSaving = ref(false)
const invoiceSettings = reactive({ dueDays: 7, dueText: 'Zahlbar innerhalb von 7 Tagen netto', vatRate: 19, priceDisplay: 'netto', smallBusiness: false })

// ── Mahnwesen ─────────────────────────────────────────
const dunningSaving = ref(false)
const dunning = reactive({
  level1: { active: true, days: 5,  fee: 0,  text: 'Wir möchten Sie freundlich daran erinnern, dass die folgende Rechnung noch offen ist. Bitte begleichen Sie den ausstehenden Betrag umgehend.' },
  level2: { active: true, days: 14, fee: 15, text: 'Trotz unserer ersten Mahnung haben wir noch keinen Zahlungseingang verbuchen können. Wir bitten Sie dringend, den ausstehenden Betrag inklusive Mahngebühr zu begleichen.' },
  level3: { active: true, days: 30, fee: 40, inkasso: true, text: 'Dies ist unsere letzte Mahnung. Sollte der ausstehende Betrag nicht innerhalb von 7 Tagen beglichen werden, sehen wir uns gezwungen, die Forderung an ein Inkassounternehmen zu übergeben.' }
})

onMounted(async () => {
  try {
    const user = await getCurrentUser()
    userEmail.value = user.signInDetails?.loginId || '–'
    userName.value  = user.username || '–'
  } catch {}

  try {
    const d = await $fetch(useApiUrl('/api/settings/branding') as any)
    if (d?.branding) Object.assign(brand, d.branding)
  } catch {}

  try {
    const d = await $fetch(useApiUrl('/api/settings/invoice') as any)
    if (d?.settings) Object.assign(invoiceSettings, d.settings)
  } catch {}

  try {
    const d = await $fetch(useApiUrl('/api/settings/dunning') as any)
    if (d?.settings) Object.assign(dunning, d.settings)
  } catch {}
})

const logoUploading = ref(false)

async function uploadLogo(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  logoUploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('prefix', 'branding/')
    const res = await $fetch(useApiUrl('/api/aws/s3-upload'), { method: 'POST', body: fd }) as any
    if (res?.url) brand.logoUrl = res.url
    else if (res?.key) brand.logoUrl = `https://plexora-files.s3.eu-central-1.amazonaws.com/${res.key}`
  } catch (err) {
    console.error('Logo-Upload fehlgeschlagen:', err)
  } finally {
    logoUploading.value = false
  }
}

async function saveCompany() {
  if (isDemo.value) return
  companySaving.value = true
  try {
    await $fetch(useApiUrl('/api/settings/company'), { method: 'POST', body: { ...company } })
    showSettingsToast('Unternehmensdaten gespeichert!')
  } catch {
    showSettingsToast('Fehler beim Speichern!', true)
  } finally {
    companySaving.value = false
  }
}

async function saveBranding() {
  if (isDemo.value) return
  brandSaving.value = true
  try {
    await $fetch(useApiUrl('/api/settings/branding'), { method: 'POST', body: { ...brand } })
    const { useBranding } = await import('~/composables/useBranding')
    const { branding } = useBranding()
    Object.assign(branding.value, brand)
  } finally {
    brandSaving.value = false
  }
}

async function saveInvoiceSettings() {
  if (isDemo.value) return
  invoiceSaving.value = true
  try {
    await $fetch(useApiUrl('/api/settings/invoice'), { method: 'POST', body: { ...invoiceSettings } })
  } finally {
    invoiceSaving.value = false
  }
}

async function saveDunningSettings() {
  if (isDemo.value) return
  dunningSaving.value = true
  try {
    await $fetch(useApiUrl('/api/settings/dunning'), { method: 'POST', body: { ...dunning } })
  } finally {
    dunningSaving.value = false
  }
}

// ── Module speichern ─────────────────────────────────────────────────────────
const modulesDirty  = ref(false)
const modulesSaving = ref(false)

async function saveModules() {
  if (isDemo.value) return
  modulesSaving.value = true
  try {
    await $fetch(useApiUrl('/api/settings/modules'), {
      method: 'POST',
      body: { modules: store.modules }
    })
    modulesDirty.value = false
    showSettingsToast('Einstellungen gespeichert!')
  } catch (err) {
    console.error('Module speichern fehlgeschlagen:', err)
    showSettingsToast('Fehler beim Speichern!', true)
  } finally {
    modulesSaving.value = false
  }
}

const settingsToast    = ref('')
const settingsToastErr = ref(false)
function showSettingsToast(msg: string, isError = false) {
  settingsToast.value    = msg
  settingsToastErr.value = isError
  setTimeout(() => settingsToast.value = '', 2800)
}

// ── Payment ──────────────────────────────────────────────────────────────────
const paymentSaving = ref(false)
const payment = reactive({
  activeGateway:        'stripe',
  stripeSecretKey:      '',
  stripePublishableKey: '',
  stripeWebhookSecret:  '',
  paypalClientId:       '',
  paypalSecret:         '',
  paypalSandbox:        true,
  mollieApiKey:         '',
  customName:           '',
  customApiUrl:         '',
  customApiKey:         '',
})

const gateways = [
  { key: 'stripe',  name: 'Stripe',  icon: 'ti-brand-stripe', desc: 'Kreditkarte, SEPA' },
  { key: 'paypal',  name: 'PayPal',  icon: 'ti-brand-paypal', desc: 'PayPal, Kreditkarte' },
  { key: 'mollie',  name: 'Mollie',  icon: 'ti-credit-card',  desc: 'iDEAL, SOFORT, mehr' },
  { key: 'custom',  name: 'Custom',  icon: 'ti-plug',         desc: 'Eigener Anbieter' },
]

async function savePayment() {
  if (isDemo.value) return
  paymentSaving.value = true
  try {
    await $fetch(useApiUrl('/api/settings/payment'), { method: 'POST', body: { ...payment } })
    showSettingsToast('Payment-Einstellungen gespeichert!')
  } catch {
    showSettingsToast('Fehler beim Speichern!', true)
  } finally {
    paymentSaving.value = false
  }
}

const savingNav = ref(false)
const { data: navPagesData, refresh: refreshNav } = await useFetch(useApiUrl('/api/pages'))
const navPages = ref<any[]>([])
watch(navPagesData, (v) => {
  navPages.value = ((v as any)?.pages || [])
    .filter((p: any) => p.inNav)
    .sort((a: any, b: any) => (a.navOrder || 0) - (b.navOrder || 0))
}, { immediate: true })

function moveNav(idx: number, dir: number) {
  const item = navPages.value.splice(idx, 1)[0]
  navPages.value.splice(idx + dir, 0, item)
}

async function saveNavOrder() {
  if (isDemo.value) return
  savingNav.value = true
  await Promise.all(
    navPages.value.map((p, idx) =>
      $fetch(useApiUrl(`/api/pages/${p.slug}`), {
        method: 'PUT',
        body: { ...p, navOrder: idx }
      })
    )
  )
  await refreshNav()
  savingNav.value = false
}

const awsLoading = ref(false)
const awsData = reactive({ tables: [], functions: [], logs: [] })

// ── S3 Filemanager ──────────────────────────────────
const s3Loading = ref(false)
const s3Uploading = ref(false)
const s3Prefix = ref('')
const s3FileInput = ref<HTMLInputElement | null>(null)
const s3Data = reactive({ folders: [] as any[], files: [] as any[] })
const s3Breadcrumbs = computed(() => s3Prefix.value.split('/').filter(Boolean))

function formatBytes(bytes: number) {
  if (!bytes) return '0 B'
  const units = ['B','KB','MB','GB']
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++ }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

async function loadS3() {
  s3Loading.value = true
  try {
    const res = await $fetch(useApiUrl('/api/aws/s3'), { query: { prefix: s3Prefix.value } }) as any
    s3Data.folders = res.folders || []
    s3Data.files = res.files || []
  } catch(e) { console.error(e) }
  s3Loading.value = false
}

function s3GoTo(prefix: string) {
  s3Prefix.value = prefix
  loadS3()
}

async function onS3FileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  s3Uploading.value = true
  try {
    const reader = new FileReader()
    const fileBase64 = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    await $fetch(useApiUrl('/api/aws/s3-upload'), {
      method: 'POST',
      body: { fileBase64, fileName: file.name, prefix: s3Prefix.value }
    })
    await loadS3()
  } finally {
    s3Uploading.value = false
    if (s3FileInput.value) s3FileInput.value.value = ''
  }
}

async function deleteS3Object(key: string) {
  if (!confirm(`${key} wirklich löschen?`)) return
  await $fetch(useApiUrl('/api/aws/s3-delete'), { method: 'POST', body: { key } })
  await loadS3()
}

function copyS3Url(url: string) {
  navigator.clipboard.writeText(url)
}

async function loadAws() {
  awsLoading.value = true
  try {
    const [dynamo, lambda, logs] = await Promise.all([
      $fetch(useApiUrl('/api/aws/dynamo')),
      $fetch(useApiUrl('/api/aws/lambda')),
      $fetch(useApiUrl('/api/aws/logs')),
    ])
    awsData.tables    = (dynamo as any).tables    || []
    awsData.functions = (lambda as any).functions || []
    awsData.logs      = (logs as any).events      || []
  } catch(e) { console.error(e) }
  awsLoading.value = false
}

onMounted(() => { if (tab.value === 'infra') { loadAws(); loadS3() } })
watch(tab, v => { if (v === 'infra') { loadAws(); loadS3() } })


onMounted(async () => {
  try {
    const d = await $fetch(useApiUrl('/api/settings/company') as any)
    if (d?.company) Object.assign(company, d.company)
  } catch {}
  try {
    const d = await $fetch(useApiUrl('/api/settings/agb') as any)
    if (d?.agb) Object.assign(agb, d.agb)
  } catch {}
  try {
    const d = await $fetch(useApiUrl('/api/settings/payment') as any)
    if (d?.payment) Object.assign(payment, d.payment)
  } catch {}
})

async function saveAgb() {
  if (isDemo.value) return
  agbSaving.value = true
  try {
    await $fetch(useApiUrl('/api/settings/agb'), { method: 'POST', body: { content: agb.content } })
  } finally {
    agbSaving.value = false
  }
}

// ── Team ──────────────────────────────────────────────
const teamMembers    = ref<any[]>([])
const teamLoading    = ref(false)
const teamInviteEmail = ref('')
const teamInviteRole  = ref('member')
const teamInviting   = ref(false)

async function loadTeamMembers() {
  if (!userEmail.value || userEmail.value === '–') return
  teamLoading.value = true
  try {
    const res = await $fetch<any>(useApiUrl(`/api/team/members?userId=${encodeURIComponent(userEmail.value)}`))
    teamMembers.value = res.members || []
  } catch {} finally {
    teamLoading.value = false
  }
}

async function inviteTeamMember() {
  if (!teamInviteEmail.value || teamInviting.value) return
  teamInviting.value = true
  try {
    await $fetch(useApiUrl('/api/team/invite'), {
      method: 'POST',
      body: { inviterEmail: userEmail.value, inviteeEmail: teamInviteEmail.value, role: teamInviteRole.value },
    })
    teamInviteEmail.value = ''
    await loadTeamMembers()
  } catch (e: any) {
    alert(e?.data?.message || 'Fehler beim Einladen')
  } finally {
    teamInviting.value = false
  }
}

async function removeTeamMember(email: string) {
  if (!confirm(`${email} wirklich entfernen?`)) return
  try {
    await $fetch(useApiUrl(`/api/team/${encodeURIComponent(email)}?userId=${encodeURIComponent(userEmail.value)}`), { method: 'DELETE' })
    await loadTeamMembers()
  } catch (e: any) {
    alert(e?.data?.message || 'Fehler beim Entfernen')
  }
}

watch(tab, v => { if (v === 'team') loadTeamMembers() })
</script>
