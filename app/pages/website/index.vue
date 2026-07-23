<template>
  <div class="page">

    <!-- Header -->
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px;position:sticky;top:0;z-index:10;background:#0a0e1a;padding:16px 0 14px;margin-top:-16px;border-bottom:1px solid var(--border);box-shadow:0 4px 24px rgba(0,0,0,0.8)">
      <div style="width:36px;height:36px;background:var(--accent);border-radius:10px;display:flex;align-items:center;justify-content:center">
        <i class="ti ti-world" style="font-size:18px;color:#fff"></i>
      </div>
      <div>
        <div style="font-size:18px;font-weight:700">Unternehmens-Webseite</div>
        <div style="font-size:12px;color:var(--text-muted)">Nexora · powered by Plexora</div>
      </div>
      <div style="margin-left:auto;display:flex;gap:8px">
        <a v-if="nexora?.customDomain" :href="`https://${nexora.customDomain}`" target="_blank" class="btn-secondary" style="font-size:12px;display:flex;align-items:center;gap:6px">
          <i class="ti ti-external-link"></i> Vorschau
        </a>
        <button class="accent-btn" style="height:32px;font-size:12px;padding:0 14px" @click="save" :disabled="saving">
          <i class="ti" :class="saving ? 'ti-loader-2 spin' : 'ti-device-floppy'" style="margin-right:4px"></i>
          {{ saving ? 'Speichern...' : 'Speichern' }}
        </button>
      </div>
    </div>

    <!-- Not provisioned -->
    <div v-if="!nexora && !loading" style="text-align:center;padding:60px 20px">
      <div style="width:64px;height:64px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
        <i class="ti ti-world-off" style="font-size:28px;color:var(--text-muted)"></i>
      </div>
      <div style="font-size:16px;font-weight:600;margin-bottom:8px">Nexora noch nicht aktiviert</div>
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:24px">Kaufe das Modul "Unternehmens-Webseite" im Modul-Store.</div>
      <NuxtLink to="/store" class="accent-btn" style="display:inline-flex;align-items:center;gap:8px;padding:10px 20px;font-size:13px">
        <i class="ti ti-building-store"></i> Zum Modul-Store
      </NuxtLink>
    </div>

    <div v-else-if="loading" style="padding:60px;text-align:center;color:var(--text-muted)">
      <i class="ti ti-loader-2 spin" style="font-size:28px"></i>
    </div>

    <template v-else-if="nexora">

      <!-- Status Banner -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding:12px 18px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px">
        <div style="width:8px;height:8px;background:#22c55e;border-radius:50%;box-shadow:0 0 6px #22c55e88;flex-shrink:0"></div>
        <div style="font-size:13px;font-weight:600">Nexora ist aktiv</div>
        <div style="font-size:12px;color:var(--text-muted)">{{ nexora.customDomain || 'Domain noch nicht konfiguriert' }}</div>
        <div style="margin-left:auto;font-size:11px;color:var(--text-muted)">Tenant: {{ nexora.tenantId }}</div>
      </div>

      <!-- Tabs -->
      <div style="display:flex;gap:8px;margin-bottom:20px;border-bottom:1px solid var(--border);padding-bottom:0;position:sticky;top:67px;z-index:9;background:#0a0e1a;box-shadow:0 4px 16px rgba(0,0,0,0.6);overflow-x:auto;overflow-y:hidden;max-width:100%;scrollbar-width:thin">
        <button v-for="t in tabs" :key="t.key" @click="activeTab = t.key"
          style="padding:8px 14px;background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;font-size:13px;font-weight:500;color:var(--text-muted);transition:all .15s;margin-bottom:-1px;font-family:inherit;white-space:nowrap;flex-shrink:0"
          :style="activeTab === t.key ? 'color:var(--accent);border-bottom-color:var(--accent)' : ''">
          <i class="ti" :class="t.icon" style="margin-right:6px"></i>{{ t.label }}
        </button>
      </div>

      <!-- ── Two-Column Layout ── -->
      <div style="display:grid;grid-template-columns:1fr 300px;gap:24px;align-items:start">
      <div style="min-width:0">

      <!-- ── TAB: VERBINDUNG ── -->
      <div v-if="activeTab === 'connection'" class="ws-grid">
        <div style="display:flex;flex-direction:column;gap:16px">

          <!-- Unternehmensname -->
          <div class="card">
            <div class="card-header"><span class="card-title"><i class="ti ti-building" style="margin-right:8px;color:var(--accent)"></i>Dein Unternehmen</span></div>
            <div style="display:flex;flex-direction:column;gap:14px">
              <div>
                <label class="field-label">Unternehmensname</label>
                <input v-model="form.companyName" class="field-input" placeholder="Muster GmbH" />
              </div>
            </div>
          </div>

          <!-- Domain -->
          <div class="card">
            <div class="card-header"><span class="card-title"><i class="ti ti-world" style="margin-right:8px;color:var(--accent)"></i>Deine Domain</span></div>
            <div style="display:flex;flex-direction:column;gap:16px">
              <div>
                <label class="field-label">Domain (z.B. meinefirma.de)</label>
                <input v-model="form.customDomain" class="field-input" placeholder="meinefirma.de" />
                <div style="font-size:11px;color:var(--text-muted);margin-top:6px">Trag hier die Domain ein, auf der deine Website erreichbar sein soll.</div>
              </div>

              <!-- CNAME Anweisung -->
              <div v-if="form.customDomain" style="border:1px solid var(--accent);border-radius:10px;overflow:hidden">
                <div style="padding:10px 14px;background:var(--accent)11;display:flex;align-items:center;gap:8px">
                  <i class="ti ti-info-circle" style="color:var(--accent)"></i>
                  <span style="font-size:12px;font-weight:600;color:var(--accent)">Einmalig in deinem DNS eintragen</span>
                </div>
                <div style="padding:14px 16px;display:flex;flex-direction:column;gap:10px">
                  <div style="font-size:12px;color:var(--text-muted)">Gehe zu deinem Domain-Anbieter (z.B. Namecheap, IONOS, Strato, Cloudflare) und erstelle folgenden DNS-Eintrag:</div>
                  <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px 14px;font-family:monospace;font-size:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                    <span style="color:var(--text-muted)">Typ:</span>
                    <span style="font-weight:700;color:var(--accent)">CNAME</span>
                    <span style="color:var(--border)">|</span>
                    <span style="color:var(--text-muted)">Name:</span>
                    <span style="color:var(--text)">{{ form.customDomain }}</span>
                    <span style="color:var(--border)">|</span>
                    <span style="color:var(--text-muted)">Ziel:</span>
                    <span style="color:var(--accent)">nexora-nuxt.pages.dev</span>
                  </div>
                  <div style="font-size:11px;color:var(--text-muted)">Das war's! Nach 5–10 Minuten ist deine Website unter <strong style="color:var(--text)">{{ form.customDomain }}</strong> erreichbar.</div>
                </div>
              </div>

              <div v-else style="padding:14px;background:var(--bg-elevated);border:1px dashed var(--border);border-radius:8px;font-size:12px;color:var(--text-muted);text-align:center">
                <i class="ti ti-arrow-up" style="margin-right:6px"></i>Trag deine Domain ein — dann zeigen wir dir den DNS-Eintrag
              </div>
            </div>
          </div>

        </div>

        <!-- Rechte Spalte -->
        <div style="display:flex;flex-direction:column;gap:16px">

          <!-- So einfach geht's -->
          <div class="card">
            <div class="card-header"><span class="card-title"><i class="ti ti-rocket" style="margin-right:8px;color:var(--accent)"></i>So einfach geht's</span></div>
            <div style="display:flex;flex-direction:column;gap:0">
              <div v-for="(step, i) in customerSteps" :key="i"
                style="display:flex;gap:14px;align-items:flex-start;padding:14px 0"
                :style="i < customerSteps.length - 1 ? 'border-bottom:1px solid var(--border)' : ''">
                <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0"
                  :style="step.done ? 'background:#22c55e22;color:#22c55e' : 'background:var(--accent)22;color:var(--accent)'">
                  <i class="ti" :class="step.done ? 'ti-check' : `ti-${i+1}-circle-filled`" v-if="step.done || i > 3"></i>
                  <span v-else>{{ i + 1 }}</span>
                </div>
                <div style="flex:1">
                  <div style="font-size:13px;font-weight:600;margin-bottom:3px">{{ step.title }}</div>
                  <div style="font-size:12px;color:var(--text-muted);line-height:1.5">{{ step.desc }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Für Entwickler (aufklappbar) -->
          <div class="card">
            <div class="card-header" style="cursor:pointer" @click="showDevSection = !showDevSection">
              <span class="card-title"><i class="ti ti-code" style="margin-right:8px;color:var(--text-muted)"></i><span style="color:var(--text-muted)">Für Entwickler</span></span>
              <i class="ti" :class="showDevSection ? 'ti-chevron-up' : 'ti-chevron-down'" style="color:var(--text-muted)"></i>
            </div>
            <div v-if="showDevSection" style="display:flex;flex-direction:column;gap:12px;margin-top:12px">
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">Self-Hosting: Tenant-ID als <code style="background:var(--bg);padding:2px 5px;border-radius:4px;font-size:11px">PLEXORA_TENANT_ID</code> Env-Variable setzen.</div>
              <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:10px">
                <div style="flex:1;font-family:monospace;font-size:11px;color:var(--accent);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                  {{ showKey ? nexora.apiKey : nexora.apiKey.slice(0,12) + '••••••••••' }}
                </div>
                <button class="icon-btn" @click="showKey = !showKey"><i class="ti" :class="showKey ? 'ti-eye-off' : 'ti-eye'"></i></button>
                <button class="icon-btn" @click="copyKey"><i class="ti" :class="copied ? 'ti-check' : 'ti-copy'" :style="copied ? 'color:#22c55e' : ''"></i></button>
              </div>
              <div style="font-size:11px;color:var(--text-muted)">Tenant-ID: <code style="font-size:11px">{{ nexora.tenantId }}</code></div>
            </div>
          </div>

        </div>
      </div>

      <!-- ── TAB: TRAFFIC ── -->
      <div v-else-if="activeTab === 'traffic'">
        <div v-if="loadingSiteStats" style="display:flex;justify-content:center;padding:60px;color:var(--text-muted)">
          <i class="ti ti-loader-2 spin" style="font-size:28px"></i>
        </div>
        <div v-else-if="!siteStats" style="text-align:center;padding:60px;color:var(--text-muted)">
          <i class="ti ti-chart-line" style="font-size:40px;display:block;margin-bottom:12px;opacity:.3"></i>
          <p style="font-size:13px">Noch keine Besucherdaten vorhanden.</p>
        </div>
        <template v-else>
          <div class="card" style="margin-bottom:14px">
            <div class="card-header">
              <span class="card-title">Aufrufe letzte 30 Tage</span>
              <div style="display:flex;gap:16px;font-size:11px;color:var(--text-muted)">
                <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--accent);margin-right:4px"></span>Besucher</span>
                <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#6C3FE8;margin-right:4px"></span>Bots</span>
              </div>
            </div>
            <div style="padding:16px 20px">
              <div style="display:flex;align-items:flex-end;gap:3px;height:80px">
                <div v-for="d in siteStats.days" :key="d.date"
                  style="flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;cursor:default"
                  :title="`${d.date}\nBesucher: ${d.human}\nBots: ${d.bot}`">
                  <div :style="{ width:'100%', background:'#6C3FE8', borderRadius:'2px 2px 0 0', height: maxSiteDay > 0 ? `${Math.max(2, Math.round((d.bot / maxSiteDay) * 36))}px` : '2px', opacity: 0.7 }"></div>
                  <div :style="{ width:'100%', background:'var(--accent)', borderRadius:'2px 2px 0 0', height: maxSiteDay > 0 ? `${Math.max(2, Math.round((d.human / maxSiteDay) * 36))}px` : '2px' }"></div>
                </div>
              </div>
              <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:10px;color:var(--text-muted)">
                <span>{{ siteStats.days[0]?.date?.slice(5) }}</span>
                <span>{{ siteStats.days[14]?.date?.slice(5) }}</span>
                <span>{{ siteStats.days[29]?.date?.slice(5) }}</span>
              </div>
            </div>
          </div>

          <div class="grid-2" style="margin-bottom:14px">
            <div class="card">
              <div class="card-header"><span class="card-title">Top Seiten</span></div>
              <table class="data-table">
                <thead><tr><th>Seite</th><th style="text-align:right">Aufrufe</th></tr></thead>
                <tbody>
                  <tr v-if="!siteStats.topPages.length"><td colspan="2" style="text-align:center;color:var(--text-muted);padding:24px">Noch keine Daten</td></tr>
                  <tr v-for="p in siteStats.topPages" :key="p.path">
                    <td class="td-name" style="font-family:monospace;font-size:12px">{{ p.path }}</td>
                    <td style="text-align:right;font-weight:600">{{ p.count }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="card">
              <div class="card-header"><span class="card-title">Traffic-Quellen</span></div>
              <table class="data-table">
                <thead><tr><th>Quelle</th><th style="text-align:right">Aufrufe</th></tr></thead>
                <tbody>
                  <tr v-if="!siteStats.topRefs.length"><td colspan="2" style="text-align:center;color:var(--text-muted);padding:24px">Noch keine Daten</td></tr>
                  <tr v-for="r in siteStats.topRefs" :key="r.ref">
                    <td class="td-name" style="font-size:12px">
                      <span v-if="r.ref === 'direct'" style="color:var(--text-muted)">— direkt / bookmark —</span>
                      <span v-else>{{ r.ref }}</span>
                    </td>
                    <td style="text-align:right;font-weight:600">{{ r.count }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="grid-2">
            <div class="card">
              <div class="card-header"><span class="card-title"><i class="ti ti-world" style="color:var(--accent);margin-right:6px"></i>Länder</span></div>
              <div v-if="!siteStats.topCountries?.length" style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">Noch keine Daten</div>
              <div v-else style="padding:12px 16px;display:flex;flex-direction:column;gap:8px">
                <div v-for="c in siteStats.topCountries" :key="c.code" style="display:flex;align-items:center;gap:10px">
                  <span style="font-size:16px;width:24px">{{ siteFlag(c.code) }}</span>
                  <span style="font-size:13px;min-width:80px">{{ siteCountryName(c.code) }}</span>
                  <div style="flex:1;background:var(--bg-elevated);border-radius:4px;height:6px;overflow:hidden">
                    <div :style="`width:${Math.round((c.count/siteStats.topCountries[0].count)*100)}%;background:var(--accent);height:100%;border-radius:4px`"></div>
                  </div>
                  <span style="font-size:12px;font-weight:600;min-width:28px;text-align:right">{{ c.count }}</span>
                </div>
              </div>
            </div>
            <div class="card">
              <div class="card-header"><span class="card-title"><i class="ti ti-building" style="color:var(--accent);margin-right:6px"></i>Städte</span></div>
              <div v-if="!siteStats.topCities?.length" style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">Noch keine Daten</div>
              <table v-else class="data-table">
                <thead><tr><th>Stadt</th><th style="text-align:right">Aufrufe</th></tr></thead>
                <tbody>
                  <tr v-for="c in siteStats.topCities" :key="c.city">
                    <td style="font-size:13px">{{ c.city }}</td>
                    <td style="text-align:right;font-weight:600">{{ c.count }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </div>

      <!-- ── TAB: INHALTE ── -->
      <div v-else-if="activeTab === 'content'" style="display:flex;flex-direction:column;gap:16px;max-width:760px">
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="ti ti-home" style="margin-right:8px;color:var(--accent)"></i>Hero-Bereich</span></div>
          <div style="display:flex;flex-direction:column;gap:14px">
            <div>
              <label class="field-label">Standort / Tag</label>
              <input v-model="form.heroLocation" class="field-input" placeholder="Frankfurt · Remote · Worldwide" />
            </div>
            <div>
              <label class="field-label">Headline</label>
              <input v-model="form.heroHeadline" class="field-input" placeholder='Software, die **wirklich** skaliert.' />
              <div style="margin-top:5px;font-size:11px;color:var(--text-muted);padding:6px 10px;background:var(--bg-elevated);border-radius:6px;border:1px solid var(--border)">
                <i class="ti ti-info-circle" style="margin-right:4px;color:var(--accent)"></i>
                Tipp: <code style="font-family:monospace;background:var(--bg-hover);padding:1px 5px;border-radius:3px">**Wort**</code> markiert ein Wort mit rotem Oval und Akzentfarbe
              </div>
            </div>
            <div>
              <label class="field-label">Beschreibungstext</label>
              <textarea v-model="form.heroDesc" class="field-input" rows="3" style="resize:vertical" placeholder="Kurze Beschreibung deines Unternehmens..."></textarea>
            </div>
            <div>
              <label class="field-label">CTA-Button Text</label>
              <input v-model="form.heroCtaLabel" class="field-input" placeholder="Kontakt aufnehmen" />
            </div>

            <!-- Title font size -->
            <div>
              <label class="field-label">Schriftgröße Firmenname</label>
              <select v-model="form.heroTitleSize" class="field-input" style="cursor:pointer">
                <option value="sm">Klein (36pt)</option>
                <option value="md">Mittel (48pt)</option>
                <option value="lg">Groß (64pt) — Standard</option>
                <option value="xl">Sehr groß (80pt)</option>
                <option value="xxl">Riesig (96pt)</option>
              </select>
            </div>

            <!-- Background type -->
            <div>
              <label class="field-label">Hintergrund-Stil</label>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button v-for="bg in heroBgOptions" :key="bg.value" @click="form.heroBackground = bg.value"
                  style="display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:8px;border:1px solid;cursor:pointer;font-size:12px;font-weight:600;font-family:inherit;transition:all .15s"
                  :style="form.heroBackground === bg.value ? `border-color:var(--accent);background:var(--accent)22;color:var(--accent)` : `border-color:var(--border);background:var(--bg-elevated);color:var(--text-muted)`">
                  <i class="ti" :class="bg.icon"></i> {{ bg.label }}
                </button>
              </div>
            </div>

            <!-- Gradient colors -->
            <div>
              <label class="field-label">Logo-Farbverlauf (Firmenname)</label>
              <div style="display:flex;gap:10px;align-items:center">
                <div style="flex:1;text-align:center">
                  <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">Von</div>
                  <input type="color" v-model="form.heroGradientFrom" style="width:100%;height:32px;border:1px solid var(--border);border-radius:8px;padding:2px;background:var(--bg);cursor:pointer" />
                </div>
                <div style="flex:1;text-align:center">
                  <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">Über</div>
                  <input type="color" v-model="form.heroGradientVia" style="width:100%;height:32px;border:1px solid var(--border);border-radius:8px;padding:2px;background:var(--bg);cursor:pointer" />
                </div>
                <div style="flex:1;text-align:center">
                  <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">Bis</div>
                  <input type="color" v-model="form.heroGradientTo" style="width:100%;height:32px;border:1px solid var(--border);border-radius:8px;padding:2px;background:var(--bg);cursor:pointer" />
                </div>
                <!-- Preview -->
                <div style="flex:2;height:32px;border-radius:8px;overflow:hidden;border:1px solid var(--border)"
                  :style="`background:linear-gradient(to right, ${form.heroGradientFrom}, ${form.heroGradientVia}, ${form.heroGradientTo})`"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><span class="card-title"><i class="ti ti-info-circle" style="margin-right:8px;color:var(--accent)"></i>About / Über uns</span></div>
          <div>
            <label class="field-label">Text</label>
            <textarea v-model="form.aboutText" class="field-input" rows="4" style="resize:vertical" placeholder="Über uns..."></textarea>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title"><i class="ti ti-chart-bar" style="margin-right:8px;color:var(--accent)"></i>Zahlen & Fakten</span>
            <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" @click="addStat">
              <i class="ti ti-plus"></i>
            </button>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <div v-for="(stat, i) in form.stats" :key="i" style="display:flex;gap:10px;align-items:center">
              <input v-model="stat.value" class="field-input" placeholder="120+" style="width:100px;flex-shrink:0" />
              <input v-model="stat.label" class="field-input" placeholder="Projekte abgeschlossen" style="flex:1" />
              <button class="icon-btn" @click="removeStat(i)" style="color:#ef4444;flex-shrink:0"><i class="ti ti-trash"></i></button>
            </div>
            <div v-if="!form.stats.length" style="font-size:12px;color:var(--text-muted)">Noch keine Fakten — klick auf +</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><span class="card-title"><i class="ti ti-layout-bottombar" style="margin-right:8px;color:var(--accent)"></i>Footer</span></div>
          <div style="display:flex;flex-direction:column;gap:14px">
            <div>
              <label class="field-label">Tagline (unter Copyright)</label>
              <input v-model="form.footerTagline" class="field-input" placeholder="Ihr Partner für digitale Lösungen" />
            </div>
            <div style="display:flex;gap:12px;align-items:flex-start">
              <div style="flex:1">
                <label class="field-label">Status-Label</label>
                <input v-model="form.footerStatusLabel" class="field-input" placeholder="System Online" />
              </div>
              <div style="display:flex;flex-direction:column;gap:6px;padding-top:2px">
                <label class="field-label">Anzeigen</label>
                <button @click="form.footerShowStatus = !form.footerShowStatus"
                  style="width:42px;height:24px;border-radius:12px;border:none;cursor:pointer;transition:all .2s;position:relative;flex-shrink:0"
                  :style="form.footerShowStatus ? 'background:var(--accent)' : 'background:var(--border)'">
                  <span style="position:absolute;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .2s"
                    :style="form.footerShowStatus ? 'left:21px' : 'left:3px'"></span>
                </button>
              </div>
            </div>
            <div>
              <label class="field-label">Copyright-Text (leer = automatisch)</label>
              <input v-model="form.footerCopyrightText" class="field-input" :placeholder="`© ${new Date().getFullYear()} ${form.companyName || 'Dein Unternehmen'} — Alle Rechte vorbehalten`" />
            </div>
            <div>
              <label class="field-label">Credit-Text (z.B. "Programmiert mit Herz aus der Vulkaneifel")</label>
              <input v-model="form.footerCreditText" class="field-input" placeholder="Programmiert mit Herz aus der Vulkaneifel" />
            </div>
            <div v-if="form.footerCreditText">
              <label class="field-label">Credit-Icon</label>
              <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
                <button v-for="ic in ['ti-heart','ti-heart-filled','ti-flame','ti-bolt','ti-coffee','ti-rocket','ti-mountain','ti-bulb','ti-code','ti-star','ti-moon','ti-sun','ti-music','ti-leaf','ti-diamond','ti-award']"
                  :key="ic"
                  @click="form.footerCreditIcon = ic"
                  style="width:36px;height:36px;border-radius:8px;border:1px solid;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;background:var(--surface)"
                  :style="form.footerCreditIcon === ic ? 'border-color:var(--accent)' : 'border-color:var(--border)'">
                  <i :class="['ti', ic]" style="font-size:17px"
                    :style="form.footerCreditIcon === ic ? 'color:var(--accent)' : 'color:var(--text-muted)'"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── TAB: SERVICES ── -->
      <!-- ── TAB: MEDIEN ── -->
      <div v-else-if="activeTab === 'media'" style="max-width:640px;display:flex;flex-direction:column;gap:16px">
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="ti ti-layout-sidebar-right" style="margin-right:8px;color:var(--accent)"></i>Hero-Bereich rechts</span></div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">Was soll auf der Startseite rechts neben dem Text angezeigt werden?</div>

          <!-- Toggle: Code vs Bild -->
          <div style="display:flex;gap:10px;margin-bottom:20px">
            <button @click="form.heroMediaType = 'code'"
              style="flex:1;padding:14px;border-radius:10px;border:2px solid;cursor:pointer;font-family:inherit;transition:all .15s;text-align:left"
              :style="form.heroMediaType === 'code' ? 'border-color:var(--accent);background:var(--accent)11;color:var(--accent)' : 'border-color:var(--border);background:var(--bg-elevated);color:var(--text-muted)'">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <i class="ti ti-code" style="font-size:16px"></i>
                <span style="font-size:13px;font-weight:700">Code-Animation</span>
              </div>
              <div style="font-size:11px;opacity:.7">Animierter TypeScript-Code wird live getippt und wiederholt.</div>
            </button>
            <button @click="form.heroMediaType = 'image'"
              style="flex:1;padding:14px;border-radius:10px;border:2px solid;cursor:pointer;font-family:inherit;transition:all .15s;text-align:left"
              :style="form.heroMediaType === 'image' ? 'border-color:var(--accent);background:var(--accent)11;color:var(--accent)' : 'border-color:var(--border);background:var(--bg-elevated);color:var(--text-muted)'">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <i class="ti ti-photo" style="font-size:16px"></i>
                <span style="font-size:13px;font-weight:700">Eigenes Bild</span>
              </div>
              <div style="font-size:11px;opacity:.7">Lade ein eigenes Bild hoch — z.B. dein Team, ein Produkt-Screenshot oder Mockup.</div>
            </button>
          </div>

          <!-- Image upload (only when 'image' is selected) -->
          <div v-if="form.heroMediaType === 'image'" style="border-top:1px solid var(--border);padding-top:18px">
            <label class="field-label">Hero-Bild</label>
            <div style="display:flex;align-items:flex-start;gap:14px">
              <!-- Preview -->
              <div style="width:120px;height:80px;border-radius:8px;border:1px solid var(--border);background:var(--bg-elevated);flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center">
                <img v-if="form.heroImageUrl" :src="form.heroImageUrl"
                  style="width:100%;height:100%;object-fit:cover" @error="form.heroImageUrl=''" />
                <i v-else class="ti ti-photo" style="font-size:28px;color:var(--text-muted)"></i>
              </div>
              <!-- Upload button -->
              <div style="flex:1">
                <button @click="($refs.heroImageInput as HTMLInputElement).click()" :disabled="heroImageUploading"
                  class="accent-btn" style="height:32px;font-size:12px;padding:0 14px;display:inline-flex;align-items:center;gap:6px;margin-bottom:8px">
                  <i class="ti" :class="heroImageUploading ? 'ti-loader-2 spin' : 'ti-upload'"></i>
                  {{ heroImageUploading ? 'Lädt hoch...' : 'Bild vom Computer wählen' }}
                </button>
                <div style="font-size:11px;margin-bottom:8px" :style="form.heroImageUrl ? 'color:var(--accent)' : 'color:var(--text-muted)'">
                  {{ form.heroImageUrl ? '✓ Bild gesetzt' : 'JPG/PNG/WebP empfohlen · optimal: 480×360 px' }}
                </div>
                <button v-if="form.heroImageUrl" @click="form.heroImageUrl=''" class="icon-btn" style="font-size:11px;gap:4px;padding:4px 8px;display:inline-flex;align-items:center">
                  <i class="ti ti-x"></i> Bild entfernen
                </button>
              </div>
            </div>
            <input ref="heroImageInput" type="file" accept="image/*" style="display:none" @change="uploadHeroImage" />
          </div>

          <!-- Code animation info (when 'code' is selected) -->
          <div v-else style="padding:14px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;font-size:12px;color:var(--text-muted);display:flex;align-items:flex-start;gap:10px">
            <i class="ti ti-info-circle" style="color:var(--accent);flex-shrink:0;margin-top:1px"></i>
            <span>Die Code-Animation tippt automatisch TypeScript-Code und wiederholt sich in einer Endlosschleife. Der angezeigte Cloud-Provider kommt aus deinem <strong style="color:var(--text)">Stack-Tab</strong> (gelbe Items = Cloud).</span>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'services'" style="display:flex;flex-direction:column;gap:16px">

        <!-- Grid Layout selector -->
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="ti ti-layout-grid" style="margin-right:8px;color:var(--accent)"></i>Grid-Layout</span></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button v-for="layout in serviceLayoutOptions" :key="layout.value" @click="form.servicesLayout = layout.value"
              style="display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:8px;border:1px solid;cursor:pointer;font-size:12px;font-weight:600;font-family:inherit;transition:all .15s"
              :style="form.servicesLayout === layout.value ? `border-color:var(--accent);background:var(--accent)22;color:var(--accent)` : `border-color:var(--border);background:var(--bg-elevated);color:var(--text-muted)`">
              <i class="ti" :class="layout.icon"></i> {{ layout.label }}
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title"><i class="ti ti-briefcase" style="margin-right:8px;color:var(--accent)"></i>Leistungen</span>
            <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" @click="addService">
              <i class="ti ti-plus"></i> Neue Leistung
            </button>
          </div>
          <div style="display:flex;flex-direction:column;gap:12px">
            <!-- Backdrop closes picker -->
            <div v-if="openPickerIndex !== null" style="position:fixed;inset:0;z-index:40" @click="openPickerIndex = null"></div>

            <div v-for="(svc, i) in form.services" :key="i" style="padding:16px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px">
              <!-- Row 1: Icon picker + Title + Color + Delete -->
              <div style="display:flex;gap:10px;margin-bottom:10px;align-items:center">

                <!-- Icon picker button -->
                <div style="position:relative;flex-shrink:0">
                  <button @click.stop="openPickerIndex = openPickerIndex === i ? null : i"
                    :style="`width:48px;height:36px;background:var(--bg);border:1px solid ${svc.color || 'var(--border)'};border-radius:8px;cursor:pointer;font-size:22px;display:flex;align-items:center;justify-content:center;transition:border-color .15s`">
                    {{ svc.icon || '⭐' }}
                  </button>
                  <!-- Picker dropdown -->
                  <div v-if="openPickerIndex === i"
                    style="position:absolute;top:42px;left:0;z-index:50;background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;padding:10px;display:grid;grid-template-columns:repeat(8,1fr);gap:3px;width:272px;box-shadow:0 8px 24px rgba(0,0,0,.6)"
                    @click.stop>
                    <button v-for="ic in SERVICE_ICONS" :key="ic"
                      @click="svc.icon = ic; openPickerIndex = null"
                      :style="`width:30px;height:30px;font-size:16px;border:none;border-radius:6px;cursor:pointer;transition:background .1s;background:${svc.icon === ic ? (svc.color || 'var(--accent)') + '33' : 'transparent'}`"
                      @mouseenter="($event.target as HTMLElement).style.background='var(--border)'"
                      @mouseleave="($event.target as HTMLElement).style.background= svc.icon === ic ? (svc.color || 'var(--accent)') + '33' : 'transparent'">
                      {{ ic }}
                    </button>
                  </div>
                </div>

                <input v-model="svc.title" class="field-input" placeholder="Leistungstitel" style="flex:1" />

                <!-- Color picker -->
                <div style="flex-shrink:0;display:flex;align-items:center;gap:6px">
                  <input type="color" v-model="svc.color"
                    :title="svc.color || '#f97316'"
                    style="width:36px;height:36px;border:1px solid var(--border);border-radius:8px;padding:3px;background:var(--bg);cursor:pointer;flex-shrink:0" />
                </div>

                <button class="icon-btn" @click="removeService(i)" style="color:#ef4444;flex-shrink:0"><i class="ti ti-trash"></i></button>
              </div>
              <textarea v-model="svc.description" class="field-input" rows="2" placeholder="Kurzbeschreibung..." style="resize:vertical;margin-bottom:8px"></textarea>
              <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">Features (kommagetrennt):</div>
              <input v-model="svc.featuresRaw" class="field-input" placeholder="Feature 1, Feature 2, Feature 3" style="font-size:12px" />
            </div>
            <div v-if="!form.services.length" style="text-align:center;padding:32px;color:var(--text-muted);font-size:13px">
              Noch keine Leistungen — klick auf "Neue Leistung"
            </div>
          </div>
        </div>
      </div>

      <!-- ── TAB: STACK ── -->
      <div v-else-if="activeTab === 'stack'" style="max-width:800px;display:flex;flex-direction:column;gap:16px">

        <!-- Items Card -->
        <div class="card">
          <div class="card-header">
            <span class="card-title"><i class="ti ti-stack-2" style="margin-right:8px;color:var(--accent)"></i>Tech-Stack Ticker</span>
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:12px;color:var(--text-muted)">{{ form.stackEnabled ? 'Aktiv' : 'Versteckt' }}</span>
              <button @click="form.stackEnabled = !form.stackEnabled"
                style="width:42px;height:24px;border-radius:12px;border:none;cursor:pointer;transition:all .2s;position:relative;flex-shrink:0"
                :style="form.stackEnabled ? 'background:var(--accent)' : 'background:var(--border)'">
                <span style="position:absolute;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .2s"
                  :style="form.stackEnabled ? 'left:21px' : 'left:3px'"></span>
              </button>
            </div>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:14px">Endloser Ticker mit deinen Technologien und Tools. Pausiert beim Hover.</div>

          <!-- Section title -->
          <div style="margin-bottom:14px">
            <label class="field-label">Abschnittstitel</label>
            <input v-model="form.stackTitle" class="field-input" placeholder="TECH STACK" style="font-family:monospace;text-transform:uppercase;letter-spacing:.1em" />
          </div>

          <!-- Items list -->
          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
            <div v-for="(item, i) in form.stackItems" :key="i"
              style="display:flex;gap:8px;align-items:center;padding:8px 10px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px">
              <!-- Reorder -->
              <div style="display:flex;flex-direction:column;gap:1px;flex-shrink:0">
                <button class="icon-btn" style="height:14px;width:20px;font-size:10px;padding:0" @click="moveStackItem(i, -1)" :disabled="i === 0"><i class="ti ti-chevron-up"></i></button>
                <button class="icon-btn" style="height:14px;width:20px;font-size:10px;padding:0" @click="moveStackItem(i, 1)" :disabled="i === form.stackItems.length - 1"><i class="ti ti-chevron-down"></i></button>
              </div>
              <span style="flex-shrink:0;font-size:10px;font-weight:700;padding:3px 12px;border-radius:9999px;font-family:monospace;text-transform:uppercase;letter-spacing:.05em;border:1px solid;min-width:80px;text-align:center"
                :style="stackChipStyle(item.color)">{{ item.label || '…' }}</span>
              <input v-model="item.label" class="field-input" placeholder="Label" style="flex:1;padding:5px 10px;height:32px;font-size:12px" />
              <select v-model="item.color" class="field-input" style="width:148px;padding:5px 8px;height:32px;font-size:12px;cursor:pointer">
                <option v-for="col in STACK_COLORS" :key="col.value" :value="col.value">{{ col.label }}</option>
              </select>
              <button class="icon-btn" @click="removeStackItem(i)" style="color:#ef4444;flex-shrink:0"><i class="ti ti-trash"></i></button>
            </div>
            <div v-if="!form.stackItems.length" style="text-align:center;padding:24px;color:var(--text-muted);font-size:12px;background:var(--bg-elevated);border:1px dashed var(--border);border-radius:8px">
              Noch keine Items — nutze die Schnellauswahl oder trag manuell ein
            </div>
          </div>

          <!-- Add new item -->
          <div style="display:flex;gap:8px;align-items:center;padding:10px;background:var(--bg);border:1px dashed var(--border);border-radius:8px">
            <input v-model="form.stackNewLabel" class="field-input" placeholder="z.B. Vue.js" style="flex:1;padding:5px 10px;height:32px;font-size:12px"
              @keydown.enter="addStackItem" />
            <select v-model="form.stackNewColor" class="field-input" style="width:148px;padding:5px 8px;height:32px;font-size:12px;cursor:pointer">
              <option v-for="col in STACK_COLORS" :key="col.value" :value="col.value">{{ col.label }}</option>
            </select>
            <button class="accent-btn" style="height:32px;font-size:12px;padding:0 14px;flex-shrink:0" @click="addStackItem">
              <i class="ti ti-plus" style="margin-right:4px"></i> Hinzufügen
            </button>
          </div>
        </div>

        <!-- Schnellauswahl -->
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="ti ti-sparkles" style="margin-right:8px;color:var(--accent)"></i>Schnellauswahl</span></div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">Klick auf einen Chip um ihn zur Liste hinzuzufügen (bereits hinzugefügte sind gedimmt):</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            <button v-for="preset in STACK_PRESETS" :key="preset.label"
              @click="addPreset(preset)"
              :disabled="form.stackItems.some(x => x.label === preset.label)"
              style="font-size:10px;font-weight:700;padding:4px 14px;border-radius:9999px;font-family:monospace;text-transform:uppercase;letter-spacing:.05em;cursor:pointer;border:1px solid;transition:opacity .15s;background:none"
              :style="[stackChipStyle(preset.color), form.stackItems.some(x => x.label === preset.label) ? 'opacity:.35;cursor:default' : 'opacity:1']">
              {{ preset.label }}
            </button>
          </div>
        </div>

        <!-- Legende -->
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="ti ti-tag" style="margin-right:8px;color:var(--accent)"></i>Legende — Kategorienamen</span></div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:14px">Benenne die Farbkategorien wie du möchtest — erscheint als Legende neben dem Ticker.</div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <div v-for="col in STACK_COLORS" :key="col.value" style="display:flex;gap:10px;align-items:center">
              <span style="font-size:10px;font-weight:700;padding:4px 14px;border-radius:9999px;font-family:monospace;text-transform:uppercase;letter-spacing:.05em;border:1px solid;flex-shrink:0;min-width:110px;text-align:center"
                :style="stackChipStyle(col.value)">
                {{ form.stackLegend[col.value] || col.label }}
              </span>
              <input v-model="form.stackLegend[col.value]" class="field-input" :placeholder="col.label" style="flex:1;padding:5px 10px;height:32px;font-size:12px" />
            </div>
          </div>
        </div>

      </div>

      <!-- ── TAB: KUNDEN ── -->
      <div v-else-if="activeTab === 'clients'" style="max-width:700px;display:flex;flex-direction:column;gap:16px">
        <div class="card">
          <div class="card-header">
            <span class="card-title"><i class="ti ti-building-community" style="margin-right:8px;color:var(--accent)"></i>Referenz-Ticker</span>
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:12px;color:var(--text-muted)">{{ form.clientsEnabled ? 'Aktiv' : 'Versteckt' }}</span>
              <button @click="form.clientsEnabled = !form.clientsEnabled"
                style="width:42px;height:24px;border-radius:12px;border:none;cursor:pointer;transition:all .2s;position:relative;flex-shrink:0"
                :style="form.clientsEnabled ? 'background:var(--accent)' : 'background:var(--border)'">
                <span style="position:absolute;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .2s"
                  :style="form.clientsEnabled ? 'left:21px' : 'left:3px'"></span>
              </button>
            </div>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:14px">Endloser Ticker mit deinen Kunden, Referenzen oder Projektnamen. Trenner "/" zwischen den Einträgen.</div>

          <!-- Section title -->
          <div style="margin-bottom:16px">
            <label class="field-label">Abschnittstitel</label>
            <input v-model="form.clientsTitle" class="field-input" placeholder="REFERENZEN" style="font-family:monospace;text-transform:uppercase;letter-spacing:.1em" />
          </div>

          <!-- Items list -->
          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
            <div v-for="(item, i) in form.clientsItems" :key="i"
              style="display:flex;gap:8px;align-items:center;padding:8px 12px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px">
              <!-- Reorder -->
              <div style="display:flex;flex-direction:column;gap:1px;flex-shrink:0">
                <button class="icon-btn" style="height:14px;width:20px;font-size:10px;padding:0" @click="moveClientItem(i, -1)" :disabled="i === 0"><i class="ti ti-chevron-up"></i></button>
                <button class="icon-btn" style="height:14px;width:20px;font-size:10px;padding:0" @click="moveClientItem(i, 1)" :disabled="i === form.clientsItems.length - 1"><i class="ti ti-chevron-down"></i></button>
              </div>
              <span style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);flex-shrink:0;min-width:8px">/</span>
              <input v-model="item.name" class="field-input" placeholder="Firmenname" style="flex:1;padding:5px 10px;height:32px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;font-family:monospace" />
              <button class="icon-btn" @click="removeClientItem(i)" style="color:#ef4444;flex-shrink:0"><i class="ti ti-trash"></i></button>
            </div>
            <div v-if="!form.clientsItems.length" style="text-align:center;padding:24px;color:var(--text-muted);font-size:12px;background:var(--bg-elevated);border:1px dashed var(--border);border-radius:8px">
              Noch keine Einträge — füge deine Kunden oder Referenzen hinzu
            </div>
          </div>

          <!-- Add new -->
          <div style="display:flex;gap:8px;align-items:center;padding:10px;background:var(--bg);border:1px dashed var(--border);border-radius:8px">
            <input v-model="form.clientsNewName" class="field-input" placeholder="z.B. Dell Technologies" style="flex:1;padding:5px 10px;height:32px;font-size:12px"
              @keydown.enter="addClientItem" />
            <button class="accent-btn" style="height:32px;font-size:12px;padding:0 14px;flex-shrink:0" @click="addClientItem">
              <i class="ti ti-plus" style="margin-right:4px"></i> Hinzufügen
            </button>
          </div>
        </div>
      </div>

      <!-- ── TAB: SEITEN ── -->
      <div v-else-if="activeTab === 'pages'" style="display:flex;gap:16px;min-height:600px">
        <!-- Sidebar: page list -->
        <div style="width:220px;flex-shrink:0;display:flex;flex-direction:column;gap:8px">
          <div v-for="(pg, i) in form.pages" :key="pg.slug"
            @click="editingPage = i"
            style="padding:10px 12px;border-radius:8px;cursor:pointer;border:1px solid transparent;transition:all .15s;font-size:13px;display:flex;align-items:center;gap:8px"
            :style="editingPage === i ? 'background:var(--accent)18;border-color:var(--accent);color:var(--accent)' : 'background:var(--bg-elevated);border-color:var(--border);color:var(--text)'">
            <i class="ti ti-file-text" style="font-size:15px;flex-shrink:0"></i>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ pg.title }}</span>
            <button class="icon-btn" style="color:#ef4444;padding:0;width:18px;height:18px;font-size:12px" @click.stop="removePage(i)">
              <i class="ti ti-x"></i>
            </button>
          </div>
          <button class="accent-btn" style="height:32px;font-size:12px;margin-top:4px" @click="addPage">
            <i class="ti ti-plus" style="margin-right:4px"></i> Neue Seite
          </button>
        </div>

        <!-- Monaco Editor -->
        <div v-if="editingPage !== null && form.pages[editingPage]" style="flex:1;display:flex;flex-direction:column;gap:0;border:1px solid var(--border);border-radius:10px;overflow:hidden">
          <!-- Editor Toolbar -->
          <div style="display:flex;align-items:center;gap:10px;padding:8px 14px;background:var(--bg-elevated);border-bottom:1px solid var(--border)">
            <div style="display:flex;align-items:center;gap:6px;flex:1">
              <i class="ti ti-file-code" style="color:var(--accent)"></i>
              <input v-model="form.pages[editingPage!].title" style="background:transparent;border:none;outline:none;font-size:13px;font-weight:600;color:var(--text);font-family:inherit;width:200px" placeholder="Seitentitel" />
              <span style="color:var(--border)">|</span>
              <code style="font-size:11px;color:var(--text-muted)">/{{ form.pages[editingPage!].slug }}</code>
            </div>
            <!-- Content type toggle -->
            <div style="display:flex;background:var(--bg);border:1px solid var(--border);border-radius:6px;overflow:hidden">
              <button v-for="ct in ['html','markdown']" :key="ct"
                @click="form.pages[editingPage!].contentType = ct as any"
                style="padding:4px 10px;font-size:11px;font-weight:600;border:none;cursor:pointer;transition:all .15s;font-family:inherit;text-transform:uppercase;letter-spacing:.05em"
                :style="form.pages[editingPage!].contentType === ct ? 'background:var(--accent);color:#fff' : 'background:transparent;color:var(--text-muted)'">
                {{ ct }}
              </button>
            </div>
            <!-- Monaco theme selector -->
            <select v-model="monacoTheme" @change="setMonacoTheme(monacoTheme)"
              style="background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:11px;color:var(--text);font-family:inherit;cursor:pointer">
              <option v-for="t in monacoThemes" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>
          </div>

          <!-- Editor -->
          <ClientOnly>
            <VueMonacoEditor
              v-model:value="form.pages[editingPage!].content"
              :language="form.pages[editingPage!].contentType === 'markdown' ? 'markdown' : 'html'"
              :theme="monacoTheme"
              :options="{
                fontSize: 13,
                lineHeight: 22,
                minimap: { enabled: false },
                wordWrap: 'on',
                tabSize: 2,
                scrollBeyondLastLine: false,
                fontFamily: '\'JetBrains Mono\', \'Fira Code\', monospace',
                padding: { top: 16, bottom: 16 },
              }"
              style="flex:1;min-height:520px"
            />
            <template #fallback>
              <div style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--text-muted)">
                <i class="ti ti-loader-2 spin"></i>
              </div>
            </template>
          </ClientOnly>
        </div>

        <div v-else style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--text-muted);gap:12px">
          <i class="ti ti-file-text" style="font-size:40px;opacity:.3"></i>
          <div style="font-size:13px">Seite auswählen oder neue erstellen</div>
        </div>
      </div>

      <!-- ── TAB: BLOG SETTINGS ── -->
      <div v-else-if="activeTab === 'blog-settings'" style="max-width:640px;display:flex;flex-direction:column;gap:16px">
        <div class="card">
          <div class="card-header">
            <span class="card-title"><i class="ti ti-news" style="margin-right:8px;color:var(--accent)"></i>Blog</span>
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:12px;color:var(--text-muted)">{{ form.blogEnabled ? 'Aktiv' : 'Versteckt' }}</span>
              <button @click="form.blogEnabled = !form.blogEnabled"
                style="width:42px;height:24px;border-radius:12px;border:none;cursor:pointer;transition:all .2s;position:relative;flex-shrink:0"
                :style="form.blogEnabled ? 'background:var(--accent)' : 'background:var(--border)'">
                <span style="position:absolute;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .2s"
                  :style="form.blogEnabled ? 'left:21px' : 'left:3px'"></span>
              </button>
            </div>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">Blog-Sektion auf der Website aktivieren. Beiträge verwaltest du im Sidebar-Menü unter <strong>Blog</strong>.</div>
          <div>
            <label class="field-label">Blog-Titel (Navigation & Überschrift)</label>
            <input v-model="form.blogTitle" class="field-input" placeholder="Blog" />
          </div>
        </div>
      </div>

      <!-- ── TAB: SHOP SETTINGS ── -->
      <div v-else-if="activeTab === 'shop-settings'" style="max-width:640px;display:flex;flex-direction:column;gap:16px">
        <div class="card">
          <div class="card-header">
            <span class="card-title"><i class="ti ti-shopping-cart" style="margin-right:8px;color:var(--accent)"></i>Shop</span>
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:12px;color:var(--text-muted)">{{ form.shopEnabled ? 'Aktiv' : 'Versteckt' }}</span>
              <button @click="form.shopEnabled = !form.shopEnabled"
                style="width:42px;height:24px;border-radius:12px;border:none;cursor:pointer;transition:all .2s;position:relative;flex-shrink:0"
                :style="form.shopEnabled ? 'background:var(--accent)' : 'background:var(--border)'">
                <span style="position:absolute;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .2s"
                  :style="form.shopEnabled ? 'left:21px' : 'left:3px'"></span>
              </button>
            </div>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">Shop-Link in der Navigation der Website aktivieren. Shop-Produkte verwaltest du im Sidebar-Menü unter <strong>Shop</strong>.</div>
          <div>
            <label class="field-label">Shop-Titel (Navigation & Überschrift)</label>
            <input v-model="form.shopTitle" class="field-input" placeholder="Shop" />
          </div>
        </div>
      </div>

      <!-- ── TAB: NEWSLETTER SETTINGS ── -->
      <div v-else-if="activeTab === 'newsletter-settings'" style="max-width:640px;display:flex;flex-direction:column;gap:16px">
        <div class="card">
          <div class="card-header">
            <span class="card-title"><i class="ti ti-mail" style="margin-right:8px;color:var(--accent)"></i>Newsletter</span>
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:12px;color:var(--text-muted)">{{ form.newsletterEnabled ? 'Aktiv' : 'Versteckt' }}</span>
              <button @click="form.newsletterEnabled = !form.newsletterEnabled"
                style="width:42px;height:24px;border-radius:12px;border:none;cursor:pointer;transition:all .2s;position:relative;flex-shrink:0"
                :style="form.newsletterEnabled ? 'background:var(--accent)' : 'background:var(--border)'">
                <span style="position:absolute;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .2s"
                  :style="form.newsletterEnabled ? 'left:21px' : 'left:3px'"></span>
              </button>
            </div>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">Anmeldeformular im Footer der Website anzeigen. Abonnenten und Absender-Einstellungen verwaltest du im Sidebar-Menü unter <strong>Newsletter</strong>.</div>
          <div>
            <label class="field-label">Überschrift im Footer</label>
            <input v-model="form.newsletterTitle" class="field-input" placeholder="Newsletter" />
          </div>
        </div>
      </div>

      <!-- ── TAB: SEO ── -->
      <div v-else-if="activeTab === 'seo'" style="max-width:640px;display:flex;flex-direction:column;gap:16px">
        <div class="card">
          <div class="card-header">
            <span class="card-title"><i class="ti ti-robot" style="margin-right:8px;color:var(--accent)"></i>Robots.txt</span>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">Steuert, welche Bereiche Suchmaschinen-Crawler durchsuchen dürfen. Leer lassen für die Standard-Einstellung (alles erlaubt).</div>
          <textarea v-model="form.robotsTxt" class="field-input" style="height:120px;resize:vertical;font-family:monospace;font-size:12px" placeholder="User-Agent: *&#10;Disallow:"></textarea>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title"><i class="ti ti-tags" style="margin-right:8px;color:var(--accent)"></i>Meta-Keywords</span>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">Kommagetrennte Schlagworte für Suchmaschinen (heute kaum noch relevant fürs Ranking, schadet aber nicht).</div>
          <input v-model="form.metaKeywords" class="field-input" placeholder="handwerk, sanitär, heizung, köln" />
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title"><i class="ti ti-brand-google" style="margin-right:8px;color:var(--accent)"></i>Google Analytics</span>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">
            Measurement-ID aus <a href="https://analytics.google.com" target="_blank" rel="noopener" style="color:var(--accent)">analytics.google.com</a> (Format <code>G-XXXXXXXXXX</code>). Lädt nur, wenn Besucher der Cookie-Nutzung zustimmen.
          </div>
          <input v-model="form.gaMeasurementId" class="field-input" placeholder="G-XXXXXXXXXX" />
        </div>
      </div>

      <!-- ── TAB: AGB ── -->
      <div v-else-if="activeTab === 'agb'" style="display:flex;flex-direction:column;gap:0;height:calc(100vh - 180px);border:1px solid var(--border);border-radius:10px;overflow:hidden">
        <div style="display:flex;align-items:center;gap:10px;padding:8px 14px;background:var(--bg-elevated);border-bottom:1px solid var(--border);flex-shrink:0">
          <i class="ti ti-license" style="color:var(--accent)"></i>
          <span style="font-size:13px;font-weight:600;color:var(--text);flex:1">Allgemeine Geschäftsbedingungen</span>
          <code style="font-size:11px;color:var(--text-muted)">/agb</code>
          <div style="display:flex;background:var(--bg);border:1px solid var(--border);border-radius:6px;overflow:hidden">
            <button v-for="ct in ['html','markdown']" :key="ct"
              @click="legalPage('agb').contentType = ct"
              style="padding:4px 10px;font-size:11px;font-weight:600;border:none;cursor:pointer;transition:all .15s;font-family:inherit;text-transform:uppercase;letter-spacing:.05em"
              :style="legalPage('agb').contentType === ct ? 'background:var(--accent);color:#fff' : 'background:transparent;color:var(--text-muted)'">
              {{ ct }}
            </button>
          </div>
          <select v-model="monacoTheme" @change="setMonacoTheme(monacoTheme)"
            style="background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:11px;color:var(--text);font-family:inherit;cursor:pointer">
            <option v-for="t in monacoThemes" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </div>
        <ClientOnly>
          <VueMonacoEditor
            v-model:value="legalPage('agb').content"
            :language="legalPage('agb').contentType === 'markdown' ? 'markdown' : 'html'"
            :theme="monacoTheme"
            :options="{ fontSize:13, lineHeight:22, minimap:{enabled:false}, wordWrap:'on', tabSize:2, scrollBeyondLastLine:false, fontFamily:'\'JetBrains Mono\',\'Fira Code\',monospace', padding:{top:16,bottom:16} }"
            style="flex:1"
          />
          <template #fallback><div style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--text-muted)"><i class="ti ti-loader-2 spin"></i></div></template>
        </ClientOnly>
      </div>

      <!-- ── TAB: DATENSCHUTZ ── -->
      <div v-else-if="activeTab === 'datenschutz'" style="display:flex;flex-direction:column;gap:0;height:calc(100vh - 180px);border:1px solid var(--border);border-radius:10px;overflow:hidden">
        <div style="display:flex;align-items:center;gap:10px;padding:8px 14px;background:var(--bg-elevated);border-bottom:1px solid var(--border);flex-shrink:0">
          <i class="ti ti-shield-lock" style="color:var(--accent)"></i>
          <span style="font-size:13px;font-weight:600;color:var(--text);flex:1">Datenschutzerklärung</span>
          <code style="font-size:11px;color:var(--text-muted)">/datenschutz</code>
          <div style="display:flex;background:var(--bg);border:1px solid var(--border);border-radius:6px;overflow:hidden">
            <button v-for="ct in ['html','markdown']" :key="ct"
              @click="legalPage('datenschutz').contentType = ct"
              style="padding:4px 10px;font-size:11px;font-weight:600;border:none;cursor:pointer;transition:all .15s;font-family:inherit;text-transform:uppercase;letter-spacing:.05em"
              :style="legalPage('datenschutz').contentType === ct ? 'background:var(--accent);color:#fff' : 'background:transparent;color:var(--text-muted)'">
              {{ ct }}
            </button>
          </div>
          <select v-model="monacoTheme" @change="setMonacoTheme(monacoTheme)"
            style="background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:11px;color:var(--text);font-family:inherit;cursor:pointer">
            <option v-for="t in monacoThemes" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </div>
        <ClientOnly>
          <VueMonacoEditor
            v-model:value="legalPage('datenschutz').content"
            :language="legalPage('datenschutz').contentType === 'markdown' ? 'markdown' : 'html'"
            :theme="monacoTheme"
            :options="{ fontSize:13, lineHeight:22, minimap:{enabled:false}, wordWrap:'on', tabSize:2, scrollBeyondLastLine:false, fontFamily:'\'JetBrains Mono\',\'Fira Code\',monospace', padding:{top:16,bottom:16} }"
            style="flex:1"
          />
          <template #fallback><div style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--text-muted)"><i class="ti ti-loader-2 spin"></i></div></template>
        </ClientOnly>
      </div>

      <!-- ── TAB: THEME ── -->
      <div v-else-if="activeTab === 'theme'" style="max-width:760px;display:flex;flex-direction:column;gap:16px">
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="ti ti-brush" style="margin-right:8px;color:var(--accent)"></i>Website-Theme wählen</span></div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">Das Theme bestimmt das visuelle Erscheinungsbild deiner Nexora-Webseite. Weitere Premium-Themes folgen im Theme Shop.</div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
            <div v-for="t in nexoraThemes" :key="t.key"
              @click="form.theme = t.key; form.primaryColor = t.preview.accent"
              style="border-radius:12px;overflow:hidden;cursor:pointer;border:2px solid transparent;transition:all .2s"
              :style="form.theme === t.key ? 'border-color:var(--accent);box-shadow:0 0 0 3px var(--accent)22' : 'border-color:var(--border)'">
              <!-- Theme Preview -->
              <div style="padding:16px 18px;display:flex;flex-direction:column;gap:8px" :style="{ background: t.preview.bg }">
                <div style="display:flex;align-items:center;gap:8px">
                  <div style="width:28px;height:28px;border-radius:6px" :style="{ background: t.preview.accent }"></div>
                  <div style="display:flex;flex-direction:column;gap:3px">
                    <div style="height:6px;width:60px;border-radius:3px;opacity:.9" :style="{ background: t.preview.text }"></div>
                    <div style="height:4px;width:40px;border-radius:2px;opacity:.4" :style="{ background: t.preview.text }"></div>
                  </div>
                  <div v-if="form.theme === t.key" style="margin-left:auto;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center" :style="{ background: t.preview.accent }">
                    <i class="ti ti-check" style="font-size:10px;color:#fff"></i>
                  </div>
                </div>
                <div style="height:3px;border-radius:2px;width:100%" :style="{ background: t.preview.surface }"></div>
                <div style="display:flex;gap:4px">
                  <div style="height:4px;flex:2;border-radius:2px;opacity:.2" :style="{ background: t.preview.text }"></div>
                  <div style="height:4px;flex:3;border-radius:2px;opacity:.2" :style="{ background: t.preview.text }"></div>
                  <div style="height:4px;flex:1;border-radius:2px;opacity:.2" :style="{ background: t.preview.text }"></div>
                </div>
              </div>
              <div style="padding:10px 14px;background:var(--bg-elevated);border-top:1px solid var(--border)">
                <div style="font-size:13px;font-weight:600">{{ t.label }}</div>
                <div style="font-size:11px;color:var(--text-muted)">{{ t.desc }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Logo & Favicon -->
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="ti ti-photo" style="margin-right:8px;color:var(--accent)"></i>Logo & Favicon</span></div>
          <div style="display:flex;flex-direction:column;gap:16px">

            <!-- Logo -->
            <div>
              <label class="field-label">Logo</label>
              <div style="display:flex;align-items:center;gap:12px">
                <div style="width:56px;height:56px;border-radius:10px;border:1px solid var(--border);background:var(--bg-elevated);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden">
                  <img v-if="form.logoUrl" :src="form.logoUrl" style="width:100%;height:100%;object-fit:contain" @error="form.logoUrl=''" />
                  <i v-else class="ti ti-photo" style="font-size:22px;color:var(--text-muted)"></i>
                </div>
                <div style="flex:1">
                  <button @click="($refs.logoInput as HTMLInputElement).click()" :disabled="logoUploading"
                    class="accent-btn" style="height:32px;font-size:12px;padding:0 14px;display:inline-flex;align-items:center;gap:6px;margin-bottom:6px">
                    <i class="ti" :class="logoUploading ? 'ti-loader-2 spin' : 'ti-upload'"></i>
                    {{ logoUploading ? 'Lädt hoch...' : 'Datei wählen' }}
                  </button>
                  <div style="font-size:11px" :style="form.logoUrl ? 'color:var(--accent)' : 'color:var(--text-muted)'">
                    {{ form.logoUrl ? '✓ Logo gesetzt' : 'PNG/SVG empfohlen · Leer = Firmenname als Text' }}
                  </div>
                </div>
                <button v-if="form.logoUrl" @click="form.logoUrl=''" class="icon-btn"><i class="ti ti-x"></i></button>
              </div>
              <input ref="logoInput" type="file" accept="image/*" style="display:none" @change="uploadLogo" />
            </div>

            <!-- Favicon -->
            <div>
              <label class="field-label">Favicon (Browser-Tab Icon)</label>
              <div style="display:flex;align-items:center;gap:12px">
                <div style="width:40px;height:40px;border-radius:8px;border:1px solid var(--border);background:var(--bg-elevated);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden">
                  <img v-if="form.faviconUrl" :src="form.faviconUrl" style="width:24px;height:24px;object-fit:contain" @error="form.faviconUrl=''" />
                  <i v-else class="ti ti-bookmark" style="font-size:18px;color:var(--text-muted)"></i>
                </div>
                <div style="flex:1">
                  <button @click="($refs.faviconInput as HTMLInputElement).click()" :disabled="faviconUploading"
                    class="accent-btn" style="height:32px;font-size:12px;padding:0 14px;display:inline-flex;align-items:center;gap:6px;margin-bottom:6px">
                    <i class="ti" :class="faviconUploading ? 'ti-loader-2 spin' : 'ti-upload'"></i>
                    {{ faviconUploading ? 'Lädt hoch...' : 'Datei wählen' }}
                  </button>
                  <div style="font-size:11px" :style="form.faviconUrl ? 'color:var(--accent)' : 'color:var(--text-muted)'">
                    {{ form.faviconUrl ? '✓ Favicon gesetzt' : 'ICO/PNG · 32×32 oder 64×64 px' }}
                  </div>
                </div>
                <button v-if="form.faviconUrl" @click="form.faviconUrl=''" class="icon-btn"><i class="ti ti-x"></i></button>
              </div>
              <input ref="faviconInput" type="file" accept="image/*,.ico" style="display:none" @change="uploadFavicon" />
            </div>

          </div>
        </div>

        <!-- Design -->
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="ti ti-palette" style="margin-right:8px;color:var(--accent)"></i>Design</span></div>
          <div style="display:flex;flex-direction:column;gap:14px">
            <div>
              <label class="field-label">Primärfarbe (Akzent)</label>
              <div style="display:flex;align-items:center;gap:10px">
                <input type="color" v-model="form.primaryColor" style="width:36px;height:36px;border:1px solid var(--border);border-radius:8px;padding:2px;background:var(--bg);cursor:pointer" />
                <input v-model="form.primaryColor" class="field-input" style="flex:1;font-family:monospace" />
              </div>
            </div>
            <div>
              <label class="field-label">Hintergrundfarbe</label>
              <div style="display:flex;align-items:center;gap:10px">
                <input type="color" v-model="form.secondaryColor" style="width:36px;height:36px;border:1px solid var(--border);border-radius:8px;padding:2px;background:var(--bg);cursor:pointer" />
                <input v-model="form.secondaryColor" class="field-input" style="flex:1;font-family:monospace" />
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><span class="card-title"><i class="ti ti-building-store" style="margin-right:8px;color:var(--accent)"></i>Theme Shop</span></div>
          <div style="display:flex;align-items:center;gap:16px;padding:8px 0">
            <div style="width:44px;height:44px;background:var(--accent)18;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <i class="ti ti-sparkles" style="font-size:22px;color:var(--accent)"></i>
            </div>
            <div>
              <div style="font-size:14px;font-weight:600;margin-bottom:3px">Weitere Themes demnächst verfügbar</div>
              <div style="font-size:12px;color:var(--text-muted)">Premium-Themes für Nexora Web & Plexora Dashboard — einmalig kaufen oder im Pro-Plan enthalten.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── TAB: GITHUB ── -->
      <div v-else-if="activeTab === 'github'" style="max-width:760px;display:flex;flex-direction:column;gap:16px">
        <div class="card">
          <div class="card-header">
            <span class="card-title"><i class="ti ti-brand-github" style="margin-right:8px;color:var(--accent)"></i>GitHub Projekte</span>
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:12px;color:var(--text-muted)">{{ form.githubEnabled ? 'Aktiv' : 'Versteckt' }}</span>
              <button @click="form.githubEnabled = !form.githubEnabled"
                style="width:42px;height:24px;border-radius:12px;border:none;cursor:pointer;transition:all .2s;position:relative;flex-shrink:0"
                :style="form.githubEnabled ? 'background:var(--accent)' : 'background:var(--border)'">
                <span style="position:absolute;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .2s"
                  :style="form.githubEnabled ? 'left:21px' : 'left:3px'"></span>
              </button>
            </div>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">Zeige deine öffentlichen GitHub-Repos als Projekt-Cards auf der Website. Der PAT wird niemals an den Browser weitergegeben.</div>

          <!-- Section title -->
          <div style="margin-bottom:16px">
            <label class="field-label">Abschnittstitel</label>
            <input v-model="form.githubTitle" class="field-input" placeholder="PROJEKTE" style="font-family:monospace;text-transform:uppercase;letter-spacing:.1em" />
          </div>

          <!-- PAT -->
          <div style="margin-bottom:12px">
            <label class="field-label">GitHub Personal Access Token (PAT) <span v-if="form.githubPatConfigured" class="badge badge-success" style="font-size:10px;margin-left:4px">Hinterlegt</span></label>
            <div style="display:flex;gap:8px">
              <div style="flex:1;position:relative">
                <input v-model="form.githubPat" class="field-input" :placeholder="form.githubPatConfigured ? 'Unverändert lassen zum Beibehalten' : 'github_pat_...'" style="width:100%;font-family:monospace;font-size:12px;padding-right:40px"
                  :type="form.githubPatVisible ? 'text' : 'password'" />
                <button @click="form.githubPatVisible = !form.githubPatVisible"
                  style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-muted)">
                  <i class="ti" :class="form.githubPatVisible ? 'ti-eye-off' : 'ti-eye'"></i>
                </button>
              </div>
              <button class="accent-btn" style="height:36px;padding:0 16px;font-size:12px;flex-shrink:0;white-space:nowrap"
                :disabled="!form.githubPat.trim() || form.githubLoading" @click="loadGithubRepos">
                <i class="ti" :class="form.githubLoading ? 'ti-loader-2' : 'ti-refresh'" style="margin-right:4px"></i>
                {{ form.githubLoading ? 'Laden...' : 'Repos laden' }}
              </button>
            </div>
            <div style="margin-top:6px;font-size:11px;color:var(--text-muted)">
              <i class="ti ti-info-circle" style="margin-right:4px"></i>
              Nur "Read-only" auf Public Repositories nötig — kein Schreibzugriff.
            </div>
          </div>

          <!-- Show forks toggle -->
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
            <button @click="form.githubShowForks = !form.githubShowForks"
              style="width:36px;height:20px;border-radius:10px;border:none;cursor:pointer;position:relative;flex-shrink:0;transition:all .2s"
              :style="form.githubShowForks ? 'background:var(--accent)' : 'background:var(--border)'">
              <span style="position:absolute;top:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .2s"
                :style="form.githubShowForks ? 'left:18px' : 'left:2px'"></span>
            </button>
            <span style="font-size:12px;color:var(--text-muted)">Forks anzeigen</span>
          </div>

          <!-- Repo selection -->
          <div v-if="form.githubAvailable.length > 0">
            <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">
              Repos auswählen <span style="font-weight:400;color:var(--text-muted)">(leer = alle anzeigen)</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;max-height:360px;overflow-y:auto">
              <div v-for="repo in form.githubAvailable" :key="repo.name"
                @click="toggleGithubRepo(repo.name)"
                style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:8px;cursor:pointer;transition:all .15s"
                :style="form.githubRepos.includes(repo.name)
                  ? 'background:rgba(var(--accent-rgb),.12);border:1px solid var(--accent)'
                  : 'background:var(--bg-elevated);border:1px solid var(--border)'">
                <i class="ti ti-brand-github" style="font-size:16px;flex-shrink:0" :style="form.githubRepos.includes(repo.name) ? 'color:var(--accent)' : 'color:var(--text-muted)'"></i>
                <div style="flex:1;min-width:0">
                  <div style="font-size:13px;font-weight:700;font-family:monospace">{{ repo.name }}</div>
                  <div v-if="repo.description" style="font-size:11px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ repo.description }}</div>
                </div>
                <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
                  <span v-if="repo.language" style="font-size:10px;padding:2px 8px;border-radius:9999px;background:var(--bg-hover);color:var(--text-muted);font-family:monospace">{{ repo.language }}</span>
                  <span style="font-size:11px;color:var(--text-muted)"><i class="ti ti-star" style="margin-right:2px"></i>{{ repo.stars }}</span>
                  <i class="ti" :class="form.githubRepos.includes(repo.name) ? 'ti-check' : 'ti-circle'" :style="form.githubRepos.includes(repo.name) ? 'color:var(--accent)' : 'color:var(--border)'"></i>
                </div>
              </div>
            </div>
            <div style="margin-top:8px;font-size:11px;color:var(--text-muted)">
              {{ form.githubRepos.length === 0 ? 'Alle öffentlichen Repos werden angezeigt' : `${form.githubRepos.length} Repo(s) ausgewählt` }}
            </div>
          </div>
          <div v-else-if="!form.githubPat.trim()" style="text-align:center;padding:32px;color:var(--text-muted);font-size:12px;background:var(--bg-elevated);border:1px dashed var(--border);border-radius:8px">
            <i class="ti ti-brand-github" style="font-size:32px;display:block;margin-bottom:8px;opacity:.3"></i>
            PAT eingeben und "Repos laden" klicken
          </div>
        </div>
      </div>

      <!-- ── TAB: POSITIONEN ── -->
      <div v-else-if="activeTab === 'position'" style="max-width:600px;display:flex;flex-direction:column;gap:16px">
        <div class="card">
          <div class="card-header">
            <span class="card-title"><i class="ti ti-layout-rows" style="margin-right:8px;color:var(--accent)"></i>Sektions-Reihenfolge</span>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:18px">Bestimme die Reihenfolge der Sektionen auf der Website. Hero und Footer sind immer fest.</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <template v-for="(key, idx) in form.sectionOrder" :key="key">
            <div v-if="SECTION_META[key]"
              style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:10px;border:1px solid;transition:all .15s"
              :style="{ borderColor: SECTION_META[key].color + '55', background: SECTION_META[key].color + '0d' }">
              <!-- Position number -->
              <div style="width:22px;height:22px;border-radius:50%;border:1px solid;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0"
                :style="{ borderColor: SECTION_META[key].color + '80', color: SECTION_META[key].color }">{{ idx + 1 }}</div>
              <!-- Icon + label -->
              <i class="ti" :class="SECTION_META[key].icon" style="font-size:16px;flex-shrink:0" :style="{ color: SECTION_META[key].color }"></i>
              <div style="flex:1">
                <div style="font-size:13px;font-weight:700;font-family:monospace;text-transform:uppercase;letter-spacing:.08em" :style="{ color: SECTION_META[key].color }">{{ SECTION_META[key].label }}</div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:2px">{{ SECTION_META[key].desc }}</div>
              </div>
              <!-- Enabled indicator -->
              <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
                <div style="width:6px;height:6px;border-radius:50%" :style="sectionEnabled(key) ? 'background:#22c55e;box-shadow:0 0 4px #22c55e88' : 'background:var(--border)'"></div>
                <span style="font-size:10px;color:var(--text-muted)">{{ sectionEnabled(key) ? 'Aktiv' : 'Aus' }}</span>
              </div>
              <!-- Reorder arrows -->
              <div style="display:flex;flex-direction:column;gap:2px;flex-shrink:0">
                <button class="icon-btn" style="height:18px;width:24px;font-size:11px;padding:0" @click="moveSectionItem(idx, -1)" :disabled="idx === 0"><i class="ti ti-chevron-up"></i></button>
                <button class="icon-btn" style="height:18px;width:24px;font-size:11px;padding:0" @click="moveSectionItem(idx, 1)" :disabled="idx === form.sectionOrder.length - 1"><i class="ti ti-chevron-down"></i></button>
              </div>
            </div>
            </template>
          </div>
          <div style="margin-top:16px;padding:12px;background:var(--bg-elevated);border:1px dashed var(--border);border-radius:8px;font-size:11px;color:var(--text-muted)">
            <i class="ti ti-info-circle" style="margin-right:6px;color:var(--accent)"></i>
            Die Vorschau rechts aktualisiert sich sofort. Zum Übernehmen oben auf <strong>Speichern</strong> klicken.
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title"><i class="ti ti-menu-2" style="margin-right:8px;color:var(--accent)"></i>Navigation-Reihenfolge</span>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:18px">Ziehe die Menüpunkte in die gewünschte Reihenfolge — so erscheinen sie in der Navigation deiner Webseite.</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <template v-for="(key, idx) in form.navOrder" :key="key">
            <div v-if="NAV_META[key]"
              draggable="true"
              @dragstart="onNavDragStart(idx)"
              @dragover.prevent="onNavDragOver(idx)"
              @drop="onNavDrop(idx)"
              @dragend="onNavDragEnd"
              style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:10px;border:1px solid var(--border);background:var(--bg-elevated);cursor:grab;transition:opacity .15s,border-color .15s"
              :style="{
                opacity: draggedNavIndex === idx ? 0.4 : 1,
                borderColor: dragOverNavIndex === idx && draggedNavIndex !== idx ? 'var(--accent)' : 'var(--border)',
              }">
              <!-- Grip handle -->
              <i class="ti ti-grip-vertical" style="font-size:16px;color:var(--text-muted);flex-shrink:0"></i>
              <!-- Position number -->
              <div style="width:22px;height:22px;border-radius:50%;border:1px solid var(--border);font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--text-muted)">{{ idx + 1 }}</div>
              <!-- Icon + label -->
              <i class="ti" :class="NAV_META[key].icon" style="font-size:16px;flex-shrink:0;color:var(--accent)"></i>
              <div style="flex:1;font-size:13px;font-weight:600">{{ navLabel(key) }}</div>
              <!-- Enabled indicator -->
              <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
                <div style="width:6px;height:6px;border-radius:50%" :style="navEnabled(key) ? 'background:#22c55e;box-shadow:0 0 4px #22c55e88' : 'background:var(--border)'"></div>
                <span style="font-size:10px;color:var(--text-muted)">{{ navEnabled(key) ? 'Aktiv' : 'Aus' }}</span>
              </div>
            </div>
            </template>
          </div>
          <div style="margin-top:16px;padding:12px;background:var(--bg-elevated);border:1px dashed var(--border);border-radius:8px;font-size:11px;color:var(--text-muted)">
            <i class="ti ti-info-circle" style="margin-right:6px;color:var(--accent)"></i>
            Ausgeblendete Menüpunkte (z.B. weil das Modul noch nicht aktiviert ist) erscheinen erst live, sobald sie aktiv sind — die Reihenfolge bleibt erhalten.
          </div>
        </div>
      </div>

      <!-- ── TAB: KONTAKT ── -->
      <div v-else-if="activeTab === 'contact'" style="max-width:560px">
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="ti ti-map-pin" style="margin-right:8px;color:var(--accent)"></i>Kontaktdaten</span></div>
          <div style="display:flex;flex-direction:column;gap:14px">
            <div>
              <label class="field-label">Adresse</label>
              <textarea v-model="form.contactAddress" class="field-input" rows="2" placeholder="Musterstraße 1&#10;12345 Musterstadt" style="resize:vertical"></textarea>
            </div>
            <div>
              <label class="field-label">E-Mail</label>
              <input v-model="form.contactEmail" class="field-input" type="email" placeholder="info@meine-firma.de" />
            </div>
            <div>
              <label class="field-label">Telefon</label>
              <input v-model="form.contactPhone" class="field-input" placeholder="+49 123 456789" />
            </div>
            <div>
              <label class="field-label">Erreichbarkeit</label>
              <input v-model="form.contactAvailability" class="field-input" placeholder="Mo – Fr, 9:00 – 18:00 Uhr" />
            </div>
          </div>
        </div>

        <!-- Impressum-Felder -->
        <div class="card" style="margin-top:14px">
          <div class="card-header"><span class="card-title"><i class="ti ti-gavel" style="margin-right:8px;color:var(--accent)"></i>Impressum (§ 5 TMG)</span></div>
          <div style="display:flex;flex-direction:column;gap:14px">
            <div>
              <label class="field-label">Inhaber / Verantwortliche Person</label>
              <input v-model="form.contactLegalName" class="field-input" placeholder="Max Mustermann" />
            </div>
            <div>
              <label class="field-label">Umsatzsteuer-ID (optional)</label>
              <input v-model="form.contactVatId" class="field-input" placeholder="DE123456789" />
            </div>
          </div>
        </div>

        <div style="margin-top:14px;padding:12px 16px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;font-size:12px;color:var(--text-muted)">
          <i class="ti ti-info-circle" style="margin-right:6px;color:var(--accent)"></i>
          Kontaktformular-Submissions landen automatisch als Leads in deinem <NuxtLink to="/crm" style="color:var(--accent);text-decoration:none">CRM</NuxtLink>.
        </div>
      </div>

      </div><!-- /left column -->

      <!-- ── WIREFRAME PREVIEW PANEL ── -->
      <div style="position:sticky;top:120px;display:flex;flex-direction:column;gap:0">
        <div style="font-size:10px;font-weight:700;letter-spacing:.15em;color:var(--text-muted);text-transform:uppercase;margin-bottom:10px;display:flex;align-items:center;gap:8px">
          <i class="ti ti-device-desktop" style="font-size:13px"></i> Vorschau
        </div>
        <!-- Browser chrome -->
        <div style="border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--bg-elevated)">
          <div style="background:var(--bg-hover);padding:8px 12px;display:flex;align-items:center;gap:6px;border-bottom:1px solid var(--border)">
            <div style="width:8px;height:8px;border-radius:50%;background:#ef4444;flex-shrink:0"></div>
            <div style="width:8px;height:8px;border-radius:50%;background:#f97316;flex-shrink:0"></div>
            <div style="width:8px;height:8px;border-radius:50%;background:#22c55e;flex-shrink:0"></div>
            <div style="flex:1;background:var(--bg-elevated);border-radius:4px;height:16px;margin-left:6px;display:flex;align-items:center;padding:0 8px">
              <span style="font-size:9px;color:var(--text-muted);font-family:monospace">{{ nexora?.customDomain || 'deine-domain.de' }}</span>
            </div>
          </div>
          <!-- Site sections wireframe -->
          <div style="padding:8px;display:flex;flex-direction:column;gap:4px">
            <!-- Navbar (fixed) -->
            <div style="height:22px;border-radius:4px;background:var(--bg-hover);border:1px solid var(--border);display:flex;align-items:center;padding:0 8px;gap:6px">
              <div style="width:30px;height:4px;border-radius:2px;background:var(--accent);opacity:.7"></div>
              <div style="flex:1"></div>
              <div v-for="n in 3" :key="n" style="width:20px;height:3px;border-radius:2px;background:var(--border)"></div>
            </div>
            <!-- Hero (fixed first) -->
            <div style="height:64px;border-radius:4px;border:1px solid var(--accent);background:rgba(var(--accent-rgb),.06);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px">
              <div style="width:80px;height:4px;border-radius:2px;background:var(--accent);opacity:.8"></div>
              <div style="width:110px;height:3px;border-radius:2px;background:var(--accent);opacity:.4"></div>
              <div style="width:50px;height:10px;border-radius:4px;background:var(--accent);opacity:.5;margin-top:2px"></div>
            </div>
            <!-- Moveable sections -->
            <template v-for="(key, idx) in form.sectionOrder" :key="key">
              <div v-if="SECTION_META[key]"
                style="border-radius:4px;border:1px solid;display:flex;align-items:center;gap:6px;padding:0 8px;position:relative;cursor:default;transition:all .15s"
                :style="{
                  height: SECTION_META[key].height + 'px',
                  borderColor: SECTION_META[key].color + '55',
                  background: SECTION_META[key].color + '0d',
                  opacity: sectionEnabled(key) ? 1 : .3,
                }">
                <i class="ti" :class="SECTION_META[key].icon" style="font-size:11px;flex-shrink:0" :style="{ color: SECTION_META[key].color }"></i>
                <span style="font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-family:monospace" :style="{ color: SECTION_META[key].color }">{{ SECTION_META[key].label }}</span>
                <div style="margin-left:auto;display:flex;flex-direction:column;gap:1px">
                  <button @click="moveSectionItem(idx, -1)" :disabled="idx === 0"
                    style="width:14px;height:10px;border-radius:2px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:8px;padding:0"
                    :style="idx === 0 ? 'background:transparent;color:var(--border)' : 'background:var(--bg-hover);color:var(--text-muted)'">▲</button>
                  <button @click="moveSectionItem(idx, 1)" :disabled="idx === form.sectionOrder.length - 1"
                    style="width:14px;height:10px;border-radius:2px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:8px;padding:0"
                    :style="idx === form.sectionOrder.length - 1 ? 'background:transparent;color:var(--border)' : 'background:var(--bg-hover);color:var(--text-muted)'">▼</button>
                </div>
              </div>
            </template>
            <!-- Footer (fixed) -->
            <div style="height:20px;border-radius:4px;background:var(--bg-hover);border:1px solid var(--border);display:flex;align-items:center;justify-content:center">
              <div style="width:60px;height:2px;border-radius:2px;background:var(--border)"></div>
            </div>
          </div>
        </div>
        <div style="font-size:10px;color:var(--text-muted);text-align:center;margin-top:8px">▲▼ zum Verschieben — Speichern nicht vergessen</div>
      </div>

      </div><!-- /grid -->

    </template>
  </div>
