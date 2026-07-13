// 1:1-Nachbau des ursprünglich hartcodierten Layouts aus app/pages/lead/[slug].vue —
// Pflicht-Fallback für alle bestehenden Kampagnen ohne eigenes customTemplateHtml.
export const STANDARD_LEAD_HTML = `<div class="lp-root">
  <div class="lp-bg" data-plx-field="campaign.bgImageUrl" data-plx-type="image-bg"></div>
  <div class="lp-bg-overlay"></div>

  <div class="lp-layout">
    <div class="lp-hero">
      <div class="lp-logo">
        {{#if campaign.logoUrl}}
          <img src="{{campaign.logoUrl}}" data-plx-field="campaign.logoUrl" data-plx-type="image" style="max-height:48px;max-width:{{#if campaign.imageStyles.logoUrl}}{{campaign.imageStyles.logoUrl.widthPct}}%{{else}}180px{{/if}};object-fit:contain" />
        {{else}}
          <div class="lp-logo-text">{{branding.brandNameFirst}}<span class="lp-logo-accent">{{branding.brandNameLast}}</span></div>
        {{/if}}
      </div>

      <h1 class="lp-headline" data-plx-field="campaign.headline" data-plx-type="text">{{campaign.headline}}</h1>
      {{#if campaign.subtext}}<p class="lp-subtext" data-plx-field="campaign.subtext" data-plx-type="text">{{campaign.subtext}}</p>{{/if}}

      {{#if campaign.headerImageUrl}}
        <div class="lp-banner-card" {{#if campaign.imageStyles.headerImageUrl}}style="max-width:{{campaign.imageStyles.headerImageUrl.widthPct}}%"{{/if}}><img src="{{campaign.headerImageUrl}}" data-plx-field="campaign.headerImageUrl" data-plx-type="image" /></div>
      {{/if}}

      {{#if campaign.contentItems.length}}
        <div class="lp-benefits">
          {{#if campaign.contentTitle}}<div class="lp-benefits-title" data-plx-field="campaign.contentTitle" data-plx-type="text">{{campaign.contentTitle}}</div>{{/if}}
          {{#each campaign.contentItems}}
            <div class="lp-benefit-item">
              <span class="lp-benefit-check"><i class="ti ti-check"></i></span>
              {{this}}
            </div>
          {{/each}}
        </div>
      {{/if}}

      <div class="lp-trust">
        <div class="lp-trust-item"><i class="ti ti-shield-check"></i> 100% kostenlos</div>
        <div class="lp-trust-item"><i class="ti ti-lock"></i> SSL gesichert</div>
        <div class="lp-trust-item"><i class="ti ti-clock"></i> Antwort in 24h</div>
      </div>
    </div>

    <div class="lp-form-col">
      <div class="lp-form-card">
        <div class="lp-form-title">{{#if form.title}}{{form.title}}{{else}}{{#if campaign.headline}}{{campaign.headline}}{{else}}Jetzt anfragen{{/if}}{{/if}}</div>
        {{#if form.description}}<div class="lp-form-desc">{{form.description}}</div>{{/if}}
        {{{form_html}}}
      </div>
    </div>
  </div>
</div>

<style>
.lp-root { min-height: 100vh; position: relative; overflow-x: hidden; background: linear-gradient(135deg, #050815 0%, #0f1628 60%, {{campaign.accentColor}}18 100%); }
{{#if campaign.bgImageUrl}}
.lp-bg { background-image: url('{{campaign.bgImageUrl}}'); background-size: cover; background-position: center; }
{{else if campaign.bgColor}}
.lp-bg { background: {{campaign.bgColor}}; }
{{else if campaign.headerImageUrl}}
.lp-bg { background-image: url('{{campaign.headerImageUrl}}'); background-size: cover; background-position: center; }
.lp-bg-overlay { background: linear-gradient(135deg, rgba(5,8,21,0.85) 0%, rgba(5,8,21,0.6) 50%, rgba(5,8,21,0.75) 100%); }
{{/if}}

.lp-bg, .lp-bg-overlay { position: fixed; inset: 0; z-index: 0; }

.lp-layout { position: relative; z-index: 1; min-height: 100vh; display: grid; grid-template-columns: 1fr 480px; gap: 0; max-width: 1200px; margin: 0 auto; padding: 0 40px; align-items: center; }
@media (max-width: 900px) { .lp-layout { grid-template-columns: 1fr; padding: 24px 16px 48px; gap: 28px; align-items: start; } }
@media (max-width: 480px) { .lp-layout { padding: 20px 12px 40px; gap: 20px; } }

.lp-hero { padding: 80px 40px 80px 0; display: flex; flex-direction: column; gap: 20px; }
@media (max-width: 900px) { .lp-hero { padding: 0; text-align: center; align-items: center; order: 2; } }

.lp-logo { margin-bottom: 8px; }
.lp-logo-text { font-size: 28px; font-weight: 900; color: #fff; letter-spacing: -0.5px; }
.lp-logo-accent { color: {{campaign.accentColor}}; }

.lp-headline { font-size: clamp(24px, 5vw, 52px); font-weight: 900; color: #fff; line-height: 1.15; margin: 0; letter-spacing: -0.5px; }
.lp-subtext { font-size: 17px; color: rgba(255,255,255,0.72); margin: 0; line-height: 1.6; max-width: 480px; }

.lp-benefits { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
.lp-benefits-title { font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.5); margin-bottom: 4px; }
.lp-benefit-item { display: flex; align-items: center; gap: 12px; font-size: 15px; color: rgba(255,255,255,0.88); }
@media (max-width: 900px) { .lp-benefit-item { justify-content: center; } }
.lp-benefit-check { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; background: {{campaign.accentColor}}22; color: {{campaign.accentColor}}; border: 1px solid {{campaign.accentColor}}44; }

.lp-trust { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 8px; }
@media (max-width: 900px) { .lp-trust { justify-content: center; } }
.lp-trust-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: rgba(255,255,255,0.5); }
.lp-trust-item i { color: {{campaign.accentColor}}; }

.lp-banner-card { border-radius: 14px; overflow: hidden; border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 16px 48px rgba(0,0,0,0.4); max-width: 420px; width: 100%; }
.lp-banner-card img { width: 100%; display: block; object-fit: cover; }

.lp-form-col { padding: 60px 0; }
@media (max-width: 900px) { .lp-form-col { padding: 0; order: 1; } }

.lp-form-card { background: rgba(15, 20, 40, 0.72); backdrop-filter: blur(24px) saturate(1.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 36px; box-shadow: 0 32px 80px rgba(0,0,0,0.4); }
@media (max-width: 480px) { .lp-form-card { padding: 24px 20px; border-radius: 18px; } }

.lp-form-title { font-size: 20px; font-weight: 800; color: #fff; margin-bottom: 4px; }
.lp-form-desc { font-size: 13px; color: rgba(255,255,255,0.55); margin-bottom: 4px; }

#plx-lead-form-fields, .plx-fields { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
.plx-field { display: flex; flex-direction: column; gap: 5px; }
.plx-label { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.65); letter-spacing: 0.03em; }
.plx-required { color: {{campaign.accentColor}}; }

.plx-input { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 10px 14px; font-size: 14px; color: #fff; outline: none; width: 100%; box-sizing: border-box; transition: border-color 0.15s; font-family: inherit; }
.plx-input::placeholder { color: rgba(255,255,255,0.28); }
.plx-input:focus { border-color: {{campaign.accentColor}}; background: rgba(255,255,255,0.09); }
.plx-textarea { resize: vertical; }
.plx-select { appearance: none; cursor: pointer; }
.plx-select option { background: #111827; color: #fff; }

.plx-submit-btn { width: 100%; padding: 14px; border: none; border-radius: 12px; font-size: 15px; font-weight: 700; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: opacity 0.2s, transform 0.15s; margin-top: 4px; background: {{campaign.accentColor}}; box-shadow: 0 4px 24px {{campaign.accentColor}}55; }
.plx-submit-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
.plx-submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.plx-submit-btn .plx-submit-label::after { content: ''; }

.plx-privacy { text-align: center; font-size: 11px; color: rgba(255,255,255,0.35); display: flex; align-items: center; justify-content: center; gap: 5px; margin-top: 10px; }

.plx-no-form { text-align: center; color: rgba(255,255,255,0.4); padding: 32px; display: flex; flex-direction: column; align-items: center; gap: 8px; font-size: 14px; }

.plx-form-success { text-align: center; padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 8px; font-size: 22px; font-weight: 800; color: #fff; }
.plx-form-error { text-align: center; color: #ef4444; font-size: 13px; margin-top: 10px; }
</style>`
