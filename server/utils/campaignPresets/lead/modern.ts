// Helles, zentriertes Layout mit großer Karte — Kontrast zum dunklen "standard"-Preset.
export const MODERN_LEAD_HTML = `<div class="lp2-root">
  <div class="lp2-topbar">
    {{#if campaign.logoUrl}}
      <img src="{{campaign.logoUrl}}" class="lp2-logo" />
    {{else}}
      <div class="lp2-logo-text">{{branding.brandNameFirst}}<span class="lp2-accent">{{branding.brandNameLast}}</span></div>
    {{/if}}
  </div>

  <div class="lp2-hero">
    {{#if campaign.headerImageUrl}}<div class="lp2-hero-img"><img src="{{campaign.headerImageUrl}}" /></div>{{/if}}
    <h1 class="lp2-headline">{{campaign.headline}}</h1>
    {{#if campaign.subtext}}<p class="lp2-subtext">{{campaign.subtext}}</p>{{/if}}
  </div>

  <div class="lp2-body">
    {{#if campaign.contentItems.length}}
      <div class="lp2-benefits">
        {{#if campaign.contentTitle}}<div class="lp2-benefits-title">{{campaign.contentTitle}}</div>{{/if}}
        <div class="lp2-benefits-grid">
          {{#each campaign.contentItems}}
            <div class="lp2-benefit-item"><span class="lp2-check"><i class="ti ti-check"></i></span>{{this}}</div>
          {{/each}}
        </div>
      </div>
    {{/if}}

    <div class="lp2-form-card">
      <div class="lp2-form-title">{{#if form.title}}{{form.title}}{{else}}{{#if campaign.headline}}{{campaign.headline}}{{else}}Jetzt anfragen{{/if}}{{/if}}</div>
      {{#if form.description}}<div class="lp2-form-desc">{{form.description}}</div>{{/if}}
      {{{form_html}}}
    </div>
  </div>
</div>

<style>
.lp2-root { min-height: 100vh; background: #f7f7fb; padding: 0 0 64px; }
.lp2-topbar { padding: 24px 40px; display: flex; justify-content: center; }
.lp2-logo { max-height: 40px; max-width: 160px; object-fit: contain; }
.lp2-logo-text { font-size: 22px; font-weight: 900; color: #111; }
.lp2-accent { color: {{campaign.accentColor}}; }

.lp2-hero { max-width: 720px; margin: 0 auto; text-align: center; padding: 24px 24px 8px; }
.lp2-hero-img { border-radius: 20px; overflow: hidden; margin-bottom: 28px; box-shadow: 0 24px 60px rgba(0,0,0,0.12); }
.lp2-hero-img img { width: 100%; display: block; max-height: 320px; object-fit: cover; }
.lp2-headline { font-size: clamp(26px, 4.5vw, 44px); font-weight: 900; color: #0d0d14; line-height: 1.2; margin: 0; }
.lp2-subtext { font-size: 16px; color: #55566b; margin: 14px 0 0; line-height: 1.6; }

.lp2-body { max-width: 720px; margin: 32px auto 0; padding: 0 24px; display: flex; flex-direction: column; gap: 28px; }

.lp2-benefits-title { font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #8a8ba0; margin-bottom: 12px; text-align: center; }
.lp2-benefits-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 560px) { .lp2-benefits-grid { grid-template-columns: 1fr; } }
.lp2-benefit-item { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #2b2c3d; background: #fff; border-radius: 12px; padding: 12px 14px; box-shadow: 0 2px 10px rgba(20,20,40,0.05); }
.lp2-check { width: 24px; height: 24px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; background: {{campaign.accentColor}}18; color: {{campaign.accentColor}}; }

.lp2-form-card { background: #fff; border-radius: 20px; padding: 32px; box-shadow: 0 24px 60px rgba(20,20,40,0.08); border: 1px solid #eceef5; }
.lp2-form-title { font-size: 19px; font-weight: 800; color: #111; margin-bottom: 4px; }
.lp2-form-desc { font-size: 13px; color: #7a7b90; margin-bottom: 4px; }

#plx-lead-form-fields, .plx-fields { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
.plx-field { display: flex; flex-direction: column; gap: 5px; }
.plx-label { font-size: 12px; font-weight: 600; color: #55566b; }
.plx-required { color: {{campaign.accentColor}}; }
.plx-input { background: #f7f7fb; border: 1px solid #e4e5ef; border-radius: 10px; padding: 10px 14px; font-size: 14px; color: #16161f; outline: none; width: 100%; box-sizing: border-box; font-family: inherit; transition: border-color 0.15s; }
.plx-input:focus { border-color: {{campaign.accentColor}}; background: #fff; }
.plx-textarea { resize: vertical; }
.plx-select { appearance: none; cursor: pointer; }
.plx-submit-btn { width: 100%; padding: 14px; border: none; border-radius: 12px; font-size: 15px; font-weight: 700; color: #fff; cursor: pointer; margin-top: 4px; background: {{campaign.accentColor}}; box-shadow: 0 8px 24px {{campaign.accentColor}}40; }
.plx-submit-btn:hover:not(:disabled) { opacity: 0.9; }
.plx-submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.plx-privacy { text-align: center; font-size: 11px; color: #9a9bb0; margin-top: 10px; }
.plx-no-form { text-align: center; color: #9a9bb0; padding: 32px; font-size: 14px; }
.plx-form-success { text-align: center; padding: 24px; font-size: 20px; font-weight: 800; color: {{campaign.accentColor}}; }
.plx-form-error { text-align: center; color: #dc2626; font-size: 13px; margin-top: 10px; }
</style>`