</template>

<script setup lang="ts">
import { VueMonacoEditor } from '@guolao/vue-monaco-editor'
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const { useAuthUser, useAuthHeader } = await import('~/composables/useAuth')
const u = await useAuthUser()

const loading         = ref(true)
const saving          = ref(false)
const logoUploading      = ref(false)
const faviconUploading   = ref(false)
const heroImageUploading = ref(false)

async function uploadFile(file: File, prefix: string): Promise<string> {
  const b64 = await new Promise<string>((res, rej) => {
    const r = new FileReader()
    r.onload  = e => res(e.target?.result as string)
    r.onerror = rej
    r.readAsDataURL(file)
  })
  const result = await $fetch<{ url: string }>(useApiUrl('/api/aws/s3-upload'), {
    method: 'POST',
    headers: await useAuthHeader(),
    body: { fileBase64: b64, fileName: `${Date.now()}-${file.name}`, prefix },
  })
  return result.url
}

async function uploadLogo(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  logoUploading.value = true
  try { form.logoUrl = await uploadFile(file, 'nexora/logos/') }
  catch { alert('Logo-Upload fehlgeschlagen') }
  finally { logoUploading.value = false; (e.target as HTMLInputElement).value = '' }
}

async function uploadFavicon(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  faviconUploading.value = true
  try { form.faviconUrl = await uploadFile(file, 'nexora/favicons/') }
  catch { alert('Favicon-Upload fehlgeschlagen') }
  finally { faviconUploading.value = false; (e.target as HTMLInputElement).value = '' }
}

