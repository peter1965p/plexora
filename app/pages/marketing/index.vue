<template>
  <div class="mkt-page">

    <div class="mkt-tabs">
      <button class="mkt-tab" :class="{ active: tab === 'campaigns' }" @click="setTab('campaigns')"><i class="ti ti-speakerphone"></i> Kampagnen <span class="mkt-tab-count">{{ campaigns.length }}</span></button>
      <button class="mkt-tab" :class="{ active: tab === 'automations' }" @click="setTab('automations')"><i class="ti ti-bolt"></i> Automatisierungen <span class="mkt-tab-count">{{ automations.length }}</span></button>
      <button class="mkt-tab" :class="{ active: tab === 'mail' }" @click="setTab('mail')"><i class="ti ti-mail"></i> Versand-Protokoll <span class="mkt-tab-count">{{ mailLog.length }}</span></button>
    </div>

    <!-- STATS -->
    <div v-if="tab === 'campaigns'" class="mkt-stats">
      <div class="mkt-stat-card">
        <div class="mkt-stat-glow"></div>
        <div class="mkt-stat-icon"><i class="ti ti-speakerphone"></i></div>
        <div class="mkt-stat-body">
          <div class="mkt-stat-label">{{ t.marketing.campaigns }}</div>
          <div class="mkt-stat-value">{{ campaigns.length }}</div>
          <div class="mkt-stat-sub">{{ campaigns.filter((c:any) => c.active).length }} {{ t.common.active }}</div>
        </div>
      </div>
      <div class="mkt-stat-card">
        <div class="mkt-stat-glow"></div>
        <div class="mkt-stat-icon"><i class="ti ti-users"></i></div>
        <div class="mkt-stat-body">
          <div class="mkt-stat-label">{{ t.marketing.totalLeads }}</div>
          <div class="mkt-stat-value">{{ totalLeads }}</div>
          <div class="mkt-stat-sub">{{ t.marketing.viaLandingpages }}</div>
        </div>
      </div>
      <div class="mkt-stat-card">
        <div class="mkt-stat-glow"></div>
        <div class="mkt-stat-icon"><i class="ti ti-trophy"></i></div>
        <div class="mkt-stat-body">
          <div class="mkt-stat-label">{{ t.marketing.bestCampaign }}</div>
          <div class="mkt-stat-value" style="font-size:15px;line-height:1.3">{{ bestCampaign }}</div>
          <div class="mkt-stat-sub">{{ t.marketing.mostLeads }}</div>
        </div>
      </div>
      <div class="mkt-stat-card">
        <div class="mkt-stat-glow"></div>
        <div class="mkt-stat-icon"><i class="ti ti-world"></i></div>
        <div class="mkt-stat-body">
          <div class="mkt-stat-label">{{ t.marketing.baseUrl }}</div>
          <div class="mkt-stat-value" style="font-size:13px">app.plexora.eu</div>
          <div class="mkt-stat-sub">/lead/[formId]</div>
        </div>
      </div>
    </div>

    <!-- HEADER -->
    <div v-if="tab === 'campaigns'" class="mkt-header">
      <div class="mkt-header-left">
        <h2 class="mkt-title">{{ t.marketing.campaigns }}</h2>
        <span class="mkt-count">{{ campaigns.length }}</span>
      </div>
      <div style="display:flex;align-items:center;gap:16px">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;color:var(--text-muted)">
          <span>URL-Shortener</span>
          <button @click="toggleShortener"
            style="width:38px;height:22px;border-radius:11px;border:none;cursor:pointer;transition:all .2s;position:relative;flex-shrink:0"
            :style="shortenerEnabled ? 'background:var(--accent)' : 'background:var(--border)'">
            <span style="position:absolute;top:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .2s"
              :style="shortenerEnabled ? 'left:19px' : 'left:3px'"></span>
          </button>
        </label>
        <button class="mkt-new-btn" @click="openAdd">
          <i class="ti ti-plus"></i> {{ t.marketing.newCampaign }}
        </button>
      </div>
    </div>

    <!-- EMPTY -->
    <!-- AUTOMATISIERUNGEN -->
    <div v-if="tab === 'automations'" class="auto-block">
      <div class="auto-head">
        <div style="display:flex;align-items:center;gap:14px">
          <div class="auto-icon"><i class="ti ti-bolt"></i></div>
          <div>
            <div class="auto-title">Automatisierungen <span class="auto-count">{{ automations.length }}</span></div>
            <div class="auto-sub">Wenn etwas passiert, läuft automatisch eine Aktion ab.</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <NuxtLink to="/funnels" class="auto-btn-ghost"><i class="ti ti-route"></i> Funnel-Editor</NuxtLink>
          <button class="auto-btn" @click="openAddAutomation"><i class="ti ti-plus"></i> Neue Automatisierung</button>
        </div>
      </div>

      <div v-if="!automations.length" class="auto-empty">
        <i class="ti ti-bolt-off"></i>
        <div class="auto-empty-title">Noch keine Automatisierung aktiv</div>
        <div class="auto-empty-sub">Lass Plexora z.B. nach jeder Formular-Abgabe automatisch eine Terminbestätigung oder einen Termin-Link schicken.</div>
        <div style="display:flex;gap:8px;margin-top:6px">
          <button class="auto-btn" @click="openAddAutomation"><i class="ti ti-plus"></i> Erste Automatisierung</button>
          <NuxtLink to="/funnels" class="auto-btn-ghost"><i class="ti ti-route"></i> Mehrstufigen Funnel bauen</NuxtLink>
        </div>
      </div>

      <div v-else class="auto-list">
        <div v-for="a in automations" :key="a.automationId" class="auto-row" :class="{ off: !a.enabled }">
          <div class="auto-row-main">
            <div class="auto-row-name">{{ a.name }}</div>
            <div class="auto-flow">
              <span class="auto-chip trig"><i class="ti ti-bolt"></i> {{ triggerLabel(a.trigger) }}</span>
              <i class="ti ti-arrow-right auto-arrow"></i>
              <span class="auto-chip act"><i class="ti ti-player-play"></i> {{ actionLabel(a) }}</span>
            </div>
          </div>
          <span class="auto-status" :class="a.enabled ? 'on' : 'off'">{{ a.enabled ? 'Aktiv' : 'Pausiert' }}</span>
          <button class="fn-toggle" :class="{ on: a.enabled }" :title="a.enabled ? 'Pausieren' : 'Aktivieren'" @click="toggleAutomation(a)"><span></span></button>
          <button class="auto-del" title="Löschen" @click="deleteAutomation(a)"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    </div>

    <div v-if="tab === 'campaigns'">
    <div v-if="!campaigns.length" class="mkt-empty">
      <div class="mkt-empty-icon"><i class="ti ti-speakerphone"></i></div>
      <div class="mkt-empty-title">{{ t.marketing.noCampaigns }}</div>
      <button class="mkt-new-btn" @click="openAdd"><i class="ti ti-plus"></i> Erste Kampagne erstellen</button>
    </div>

    <!-- KAMPAGNEN GRID -->
    <div v-else class="mkt-grid">
      <div v-for="c in campaigns" :key="c.campaignId" class="mkt-campaign-card">
        <div class="mkt-campaign-glow" :style="`background: radial-gradient(circle at 30% 50%, ${c.accentColor || 'var(--accent)'}22, transparent 70%)`"></div>

        <!-- Banner -->
        <div v-if="c.headerImageUrl" class="mkt-campaign-banner">
          <img :src="c.headerImageUrl" />
          <div class="mkt-campaign-banner-overlay"></div>
        </div>
        <div v-else class="mkt-campaign-banner-placeholder" :style="`background: linear-gradient(135deg, ${c.accentColor || 'var(--accent)'}33, transparent)`">
          <i class="ti ti-speakerphone" :style="`color: ${c.accentColor || 'var(--accent)'}`"></i>
        </div>

        <!-- Status badge -->
        <div class="mkt-campaign-status-row">
          <span class="mkt-status-badge" :class="c.active ? 'active' : 'inactive'">
            <span class="mkt-status-dot"></span>
            {{ c.active ? t.common.active : t.marketing.inactive }}
          </span>
          <span v-if="c.utmSource" class="mkt-utm-badge">{{ c.utmSource }}</span>
        </div>

        <!-- Content -->
        <div class="mkt-campaign-content">
          <div class="mkt-campaign-name">{{ c.name || '—' }}</div>
          <div class="mkt-campaign-headline">{{ c.headline || c.subtext || '' }}</div>

          <div class="mkt-campaign-meta">
            <div class="mkt-meta-item">
              <i class="ti ti-users"></i>
              <span>{{ leadStats[c.utmCampaign || c.name] || 0 }} Leads</span>
            </div>
            <div class="mkt-meta-item">
              <i class="ti ti-link"></i>
              <span class="mkt-slug">/{{ c.slug || 'lead/' + (c.formId?.slice(0,8) || '...') }}</span>
            </div>
          </div>
        </div>

        <!-- Email Stats -->
        <div v-if="emailStats[c.campaignId]" class="mkt-email-stats">
          <div class="mkt-estat-item" title="Gesendet"><i class="ti ti-send"></i> {{ emailStats[c.campaignId].sent }}</div>
          <div class="mkt-estat-item" title="Geöffnet"><i class="ti ti-mail-opened"></i> {{ emailStats[c.campaignId].opened }} ({{ emailStats[c.campaignId].openRate }}%)</div>
          <div class="mkt-estat-item" title="Geklickt"><i class="ti ti-cursor-text"></i> {{ emailStats[c.campaignId].clicked }}</div>
        </div>

        <!-- Actions -->
        <div class="mkt-campaign-actions">
          <button class="mkt-action-btn" :title="t.marketing.copyLink" @click="copyLink(c)">
            <i class="ti ti-copy"></i>
          </button>
          <button class="mkt-action-btn" title="Kurzlink erstellen &amp; kopieren" @click="shortenAndCopy(c)">
            <i class="ti" :class="shorteningId === c.campaignId ? 'ti-loader-2 spin' : 'ti-scissors'"></i>
          </button>
          <button class="mkt-action-btn" :title="t.marketing.qrCode" @click="showQr(c)">
            <i class="ti ti-qrcode"></i>
          </button>
          <button class="mkt-action-btn" title="E-Mail Kampagne senden" @click="openSendEmail(c)">
            <i class="ti ti-mail-forward"></i>
          </button>
          <NuxtLink class="mkt-action-btn mkt-design-btn" title="Design-Editor öffnen" :to="`/marketing/design/${c.campaignId}`">
            <i class="ti ti-palette"></i>
          </NuxtLink>
          <button class="mkt-action-btn" @click="openEdit(c)">
            <i class="ti ti-pencil"></i>
          </button>
          <button class="mkt-action-btn danger" @click="deleteCampaign(c)">
            <i class="ti ti-trash"></i>
          </button>
        </div>
      </div>
    </div>

    </div>

    <!-- MODAL ERSTELLEN/BEARBEITEN -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal=false">
      <div class="modal-card" style="max-width:960px;width:95vw;max-height:90vh;overflow-y:auto">
        <div class="modal-header">
          <span class="card-title">{{ editing ? t.marketing.editCampaign : t.marketing.newCampaignTitle }}</span>
          <span v-if="!editing && draft.statusText.value" class="draft-status" :class="draft.status.value">{{ draft.statusText.value }}</span>
          <button class="icon-btn" @click="showModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div v-if="!editing && draft.candidate.value" class="draft-restore">
          <span><i class="ti ti-history"></i> Entwurf vom {{ draft.candidateTime.value }} wiederherstellen?</span>
          <span style="display:flex;gap:8px">
            <button class="accent-btn" style="height:28px;font-size:12px;padding:0 14px" @click="draft.restore()">Wiederherstellen</button>
            <button class="icon-btn" style="font-size:12px;padding:4px 12px;height:auto" @click="draft.discard()">Verwerfen</button>
          </span>
        </div>
        <div class="modal-body" style="display:grid;grid-template-columns:1fr 1fr;gap:20px">

          <div style="display:flex;flex-direction:column;gap:14px">
            <div class="auth-field"><label>{{ t.marketing.campaignName }}</label><input v-model="form.name" placeholder="Kostenlose Beratung" /></div>
            <div class="auth-field">
              <label>{{ t.marketing.form }}</label>
              <select v-model="form.formId" class="form-select">
                <option value="">{{ t.marketing.noForm }}</option>
                <option v-for="f in forms" :key="f.formId" :value="f.formId">{{ f.title }}</option>
              </select>
            </div>
            <div class="auth-field">
              <label>{{ t.marketing.vanitySlug }}</label>
              <div style="display:flex;align-items:center;gap:6px">
                <span style="font-size:13px;color:var(--text-muted)">/</span>
                <input v-model="form.slug" placeholder="beratung" style="flex:1" />
              </div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:4px">
                {{ t.marketing.link }} app.plexora.eu/{{ form.slug || 'lead/' + (form.formId?.slice(0,8) || '...') }}
              </div>
            </div>

            <div style="border-top:0.5px solid var(--border);padding-top:14px">
              <div class="settings-label" style="margin-bottom:10px">{{ t.marketing.design }}</div>
              <div class="auth-field"><label>{{ t.marketing.headline }}</label><input v-model="form.headline" placeholder="Kostenlose IT-Beratung" /></div>
              <div class="auth-field"><label>{{ t.marketing.subtext }}</label><input v-model="form.subtext" placeholder="Jetzt unverbindlich anfragen" /></div>
              <div class="auth-field">
                <label>{{ t.marketing.headerBanner }}</label>
                <div v-if="cropSrc" style="margin-bottom:10px">
                  <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">Zuschneiden — dann "Übernehmen" klicken:</div>
                  <div style="position:relative;overflow:hidden;border-radius:8px;border:0.5px solid var(--border);background:#000">
                    <img ref="cropImgRef" :src="cropSrc" style="width:100%;max-height:180px;object-fit:contain;display:block" />
                    <div v-if="cropRect" :style="`position:absolute;border:2px solid #fff;box-shadow:0 0 0 9999px rgba(0,0,0,0.5);pointer-events:none;left:${cropRect.x}px;top:${cropRect.y}px;width:${cropRect.w}px;height:${cropRect.h}px`"></div>
                  </div>
                  <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;align-items:center">
                    <button class="icon-btn" style="font-size:11px;padding:4px 10px;height:auto" @click="setCropRatio(16,9)">16:9</button>
                    <button class="icon-btn" style="font-size:11px;padding:4px 10px;height:auto" @click="setCropRatio(3,1)">3:1</button>
                    <button class="icon-btn" style="font-size:11px;padding:4px 10px;height:auto" @click="cropRect=null">Original</button>
                    <button class="accent-btn" style="height:28px;font-size:12px;padding:0 14px;margin-left:auto" :disabled="headerUploading" @click="confirmCropAndUpload">
                      <i class="ti" :class="headerUploading ? 'ti-loader-2 spin' : 'ti-check'"></i>
                      {{ headerUploading ? t.common.loading : 'Übernehmen' }}
                    </button>
                    <button class="icon-btn" style="color:var(--danger)" @click="cropSrc=null;cropRect=null"><i class="ti ti-x"></i></button>
                  </div>
                </div>
                <div v-if="form.headerImageUrl && !cropSrc" style="margin-bottom:10px;border-radius:8px;overflow:hidden;border:0.5px solid var(--border);position:relative">
                  <img :src="form.headerImageUrl" style="width:100%;max-height:120px;object-fit:cover;display:block" />
                  <div style="position:absolute;top:6px;right:6px;display:flex;gap:4px">
                    <label style="cursor:pointer">
                      <input type="file" accept="image/*" style="display:none" @change="selectBannerFile" />
                      <span class="icon-btn" style="background:rgba(0,0,0,0.6);display:inline-flex;align-items:center;justify-content:center;pointer-events:none"><i class="ti ti-pencil"></i></span>
                    </label>
                    <button class="icon-btn" style="background:rgba(0,0,0,0.6);color:var(--danger)" @click="form.headerImageUrl=''"><i class="ti ti-trash"></i></button>
                  </div>
                </div>
                <label v-if="!form.headerImageUrl && !cropSrc" style="cursor:pointer;display:block">
                  <input type="file" accept="image/*" style="display:none" @change="selectBannerFile" />
                  <span class="accent-btn" style="height:32px;font-size:12px;padding:0 14px;display:inline-flex;align-items:center;gap:6px;pointer-events:none"><i class="ti ti-photo-up"></i> {{ t.common.upload }}</span>
                </label>
              </div>
              <div class="auth-field">
                <label>Hintergrundbild (Landing Page)</label>
                <div v-if="bgCropSrc" style="margin-bottom:10px">
                  <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">Zuschneiden — dann "Übernehmen" klicken:</div>
                  <div style="position:relative;overflow:hidden;border-radius:8px;border:0.5px solid var(--border);background:#000">
                    <img ref="bgCropImgRef" :src="bgCropSrc" style="width:100%;max-height:180px;object-fit:contain;display:block" />
                    <div v-if="bgCropRect" :style="`position:absolute;border:2px solid #fff;box-shadow:0 0 0 9999px rgba(0,0,0,0.5);pointer-events:none;left:${bgCropRect.x}px;top:${bgCropRect.y}px;width:${bgCropRect.w}px;height:${bgCropRect.h}px`"></div>
                  </div>
                  <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;align-items:center">
                    <button class="icon-btn" style="font-size:11px;padding:4px 10px;height:auto" @click="setBgCropRatio(16,9)">16:9</button>
                    <button class="icon-btn" style="font-size:11px;padding:4px 10px;height:auto" @click="setBgCropRatio(4,3)">4:3</button>
                    <button class="icon-btn" style="font-size:11px;padding:4px 10px;height:auto" @click="bgCropRect=null">Original</button>
                    <button class="accent-btn" style="height:28px;font-size:12px;padding:0 14px;margin-left:auto" :disabled="bgUploading" @click="confirmBgCropAndUpload">
                      <i class="ti" :class="bgUploading ? 'ti-loader-2 spin' : 'ti-check'"></i>
                      {{ bgUploading ? t.common.loading : 'Übernehmen' }}
                    </button>
                    <button class="icon-btn" style="color:var(--danger)" @click="bgCropSrc=null;bgCropRect=null"><i class="ti ti-x"></i></button>
                  </div>
                </div>
                <div v-if="form.bgImageUrl && !bgCropSrc" style="margin-bottom:10px;border-radius:8px;overflow:hidden;border:0.5px solid var(--border);position:relative">
                  <img :src="form.bgImageUrl" style="width:100%;max-height:100px;object-fit:cover;display:block" />
                  <div style="position:absolute;top:6px;right:6px;display:flex;gap:4px">
                    <label style="cursor:pointer">
                      <input type="file" accept="image/*" style="display:none" @change="selectBgFile" />
                      <span class="icon-btn" style="background:rgba(0,0,0,0.6);display:inline-flex;align-items:center;justify-content:center;pointer-events:none"><i class="ti ti-pencil"></i></span>
                    </label>
                    <button class="icon-btn" style="background:rgba(0,0,0,0.6);color:var(--danger)" @click="form.bgImageUrl=''"><i class="ti ti-trash"></i></button>
                  </div>
                </div>
                <div v-if="!form.bgImageUrl && !bgCropSrc" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                  <label style="cursor:pointer">
                    <input type="file" accept="image/*" style="display:none" @change="selectBgFile" />
                    <span class="accent-btn" style="height:32px;font-size:12px;padding:0 14px;display:inline-flex;align-items:center;gap:6px;pointer-events:none"><i class="ti ti-photo-up"></i> Bild hochladen</span>
                  </label>
                  <span style="font-size:11px;color:var(--text-muted)">oder Farbe:</span>
                  <input type="color" v-model="form.bgColor" style="width:36px;height:32px;border-radius:6px;border:0.5px solid var(--border);background:none;cursor:pointer" />
                  <span style="font-size:11px;color:var(--text-muted)">{{ form.bgColor }}</span>
                </div>
                <div v-if="form.bgImageUrl && !bgCropSrc" style="display:flex;gap:8px;align-items:center;margin-top:6px">
                  <span style="font-size:11px;color:var(--text-muted)">Fallback-Farbe:</span>
                  <input type="color" v-model="form.bgColor" style="width:36px;height:32px;border-radius:6px;border:0.5px solid var(--border);background:none;cursor:pointer" />
                </div>
              </div>
              <div class="auth-field">
                <label>Akzentfarbe</label>
                <div style="display:flex;gap:8px;align-items:center">
                  <input type="color" v-model="form.accentColor" style="width:48px;height:36px;border-radius:6px;border:0.5px solid var(--border);background:none;cursor:pointer" />
                  <span style="font-size:12px;color:var(--text-muted)">{{ form.accentColor }}</span>
                </div>
              </div>
            </div>

            <div style="border-top:0.5px solid var(--border);padding-top:14px">
              <div class="settings-label" style="margin-bottom:4px">Content-Block</div>
              <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">Wird links neben dem Formular angezeigt (Bullet-Points)</div>
              <div class="auth-field"><label>Block-Titel (optional)</label><input v-model="form.contentTitle" placeholder="Was Sie erwartet" /></div>
              <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px">
                <input v-for="(_, i) in 4" :key="i" v-model="form.contentItems[i]"
                  :placeholder="`Punkt ${i+1} (z.B. Kostenlose Erstberatung)`"
                  style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px;color:var(--text);width:100%;box-sizing:border-box;outline:none" />
              </div>
            </div>

            <div style="border-top:0.5px solid var(--border);padding-top:14px">
              <div class="settings-label" style="margin-bottom:10px">{{ t.marketing.utmTracking }}</div>
              <div class="auth-row">
                <div class="auth-field"><label>utm_source</label><input v-model="form.utmSource" placeholder="linkedin" /></div>
                <div class="auth-field"><label>utm_medium</label><input v-model="form.utmMedium" placeholder="social" /></div>
              </div>
              <div class="auth-field"><label>utm_campaign</label><input v-model="form.utmCampaign" placeholder="beratung-2026" /></div>
            </div>

            <div v-if="!editing" style="margin-top:20px;padding-top:16px;border-top:0.5px solid var(--border)">
              <div class="settings-label" style="margin-bottom:6px">Kampagnen-Termin</div>
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">
                Wird automatisch zusammen mit der Kampagne angelegt. Er erscheint nicht auf der allgemeinen Terminseite,
                sondern nur über den Link in der Bestätigungsmail. Mit Ablauf der Kampagne wird er wieder entfernt.
              </div>
              <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:12px;cursor:pointer">
                <input type="checkbox" v-model="form.appointmentEnabled" /> Kampagnen-Termin anlegen
              </label>
              <template v-if="form.appointmentEnabled">
                <div class="auth-field"><label>Terminname</label><input v-model="form.appointmentName" placeholder="Kostenlose AI Beratung" /></div>
                <div class="auth-row">
                  <div class="auth-field"><label>Dauer (Min.)</label><input v-model.number="form.appointmentDurationMinutes" type="number" min="15" step="15" /></div>
                  <div class="auth-field"><label>Läuft ab am</label><input v-model="form.endsAt" type="date" /></div>
                </div>
              </template>
            </div>

            <div style="margin-top:20px;padding-top:16px;border-top:0.5px solid var(--border)">
              <div class="settings-label" style="margin-bottom:6px">Bot-Schutz</div>
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">
                Schützt das Formular dieser Kampagne (und die Terminbuchung) mit Cloudflare Turnstile vor Spam-Einträgen.
              </div>
              <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer"
                :style="!botKeysReady ? 'opacity:.6;cursor:not-allowed' : ''">
                <input type="checkbox" v-model="form.turnstileEnabled" :disabled="!botKeysReady && !form.turnstileEnabled" /> Bot-Schutz aktiv
              </label>
              <div v-if="!botKeysReady" style="font-size:12px;color:var(--text-muted);margin-top:6px">
                <i class="ti ti-info-circle"></i> Erst nach Hinterlegen von Sitekey und Secret möglich:
                <NuxtLink to="/settings" style="color:var(--accent)">Einstellungen → Bot-Schutz</NuxtLink>
              </div>
              <div v-else-if="form.turnstileEnabled && !botMainEnabled" style="font-size:12px;color:var(--text-muted);margin-top:6px">
                <i class="ti ti-alert-triangle"></i> Der Hauptschalter unter Einstellungen → Bot-Schutz ist aus – der Schutz ruht derzeit.
              </div>
            </div>

            <div style="margin-top:20px;padding-top:16px;border-top:0.5px solid var(--border)">
              <div class="settings-label" style="margin-bottom:6px">Vertrauenspunkte, Datenschutzzeile &amp; Sticker</div>
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">
                Bestimmt, was unter dem Hero-Bild und unter dem Button der Lead-Seite steht, und welche Sticker auf dem Hero-Bild liegen. Ohne Änderung bleibt alles wie bisher.
              </div>
              <LeadDecorEditor ref="decorEditor" :selected-id="selectedOverlayId" @select="selectedOverlayId = $event" :model-value="decor" :has-hero="!!form.headerImageUrl" :custom-template="!!editing?.customTemplateHtml"
                @update:model-value="(v: any) => Object.assign(decor, v)" @touched="decorTouched = true" />
            </div>
          </div>

          <!-- Live-Vorschau -->
          <div style="position:sticky;top:0">
            <div class="settings-label" style="margin-bottom:10px">{{ t.marketing.livePreview }}</div>
            <!-- Live-Vorschau der Lead-Seite (Desktop und Handy) inkl. Vertrauenspunkten, Datenschutzzeile und Stickern -->
            <LeadPreview v-model:mode="previewMode" :campaign="previewCampaign" :form="selectedForm" :selected-overlay-id="selectedOverlayId"
              @select-overlay="selectedOverlayId = $event" @move-overlay="(m: any) => decorEditor?.setOverlayPos(m.id, m.x, m.y)" />
            <div v-if="form.formId" style="margin-top:8px;background:var(--bg-elevated);border-radius:8px;padding:10px;font-size:11px">
              <div style="color:var(--text-muted);margin-bottom:3px">Link:</div>
              <div style="color:var(--accent);word-break:break-all;font-size:10px">{{ campaignUrl }}</div>
            </div>
          </div>
        </div>
        <div style="padding:0 24px 24px">
          <button class="auth-btn" :disabled="!form.name || !form.formId || saving" @click="save">
            <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else>{{ editing ? t.common.save : t.marketing.createCampaign }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- EMAIL SEND MODAL -->
    <div v-if="sendEmailCampaign" class="modal-overlay" @click.self="sendEmailCampaign=null">
      <div class="modal-card" style="max-width:980px;width:95vw;max-height:90vh;overflow-y:auto">
        <div class="modal-header">
          <span class="card-title"><i class="ti ti-mail-forward"></i> E-Mail Kampagne — {{ sendEmailCampaign.name }}</span>
          <button class="icon-btn" @click="sendEmailCampaign=null"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body" style="display:grid;grid-template-columns:1fr 1fr;gap:20px">

          <!-- Left: Konfiguration -->
          <div style="display:flex;flex-direction:column;gap:14px">
            <div style="display:flex;gap:8px">
              <button class="theme-opt" :class="{ active: sendEmailForm.mode === 'ai' }" @click="sendEmailForm.mode = 'ai'">
                <i class="ti ti-sparkles"></i> Mit KI verfassen
              </button>
              <button class="theme-opt" :class="{ active: sendEmailForm.mode === 'manual' }" @click="sendEmailForm.mode = 'manual'">
                <i class="ti ti-pencil"></i> Selbst schreiben
              </button>
            </div>

            <div class="auth-field">
              <label>Betreff</label>
              <input v-model="sendEmailForm.subject" :placeholder="`${sendEmailCampaign.name} — ${sendEmailCampaign.headline || 'Unser Angebot'}`" />
            </div>
            <div v-if="sendEmailForm.mode === 'ai'" class="auth-field">
              <label>Ton der KI-E-Mail</label>
              <select v-model="sendEmailForm.tone" class="form-select">
                <option value="freundlich">Freundlich</option>
                <option value="sachlich">Sachlich</option>
                <option value="direkt">Direkt</option>
                <option value="motivierend">Motivierend</option>
              </select>
            </div>
            <div class="auth-field">
              <label>Empfänger</label>
              <select v-model="sendEmailForm.contactStatus" class="form-select">
                <option value="">Alle Kontakte mit E-Mail ({{ segmentCounts.all }})</option>
                <option value="lead">Nur Leads ({{ segmentCounts.lead }})</option>
                <option value="customer">Nur Kunden ({{ segmentCounts.customer }})</option>
                <option value="churned">Nur Verlorene ({{ segmentCounts.churned }})</option>
              </select>
            </div>

            <div v-if="sendEmailForm.mode === 'ai'" style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;padding:12px;font-size:12px;color:var(--text-muted)">
              <i class="ti ti-sparkles" style="color:var(--accent)"></i>
              Claude generiert für jeden Kontakt eine personalisierte E-Mail.
              Ohne API-Key wird eine Standard-E-Mail verwendet.
            </div>

            <button class="auth-btn" :disabled="sending" @click="sendEmailBlast">
              <i class="ti" :class="sending ? 'ti-loader-2 spin' : 'ti-send'"></i>
              {{ sending ? 'Wird gesendet...' : 'Kampagne jetzt senden' }}
            </button>

            <div v-if="sendEmailResult" class="mkt-send-result" :class="sendEmailResult.sent > 0 ? 'success' : 'warn'">
              <i class="ti" :class="sendEmailResult.sent > 0 ? 'ti-circle-check' : 'ti-alert-triangle'"></i>
              <span>{{ sendEmailResult.sent }} von {{ sendEmailResult.total }} E-Mails gesendet</span>
            </div>
            <div v-if="sendEmailResult?.failed?.length" class="mkt-send-failed">
              <button class="mkt-failed-toggle" @click="showFailedList = !showFailedList">
                <i class="ti" :class="showFailedList ? 'ti-chevron-up' : 'ti-chevron-down'"></i>
                {{ sendEmailResult.failed.length }} Fehler anzeigen
              </button>
              <div v-if="showFailedList" class="mkt-failed-list">
                <div v-for="f in sendEmailResult.failed" :key="f.contactId" class="mkt-failed-item">
                  <strong>{{ f.name || f.email }}</strong> ({{ f.email }}) — {{ f.error }}
                </div>
              </div>
            </div>

            <button class="mkt-secondary-btn" @click="runFollowups" :disabled="followupRunning">
              <i class="ti" :class="followupRunning ? 'ti-loader-2 spin' : 'ti-refresh'"></i>
              Follow-ups prüfen & senden
            </button>
          </div>

          <!-- Right: Live-Vorschau -->
          <div v-if="sendEmailForm.mode === 'ai'" style="display:flex;flex-direction:column;gap:14px">
            <button class="mkt-secondary-btn" :disabled="previewLoading" @click="generatePreview">
              <i class="ti" :class="previewLoading ? 'ti-loader-2 spin' : 'ti-eye'"></i>
              {{ previewLoading ? 'Vorschau wird generiert...' : (emailPreview ? 'Vorschau aktualisieren' : 'Vorschau generieren') }}
            </button>

            <div v-if="!emailPreview && !previewLoading" class="mkt-preview-empty">
              <i class="ti ti-mail-forward"></i>
              <span>Vorschau zeigt eine KI-generierte Beispiel-E-Mail für einen Kontakt aus dem gewählten Segment — vor dem echten Versand an alle.</span>
            </div>

            <div v-else-if="emailPreview && emailPreview.available === false" class="mkt-preview-empty">
              <i class="ti ti-alert-triangle"></i>
              <span>{{ emailPreview.message }}</span>
            </div>

            <div v-else-if="emailPreview" class="mkt-preview-card">
              <div class="mkt-preview-meta">
                <div><strong>An:</strong> {{ emailPreview.contactName || emailPreview.to }} ({{ emailPreview.to }})</div>
                <div><strong>Betreff:</strong> {{ emailPreview.subject }}</div>
              </div>
              <div class="mkt-preview-html" v-html="emailPreview.html"></div>
            </div>
          </div>

          <!-- Right: Manueller Text-Modus -->
          <div v-else style="display:flex;flex-direction:column;gap:14px">
            <div class="auth-field">
              <label>E-Mail-Text</label>
              <textarea v-model="sendEmailForm.manualBody" rows="8"
                placeholder="Hallo {{vorname}}, ..."
                style="width:100%;font-family:inherit;font-size:13px;resize:vertical;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-elevated);color:var(--text-primary)"></textarea>
              <div style="font-size:11px;color:var(--text-muted);margin-top:4px">
                {{ placeholderHint }}
              </div>
            </div>

            <div v-if="!manualPreviewContact" class="mkt-preview-empty">
              <i class="ti ti-mail-forward"></i>
              <span>Vorschau erscheint, sobald ein Kontakt im gewählten Segment gefunden wird.</span>
            </div>
            <div v-else class="mkt-preview-card">
              <div class="mkt-preview-meta">
                <div><strong>An:</strong> {{ manualPreviewContact.firstName }} {{ manualPreviewContact.lastName }} ({{ manualPreviewContact.email }})</div>
                <div><strong>Betreff:</strong> {{ manualPreviewSubject }}</div>
              </div>
              <div class="mkt-preview-html" v-html="manualPreviewHtml"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- VERSAND-PROTOKOLL -->
    <div v-if="tab === 'mail'" class="mail-app">
      <aside class="mail-folders">
        <div class="mail-acc">
          <span><i class="ti ti-mail"></i> Versand</span>
          <button class="mail-icon-btn" title="Aktualisieren" :disabled="mailLoading" @click="loadMailLog"><i class="ti" :class="mailLoading ? 'ti-loader-2 spin' : 'ti-refresh'"></i></button>
        </div>
        <button v-for="f in mailFolders" :key="f.key" class="mail-folder" :class="{ active: mailFolder === f.key, sep: f.sep }" @click="mailFolder = f.key">
          <i class="ti" :class="f.icon"></i> {{ f.label }} <span class="mail-fcount">{{ mailCounts[f.key] || 0 }}</span>
        </button>
      </aside>

      <section class="mail-list">
        <div class="mail-search"><i class="ti ti-search"></i><input v-model="mailSearch" placeholder="Empfänger oder Betreff suchen" /></div>
        <div v-if="!filteredMails.length" class="mail-empty">Keine Mails in diesem Ordner.</div>
        <button v-for="m in filteredMails" :key="m.mailId" class="mail-item" :class="{ active: selectedMailId === m.mailId }" @click="selectedMailId = m.mailId">
          <div class="mail-item-top">
            <span class="mail-dot" :class="m.status"></span>
            <span class="mail-to">{{ m.to }}</span>
            <span class="mail-time">{{ fmtMailTime(m.created) }}</span>
          </div>
          <div class="mail-subj">{{ m.subject }}</div>
          <div class="mail-kind">{{ mailKindLabel(m.kind) }}</div>
        </button>
      </section>

      <section class="mail-read">
        <div v-if="!selectedMail" class="mail-empty">Mail auswählen, um Details zu sehen.</div>
        <template v-else>
          <div class="mail-read-subj">{{ selectedMail.subject }}</div>
          <div class="mail-meta">
            <div><span>An</span>{{ selectedMail.to }}</div>
            <div><span>Art</span>{{ mailKindLabel(selectedMail.kind) }}</div>
            <div><span>Zeit</span>{{ new Date(selectedMail.created).toLocaleString('de-DE') }}</div>
            <div><span>Status</span><b :class="selectedMail.status">{{ selectedMail.status === 'sent' ? 'Versendet' : 'Fehlgeschlagen' }}</b></div>
          </div>
          <div v-if="selectedMail.error" class="mail-error"><i class="ti ti-alert-triangle"></i> {{ selectedMail.error }}</div>
          <div class="mail-body">{{ selectedMail.preview || 'Keine Vorschau gespeichert (ältere Mail).' }}</div>
        </template>
      </section>
    </div>

    <!-- NEUE AUTOMATISIERUNG MODAL -->
    <div v-if="showAutomationModal" class="modal-overlay" @click.self="showAutomationModal=false">
      <div class="modal-card">
        <div class="modal-header">
          <span class="card-title">Neue Automatisierung</span>
          <button class="icon-btn" @click="showAutomationModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-field"><label>Name</label><input v-model="newAutomation.name" placeholder="z.B. Lead an ActiveCampaign" /></div>
          <div class="auth-field">
            <label>Wenn...</label>
            <select v-model="newAutomation.trigger" class="form-select">
              <option value="new_lead">Neuer Lead (mit E-Mail)</option>
              <option value="form_submitted">Formular abgeschickt</option>
            </select>
          </div>
          <div class="auth-field">
            <label>Dann...</label>
            <select v-model="newAutomation.action" class="form-select">
              <option value="send_email_template">E-Mail-Vorlage an den Lead senden</option>
              <option value="send_booking_link">Termin-Buchungslink senden (Google Meet)</option>
              <option value="set_lead_status">Lead-Status setzen</option>
              <option value="email">Interne Benachrichtigung senden</option>
              <option value="webhook">Webhook aufrufen (nur für externe Ziele)</option>
            </select>
          </div>
          <div v-if="newAutomation.action === 'send_email_template'" class="auth-field">
            <label>Vorlage</label>
            <select v-model="newAutomation.templateId" class="form-select">
              <option value="" disabled>Vorlage wählen...</option>
              <option v-for="tpl in emailTemplates" :key="tpl.templateId" :value="tpl.templateId">{{ tpl.name }}</option>
            </select>
            <div v-if="!emailTemplates.length" style="font-size:11px;color:var(--text-muted);margin-top:4px">
              Noch keine Vorlagen vorhanden — unter Newsletter eine Vorlage anlegen.
            </div>
          </div>
          <div v-else-if="newAutomation.action === 'send_booking_link'" class="auth-field">
            <label>Terminart (optional)</label>
            <select v-model="newAutomation.appointmentTypeId" class="form-select">
              <option value="">Alle Terminarten anzeigen</option>
              <option v-for="tp in appointmentTypes" :key="tp.typeId" :value="tp.typeId">{{ tp.name }}</option>
            </select>
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px">
              Mit Terminart springt der Lead direkt zur Buchung dieses einen Termins, sonst sieht er die komplette Übersicht.
            </div>
          </div>
          <div v-else-if="newAutomation.action === 'set_lead_status'" class="auth-field">
            <label>Neuer Lead-Status</label>
            <select v-model="newAutomation.leadStatus" class="form-select">
              <option value="new">Neu</option>
              <option value="contacted">Kontaktiert</option>
              <option value="qualified">Qualifiziert</option>
              <option value="unqualified">Unqualifiziert</option>
            </select>
          </div>
          <div v-else-if="newAutomation.action === 'webhook'" class="auth-field">
            <label>Webhook-URL</label>
            <input v-model="newAutomation.webhookUrl" placeholder="https://hooks.zapier.com/..." />
          </div>
          <template v-else>
            <div class="auth-field"><label>E-Mail-Adresse</label><input v-model="newAutomation.emailTo" placeholder="du@firma.de" /></div>
            <div class="auth-field"><label>Betreff</label><input v-model="newAutomation.emailSubject" placeholder="Neuer Lead: {{name}}" /></div>
          </template>
          <button class="auth-btn" :disabled="savingAutomation || !newAutomation.name" @click="saveAutomation">
            <span v-if="savingAutomation"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else>Automatisierung anlegen</span>
          </button>
        </div>
      </div>
    </div>

    <!-- QR MODAL -->
    <div v-if="qrCampaign" class="modal-overlay" @click.self="qrCampaign=null">
      <div class="modal-card" style="max-width:360px;text-align:center">
        <div class="modal-header">
          <span class="card-title">{{ t.marketing.qrCode }} — {{ qrCampaign.name }}</span>
          <button class="icon-btn" @click="qrCampaign=null"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body" style="align-items:center">
          <div id="qr-container" style="background:#fff;padding:16px;border-radius:8px;display:inline-block"></div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:8px;word-break:break-all">{{ qrUrl }}</div>
          <button class="auth-btn" @click="copyQrUrl"><i class="ti ti-copy"></i> {{ t.marketing.copyLink }}</button>
        </div>
      </div>
    </div>

    <!-- TOAST -->
    <div v-if="toast" class="toast-success"><i class="ti ti-circle-check"></i> {{ toast }}</div>

  </div>
</template>

<script setup lang="ts">
import { resolveTrustItems, resolvePrivacyLine, resolveOverlays } from '~~/shared/leadDecor'
import { MARKETING_CAMPAIGN_DRAFT_FIELDS } from '~~/shared/draftFields'
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
const { t, lang } = useLang()

const userId = ref('demo-user')
const { idToken } = await useAuthUser()
const authHeaders = { Authorization: `Bearer ${idToken}` }

const { data: campaignsData, refresh } = await useFetch(
  () => useApiUrl(`/api/marketing?userId=${encodeURIComponent(userId.value)}`),
  { getCachedData: () => undefined, headers: authHeaders }
)
const { data: formsData, refresh: refreshForms } = await useFetch(
  () => useApiUrl(`/api/forms?userId=${encodeURIComponent(userId.value)}`),
  { getCachedData: () => undefined, headers: authHeaders }
)
const { data: statsData, refresh: refreshStats } = await useFetch(
  () => useApiUrl(`/api/marketing/stats?userId=${encodeURIComponent(userId.value)}`),
  { getCachedData: () => undefined, headers: authHeaders }
)

onMounted(async () => {
  const { useAuthUser } = await import('~/composables/useAuth')
  const u = await useAuthUser()
  if (u.userId && u.userId !== 'demo-user') {
    userId.value = u.userId
  }
})

watch(userId, async (newId) => {
  if (newId && newId !== 'demo-user') {
    await Promise.all([refresh(), refreshForms(), refreshStats()])
  }
})

const campaigns = computed(() => (campaignsData.value as any)?.campaigns || [])
const forms     = computed(() => (formsData.value as any)?.forms || [])
const leadStats = computed(() => (statsData.value as any)?.stats || {})

const totalLeads   = computed(() => Object.values(leadStats.value).reduce((s: any, v: any) => s + v, 0) as number)
const bestCampaign = computed(() => {
  const entries = Object.entries(leadStats.value) as [string, number][]
  if (!entries.length) return '—'
  return entries.sort((a, b) => b[1] - a[1])[0][0]
})

const BASE_URL = 'https://app.plexora.eu'

function formTitle(formId: string): string {
  return forms.value.find((f: any) => f.formId === formId)?.title || '—'
}

function getCampaignUrl(c: any): string {
  const base = `${BASE_URL}/lead/${c.campaignId}`
  const params = new URLSearchParams()
  if (c.utmSource)   params.set('utm_source', c.utmSource)
  if (c.utmMedium)   params.set('utm_medium', c.utmMedium)
  if (c.utmCampaign) params.set('utm_campaign', c.utmCampaign)
  const q = params.toString()
  return q ? `${base}?${q}` : base
}

async function copyLink(c: any) {
  await navigator.clipboard.writeText(getCampaignUrl(c))
  showToast('Link kopiert!')
}

// ── Automatisierungen ────────────────────────────────
const automations = ref<any[]>([])
const emailTemplates = ref<any[]>([])
const appointmentTypes = ref<any[]>([])
const mailLog = ref<any[]>([])
const showAutomationModal = ref(false)
const savingAutomation = ref(false)
const newAutomation = reactive({
  name: '', trigger: 'new_lead', action: 'send_email_template',
  webhookUrl: '', emailTo: '', emailSubject: '', templateId: '', leadStatus: 'contacted', appointmentTypeId: '',
})

async function loadAutomations() {
  try {
    const res = await $fetch<{ automations: any[] }>(useApiUrl('/api/automations'), { headers: authHeaders })
    automations.value = res.automations || []
  } catch {}
}
async function loadEmailTemplates() {
  try {
    const res = await $fetch<{ templates: any[] }>(useApiUrl('/api/newsletter/templates'), { headers: authHeaders })
    emailTemplates.value = res.templates || []
  } catch {}
}
async function loadAppointmentTypes() {
  try {
    const res = await $fetch<{ types: any[] }>(useApiUrl('/api/termine/types'), { headers: authHeaders })
    appointmentTypes.value = res.types || []
  } catch {}
}
const mailLoading = ref(false)
async function loadMailLog() {
  mailLoading.value = true
  try {
    const res = await $fetch<{ mails: any[] }>(useApiUrl('/api/mail-log'), { headers: authHeaders })
    mailLog.value = res.mails || []
    showToast(`Protokoll aktualisiert: ${mailLog.value.length} Mails`)
  } catch {
    showToast('Protokoll konnte nicht geladen werden')
  } finally {
    mailLoading.value = false
  }
}
function mailKindLabel(kind: string) {
  return kind === 'booking_confirmation' ? 'Terminbestätigung' : kind === 'internal' ? 'Interne Benachrichtigung' : 'Automatisierung'
}
onMounted(() => { loadAutomations(); loadEmailTemplates(); loadAppointmentTypes(); loadMailLog() })

function triggerLabel(trigger: string): string {
  return trigger === 'form_submitted' ? 'Formular abgeschickt' : 'Neuer Lead (mit E-Mail)'
}
const leadStatusLabels: Record<string, string> = { new: 'Neu', contacted: 'Kontaktiert', qualified: 'Qualifiziert', unqualified: 'Unqualifiziert' }
function actionLabel(a: any): string {
  if (a.action === 'send_email_template') return `E-Mail "${a.templateName || a.templateId}" senden`
  if (a.action === 'send_booking_link') return a.appointmentTypeName ? `Termin-Link "${a.appointmentTypeName}" senden` : 'Termin-Link (alle Terminarten) senden'
  if (a.action === 'set_lead_status') return `Lead-Status → ${leadStatusLabels[a.leadStatus] || a.leadStatus}`
  if (a.action === 'webhook') return `Webhook: ${a.webhookUrl}`
  return `Interne E-Mail an ${a.emailTo}`
}

function openAddAutomation() {
  Object.assign(newAutomation, {
    name: '', trigger: 'new_lead', action: 'send_email_template',
    webhookUrl: '', emailTo: '', emailSubject: '', templateId: '', leadStatus: 'contacted', appointmentTypeId: '',
  })
  showAutomationModal.value = true
}

async function saveAutomation() {
  savingAutomation.value = true
  try {
    const templateName = emailTemplates.value.find(t => t.templateId === newAutomation.templateId)?.name || ''
    const appointmentTypeName = appointmentTypes.value.find(t => t.typeId === newAutomation.appointmentTypeId)?.name || ''
    await $fetch(useApiUrl('/api/automations'), { method: 'POST', headers: authHeaders, body: { ...newAutomation, templateName, appointmentTypeName } })
    await loadAutomations()
    showAutomationModal.value = false
    showToast('Automatisierung angelegt!')
  } catch (e: any) {
    showToast('Fehler: ' + (e?.data?.message || e?.message || 'Anlegen fehlgeschlagen'))
  } finally {
    savingAutomation.value = false
  }
}

async function toggleAutomation(a: any) {
  a.enabled = !a.enabled
  try {
    await $fetch(useApiUrl(`/api/automations/${a.automationId}`), { method: 'PATCH', headers: authHeaders, body: { enabled: a.enabled, name: a.name } })
  } catch {
    a.enabled = !a.enabled
  }
}

async function deleteAutomation(a: any) {
  if (!confirm(`"${a.name}" wirklich löschen?`)) return
  await $fetch(useApiUrl(`/api/automations/${a.automationId}`), { method: 'DELETE', headers: authHeaders })
  await loadAutomations()
}

// ── URL-Shortener ────────────────────────────────────
const shortenerEnabled = ref(false)
const shorteningId = ref('')

async function loadShortenerSettings() {
  try {
    const res = await $fetch<{ enabled: boolean }>(useApiUrl('/api/marketing/shortlinks/settings'), { headers: authHeaders })
    shortenerEnabled.value = res.enabled
  } catch {}
}
onMounted(() => loadShortenerSettings())

async function toggleShortener() {
  shortenerEnabled.value = !shortenerEnabled.value
  try {
    await $fetch(useApiUrl('/api/marketing/shortlinks/settings'), {
      method: 'POST', headers: authHeaders, body: { enabled: shortenerEnabled.value },
    })
    showToast(shortenerEnabled.value ? 'URL-Shortener aktiviert!' : 'URL-Shortener deaktiviert.')
  } catch {
    shortenerEnabled.value = !shortenerEnabled.value
  }
}

async function shortenAndCopy(c: any) {
  if (!shortenerEnabled.value) { showToast('Bitte zuerst den URL-Shortener oben aktivieren.'); return }
  shorteningId.value = c.campaignId
  try {
    const res = await $fetch<{ link: { shortCode: string } }>(useApiUrl('/api/marketing/shortlinks'), {
      method: 'POST', headers: authHeaders, body: { targetUrl: getCampaignUrl(c), label: c.name },
    })
    const shortUrl = `${BASE_URL}/s/${res.link.shortCode}`
    await navigator.clipboard.writeText(shortUrl)
    showToast(`Kurzlink kopiert: ${shortUrl}`)
  } catch (e: any) {
    showToast('Fehler: ' + (e?.data?.message || e?.message || 'Kurzlink fehlgeschlagen'))
  } finally {
    shorteningId.value = ''
  }
}

const qrCampaign = ref<any>(null)
const qrUrl = computed(() => qrCampaign.value ? getCampaignUrl(qrCampaign.value) : '')

async function showQr(c: any) {
  qrCampaign.value = c
  await nextTick()
  await new Promise(r => setTimeout(r, 100))
  const container = document.getElementById('qr-container')
  if (!container) return
  container.innerHTML = ''
  try {
    const QRCode = (await import('qrcode')).default
    const canvas = document.createElement('canvas')
    await QRCode.toCanvas(canvas, qrUrl.value, { width: 220, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
    container.appendChild(canvas)
  } catch {
    const img = document.createElement('img')
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrUrl.value)}`
    img.style.cssText = 'width:220px;height:220px;border-radius:4px'
    container.appendChild(img)
  }
}

function copyQrUrl() {
  navigator.clipboard.writeText(qrUrl.value)
  showToast('Link kopiert!')
}

const route = useRoute()
const router = useRouter()
const tab = ref<'campaigns' | 'automations' | 'mail'>((['campaigns', 'automations', 'mail'] as const).includes(route.query.tab as any) ? (route.query.tab as any) : 'campaigns')
function setTab(t: 'campaigns' | 'automations' | 'mail') {
  tab.value = t
  router.replace({ query: { ...route.query, tab: t } })
}

const mailFolder = ref('all')
const mailSearch = ref('')
const selectedMailId = ref<string | null>(null)
const mailFolders = [
  { key: 'all', label: 'Alle Mails', icon: 'ti-inbox' },
  { key: 'sent', label: 'Versendet', icon: 'ti-send' },
  { key: 'failed', label: 'Fehlgeschlagen', icon: 'ti-alert-circle' },
  { key: 'automation', label: 'Automatisierungen', icon: 'ti-bolt', sep: true },
  { key: 'booking_confirmation', label: 'Terminbestätigungen', icon: 'ti-calendar-check' },
  { key: 'internal', label: 'Intern', icon: 'ti-bell' },
]
const mailCounts = computed<Record<string, number>>(() => {
  const c: Record<string, number> = { all: mailLog.value.length, sent: 0, failed: 0 }
  for (const m of mailLog.value) {
    if (m.status === 'sent') c.sent++
    else c.failed++
    c[m.kind] = (c[m.kind] || 0) + 1
  }
  return c
})
const filteredMails = computed(() => {
  const q = mailSearch.value.trim().toLowerCase()
  return mailLog.value.filter(m => {
    const folderOk = mailFolder.value === 'all'
      || (mailFolder.value === 'sent' && m.status === 'sent')
      || (mailFolder.value === 'failed' && m.status !== 'sent')
      || m.kind === mailFolder.value
    const searchOk = !q || String(m.to).toLowerCase().includes(q) || String(m.subject).toLowerCase().includes(q)
    return folderOk && searchOk
  })
})
const selectedMail = computed(() => filteredMails.value.find(m => m.mailId === selectedMailId.value) || filteredMails.value[0] || null)
function fmtMailTime(iso: string) {
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })
}
const showModal = ref(false)

// Bot-Schutz: der Schalter ist nur nutzbar, wenn Sitekey und Secret hinterlegt sind (der Server prüft das ebenfalls)
const botKeysReady = ref(false)
const botMainEnabled = ref(false)
async function loadBotStatus() {
  try {
    const res: any = await $fetch(useApiUrl('/api/settings/bot-protection'), { headers: authHeaders })
    botKeysReady.value = !!(res.siteKey && res.secretConfigured)
    botMainEnabled.value = !!res.enabled
  } catch { botKeysReady.value = false }
}
onMounted(loadBotStatus)

// Vertrauenspunkte, Datenschutzzeile, Overlays: Standardwerte; gesendet wird nur, was der Nutzer wirklich geändert hat (sonst bleibt alles wie vorher)
const decor = reactive<{ trustItems: any[]; privacyLine: any; overlays: any[] }>({ trustItems: resolveTrustItems(undefined), privacyLine: resolvePrivacyLine(undefined), overlays: [] })
const decorTouched = ref(false)
const previewMode = ref<'desktop' | 'mobile'>('desktop')
const decorEditor = ref<{ setOverlayPos: (id: string, x: number, y: number) => void } | null>(null)
const selectedOverlayId = ref('')
function loadDecor(c?: any) { Object.assign(decor, { trustItems: resolveTrustItems(c?.trustItems), privacyLine: resolvePrivacyLine(c?.privacyLine), overlays: resolveOverlays(c?.overlays) }); decorTouched.value = false }

const editing = ref<any>(null)
const saving  = ref(false)
const form = reactive({
  name: '', slug: '', formId: '', headline: '', subtext: '',
  headerImageUrl: '', accentColor: '#6C3FE8',
  bgImageUrl: '', bgColor: '#050815',
  contentTitle: '', contentItems: ['', '', '', ''] as string[],
  utmSource: '', utmMedium: 'social', utmCampaign: '',
  appointmentEnabled: true, appointmentName: '', appointmentDurationMinutes: 30,
  endsAt: new Date(Date.now() + 90 * 86400_000).toISOString().slice(0, 10),
  turnstileEnabled: false,
})

// ── Entwurfs-Autosave für "Neue Kampagne" (nicht beim Bearbeiten) ──
const draft = useDraftAutosave({
  formType: 'marketing-campaign',
  form,
  fields: MARKETING_CAMPAIGN_DRAFT_FIELDS,
  applyData: (d) => {
    const items = Array.isArray(d.contentItems) ? (d.contentItems as string[]) : []
    Object.assign(form, d, { contentItems: [...items, '', '', '', ''].slice(0, 4) })
  },
})
watch(showModal, (open) => {
  if (open && !editing.value) void draft.begin()
  else if (!open) draft.stop()
})
onMounted(() => { if (route.query.new) showModal.value = true })

const previewCampaign = computed(() => ({ ...form, trustItems: decor.trustItems, privacyLine: decor.privacyLine, overlays: decor.overlays }))
const selectedForm = computed(() => forms.value.find((f: any) => f.formId === form.formId) || null)
const campaignUrl  = computed(() => {
  if (!form.formId) return ''
  const id = editing.value?.campaignId || '...'
  const base = `${BASE_URL}/lead/${id}`
  const params = new URLSearchParams()
  if (form.utmSource)   params.set('utm_source', form.utmSource)
  if (form.utmMedium)   params.set('utm_medium', form.utmMedium)
  if (form.utmCampaign) params.set('utm_campaign', form.utmCampaign)
  const q = params.toString()
  return q ? `${base}?${q}` : base
})

function resetForm() {
  Object.assign(form, { name: '', slug: '', formId: '', headline: '', subtext: '', headerImageUrl: '', accentColor: '#6C3FE8', bgImageUrl: '', bgColor: '#050815', contentTitle: '', contentItems: ['', '', '', ''], utmSource: '', utmMedium: 'social', utmCampaign: '', turnstileEnabled: false })
}

function openAdd() { editing.value = null; resetForm(); loadDecor(); showModal.value = true }

function openEdit(c: any) {
  editing.value = c
  let items: string[] = ['', '', '', '']
  if (Array.isArray(c.contentItems)) items = [...c.contentItems, '', '', '', ''].slice(0, 4)
  else if (typeof c.contentItems === 'string') {
    try { const parsed = JSON.parse(c.contentItems); items = [...parsed, '', '', '', ''].slice(0, 4) } catch {}
  }
  Object.assign(form, {
    name: c.name, slug: c.slug || '', formId: c.formId || '',
    headline: c.headline || '', subtext: c.subtext || '',
    headerImageUrl: c.headerImageUrl || '', accentColor: c.accentColor || '#6C3FE8',
    bgImageUrl: c.bgImageUrl || '', bgColor: c.bgColor || '#050815',
    contentTitle: c.contentTitle || '', contentItems: items,
    utmSource: c.utmSource || '', utmMedium: c.utmMedium || 'social', utmCampaign: c.utmCampaign || '',
    turnstileEnabled: c.turnstileEnabled === true,
  })
  loadDecor(c)
  showModal.value = true
}

async function save() {
  saving.value = true
  try {
    const payload: Record<string, any> = { ...form, contentItems: form.contentItems.filter(Boolean), userId: userId.value }
    if (decorTouched.value) Object.assign(payload, { trustItems: decor.trustItems, privacyLine: decor.privacyLine, overlays: decor.overlays })
    if (editing.value) {
      await $fetch(useApiUrl(`/api/marketing/${editing.value.campaignId}`), { method: 'PATCH', headers: authHeaders, body: payload })
    } else {
      await $fetch(useApiUrl('/api/marketing'), { method: 'POST', headers: authHeaders, body: payload })
    }
    if (!editing.value) await draft.clear()
    await new Promise(r => setTimeout(r, 300))
    await Promise.all([refresh(), refreshStats()])
    showModal.value = false
    showToast(editing.value ? 'Kampagne aktualisiert!' : 'Kampagne erstellt!')
  } catch (e: any) {
    showToast('Fehler: ' + (e?.data?.message || e?.message || 'Speichern fehlgeschlagen'))
  } finally {
    saving.value = false
  }
}

const { openConfirm } = useConfirm()

async function deleteCampaign(c: any) {
  if (!await openConfirm({ title: 'Kampagne löschen?', name: c.name, accentColor: c.accentColor })) return
  try {
    await $fetch(useApiUrl(`/api/marketing/${c.campaignId}`), { method: 'DELETE', headers: authHeaders })
    await new Promise(r => setTimeout(r, 300))
    await Promise.all([refresh(), refreshStats()])
    showToast('Kampagne gelöscht!')
  } catch (e: any) {
    showToast('Fehler: ' + (e?.data?.message || e?.message || 'Löschen fehlgeschlagen'))
  }
}

// ── Email Blast ──
const emailStats      = ref<Record<string, any>>({})
const sendEmailCampaign = ref<any>(null)
const sendEmailForm   = reactive({ subject: '', tone: 'freundlich', contactStatus: '', mode: 'ai' as 'ai' | 'manual', manualBody: '' })
const sendEmailResult = ref<any>(null)
const sending          = ref(false)
const followupRunning = ref(false)
const showFailedList  = ref(false)
const emailPreview    = ref<any>(null)
const previewLoading  = ref(false)
const segmentContacts = ref<any[]>([])

const segmentCounts = computed(() => {
  const withEmail = segmentContacts.value.filter((c: any) => c.email)
  return {
    all:      withEmail.length,
    lead:     withEmail.filter((c: any) => c.status === 'lead').length,
    customer: withEmail.filter((c: any) => c.status === 'customer').length,
    churned:  withEmail.filter((c: any) => c.status === 'churned').length,
  }
})

const placeholderHint = 'Platzhalter: {{vorname}}, {{nachname}}, {{name}}, {{firma}} — werden pro Empfänger ersetzt.'

function replacePlaceholders(text: string, contact: any): string {
  const firstName = contact?.firstName || ''
  const lastName  = contact?.lastName  || ''
  const fullName  = `${firstName} ${lastName}`.trim()
  return text
    .replaceAll('{{vorname}}',  firstName)
    .replaceAll('{{nachname}}', lastName)
    .replaceAll('{{name}}',     fullName)
    .replaceAll('{{firma}}',    contact?.company || '')
}

const manualPreviewContact = computed(() => {
  const withEmail = segmentContacts.value.filter((c: any) => c.email)
  const filtered = sendEmailForm.contactStatus ? withEmail.filter((c: any) => c.status === sendEmailForm.contactStatus) : withEmail
  return filtered[0] || null
})

const manualPreviewSubject = computed(() =>
  manualPreviewContact.value ? replacePlaceholders(sendEmailForm.subject || '', manualPreviewContact.value) : ''
)

function escapeHtml(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

const manualPreviewHtml = computed(() => {
  if (!manualPreviewContact.value) return ''
  const replaced = replacePlaceholders(sendEmailForm.manualBody || '', manualPreviewContact.value)
  return replaced
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
})

async function loadEmailStats(campaignId: string) {
  if (emailStats.value[campaignId]) return
  const res = await $fetch(useApiUrl(`/api/marketing/email-stats?campaignId=${campaignId}`), { headers: authHeaders }) as any
  if (res?.stats) emailStats.value[campaignId] = res.stats
}

async function loadSegmentContacts() {
  try {
    const res = await $fetch(useApiUrl(`/api/contacts?userId=${encodeURIComponent(userId.value)}`), { headers: authHeaders }) as any
    segmentContacts.value = res?.contacts || []
  } catch {
    segmentContacts.value = []
  }
}

function openSendEmail(c: any) {
  sendEmailCampaign.value = c
  sendEmailResult.value = null
  showFailedList.value = false
  emailPreview.value = null
  sendEmailForm.subject = ''
  sendEmailForm.tone = 'freundlich'
  sendEmailForm.contactStatus = ''
  sendEmailForm.mode = 'ai'
  sendEmailForm.manualBody = ''
  loadEmailStats(c.campaignId)
  loadSegmentContacts()
}

async function generatePreview() {
  if (!sendEmailCampaign.value) return
  previewLoading.value = true
  try {
    emailPreview.value = await $fetch(useApiUrl(`/api/marketing/${sendEmailCampaign.value.campaignId}/preview-email`), {
      method: 'POST',
      headers: authHeaders,
      body: {
        subject: sendEmailForm.subject || undefined,
        tone: sendEmailForm.tone,
        contactFilter: sendEmailForm.contactStatus ? { status: sendEmailForm.contactStatus } : {},
      },
    })
  } catch (e: any) {
    showToast('Fehler: ' + (e?.data?.message || e?.message || 'Vorschau fehlgeschlagen'))
  } finally {
    previewLoading.value = false
  }
}

async function sendEmailBlast() {
  if (!sendEmailCampaign.value) return
  sending.value = true
  sendEmailResult.value = null
  showFailedList.value = false
  try {
    const res = await $fetch(useApiUrl(`/api/marketing/${sendEmailCampaign.value.campaignId}/send-email`), {
      method: 'POST',
      headers: authHeaders,
      body: {
        subject: sendEmailForm.subject || undefined,
        tone: sendEmailForm.tone,
        contactFilter: sendEmailForm.contactStatus ? { status: sendEmailForm.contactStatus } : {},
        mode: sendEmailForm.mode,
        manualSubject: sendEmailForm.subject,
        manualBody: sendEmailForm.manualBody,
      },
    }) as any
    sendEmailResult.value = res
    // Refresh stats
    delete emailStats.value[sendEmailCampaign.value.campaignId]
    await loadEmailStats(sendEmailCampaign.value.campaignId)
  } catch (e: any) {
    sendEmailResult.value = { sent: 0, total: 0, failed: [] }
    showToast('Fehler: ' + (e?.data?.message || e?.message || 'Senden fehlgeschlagen'))
  } finally {
    sending.value = false
  }
}

async function runFollowups() {
  followupRunning.value = true
  try {
    const res = await $fetch(useApiUrl('/api/marketing/run-followups'), { method: 'POST', headers: authHeaders }) as any
    showToast(`${res.followupsSent} Follow-up${res.followupsSent !== 1 ? 's' : ''} gesendet`)
  } catch {
    showToast('Follow-up Fehler')
  } finally {
    followupRunning.value = false
  }
}

// ── Header-Upload mit Crop ──
const headerUploading = ref(false)
const cropSrc    = ref<string | null>(null)
const cropRect   = ref<{ x: number; y: number; w: number; h: number } | null>(null)
const cropImgRef = ref<HTMLImageElement | null>(null)
let _cropFile: File | null = null

function selectBannerFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  _cropFile = file
  const reader = new FileReader()
  reader.onload = ev => { cropSrc.value = ev.target?.result as string; cropRect.value = null }
  reader.readAsDataURL(file)
}

function setCropRatio(rw: number, rh: number) {
  const img = cropImgRef.value
  if (!img) return
  const dw = img.clientWidth, dh = img.clientHeight
  const ratio = rw / rh
  let w = dw, h = Math.round(w / ratio)
  if (h > dh) { h = dh; w = Math.round(h * ratio) }
  cropRect.value = { x: Math.round((dw - w) / 2), y: Math.round((dh - h) / 2), w, h }
}

async function confirmCropAndUpload() {
  if (!_cropFile) return
  headerUploading.value = true
  try {
    let uploadFile: File = _cropFile
    if (cropRect.value && cropImgRef.value) {
      const img = cropImgRef.value
      const sx = img.naturalWidth / img.clientWidth
      const sy = img.naturalHeight / img.clientHeight
      const { x, y, w, h } = cropRect.value
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(w * sx)
      canvas.height = Math.round(h * sy)
      canvas.getContext('2d')!.drawImage(img, Math.round(x*sx), Math.round(y*sy), canvas.width, canvas.height, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob>(r => canvas.toBlob(b => r(b!), 'image/jpeg', 0.92))
      uploadFile = new File([blob], _cropFile.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
    }
    const base64 = await new Promise<string>(r => {
      const reader = new FileReader()
      reader.onload = e => r(e.target!.result as string)
      reader.readAsDataURL(uploadFile)
    })
    const { useAuthHeader } = await import('~/composables/useAuth')
    const res: any = await $fetch(useApiUrl('/api/aws/s3-upload'), {
      method: 'POST',
      headers: await useAuthHeader(),
      body: { fileBase64: base64, fileName: `banner-${Date.now()}.jpg`, prefix: 'marketing/' }
    })
    if (res?.url)      form.headerImageUrl = res.url
    else if (res?.key) form.headerImageUrl = 'https://plexora-files.s3.eu-central-1.amazonaws.com/' + res.key
    cropSrc.value = null; cropRect.value = null; _cropFile = null
  } catch (err) {
    alert('Upload fehlgeschlagen — bitte erneut versuchen.')
  } finally { headerUploading.value = false }
}

// ── Background-Upload mit Crop ──
const bgUploading = ref(false)
const bgCropSrc    = ref<string | null>(null)
const bgCropRect   = ref<{ x: number; y: number; w: number; h: number } | null>(null)
const bgCropImgRef = ref<HTMLImageElement | null>(null)
let _bgCropFile: File | null = null

function selectBgFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  _bgCropFile = file
  const reader = new FileReader()
  reader.onload = ev => { bgCropSrc.value = ev.target?.result as string; bgCropRect.value = null }
  reader.readAsDataURL(file)
}

function setBgCropRatio(rw: number, rh: number) {
  const img = bgCropImgRef.value
  if (!img) return
  const dw = img.clientWidth, dh = img.clientHeight
  const ratio = rw / rh
  let w = dw, h = Math.round(w / ratio)
  if (h > dh) { h = dh; w = Math.round(h * ratio) }
  bgCropRect.value = { x: Math.round((dw - w) / 2), y: Math.round((dh - h) / 2), w, h }
}

async function confirmBgCropAndUpload() {
  if (!_bgCropFile) return
  bgUploading.value = true
  try {
    let uploadFile: File = _bgCropFile
    if (bgCropRect.value && bgCropImgRef.value) {
      const img = bgCropImgRef.value
      const sx = img.naturalWidth / img.clientWidth
      const sy = img.naturalHeight / img.clientHeight
      const { x, y, w, h } = bgCropRect.value
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(w * sx)
      canvas.height = Math.round(h * sy)
      canvas.getContext('2d')!.drawImage(img, Math.round(x*sx), Math.round(y*sy), canvas.width, canvas.height, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob>(r => canvas.toBlob(b => r(b!), 'image/jpeg', 0.92))
      uploadFile = new File([blob], _bgCropFile.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
    }
    const base64 = await new Promise<string>(r => {
      const reader = new FileReader()
      reader.onload = e => r(e.target!.result as string)
      reader.readAsDataURL(uploadFile)
    })
    const { useAuthHeader } = await import('~/composables/useAuth')
    const res: any = await $fetch(useApiUrl('/api/aws/s3-upload'), {
      method: 'POST',
      headers: await useAuthHeader(),
      body: { fileBase64: base64, fileName: `bg-${Date.now()}.jpg`, prefix: 'marketing/' }
    })
    if (res?.url)      form.bgImageUrl = res.url
    else if (res?.key) form.bgImageUrl = 'https://plexora-files.s3.eu-central-1.amazonaws.com/' + res.key
    bgCropSrc.value = null; bgCropRect.value = null; _bgCropFile = null
  } catch {
    alert('Upload fehlgeschlagen — bitte erneut versuchen.')
  } finally { bgUploading.value = false }
}

const toast = ref('')
function showToast(msg: string) {
  toast.value = msg
  setTimeout(() => toast.value = '', 2500)
}
</script>

<style scoped>
.mkt-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); margin-bottom: 4px; overflow-x: auto; }
.mkt-tab { display: inline-flex; align-items: center; gap: 7px; padding: 11px 16px; margin-bottom: -1px; background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-size: 13px; font-weight: 600; color: var(--text-muted); white-space: nowrap; }
.mkt-tab:hover { color: var(--text); }
.mkt-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
.mkt-tab-count { font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 999px; background: var(--border); color: var(--text-muted); }
.mkt-tab.active .mkt-tab-count { background: color-mix(in srgb, var(--accent) 18%, transparent); color: var(--accent); }

.mail-app { display: grid; grid-template-columns: 210px 340px 1fr; height: 600px; border: 1px solid var(--border); border-radius: 14px; overflow: hidden; background: var(--bg-elevated); box-shadow: 0 8px 26px rgba(0,0,0,.07); margin-top: 16px; }
.mail-folders { background: var(--bg); border-right: 1px solid var(--border); padding: 12px 8px; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }
.mail-acc { display: flex; justify-content: space-between; align-items: center; padding: 6px 8px 12px; font-weight: 800; font-size: 13px; color: var(--text); }
.mail-acc span { display: flex; align-items: center; gap: 7px; }
.mail-icon-btn { width: 26px; height: 26px; border-radius: 7px; border: none; background: transparent; color: var(--text-muted); cursor: pointer; }
.mail-icon-btn:hover { background: var(--border); color: var(--text); }
.mail-folder { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 8px; border: none; background: transparent; color: var(--text); font-size: 12px; font-weight: 600; cursor: pointer; text-align: left; }
.mail-folder:hover { background: var(--border); }
.mail-folder.active { background: color-mix(in srgb, var(--accent) 16%, transparent); color: var(--accent); }
.mail-folder.sep { margin-top: 12px; }
.mail-folder.sep::before { content: ''; }
.mail-fcount { margin-left: auto; font-size: 10px; font-weight: 700; color: var(--text-muted); }
.mail-folder.active .mail-fcount { color: var(--accent); }

.mail-list { border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }
.mail-search { display: flex; align-items: center; gap: 8px; margin: 10px; padding: 8px 10px; border: 1px solid var(--border); border-radius: 9px; background: var(--bg); color: var(--text-muted); font-size: 13px; }
.mail-search input { flex: 1; border: none; outline: none; background: transparent; color: var(--text); font-size: 12px; }
.mail-item { display: flex; flex-direction: column; gap: 3px; text-align: left; padding: 11px 14px; border: none; border-bottom: 1px solid var(--border); background: transparent; cursor: pointer; color: var(--text); }
.mail-item:hover { background: var(--bg); }
.mail-item.active { background: color-mix(in srgb, var(--accent) 12%, transparent); box-shadow: inset 3px 0 0 var(--accent); }
.mail-item-top { display: flex; align-items: center; gap: 8px; }
.mail-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; flex-shrink: 0; }
.mail-dot.failed { background: #ef4444; }
.mail-to { font-size: 12px; font-weight: 700; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mail-time { font-size: 10px; color: var(--text-muted); white-space: nowrap; }
.mail-subj { font-size: 12px; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-left: 16px; }
.mail-kind { font-size: 10px; color: var(--text-muted); padding-left: 16px; }
.mail-empty { padding: 30px; text-align: center; color: var(--text-muted); font-size: 12px; }

.mail-read { padding: 22px 26px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
.mail-read-subj { font-size: 18px; font-weight: 800; color: var(--text); }
.mail-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; font-size: 12px; color: var(--text); padding: 12px 14px; background: var(--bg); border: 1px solid var(--border); border-radius: 10px; }
.mail-meta > div { display: flex; flex-direction: column; gap: 2px; }
.mail-meta span { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); font-weight: 700; }
.mail-meta b.sent { color: #047857; }
.mail-meta b.failed { color: #b91c1c; }
.mail-error { display: flex; gap: 8px; align-items: center; padding: 10px 12px; border-radius: 9px; background: color-mix(in srgb, #ef4444 12%, transparent); color: #b91c1c; font-size: 12px; }
.mail-body { font-size: 13px; line-height: 1.6; color: var(--text); white-space: pre-wrap; padding: 14px; border-radius: 10px; background: var(--bg); border: 1px solid var(--border); }

@media (max-width: 1100px) {
  .mail-app { grid-template-columns: 170px 1fr; }
  .mail-read { grid-column: 1 / -1; border-top: 1px solid var(--border); }
}

.auto-block { margin-top: 24px; padding: 22px; border-radius: 16px; background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, var(--bg-elevated)), var(--bg-elevated)); border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border)); box-shadow: 0 10px 30px rgba(0,0,0,.08); }
.auto-head { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; }
.auto-icon { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; color: #fff; background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 60%, #f59e0b)); box-shadow: 0 6px 16px color-mix(in srgb, var(--accent) 40%, transparent); }
.auto-title { font-size: 17px; font-weight: 800; color: var(--text); display: flex; align-items: center; gap: 8px; }
.auto-count { font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 999px; background: var(--accent); color: #fff; }
.auto-sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.auto-btn { height: 34px; padding: 0 14px; border-radius: 9px; border: none; cursor: pointer; font-size: 12px; font-weight: 700; color: #fff; background: var(--accent); display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px color-mix(in srgb, var(--accent) 35%, transparent); }
.auto-btn:hover { filter: brightness(1.07); }
.auto-btn-ghost { height: 34px; padding: 0 14px; border-radius: 9px; font-size: 12px; font-weight: 600; color: var(--text); background: var(--bg); border: 1px solid var(--border); display: inline-flex; align-items: center; gap: 6px; text-decoration: none; }
.auto-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 36px 20px; border: 2px dashed color-mix(in srgb, var(--accent) 35%, var(--border)); border-radius: 14px; background: var(--bg); text-align: center; }
.auto-empty > i { font-size: 34px; color: var(--accent); }
.auto-empty-title { font-size: 15px; font-weight: 700; color: var(--text); }
.auto-empty-sub { font-size: 12px; color: var(--text-muted); max-width: 440px; }
.auto-list { display: flex; flex-direction: column; gap: 10px; }
.auto-row { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-radius: 12px; background: var(--bg); border: 1px solid var(--border); border-left: 4px solid var(--accent); box-shadow: 0 4px 14px rgba(0,0,0,.05); transition: transform .15s, box-shadow .15s; }
.auto-row:hover { transform: translateY(-1px); box-shadow: 0 8px 22px rgba(0,0,0,.09); }
.auto-row.off { opacity: .55; border-left-color: var(--border); }
.auto-row-main { flex: 1; min-width: 0; }
.auto-row-name { font-weight: 800; font-size: 14px; color: var(--text); margin-bottom: 6px; }
.auto-flow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.auto-chip { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; padding: 5px 10px; border-radius: 8px; }
.auto-chip.trig { background: color-mix(in srgb, #f59e0b 16%, transparent); color: #b45309; }
.auto-chip.act { background: color-mix(in srgb, #10b981 16%, transparent); color: #047857; }
.auto-arrow { color: var(--text-muted); font-size: 14px; }
.auto-status { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; white-space: nowrap; }
.auto-status.on { background: color-mix(in srgb, #10b981 18%, transparent); color: #047857; }
.auto-status.off { background: var(--border); color: var(--text-muted); }
.auto-del { width: 32px; height: 32px; border-radius: 8px; border: none; background: transparent; color: #ef4444; cursor: pointer; flex-shrink: 0; }
.auto-del:hover { background: color-mix(in srgb, #ef4444 12%, transparent); }
.fn-toggle { width: 38px; height: 22px; border-radius: 11px; border: none; cursor: pointer; position: relative; background: var(--border); flex-shrink: 0; transition: background .2s; }
.fn-toggle span { position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: left .2s; }
.fn-toggle.on { background: var(--accent); }
.fn-toggle.on span { left: 19px; }

.mkt-page { display: flex; flex-direction: column; gap: 24px; }

/* STATS */
.mkt-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
@media (max-width: 900px) { .mkt-stats { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 500px) { .mkt-stats { grid-template-columns: 1fr; } }

.mkt-stat-card {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  overflow: hidden;
  transition: border-color 0.2s, transform 0.2s;
}
.mkt-stat-card:hover { border-color: var(--accent); transform: translateY(-2px); }

.mkt-stat-glow {
  position: absolute;
  top: -30px; left: -30px;
  width: 120px; height: 120px;
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.15), transparent 70%);
  pointer-events: none;
}

.mkt-stat-icon {
  width: 44px; height: 44px;
  background: rgba(var(--accent-rgb), 0.12);
  border: 1px solid rgba(var(--accent-rgb), 0.25);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px;
  color: var(--accent);
  flex-shrink: 0;
}

.mkt-stat-body { flex: 1; min-width: 0; }
.mkt-stat-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
.mkt-stat-value { font-size: 24px; font-weight: 800; color: var(--text); line-height: 1; margin-bottom: 4px; }
.mkt-stat-sub { font-size: 11px; color: var(--accent); }

/* HEADER */
.mkt-header {
  display: flex; align-items: center; justify-content: space-between;
}
.mkt-header-left { display: flex; align-items: center; gap: 10px; }
.mkt-title { font-size: 16px; font-weight: 700; color: var(--text); margin: 0; }
.mkt-count {
  background: rgba(var(--accent-rgb), 0.15);
  color: var(--accent);
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  border-radius: 20px;
  font-size: 12px; font-weight: 700;
  padding: 2px 10px;
}

.mkt-new-btn {
  display: flex; align-items: center; gap: 6px;
  background: var(--accent); color: #fff;
  border: none; border-radius: 10px;
  padding: 8px 16px; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: opacity 0.2s, transform 0.15s;
}
.mkt-new-btn:hover { opacity: 0.88; transform: translateY(-1px); }

/* EMPTY */
.mkt-empty {
  display: flex; flex-direction: column; align-items: center;
  gap: 16px; padding: 60px 20px;
  background: var(--surface); border: 1px dashed var(--border); border-radius: 16px;
  text-align: center;
}
.mkt-empty-icon { font-size: 40px; color: var(--text-muted); opacity: 0.4; }
.mkt-empty-title { font-size: 15px; color: var(--text-muted); }

/* KAMPAGNEN GRID */
.mkt-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  max-height: min(620px, calc(100vh - 420px));
  min-height: 280px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--accent) transparent;
  padding: 4px 6px 4px 4px;
  margin: -4px -6px -4px -4px;
}

.mkt-campaign-card {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
}
.mkt-campaign-card:hover {
  border-color: rgba(var(--accent-rgb), 0.5);
  transform: translateY(-3px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.3);
}

.mkt-campaign-glow {
  position: absolute; inset: 0;
  pointer-events: none;
  z-index: 0;
}

.mkt-campaign-banner {
  height: 120px; overflow: hidden; position: relative;
}
.mkt-campaign-banner img {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
.mkt-campaign-banner-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(0,0,0,0.5));
}

.mkt-campaign-banner-placeholder {
  height: 100px;
  display: flex; align-items: center; justify-content: center;
  font-size: 32px;
  border-bottom: 1px solid var(--border);
}

.mkt-campaign-status-row {
  position: relative; z-index: 1;
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px 0;
}

.mkt-status-badge {
  display: flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 600;
  padding: 3px 9px; border-radius: 20px;
}
.mkt-status-badge.active { background: rgba(16,185,129,0.12); color: #10b981; border: 1px solid rgba(16,185,129,0.25); }
.mkt-status-badge.inactive { background: rgba(245,158,11,0.12); color: #f59e0b; border: 1px solid rgba(245,158,11,0.25); }

.mkt-status-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: currentColor;
  animation: pulse-dot 2s infinite;
}
.mkt-status-badge.inactive .mkt-status-dot { animation: none; }

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.mkt-utm-badge {
  font-size: 10px; color: var(--text-muted);
  background: var(--bg); border: 1px solid var(--border);
  padding: 2px 8px; border-radius: 20px;
}

.mkt-campaign-content {
  position: relative; z-index: 1;
  padding: 10px 14px 12px;
}

.mkt-campaign-name {
  font-size: 15px; font-weight: 700; color: var(--text);
  margin-bottom: 4px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.mkt-campaign-headline {
  font-size: 12px; color: var(--text-muted);
  margin-bottom: 12px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  min-height: 16px;
}

.mkt-campaign-meta {
  display: flex; gap: 14px; align-items: center;
}

.mkt-meta-item {
  display: flex; align-items: center; gap: 5px;
  font-size: 12px; color: var(--text-muted);
}
.mkt-meta-item i { color: var(--accent); font-size: 13px; }
.mkt-slug { color: var(--accent); }

.mkt-campaign-actions {
  position: relative; z-index: 1;
  display: flex; gap: 4px;
  padding: 8px 14px 12px;
  border-top: 1px solid var(--border);
}

.mkt-action-btn {
  width: 32px; height: 32px;
  background: var(--bg); border: 1px solid var(--border);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; color: var(--text-muted);
  cursor: pointer; transition: all 0.15s;
  flex-shrink: 0;
}
.mkt-action-btn:hover { border-color: var(--accent); color: var(--accent); background: rgba(var(--accent-rgb), 0.08); }
.mkt-action-btn.danger:hover { border-color: var(--danger); color: var(--danger); background: rgba(220,38,38,0.08); }

.mkt-action-btn:last-child { margin-left: auto; }

.mkt-design-btn { border-color: var(--accent); color: var(--accent); background: rgba(var(--accent-rgb), 0.1); }
.mkt-design-btn:hover { background: rgba(var(--accent-rgb), 0.2); }

/* EMAIL STATS */
.mkt-email-stats {
  display: flex; gap: 14px;
  padding: 6px 14px 8px;
  border-top: 1px solid var(--border);
}
.mkt-estat-item {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; color: var(--text-muted);
}
.mkt-estat-item i { color: var(--accent); font-size: 13px; }

/* SEND RESULT */
.mkt-send-result {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; border-radius: 10px;
  font-size: 13px; font-weight: 600;
}
.mkt-send-result.success { background: rgba(16,185,129,0.1); color: #10b981; border: 1px solid rgba(16,185,129,0.25); }
.mkt-send-result.warn    { background: rgba(245,158,11,0.1);  color: #f59e0b; border: 1px solid rgba(245,158,11,0.25); }

/* SEND FAILED LIST */
.mkt-send-failed { display: flex; flex-direction: column; gap: 6px; }
.mkt-failed-toggle {
  display: flex; align-items: center; gap: 6px;
  background: none; border: none; cursor: pointer;
  font-size: 12px; font-weight: 600; color: #ef4444; padding: 0;
}
.mkt-failed-list {
  display: flex; flex-direction: column; gap: 6px;
  background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.2);
  border-radius: 10px; padding: 10px 12px;
  max-height: 160px; overflow-y: auto;
}
.mkt-failed-item { font-size: 12px; color: var(--text-secondary); }

/* SECONDARY BUTTON */
.mkt-secondary-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; background: var(--bg-elevated); color: var(--text-primary);
  border: 1px solid var(--border); border-radius: 8px;
  padding: 12px; font-size: 13px; font-weight: 600;
  font-family: "Exo 2", sans-serif; cursor: pointer;
  transition: opacity 0.15s, background 0.15s;
}
.mkt-secondary-btn:hover:not(:disabled) { background: var(--border); }
.mkt-secondary-btn:disabled { opacity: 0.5; cursor: default; }

/* PREVIEW PANEL */
.mkt-preview-empty {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; text-align: center; padding: 32px 20px;
  background: var(--bg-elevated); border: 1px dashed var(--border); border-radius: 10px;
  color: var(--text-muted); font-size: 12px; min-height: 220px;
}
.mkt-preview-empty i { font-size: 26px; color: var(--text-muted); }
.mkt-preview-card {
  border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
  display: flex; flex-direction: column;
}
.mkt-preview-meta {
  padding: 10px 14px; background: var(--bg-elevated); border-bottom: 1px solid var(--border);
  font-size: 12px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 4px;
}
.mkt-preview-html {
  max-height: 360px; overflow-y: auto; background: #fff;
}

.draft-status { margin-left:auto; margin-right:12px; font-size:12px; color:var(--text-muted) }
.draft-status.offline { color:#E0A030 }
.draft-restore { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin:0 24px 8px; padding:10px 14px; border-radius:10px; font-size:13px; background:color-mix(in srgb, var(--accent) 12%, transparent); border:0.5px solid color-mix(in srgb, var(--accent) 35%, transparent) }
</style>
