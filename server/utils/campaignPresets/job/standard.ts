// 1:1-Nachbau des ursprünglich hartcodierten Layouts aus app/pages/jobs/[id]/index.vue —
// nutzt bewusst dieselben globalen Design-System-Klassen (card/badge/auth-*), die auf der
// echten Seite ohnehin über ~/assets/css/main.css geladen sind — Pflicht-Fallback für alle
// bestehenden Stellenausschreibungen ohne eigenes customTemplateHtml.
export const STANDARD_JOB_HTML = `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px">
  <div style="max-width:680px;width:100%">

    {{#if campaign.headerImageUrl}}
      <div style="border-radius:16px;overflow:hidden;margin-bottom:24px;height:200px">
        <img src="{{campaign.headerImageUrl}}" data-plx-field="campaign.headerImageUrl" data-plx-type="image" style="width:100%;height:100%;object-fit:cover" alt="Header" />
      </div>
    {{/if}}

    <div style="text-align:center;margin-bottom:40px">
      {{#if campaign.logoUrl}}
        <div style="margin-bottom:12px"><img src="{{campaign.logoUrl}}" data-plx-field="campaign.logoUrl" data-plx-type="image" style="max-height:60px;max-width:200px;object-fit:contain" alt="Logo" /></div>
      {{else}}
        <div class="logo-text" style="font-size:28px;margin-bottom:8px">{{branding.brandNameFirst}}<span style="color:{{campaign.accentColor}}">{{branding.brandNameLast}}</span></div>
        {{#if campaign.hasCompanyName}}
          <div style="font-size:20px;font-weight:700;color:var(--text-primary)" data-plx-field="campaign.companyName" data-plx-type="text">{{campaign.companyName}}</div>
        {{/if}}
      {{/if}}
      <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.1em;margin-top:4px">Karriere</div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding:32px">
        <div style="display:flex;align-items:start;justify-content:space-between;margin-bottom:24px">
          <div>
            <h1 style="font-size:24px;font-weight:800;margin:0 0 8px" data-plx-field="campaign.title" data-plx-type="text">{{campaign.title}}</h1>
            <div style="display:flex;gap:12px;flex-wrap:wrap">
              <span class="badge badge-info" data-plx-field="campaign.department" data-plx-type="text"><i class="ti ti-building"></i> {{campaign.department}}</span>
              <span class="badge badge-info" data-plx-field="campaign.location" data-plx-type="text"><i class="ti ti-map-pin"></i> {{campaign.location}}</span>
              <span class="badge badge-success"><i class="ti ti-clock"></i> {{campaign.typeLabel}}</span>
            </div>
          </div>
        </div>
        <div style="font-size:14px;color:var(--text-secondary);line-height:1.7;white-space:pre-wrap" data-plx-field="campaign.description" data-plx-type="multiline">{{campaign.description}}</div>
        {{#if campaign.requirements}}
          <div style="margin-top:24px">
            <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Anforderungen</div>
            <div style="font-size:14px;color:var(--text-secondary);line-height:1.7;white-space:pre-wrap" data-plx-field="campaign.requirements" data-plx-type="multiline">{{campaign.requirements}}</div>
          </div>
        {{/if}}
      </div>
    </div>

    <div class="card">
      <div class="card-header"><span class="card-title">Jetzt bewerben</span></div>
      <div class="modal-body">
        {{{application_form_html}}}
      </div>
    </div>

  </div>
</div>

<style>
.plx-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
.plx-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.plx-label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.plx-input { background: var(--bg-elevated); border: 0.5px solid var(--border); border-radius: 8px; padding: 10px 14px; font-size: 14px; color: var(--text-primary); width: 100%; outline: none; box-sizing: border-box; font-family: inherit; }
.plx-textarea { resize: vertical; min-height: 110px; }
.plx-submit-btn { width: 100%; padding: 12px; border: none; border-radius: 8px; font-size: 14px; font-weight: 700; color: #fff; cursor: pointer; margin-top: 4px; background: {{campaign.accentColor}}; }
.plx-submit-btn:hover:not(:disabled) { opacity: 0.9; }
.plx-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.plx-form-success { text-align: center; padding: 24px; font-size: 18px; font-weight: 700; color: {{campaign.accentColor}}; }
.plx-form-error { text-align: center; color: #ef4444; font-size: 13px; margin-top: 10px; }
</style>`