async function uploadHeroImage(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  heroImageUploading.value = true
  try { form.heroImageUrl = await uploadFile(file, 'nexora/hero/') }
  catch { alert('Bild-Upload fehlgeschlagen') }
  finally { heroImageUploading.value = false; (e.target as HTMLInputElement).value = '' }
}
const nexora  = ref<any>(null)
const showKey = ref(false)
const copied  = ref(false)
const activeTab = ref('connection')
const showDevSection = ref(false)
const siteStats = ref<any>(null)
const loadingSiteStats = ref(false)

watch(activeTab, (tab) => {
  if (tab === 'traffic' && !siteStats.value && !loadingSiteStats.value) loadSiteStats()
})

async function loadSiteStats() {
  loadingSiteStats.value = true
  try {
    const res = await $fetch<any>(useApiUrl('/api/nexora/site-analytics'), {
      headers: { 'x-user-email': u.email || '', Authorization: `Bearer ${u.idToken || ''}` },
    })
    siteStats.value = res?.stats || null
  } catch {
    siteStats.value = null
  }
  loadingSiteStats.value = false
}

const maxSiteDay = computed(() => {
  if (!siteStats.value?.days) return 0
  return Math.max(...siteStats.value.days.map((d: any) => d.human + d.bot), 1)
})

