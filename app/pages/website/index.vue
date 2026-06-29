<template>
  <div class="page">

    <!-- Header -->
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px;position:sticky;top:0;z-index:10;background:var(--bg);padding:16px 0 14px;margin-top:-16px;border-bottom:1px solid var(--border)">
      <div style="width:36px;height:36px;background:var(--accent);border-radius:10px;display:flex;align-items:center;justify-content:center">
        <i class="ti ti-world" style="font-size:18px;color:#fff"></i>
      </div>
      <div>
        <div style="font-size:18px;font-weight:700">Unternehmens-Webseite</div>
        <div style="font-size:12px;color:var(--text-muted)">Nexora · powered by Plexora</div>
      </div>
      <div style="margin-left:auto;display:flex;gap:8px">
        <a v-if="nexora?.subdomain" :href="`https://${nexora.subdomain}.nexora.de`" target="_blank" class="btn-secondary" style="font-size:12px;display:flex;align-items:center;gap:6px">
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
        <div style="font-size:12px;color:var(--text-muted)">{{ nexora.subdomain }}.nexora.de</div>
        <div style="margin-left:auto;font-size:11px;color:var(--text-muted)">Tenant: {{ nexora.tenantId }}</div>
      </div>

      <!-- Tabs -->
      <div style="display:flex;gap:8px;margin-bottom:20px;border-bottom:1px solid var(--border);padding-bottom:0;position:sticky;top:67px;z-index:9;background:var(--bg)">
        <button v-for="t in tabs" :key="t.key" @click="activeTab = t.key"
          style="padding:8px 14px;background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;font-size:13px;font-weight:500;color:var(--text-muted);transition:all .15s;margin-bottom:-1px;font-family:inherit"
          :style="activeTab === t.key ? 'color:var(--accent);border-bottom-color:var(--accent)' : ''">
          <i class="ti" :class="t.icon" style="margin-right:6px"></i>{{ t.label }}
        </button>
      </div>

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
              <label class="field-label">Headline (Zeile 1)</label>
              <input v-model="form.heroHeadline" class="field-input" placeholder="Software, die" />
            </div>
            <div>
              <label class="field-label">Headline Akzent (Zeile 2, farbig)</label>
              <input v-model="form.heroSubline" class="field-input" placeholder="wirklich skaliert." />
            </div>
            <div>
              <label class="field-label">Beschreibungstext</label>
              <textarea v-model="form.heroDesc" class="field-input" rows="3" style="resize:vertical" placeholder="Kurze Beschreibung deines Unternehmens..."></textarea>
            </div>
            <div>
              <label class="field-label">CTA-Button Text</label>
              <input v-model="form.heroCtaLabel" class="field-input" placeholder="Kontakt aufnehmen" />
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
          </div>
        </div>
      </div>

      <!-- ── TAB: SERVICES ── -->
      <div v-else-if="activeTab === 'services'" style="display:flex;flex-direction:column;gap:16px">
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

      <!-- ── TAB: THEME ── -->
      <div v-else-if="activeTab === 'theme'" style="max-width:760px;display:flex;flex-direction:column;gap:16px">
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="ti ti-brush" style="margin-right:8px;color:var(--accent)"></i>Website-Theme wählen</span></div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">Das Theme bestimmt das visuelle Erscheinungsbild deiner Nexora-Webseite. Weitere Premium-Themes folgen im Theme Shop.</div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
            <div v-for="t in nexoraThemes" :key="t.key"
              @click="form.theme = t.key"
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
        <div style="margin-top:14px;padding:12px 16px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;font-size:12px;color:var(--text-muted)">
          <i class="ti ti-info-circle" style="margin-right:6px;color:var(--accent)"></i>
          Kontaktformular-Submissions landen automatisch als Leads in deinem <NuxtLink to="/crm" style="color:var(--accent);text-decoration:none">CRM</NuxtLink>.
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { VueMonacoEditor } from '@guolao/vue-monaco-editor'
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const { useAuthUser } = await import('~/composables/useAuth')
const u = await useAuthUser()

const loading = ref(true)
const saving  = ref(false)
const nexora  = ref<any>(null)
const showKey = ref(false)
const copied  = ref(false)
const activeTab = ref('connection')
const showDevSection = ref(false)

const tabs = [
  { key: 'connection', label: 'Verbindung', icon: 'ti-plug' },
  { key: 'content',    label: 'Inhalte',    icon: 'ti-text-size' },
  { key: 'services',   label: 'Leistungen', icon: 'ti-briefcase' },
  { key: 'contact',    label: 'Kontakt',    icon: 'ti-map-pin' },
  { key: 'pages',      label: 'Seiten',     icon: 'ti-file-text' },
  { key: 'theme',      label: 'Theme',      icon: 'ti-palette' },
]

const form = reactive({
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
  contactAddress:      '',
  contactEmail:        '',
  contactPhone:        '',
  contactAvailability: 'Mo – Fr, 9:00 – 18:00 Uhr',
  pages: [] as { slug: string; title: string; content: string; contentType: 'html' | 'markdown' }[],
  theme: 'midnight' as string,
  footerTagline:     '',
  footerStatusLabel: 'System Online',
  footerShowStatus:  true,
})

onMounted(async () => {
  try {
    const res = await $fetch<any>(useApiUrl('/api/nexora/my'), {
      headers: { 'x-user-email': u.email || '' },
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
      form.pages               = n.pages  || defaultPages()
      form.theme               = n.theme  || 'midnight'
      form.footerTagline       = n.footer?.tagline     || ''
      form.footerStatusLabel   = n.footer?.statusLabel || 'System Online'
      form.footerShowStatus    = n.footer?.showStatus  ?? true
    }
  } catch {}
  loading.value = false
})

async function save() {
  saving.value = true
  try {
    await $fetch(useApiUrl('/api/nexora/my'), {
      method: 'PUT',
      headers: { 'x-user-email': u.email || '' },
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
        },
        pages: form.pages,
        theme: form.theme,
        footer: {
          tagline:     form.footerTagline,
          statusLabel: form.footerStatusLabel,
          showStatus:  form.footerShowStatus,
        },
      },
    })
    if (nexora.value) nexora.value.subdomain = form.subdomain
  } catch (e: any) {
    alert('Fehler: ' + (e?.message || ''))
  }
  saving.value = false
}

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
