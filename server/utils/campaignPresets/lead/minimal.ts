// Reduziert auf das Wesentliche: eine Spalte, viel Weißraum, dünne Linien statt Karten.
export const MINIMAL_LEAD_HTML = `<div class="lp3-root">
  <div class="lp3-wrap">
    <div class="lp3-brand">
      {{#if campaign.logoUrl}}
        <img src="{{campaign.logoUrl}}" data-plx-field="campaign.logoUrl" data-plx-type="image" class="lp3-logo" {{#if campaign.imageStyles.logoUrl}}style="max-width:{{campaign.imageStyles.logoUrl.widthPct}}%"{{/if}} />
      {{else}}
        <span>{{branding.brandNameFirst}}<span class="lp3-accent">{{branding.brandNameLast}}</span></span>
      {{/if}}
    </div>

    <h1 class="lp3-headline" data-plx-field="campaign.headline" data-plx-type="text">{{campaign.headline}}</h1>
    {{#if campaign.subtext}}<p class="lp3-subtext" data-plx-field="campaign.subtext" data-plx-type="text">{{campaign.subtext}}</p>{{/if}}

    {{#if campaign.contentItems.length}}
      <ul class="lp3-list">
        {{#each campaign.contentItems}}<li>{{this}}</li>{{/each}}
      </ul>
    {{/if}}

    <div class="lp3-divider"></div>

    {{{form_html}}}
  </div>
</div>

<style>
.lp3-root { min-height: 100vh; background: #fff; display: flex; justify-content: center; padding: 64px 24px; }
.lp3-wrap { max-width: 440px; width: 100%; }
.lp3-brand { font-size: 18px; font-weight: 800; color: #111; margin-bottom: 48px; }
.lp3-logo { max-height: 32px; max-width: 140px; object-fit: contain; }
.lp3-accent { color: {{campaign.accentColor}}; }

.lp3-headline { font-size: 30px; font-weight: 800; color: #0d0d14; line-height: 1.25; margin: 0 0 12px; letter-spacing: -0.3px; }
.lp3-subtext { font-size: 15px; color: #666; line-height: 1.6; margin: 0 0 24px; }

.lp3-list { list-style: none; margin: 0 0 32px; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.lp3-list li { font-size: 14px; color: #333; padding-left: 20px; position: relative; }
.lp3-list li::before { content: '—'; position: absolute; left: 0; color: {{campaign.accentColor}}; }

.lp3-divider { height: 1px; background: #eee; margin: 0 0 28px; }

.plx-fields, #plx-lead-form-fields { display: flex; flex-direction: column; gap: 16px; }
.plx-field { display: flex; flex-direction: column; gap: 5px; }
.plx-label { font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.04em; }
.plx-required { color: {{campaign.accentColor}}; }
.plx-input { border: none; border-bottom: 1.5px solid #ddd; border-radius: 0; padding: 8px 0; font-size: 15px; color: #111; outline: none; width: 100%; box-sizing: border-box; font-family: inherit; background: transparent; transition: border-color 0.15s; }
.plx-input:focus { border-color: {{campaign.accentColor}}; }
.plx-textarea { resize: vertical; border: 1.5px solid #ddd; border-radius: 8px; padding: 10px; }
.plx-select { appearance: none; cursor: pointer; }
.plx-submit-btn { width: 100%; padding: 13px; border: none; border-radius: 6px; font-size: 14px; font-weight: 700; letter-spacing: 0.02em; color: #fff; cursor: pointer; margin-top: 12px; background: {{campaign.accentColor}}; }
.plx-submit-btn:hover:not(:disabled) { opacity: 0.9; }
.plx-submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.plx-privacy { text-align: left; font-size: 11px; color: #aaa; margin-top: 12px; }
.plx-no-form { color: #aaa; font-size: 14px; padding: 16px 0; }
.plx-form-success { padding: 16px 0; font-size: 17px; font-weight: 700; color: #111; }
.plx-form-error { color: #dc2626; font-size: 13px; margin-top: 10px; }
</style>`