function siteFlag(code: string): string {
  if (!code || code.length !== 2) return '🌍'
  return code.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397))
}
const SITE_COUNTRY_NAMES: Record<string, string> = {
  DE:'Deutschland', AT:'Österreich', CH:'Schweiz', US:'USA', GB:'Großbritannien',
  FR:'Frankreich', NL:'Niederlande', BE:'Belgien', PL:'Polen', IT:'Italien',
  ES:'Spanien', RU:'Russland', UA:'Ukraine', TR:'Türkei', IN:'Indien',
  CN:'China', JP:'Japan', BR:'Brasilien', AU:'Australien', CA:'Kanada',
  LU:'Luxemburg', DK:'Dänemark', SE:'Schweden', NO:'Norwegen', FI:'Finnland',
  CZ:'Tschechien', SK:'Slowakei', HU:'Ungarn', RO:'Rumänien', XX:'Unbekannt',
}
function siteCountryName(code: string): string {
  return SITE_COUNTRY_NAMES[code] || code
}

const tabs = [
  { key: 'connection', label: 'Verbindung', icon: 'ti-plug' },
  { key: 'traffic',    label: 'Traffic',    icon: 'ti-chart-line' },
  { key: 'content',    label: 'Inhalte',    icon: 'ti-text-size' },
  { key: 'media',      label: 'Medien',     icon: 'ti-photo' },
  { key: 'services',   label: 'Leistungen', icon: 'ti-briefcase' },
  { key: 'stack',      label: 'Stack',      icon: 'ti-stack-2' },
  { key: 'clients',    label: 'Kunden',     icon: 'ti-building-community' },
  { key: 'github',     label: 'GitHub',      icon: 'ti-brand-github' },
  { key: 'position',   label: 'Positionen', icon: 'ti-layout-rows' },
  { key: 'contact',    label: 'Kontakt',    icon: 'ti-map-pin' },
  { key: 'pages',         label: 'Seiten',     icon: 'ti-file-text' },
  { key: 'blog-settings',  label: 'Blog',       icon: 'ti-news' },
  { key: 'shop-settings',  label: 'Shop',       icon: 'ti-shopping-cart' },
  { key: 'newsletter-settings', label: 'Newsletter', icon: 'ti-mail' },
  { key: 'seo',           label: 'SEO',        icon: 'ti-search' },
  { key: 'agb',           label: 'AGB',        icon: 'ti-license' },
  { key: 'datenschutz',label: 'Datenschutz',icon: 'ti-shield-lock' },
  { key: 'theme',      label: 'Theme',      icon: 'ti-palette' },
]

