<template>
  <div class="mkt-page">

    <!-- STATS -->
    <div class="mkt-stats">
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
    <div class="mkt-header">
      <div class="mkt-header-left">
        <h2 class="mkt-title">{{ t.marketing.campaigns }}</h2>
        <span class="mkt-count">{{ campaigns.length }}</span>
      </div>
      <button class="mkt-new-btn" @click="openAdd">
        <i class="ti ti-plus"></i> {{ t.marketing.newCampaign }}
      </button>
    </div>

    <!-- EMPTY -->
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

        <!-- Actions -->
        <div class="mkt-campaign-actions">
          <button class="mkt-action-btn" :title="t.marketing.copyLink" @click="copyLink(c)">
            <i class="ti ti-copy"></i>
          </button>
          <button class="mkt-action-btn" :title="t.marketing.qrCode" @click="showQr(c)">
            <i class="ti ti-qrcode"></i>
          </button>
          <button class="mkt-action-btn" @click="openEdit(c)">
            <i class="ti ti-pencil"></i>
          </button>
          <button class="mkt-action-btn danger" @click="deleteCampaign(c)">
            <i class="ti ti-trash"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL ERSTELLEN/BEARBEITEN -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal=false">
      <div class="modal-card" style="max-width:960px;width:95vw;max-height:90vh;overflow-y:auto">
        <div class="modal-header">
          <span class="card-title">{{ editing ? t.marketing.editCampaign : t.marketing.newCampaignTitle }}</span>
          <button class="icon-btn" @click="showModal=false"><i class="ti ti-x"></i></button>
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
          </div>

          <!-- Live-Vorschau -->
          <div style="position:sticky;top:0">
            <div class="settings-label" style="margin-bottom:10px">{{ t.marketing.livePreview }}</div>
            <!-- Mini Landing Page Preview -->
            <div style="border-radius:12px;overflow:hidden;border:0.5px solid var(--border);min-height:320px;position:relative"
              :style="form.bgImageUrl
                ? `background:url('${form.bgImageUrl}') center/cover no-repeat`
                : `background:${form.bgColor || '#050815'}`">
              <!-- Overlay -->
              <div style="position:absolute;inset:0;background:rgba(5,8,21,0.65);pointer-events:none"></div>
              <!-- Content -->
              <div style="position:relative;z-index:1;display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:14px;min-height:320px;align-items:center">
                <!-- Hero links -->
                <div style="padding:8px 4px">
                  <div style="font-size:11px;font-weight:800;color:#fff;margin-bottom:6px;line-height:1.2">{{ form.headline || 'Deine Headline' }}</div>
                  <div style="font-size:10px;color:rgba(255,255,255,0.6);margin-bottom:10px">{{ form.subtext || 'Dein Subtext' }}</div>
                  <div v-for="(item, i) in form.contentItems.filter(Boolean).slice(0,3)" :key="i"
                    style="display:flex;align-items:center;gap:5px;margin-bottom:5px">
                    <span :style="`width:14px;height:14px;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-size:9px;background:${form.accentColor}22;color:${form.accentColor};border:1px solid ${form.accentColor}44;flex-shrink:0`">✓</span>
                    <span style="font-size:10px;color:rgba(255,255,255,0.8)">{{ item }}</span>
                  </div>
                </div>
                <!-- Form rechts -->
                <div style="background:rgba(15,20,40,0.75);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px">
                  <div style="font-size:11px;font-weight:700;color:#fff;margin-bottom:8px">{{ form.headline || 'Anfrage' }}</div>
                  <div v-for="field in (selectedForm?.fields || []).slice(0,3)" :key="field.id"
                    style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:5px 8px;font-size:10px;color:rgba(255,255,255,0.4);margin-bottom:4px">
                    {{ field.label }}{{ field.required ? ' *' : '' }}
                  </div>
                  <div v-if="(selectedForm?.fields || []).length > 3" style="font-size:9px;color:rgba(255,255,255,0.3);text-align:center;margin-bottom:4px">+ {{ (selectedForm?.fields || []).length - 3 }} weitere...</div>
                  <button :style="`width:100%;background:${form.accentColor};color:#fff;border:none;padding:6px;border-radius:6px;font-size:10px;font-weight:700;cursor:default`">
                    {{ selectedForm?.submitLabel || 'Jetzt anfragen' }}
                  </button>
                </div>
              </div>
            </div>
            <!-- Banner Vorschau (Card) -->
            <div v-if="form.headerImageUrl" style="margin-top:8px;border-radius:8px;overflow:hidden;border:0.5px solid var(--border);height:60px;position:relative">
              <img :src="form.headerImageUrl" style="width:100%;height:100%;object-fit:cover;display:block" />
              <div style="position:absolute;inset:0;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
                <span style="font-size:10px;color:rgba(255,255,255,0.7)">Card-Banner</span>
              </div>
            </div>
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
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
const { t, lang } = useLang()

