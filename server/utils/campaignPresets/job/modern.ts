// Farbiger Hero-Banner statt neutraler Karte, größere Typografie — modernere Recruiting-Optik.
export const MODERN_JOB_HTML = `<div class="jp2-root">
  <div class="jp2-hero" style="background: linear-gradient(135deg, {{campaign.accentColor}} 0%, {{campaign.accentColor}}cc 100%);">
    {{#if campaign.logoUrl}}
      <img src="{{campaign.logoUrl}}" data-plx-field="campaign.logoUrl" data-plx-type="image" class="jp2-logo" {{#if campaign.imageStyles.logoUrl}}style="max-width:{{campaign.imageStyles.logoUrl.widthPct}}%"{{/if}} />
    {{else}}
      <div class="jp2-logo-text">{{branding.brandNameFirst}}{{branding.brandNameLast}}</div>
    {{/if}}
    <div class="jp2-eyebrow">Karriere{{#if campaign.hasCompanyName}} bei {{campaign.companyName}}{{/if}}</div>
    <h1 class="jp2-title" data-plx-field="campaign.title" data-plx-type="text">{{campaign.title}}</h1>
    <div class="jp2-badges">
      <span class="jp2-badge" data-plx-field="campaign.department" data-plx-type="text"><i class="ti ti-building"></i> {{campaign.department}}</span>
      <span class="jp2-badge" data-plx-field="campaign.location" data-plx-type="text"><i class="ti ti-map-pin"></i> {{campaign.location}}</span>
      <span class="jp2-badge"><i class="ti ti-clock"></i> {{campaign.typeLabel}}</span>
    </div>
  </div>

  {{#if campaign.headerImageUrl}}
    <div class="jp2-banner" {{#if campaign.imageStyles.headerImageUrl}}style="max-width:{{campaign.imageStyles.headerImageUrl.widthPct}}%"{{/if}}><img src="{{campaign.headerImageUrl}}" data-plx-field="campaign.headerImageUrl" data-plx-type="image" /></div>
  {{/if}}

  <div class="jp2-body">
    <div class="jp2-desc" data-plx-field="campaign.description" data-plx-type="multiline">{{campaign.description}}</div>
    {{#if campaign.requirements}}
      <div class="jp2-req">
        <div class="jp2-req-title">Anforderungen</div>
        <div class="jp2-req-text" data-plx-field="campaign.requirements" data-plx-type="multiline">{{campaign.requirements}}</div>
      </div>
    {{/if}}

    <div class="jp2-form-card">
      <div class="jp2-form-title">Jetzt bewerben</div>
      {{{application_form_html}}}
    </div>
  </div>
</div>

<style>
.jp2-root { min-height: 100vh; background: #f7f7fb; padding-bottom: 64px; }
.jp2-hero { padding: 56px 24px 40px; text-align: center; color: #fff; }
.jp2-logo { max-height: 48px; max-width: 180px; object-fit: contain; margin-bottom: 16px; filter: brightness(0) invert(1); }
.jp2-logo-text { font-size: 24px; font-weight: 900; margin-bottom: 12px; }
.jp2-eyebrow { font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; opacity: 0.85; margin-bottom: 8px; }
.jp2-title { font-size: clamp(24px, 4vw, 38px); font-weight: 900; margin: 0 0 18px; line-height: 1.2; }
.jp2-badges { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
.jp2-badge { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; background: rgba(255,255,255,0.2); border-radius: 20px; padding: 6px 14px; }

.jp2-banner { max-width: 760px; margin: -24px auto 0; border-radius: 16px; overflow: hidden; box-shadow: 0 16px 48px rgba(0,0,0,0.15); position: relative; z-index: 1; }
.jp2-banner img { width: 100%; display: block; max-height: 260px; object-fit: cover; }

.jp2-body { max-width: 640px; margin: 32px auto 0; padding: 0 24px; display: flex; flex-direction: column; gap: 24px; }
.jp2-desc { font-size: 15px; color: #333; line-height: 1.7; white-space: pre-wrap; background: #fff; border-radius: 16px; padding: 28px; box-shadow: 0 4px 20px rgba(20,20,40,0.05); }
.jp2-req { background: #fff; border-radius: 16px; padding: 28px; box-shadow: 0 4px 20px rgba(20,20,40,0.05); }
.jp2-req-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: {{campaign.accentColor}}; margin-bottom: 10px; }
.jp2-req-text { font-size: 14px; color: #444; line-height: 1.7; white-space: pre-wrap; }

.jp2-form-card { background: #fff; border-radius: 16px; padding: 28px; box-shadow: 0 4px 20px rgba(20,20,40,0.05); }
.jp2-form-title { font-size: 18px; font-weight: 800; color: #111; margin-bottom: 16px; }

.plx-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
.plx-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.plx-label { font-size: 12px; font-weight: 600; color: #666; }
.plx-input { background: #f7f7fb; border: 1px solid #e4e5ef; border-radius: 8px; padding: 10px 14px; font-size: 14px; color: #16161f; width: 100%; outline: none; box-sizing: border-box; font-family: inherit; }
.plx-input:focus { border-color: {{campaign.accentColor}}; }
.plx-textarea { resize: vertical; min-height: 100px; }
.plx-submit-btn { width: 100%; padding: 13px; border: none; border-radius: 8px; font-size: 14px; font-weight: 700; color: #fff; cursor: pointer; margin-top: 4px; background: {{campaign.accentColor}}; }
.plx-submit-btn:hover:not(:disabled) { opacity: 0.9; }
.plx-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.plx-form-success { text-align: center; padding: 20px; font-size: 17px; font-weight: 700; color: {{campaign.accentColor}}; }
.plx-form-error { text-align: center; color: #dc2626; font-size: 13px; margin-top: 10px; }
</style>`