const form = reactive({
  robotsTxt:           '',
  metaKeywords:        '',
  gaMeasurementId:     '',
  companyName:         '',
  subdomain:           '',
  customDomain:        '',
  primaryColor:        '#6C3FE8',
  secondaryColor:      '#0a0e1a',
  heroLocation:        '',
  heroHeadline:        '',
  heroSubline:         '',
  heroDesc:            '',
  heroCtaLabel:        'Kontakt aufnehmen',
  aboutText:           '',
  stats:               [] as { value: string; label: string }[],
  services:            [] as { icon: string; color: string; title: string; description: string; featuresRaw: string }[],
  logoUrl:             '',
  faviconUrl:          '',
  heroBackground:      'grid' as string,
  heroTitleSize:       'lg' as string,
  heroGradientFrom:    '#fb923c',
  heroGradientVia:     '#ea580c',
  heroGradientTo:      '#431407',
  servicesLayout:      'auto' as string,
  contactAddress:      '',
  contactEmail:        '',
  contactPhone:        '',
  contactAvailability: 'Mo – Fr, 9:00 – 18:00 Uhr',
  contactLegalName:    '',
  contactVatId:        '',
  pages: [] as { slug: string; title: string; content: string; contentType: 'html' | 'markdown' }[],
  theme: 'midnight' as string,
  footerTagline:       '',
  footerStatusLabel:   'System Online',
  footerShowStatus:    true,
  footerCopyrightText: '',
  footerCreditText:    '',
  footerCreditIcon:    'ti-heart',
  stackEnabled:  true,
  stackTitle:    'TECH STACK',
  stackItems:    [] as { label: string; color: string }[],
  stackLegend: {
    blue:   'Frontend',
    green:  'Backend',
    red:    'Database',
    orange: 'Systems',
    yellow: 'Cloud',
    violet: 'Microsoft Stack',
  } as Record<string, string>,
  stackNewLabel: '',
  stackNewColor: 'blue' as string,
  clientsEnabled:  false,
  clientsTitle:    'REFERENZEN',
  clientsItems:    [] as { name: string }[],
  clientsNewName:  '',
  githubEnabled:   false,
  blogEnabled:     false,
  blogTitle:       'Blog',
  shopEnabled:     false,
  shopTitle:       'Shop',
  newsletterEnabled: false,
  newsletterTitle:   'Newsletter',
  githubPat:       '',
  githubPatConfigured: false,
  githubTitle:     'PROJEKTE',
  githubShowForks: false,
  githubRepos:     [] as string[],
  githubAvailable: [] as { name: string; description: string; language: string; stars: number }[],
  githubLoading:   false,
  githubPatVisible: false,
  sectionOrder:    ['stack', 'clients', 'github', 'services', 'contact'] as string[],
  navOrder:        ['start', 'leistungen', 'about', 'kontakt', 'shop', 'blog', 'vehicles', 'menu', 'properties', 'termine'] as string[],
  heroMediaType:   'code' as 'code' | 'image',
  heroImageUrl:    '',
})