const userId = ref('demo-user')

const { data: campaignsData, refresh } = await useFetch(
  () => useApiUrl(`/api/marketing?userId=${encodeURIComponent(userId.value)}`),
  { getCachedData: () => undefined }
)
const { data: formsData, refresh: refreshForms } = await useFetch(
  () => useApiUrl(`/api/forms?userId=${encodeURIComponent(userId.value)}`),
  { getCachedData: () => undefined }
)
const { data: statsData, refresh: refreshStats } = await useFetch(
  () => useApiUrl(`/api/marketing/stats?userId=${encodeURIComponent(userId.value)}`),
  { getCachedData: () => undefined }
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
  const base = c.slug ? `${BASE_URL}/${c.slug}` : `${BASE_URL}/lead/${c.formId}`
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
const showModal = ref(false)
onMounted(() => { if (route.query.new) showModal.value = true })
const editing = ref<any>(null)
const saving  = ref(false)
const form = reactive({
  name: '', slug: '', formId: '', headline: '', subtext: '',
  headerImageUrl: '', accentColor: '#6C3FE8',
  bgImageUrl: '', bgColor: '#050815',
  contentTitle: '', contentItems: ['', '', '', ''] as string[],
  utmSource: '', utmMedium: 'social', utmCampaign: '',
})

const selectedForm = computed(() => forms.value.find((f: any) => f.formId === form.formId) || null)
const campaignUrl  = computed(() => {
  if (!form.formId) return ''
  const base = form.slug ? `${BASE_URL}/${form.slug}` : `${BASE_URL}/lead/${form.formId}`
  const params = new URLSearchParams()
  if (form.utmSource)   params.set('utm_source', form.utmSource)
  if (form.utmMedium)   params.set('utm_medium', form.utmMedium)
  if (form.utmCampaign) params.set('utm_campaign', form.utmCampaign)
  const q = params.toString()
  return q ? `${base}?${q}` : base
})

function resetForm() {
  Object.assign(form, { name: '', slug: '', formId: '', headline: '', subtext: '', headerImageUrl: '', accentColor: '#6C3FE8', bgImageUrl: '', bgColor: '#050815', contentTitle: '', contentItems: ['', '', '', ''], utmSource: '', utmMedium: 'social', utmCampaign: '' })
}

function openAdd() { editing.value = null; resetForm(); showModal.value = true }

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
  })
  showModal.value = true
}

async function save() {
  saving.value = true
  try {
    const payload = { ...form, contentItems: form.contentItems.filter(Boolean), userId: userId.value }
    if (editing.value) {
      await $fetch(useApiUrl(`/api/marketing/${editing.value.campaignId}`), { method: 'PATCH', body: payload })
    } else {
      await $fetch(useApiUrl('/api/marketing'), { method: 'POST', body: payload })
    }
    await new Promise(r => setTimeout(r, 300))
    await Promise.all([refresh(), refreshStats()])
    showModal.value = false
    showToast(editing.value ? 'Kampagne aktualisiert!' : 'Kampagne erstellt!')
  } finally {
    saving.value = false
  }
}

async function deleteCampaign(c: any) {
  const name = c.name || 'diese Kampagne'
  const msg = lang.value === 'en' ? `Really delete campaign "${name}"?` : `Kampagne "${name}" wirklich löschen?`
  if (!confirm(msg)) return
  try {
    await $fetch(useApiUrl(`/api/marketing/${c.campaignId}`), { method: 'DELETE' })
    await new Promise(r => setTimeout(r, 300))
    await Promise.all([refresh(), refreshStats()])
    showToast(lang.value === 'en' ? 'Campaign deleted!' : 'Kampagne gelöscht!')
  } catch (e: any) {
    showToast('Fehler: ' + (e?.data?.message || e?.message || 'Löschen fehlgeschlagen'))
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
    const res: any = await $fetch(useApiUrl('/api/aws/s3-upload'), {
      method: 'POST',
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
    const res: any = await $fetch(useApiUrl('/api/aws/s3-upload'), {
      method: 'POST',
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
</style>
