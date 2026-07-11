// Reduziert: eine Spalte, dünne Trennlinien statt Karten, viel Weißraum.
export const MINIMAL_JOB_HTML = `<div class="jp3-root">
  <div class="jp3-wrap">
    <div class="jp3-brand">
      {{#if campaign.logoUrl}}
        <img src="{{campaign.logoUrl}}" class="jp3-logo" />
      {{else}}
        <span>{{branding.brandNameFirst}}<span class="jp3-accent">{{branding.brandNameLast}}</span></span>
      {{/if}}
    </div>

    <div class="jp3-meta">{{campaign.department}} · {{campaign.location}} · {{campaign.typeLabel}}</div>
    <h1 class="jp3-title">{{campaign.title}}</h1>

    <div class="jp3-desc">{{campaign.description}}</div>
    {{#if campaign.requirements}}
      <div class="jp3-req-title">Anforderungen</div>
      <div class="jp3-desc">{{campaign.requirements}}</div>
    {{/if}}

    <div class="jp3-divider"></div>

    <div class="jp3-form-title">Jetzt bewerben</div>
    {{{application_form_html}}}
  </div>
</div>

<style>
.jp3-root { min-height: 100vh; background: #fff; display: flex; justify-content: center; padding: 56px 24px; }
.jp3-wrap { max-width: 480px; width: 100%; }
.jp3-brand { font-size: 17px; font-weight: 800; color: #111; margin-bottom: 40px; }
.jp3-logo { max-height: 30px; max-width: 140px; object-fit: contain; }
.jp3-accent { color: {{campaign.accentColor}}; }

.jp3-meta { font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
.jp3-title { font-size: 28px; font-weight: 800; color: #0d0d14; margin: 0 0 24px; letter-spacing: -0.3px; }

.jp3-desc { font-size: 14px; color: #333; line-height: 1.7; white-space: pre-wrap; margin-bottom: 8px; }
.jp3-req-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: {{campaign.accentColor}}; margin: 20px 0 8px; }

.jp3-divider { height: 1px; background: #eee; margin: 32px 0 24px; }
.jp3-form-title { font-size: 16px; font-weight: 800; color: #111; margin-bottom: 16px; }

.plx-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.plx-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 16px; }
.plx-label { font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.04em; }
.plx-input { border: none; border-bottom: 1.5px solid #ddd; border-radius: 0; padding: 8px 0; font-size: 15px; color: #111; outline: none; width: 100%; box-sizing: border-box; font-family: inherit; background: transparent; }
.plx-input:focus { border-color: {{campaign.accentColor}}; }
.plx-textarea { resize: vertical; border: 1.5px solid #ddd; border-radius: 8px; padding: 10px; }
.plx-submit-btn { width: 100%; padding: 13px; border: none; border-radius: 6px; font-size: 14px; font-weight: 700; color: #fff; cursor: pointer; margin-top: 8px; background: {{campaign.accentColor}}; }
.plx-submit-btn:hover:not(:disabled) { opacity: 0.9; }
.plx-submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.plx-form-success { padding: 16px 0; font-size: 17px; font-weight: 700; color: #111; }
.plx-form-error { color: #dc2626; font-size: 13px; margin-top: 10px; }
</style>`