onMounted(async () => {
  try {
    const res = await $fetch<any>(useApiUrl('/api/nexora/my'), {
      headers: { 'x-user-email': u.email || '', Authorization: `Bearer ${u.idToken || ''}` },
    })
    if (res?.nexora) {
      const n = res.nexora
      nexora.value = n
      form.companyName    = n.companyName  || ''
      form.subdomain      = n.subdomain    || ''
      form.customDomain   = n.customDomain || ''
      form.primaryColor   = n.config?.primaryColor   || '#6C3FE8'
      form.secondaryColor = n.config?.secondaryColor || '#0a0e1a'
      form.heroLocation   = n.hero?.location  || ''
      form.heroHeadline   = n.hero?.headline  || ''
      form.heroSubline    = n.hero?.subline    || ''
      form.heroDesc       = n.hero?.desc      || ''
      form.heroCtaLabel   = n.hero?.ctaLabel  || 'Kontakt aufnehmen'
      form.aboutText      = n.about?.text     || ''
      form.stats          = n.about?.stats    || []
      form.services       = (n.services || []).map((s: any) => ({
        ...s,
        color:       s.color || n.config?.primaryColor || '#f97316',
        featuresRaw: (s.features || []).join(', ')
      }))
      form.contactAddress      = n.contactInfo?.address      || ''
      form.contactEmail        = n.contactInfo?.email        || ''
      form.contactPhone        = n.contactInfo?.phone        || ''
      form.contactAvailability = n.contactInfo?.availability || 'Mo – Fr, 9:00 – 18:00 Uhr'
      form.contactLegalName    = n.contactInfo?.legalName    || ''
      form.contactVatId        = n.contactInfo?.vatId        || ''
      form.pages               = n.pages  || defaultPages()
      form.theme               = n.theme  || 'midnight'
      form.footerTagline       = n.footer?.tagline       || ''
      form.footerStatusLabel   = n.footer?.statusLabel   || 'System Online'
      form.footerShowStatus    = n.footer?.showStatus    ?? true
      form.footerCopyrightText = n.footer?.copyrightText || ''
      form.footerCreditText    = n.footer?.creditText    || ''
      form.footerCreditIcon    = n.footer?.creditIcon    || 'ti-heart'
      form.logoUrl             = n.logoUrl             || ''
      form.faviconUrl          = n.faviconUrl          || ''
      form.heroBackground      = n.heroBackground      || 'grid'
      form.heroTitleSize       = n.heroTitleSize       || 'lg'
      form.heroGradientFrom    = n.heroGradient?.from  || '#fb923c'
      form.heroGradientVia     = n.heroGradient?.via   || '#ea580c'
      form.heroGradientTo      = n.heroGradient?.to    || '#431407'
      form.servicesLayout      = n.servicesLayout      || 'auto'
      form.stackEnabled        = n.stackEnabled        ?? true
      form.stackTitle          = n.stackTitle          || 'TECH STACK'
      form.stackItems          = n.stackItems          || []
      form.stackLegend         = { ...form.stackLegend, ...(n.stackLegend || {}) }
      form.clientsEnabled      = n.clientsEnabled ?? false
      form.clientsTitle        = n.clientsTitle   || 'REFERENZEN'
      form.clientsItems        = n.clientsItems   || []
      form.githubEnabled       = n.githubEnabled  ?? false
      form.blogEnabled         = n.blogEnabled    ?? false
      form.blogTitle           = n.blogTitle      || 'Blog'
      form.shopEnabled         = n.shopEnabled    ?? false
      form.shopTitle           = n.shopTitle      || 'Shop'
      form.newsletterEnabled   = n.newsletterEnabled ?? false
      form.newsletterTitle     = n.newsletterTitle   || 'Newsletter'
      form.githubPatConfigured = n.githubPatConfigured ?? false
      form.githubTitle         = n.githubTitle    || 'PROJEKTE'
      form.githubShowForks     = n.githubShowForks ?? false
      form.githubRepos         = n.githubRepos    || []
      form.sectionOrder        = n.sectionOrder   || ['stack', 'clients', 'github', 'services', 'contact']
      form.navOrder            = n.navOrder       || ['start', 'leistungen', 'about', 'kontakt', 'shop', 'blog', 'vehicles', 'menu', 'properties', 'termine']
      form.heroMediaType       = n.heroMediaType  || 'code'
      form.heroImageUrl        = n.heroImageUrl   || ''
      form.robotsTxt           = n.robotsTxt        || ''
      form.metaKeywords        = n.metaKeywords     || ''
      form.gaMeasurementId     = n.gaMeasurementId  || ''

      if (n.tenantId) {
        try {
          const pub = await $fetch<any>(useApiUrl(`/api/public/${n.tenantId}/branding`))
          Object.assign(navStatus, {
            vehiclesEnabled:   pub.vehiclesEnabled   ?? false,
            vehiclesTitle:     pub.vehiclesTitle      || 'Fahrzeuge',
            menuEnabled:       pub.menuEnabled       ?? false,
            menuTitle:         pub.menuTitle          || 'Speisekarte',
            propertiesEnabled: pub.propertiesEnabled  ?? false,
            propertiesTitle:   pub.propertiesTitle     || 'Immobilien',
            termineEnabled:    pub.termineEnabled     ?? false,
            termineTitle:      pub.termineTitle        || 'Termine',
          })
        } catch {}
      }
    }
  } catch {}
  loading.value = false
})

async function save() {
  saving.value = true
  try {
    await $fetch(useApiUrl('/api/nexora/my'), {
      method: 'PUT',
      headers: { 'x-user-email': u.email || '', Authorization: `Bearer ${u.idToken || ''}` },
      body: {
        companyName:  form.companyName,
        subdomain:    form.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        customDomain: form.customDomain.toLowerCase().replace(/\s/g, ''),
        config: {
          primaryColor:   form.primaryColor,
          secondaryColor: form.secondaryColor,
        },
        hero: {
          location: form.heroLocation,
          headline: form.heroHeadline,
          subline:  form.heroSubline,
          desc:     form.heroDesc,
          ctaLabel: form.heroCtaLabel,
        },
        about: {
          text:  form.aboutText,
          stats: form.stats,
        },
        services: form.services.map(s => ({
          icon:        s.icon,
          color:       s.color || '',
          title:       s.title,
          description: s.description,
          features:    s.featuresRaw.split(',').map((f: string) => f.trim()).filter(Boolean),
        })),
        contactInfo: {
          address:      form.contactAddress,
          email:        form.contactEmail,
          phone:        form.contactPhone,
          availability: form.contactAvailability,
          legalName:    form.contactLegalName,
          vatId:        form.contactVatId,
        },
        pages: form.pages,
        theme: form.theme,
        logoUrl:        form.logoUrl,
        faviconUrl:     form.faviconUrl,
        heroBackground: form.heroBackground,
        heroTitleSize:  form.heroTitleSize,
        heroGradient:   { from: form.heroGradientFrom, via: form.heroGradientVia, to: form.heroGradientTo },
        servicesLayout: form.servicesLayout,
        footer: {
          tagline:       form.footerTagline,
          statusLabel:   form.footerStatusLabel,
          showStatus:    form.footerShowStatus,
          copyrightText: form.footerCopyrightText,
          creditText:    form.footerCreditText,
          creditIcon:    form.footerCreditIcon,
        },
        stackEnabled: form.stackEnabled,
        stackTitle:   form.stackTitle,
        stackItems:   form.stackItems,
        stackLegend:  form.stackLegend,
        clientsEnabled: form.clientsEnabled,
        clientsTitle:   form.clientsTitle,
        clientsItems:   form.clientsItems,
        githubEnabled:  form.githubEnabled,
        githubPat:      form.githubPat,
        githubTitle:    form.githubTitle,
        blogEnabled:    form.blogEnabled,
        blogTitle:      form.blogTitle,
        shopEnabled:    form.shopEnabled,
        shopTitle:      form.shopTitle,
        newsletterEnabled: form.newsletterEnabled,
        newsletterTitle:   form.newsletterTitle,
        githubShowForks: form.githubShowForks,
        githubRepos:    form.githubRepos,
        sectionOrder:   form.sectionOrder,
        navOrder:       form.navOrder,
        heroMediaType:  form.heroMediaType,
        heroImageUrl:   form.heroImageUrl,
        robotsTxt:       form.robotsTxt,
        metaKeywords:    form.metaKeywords,
        gaMeasurementId: form.gaMeasurementId,
      },
    })
    if (nexora.value) nexora.value.subdomain = form.subdomain
  } catch (e: any) {
    alert('Fehler: ' + (e?.message || ''))
  }
  saving.value = false
}

const heroBgOptions = [
  { value: 'grid',   label: 'Gitter',   icon: 'ti-grid-dots' },
  { value: 'dots',   label: 'Punkte',   icon: 'ti-dots' },
  { value: 'neural', label: 'Neural',   icon: 'ti-vector-triangle' },
  { value: 'waves',  label: 'Wellen',   icon: 'ti-wave-sine' },
  { value: 'solid',  label: 'Einfarbig',icon: 'ti-square-filled' },
]
const serviceLayoutOptions = [
  { value: 'auto', label: 'Auto',     icon: 'ti-layout-grid' },
  { value: '2',    label: '2 Spalten',icon: 'ti-columns-2' },
  { value: '3',    label: '3 Spalten',icon: 'ti-columns-3' },
  { value: '4',    label: '4 Spalten',icon: 'ti-layout-grid' },
  { value: '2x2',  label: '2×2',      icon: 'ti-grid-4x4' },
]
const openPickerIndex = ref<number | null>(null)
const SERVICE_ICONS = [
  '💻','☁️','🚀','✅','🌐','📱','🔧','🛡️','📊','💡',
  '⚡','🎨','🔗','🏗️','📦','🤖','💬','📧','🔒','📈',
  '🎯','⭐','🔥','💎','🌟','⚙️','🔍','🖥️','📋','🏆',
  '🤝','🧩','🧠','🗂️','🗺️','🖱️','🔔','🎓','🏢','🌍',
]
function addService()   { form.services.push({ icon: '⭐', color: form.primaryColor || '#f97316', title: '', description: '', featuresRaw: '' }) }
function removeService(i: number) { form.services.splice(i, 1) }
function addStat()      { form.stats.push({ value: '', label: '' }) }
function removeStat(i: number)    { form.stats.splice(i, 1) }

// ── Pages / Monaco ────────────────────────────────────────────────────────────
const monacoTheme   = ref(import.meta.client ? (localStorage.getItem('plx_editor_theme') || 'vs-dark') : 'vs-dark')
const editingPage   = ref<number | null>(null)
const monacoThemes  = [
  { value: 'vs-dark',  label: 'VS Dark' },
  { value: 'vs',       label: 'VS Light' },
  { value: 'hc-black', label: 'High Contrast Dark' },
  { value: 'hc-light', label: 'High Contrast Light' },
]
function setMonacoTheme(v: string) {
  monacoTheme.value = v
  localStorage.setItem('plx_editor_theme', v)
}
function legalPage(slug: string) {
  let pg = form.pages.find(p => p.slug === slug)
  if (!pg) {
    const defaults: Record<string, { title: string; content: string }> = {
      agb:         { title: 'AGB',               content: '<h1>Allgemeine Geschäftsbedingungen</h1>\n<p>§ 1 Geltungsbereich</p>' },
      datenschutz: { title: 'Datenschutzerklärung', content: '<h1>Datenschutzerklärung</h1>\n<p>Der Schutz deiner persönlichen Daten ist uns wichtig.</p>' },
    }
    const d = defaults[slug] || { title: slug, content: '' }
    form.pages.push({ slug, title: d.title, content: d.content, contentType: 'html' as const })
    pg = form.pages[form.pages.length - 1]
  }
  return pg
}
function defaultPages() {
  return [
    { slug: 'impressum',    title: 'Impressum',     content: '<h1>Impressum</h1>\n<p>Angaben gemäß § 5 TMG</p>\n<p><strong>Firmenname</strong><br/>Straße, PLZ Ort</p>',              contentType: 'html' as const },
    { slug: 'datenschutz',  title: 'Datenschutz',   content: '<h1>Datenschutzerklärung</h1>\n<p>Der Schutz deiner persönlichen Daten ist uns wichtig.</p>',                         contentType: 'html' as const },
    { slug: 'agb',          title: 'AGB',            content: '<h1>Allgemeine Geschäftsbedingungen</h1>\n<p>§ 1 Geltungsbereich</p>',                                               contentType: 'html' as const },
  ]
}
function addPage() {
  form.pages.push({ slug: 'neue-seite-' + Date.now(), title: 'Neue Seite', content: '<h1>Neue Seite</h1>\n<p>Inhalt hier...</p>', contentType: 'html' })
  editingPage.value = form.pages.length - 1
}
function removePage(i: number) { form.pages.splice(i, 1); if (editingPage.value === i) editingPage.value = null }

// ── Stack ─────────────────────────────────────────────────────────────────────
function addStackItem() {
  if (!form.stackNewLabel.trim()) return
  form.stackItems.push({ label: form.stackNewLabel.trim(), color: form.stackNewColor })
  form.stackNewLabel = ''
}
function removeStackItem(i: number) { form.stackItems.splice(i, 1) }
function moveStackItem(i: number, dir: -1 | 1) {
  const j = i + dir
  if (j < 0 || j >= form.stackItems.length) return
  const tmp = form.stackItems[i]; form.stackItems[i] = form.stackItems[j]; form.stackItems[j] = tmp
}
function addPreset(preset: { label: string; color: string }) {
  if (!form.stackItems.some(x => x.label === preset.label))
    form.stackItems.push({ ...preset })
}

const STACK_COLORS = [
  { value: 'blue',   label: 'Frontend'       },
  { value: 'green',  label: 'Backend'        },
  { value: 'red',    label: 'Database'       },
  { value: 'orange', label: 'Systems'        },
  { value: 'yellow', label: 'Cloud'          },
  { value: 'violet', label: 'Microsoft Stack'},
]

const STACK_PRESETS = [
  { label: 'Vue.js',      color: 'green'  }, { label: 'React',       color: 'blue'   },
  { label: 'Angular',     color: 'red'    }, { label: 'Nuxt',        color: 'green'  },
  { label: 'Next.js',     color: 'blue'   }, { label: 'TypeScript',  color: 'blue'   },
  { label: 'JavaScript',  color: 'yellow' }, { label: 'Tailwind',    color: 'blue'   },
  { label: 'Node.js',     color: 'green'  }, { label: 'Python',      color: 'yellow' },
  { label: 'Go',          color: 'green'  }, { label: 'Rust',        color: 'orange' },
  { label: 'PHP',         color: 'violet' }, { label: 'Java',        color: 'orange' },
  { label: 'C#',          color: 'violet' }, { label: '.NET',        color: 'violet' },
  { label: 'ASP.NET',     color: 'violet' }, { label: 'Docker',      color: 'orange' },
  { label: 'Linux',       color: 'orange' }, { label: 'Nginx',       color: 'orange' },
  { label: 'Kubernetes',  color: 'orange' }, { label: 'PostgreSQL',  color: 'red'    },
  { label: 'MySQL',       color: 'red'    }, { label: 'MongoDB',     color: 'green'  },
  { label: 'Redis',       color: 'red'    }, { label: 'DynamoDB',    color: 'yellow' },
  { label: 'LibSQL',      color: 'red'    }, { label: 'AWS',         color: 'yellow' },
  { label: 'AWS S3',      color: 'yellow' }, { label: 'AWS Lambda',  color: 'yellow' },
  { label: 'AWS DynamoDB',color: 'yellow' }, { label: 'AWS IAM',     color: 'yellow' },
  { label: 'Azure',       color: 'violet' }, { label: 'GCP',         color: 'blue'   },
  { label: 'Vercel',      color: 'blue'   }, { label: 'Cloudflare',  color: 'orange' },
  { label: 'GitHub CI/CD',color: 'orange' },
]

const CHIP_COLOR: Record<string, { bg: string; text: string; bd: string }> = {
  blue:   { bg: '#3b82f618', text: '#93c5fd', bd: '#3b82f640' },
  green:  { bg: '#10b98118', text: '#6ee7b7', bd: '#10b98140' },
  red:    { bg: '#ef444418', text: '#fca5a5', bd: '#ef444440' },
  orange: { bg: '#f9731618', text: '#fdba74', bd: '#f9731640' },
  yellow: { bg: '#eab30818', text: '#fde047', bd: '#eab30840' },
  violet: { bg: '#8b5cf618', text: '#c4b5fd', bd: '#8b5cf640' },
}
// ── Clients ───────────────────────────────────────────────────────────────────
function addClientItem() {
  if (!form.clientsNewName.trim()) return
  form.clientsItems.push({ name: form.clientsNewName.trim() })
  form.clientsNewName = ''
}
function removeClientItem(i: number) { form.clientsItems.splice(i, 1) }
function moveClientItem(i: number, dir: -1 | 1) {
  const j = i + dir
  if (j < 0 || j >= form.clientsItems.length) return
  ;[form.clientsItems[i], form.clientsItems[j]] = [form.clientsItems[j], form.clientsItems[i]]
}

function stackChipStyle(color: string) {
  const c = CHIP_COLOR[color] || CHIP_COLOR.blue
  return `background:${c.bg};color:${c.text};border:1px solid ${c.bd}`
}

// ── Section Positioning ───────────────────────────────────────────────────────
const SECTION_META: Record<string, { label: string; icon: string; color: string; height: number; desc: string }> = {
  stack:    { label: 'Tech Stack',  icon: 'ti-stack-2',            color: '#10b981', height: 28, desc: 'Endlos-Ticker mit deinen Technologien' },
  clients:  { label: 'Referenzen', icon: 'ti-building-community',  color: '#f97316', height: 28, desc: 'Ticker mit Kunden & Partnernamen' },
  github:   { label: 'Projekte',   icon: 'ti-brand-github',        color: '#8b5cf6', height: 52, desc: 'GitHub Projekt-Cards' },
  services: { label: 'Leistungen', icon: 'ti-briefcase',           color: '#3b82f6', height: 52, desc: 'Deine Dienstleistungen als Cards' },
  contact:  { label: 'Kontakt',    icon: 'ti-map-pin',             color: '#06b6d4', height: 44, desc: 'Kontaktformular & Infos' },
}

function sectionEnabled(key: string): boolean {
  if (key === 'stack')    return form.stackEnabled
  if (key === 'clients')  return form.clientsEnabled
  if (key === 'github')   return form.githubEnabled
  return true
}

function moveSectionItem(i: number, dir: -1 | 1) {
  const j = i + dir
  if (j < 0 || j >= form.sectionOrder.length) return
  ;[form.sectionOrder[i], form.sectionOrder[j]] = [form.sectionOrder[j], form.sectionOrder[i]]
}

// ── Nav Positioning ─────────────────────────────────────────────────────────────
const navStatus = reactive({
  vehiclesEnabled: false, vehiclesTitle: 'Fahrzeuge',
  menuEnabled: false, menuTitle: 'Speisekarte',
  propertiesEnabled: false, propertiesTitle: 'Immobilien',
  termineEnabled: false, termineTitle: 'Termine',
})

const NAV_META: Record<string, { label: string; icon: string }> = {
  start:      { label: 'Start',       icon: 'ti-home' },
  leistungen: { label: 'Leistungen',  icon: 'ti-briefcase' },
  about:      { label: 'Über uns',    icon: 'ti-info-circle' },
  kontakt:    { label: 'Kontakt',     icon: 'ti-map-pin' },
  shop:       { label: 'Shop',        icon: 'ti-shopping-cart' },
  blog:       { label: 'Blog',        icon: 'ti-news' },
  vehicles:   { label: 'Fahrzeuge',   icon: 'ti-car' },
  menu:       { label: 'Speisekarte', icon: 'ti-tools-kitchen-2' },
  properties: { label: 'Immobilien',  icon: 'ti-building-estate' },
  termine:    { label: 'Termine',     icon: 'ti-calendar-event' },
}

function navLabel(key: string): string {
  if (key === 'shop')       return form.shopTitle || 'Shop'
  if (key === 'blog')       return form.blogTitle || 'Blog'
  if (key === 'vehicles')   return navStatus.vehiclesTitle
  if (key === 'menu')       return navStatus.menuTitle
  if (key === 'properties') return navStatus.propertiesTitle
  if (key === 'termine')    return navStatus.termineTitle
  return NAV_META[key]?.label || key
}

function navEnabled(key: string): boolean {
  if (key === 'shop')       return form.shopEnabled
  if (key === 'blog')       return form.blogEnabled
  if (key === 'vehicles')   return navStatus.vehiclesEnabled
  if (key === 'menu')       return navStatus.menuEnabled
  if (key === 'properties') return navStatus.propertiesEnabled
  if (key === 'termine')    return navStatus.termineEnabled
  return true
}

const draggedNavIndex  = ref<number | null>(null)
const dragOverNavIndex = ref<number | null>(null)

function onNavDragStart(idx: number) { draggedNavIndex.value = idx }
function onNavDragOver(idx: number)  { dragOverNavIndex.value = idx }
function onNavDrop(idx: number) {
  if (draggedNavIndex.value === null || draggedNavIndex.value === idx) {
    draggedNavIndex.value = null; dragOverNavIndex.value = null
    return
  }
  const [moved] = form.navOrder.splice(draggedNavIndex.value, 1)
  form.navOrder.splice(idx, 0, moved)
  draggedNavIndex.value = null
  dragOverNavIndex.value = null
}
function onNavDragEnd() { draggedNavIndex.value = null; dragOverNavIndex.value = null }

// ── GitHub ────────────────────────────────────────────────────────────────────
async function loadGithubRepos() {
  if (!form.githubPat.trim()) return
  form.githubLoading = true
  try {
    const repos = await $fetch<any[]>('https://api.github.com/user/repos?per_page=100&sort=updated&type=owner', {
      headers: {
        Authorization: `Bearer ${form.githubPat.trim()}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
    form.githubAvailable = repos
      .filter((r: any) => !r.private)
      .map((r: any) => ({ name: r.name, description: r.description || '', language: r.language || '', stars: r.stargazers_count }))
  } catch {
    alert('GitHub PAT ungültig oder Fehler beim Laden der Repos.')
  }
  form.githubLoading = false
}
function toggleGithubRepo(name: string) {
  const idx = form.githubRepos.indexOf(name)
  if (idx >= 0) form.githubRepos.splice(idx, 1)
  else form.githubRepos.push(name)
}

// ── Themes ────────────────────────────────────────────────────────────────────
const nexoraThemes = [
  {
    key: 'midnight',
    label: 'Midnight',
    desc: 'Dark Navy + Orange',
    preview: { bg: '#05070a', accent: '#f97316', text: '#f1f5f9', surface: '#0d1117' },
  },
  {
    key: 'slate',
    label: 'Slate',
    desc: 'Slate Dark + Blau',
    preview: { bg: '#0f172a', accent: '#3b82f6', text: '#e2e8f0', surface: '#1e293b' },
  },
  {
    key: 'emerald',
    label: 'Emerald',
    desc: 'Dunkel + Grün',
    preview: { bg: '#0a0f0a', accent: '#10b981', text: '#f0fdf4', surface: '#111811' },
  },
  {
    key: 'light',
    label: 'Light',
    desc: 'Hell + Blau',
    preview: { bg: '#ffffff', accent: '#2563eb', text: '#1e293b', surface: '#f8fafc' },
  },
]

function copyKey() {
  if (!nexora.value?.apiKey) return
  navigator.clipboard.writeText(nexora.value.apiKey)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

const customerSteps = computed(() => [
  {
    title: 'Unternehmensname & Domain eintragen',
    desc:  'Tab "Verbindung" → Firmenname + deine Domain eintragen → Speichern.',
    done:  !!(form.companyName && form.customDomain),
  },
  {
    title: 'Inhalte befüllen',
    desc:  'Tabs "Inhalte", "Leistungen" und "Kontakt" ausfüllen → Speichern.',
    done:  !!(form.heroHeadline && form.aboutText),
  },
  {
    title: 'Einen DNS-Eintrag setzen',
    desc:  'Bei deinem Domain-Anbieter: CNAME deinedomain.de → nexora-nuxt.pages.dev. Der genaue Eintrag wird oben angezeigt sobald du deine Domain einträgst.',
    done:  false,
  },
  {
    title: 'Fertig — Website ist live!',
    desc:  'Nach 5–10 Minuten ist deine Website auf deiner Domain erreichbar. Kein Code, kein Deploy, kein Stress.',
    done:  false,
  },
])
</script>

<style scoped>
.ws-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 900px) { .ws-grid { grid-template-columns: 1fr; } }
.field-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 6px;
}
.field-input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text);
  font-family: inherit;
  transition: border-color .15s;
}
.field-input:focus { outline: none; border-color: var(--accent); }
textarea.field-input { line-height: 1.5; }
.spin { animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
