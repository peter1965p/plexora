// Client-seitige Kopie von server/utils/campaignTemplate.ts, damit die Live-Vorschau im
// Editor ohne Server-Roundtrip läuft. Struktur MUSS mit der Server-Version synchron bleiben.
import Handlebars from 'handlebars'

const esc = (s: any) => Handlebars.Utils.escapeExpression(String(s ?? ''))

// Formulare rendern nur semantische Klassen (kein Inline-Style) — jedes Preset
// stylt .plx-field/.plx-label/.plx-input/.plx-textarea/.plx-select/.plx-submit-btn
// über sein eigenes <style>. name=Label (nicht field.name/id) ist bewusst so gewählt:
// die bisherige Vue-Seite hat immer per Label geschlüsselt (formData[field.label]) und
// /api/forms/[id]/submit.post.ts erkennt E-Mail/Name/Telefon per Substring-Match auf dem
// Schlüssel — bei einem technischen name/id-Attribut würde dieser Auto-Lead-Erkennung
// brechen, sobald Formularfelder keine sprechenden IDs haben.
function renderLeadFormHtml(form: any): string {
  if (!form) return '<div class="plx-no-form"><i class="ti ti-file-off"></i><span>Formular nicht gefunden</span></div>'
  const fields = Array.isArray(form.fields) ? form.fields : []
  const fieldsHtml = fields.map((f: any) => {
    const req = f.required ? 'required' : ''
    const label = `<label class="plx-label">${esc(f.label)}${f.required ? ' <span class="plx-required">*</span>' : ''}</label>`
    let input = ''
    if (f.type === 'textarea') {
      input = `<textarea name="${esc(f.label)}" placeholder="${esc(f.placeholder || '')}" ${req} class="plx-input plx-textarea" rows="4"></textarea>`
    } else if (f.type === 'select') {
      const opts = (f.options || []).map((o: string) => `<option value="${esc(o)}">${esc(o)}</option>`).join('')
      input = `<select name="${esc(f.label)}" ${req} class="plx-input plx-select"><option value="">— bitte wählen —</option>${opts}</select>`
    } else {
      const type = ['email', 'phone', 'text'].includes(f.type) ? (f.type === 'phone' ? 'tel' : f.type) : 'text'
      input = `<input type="${type}" name="${esc(f.label)}" placeholder="${esc(f.placeholder || '')}" ${req} class="plx-input" />`
    }
    return `<div class="plx-field">${label}${input}</div>`
  }).join('\n')

  return `
    <form id="plx-lead-form" data-form-id="${esc(form.formId)}">
      <div class="plx-form-inputs">
        <div id="plx-lead-form-fields" class="plx-fields">${fieldsHtml}</div>
        <button type="submit" class="plx-submit-btn"><span class="plx-submit-label">${esc(form.submitLabel || 'Absenden')}</span></button>
        <div class="plx-privacy"><i class="ti ti-lock"></i> Deine Daten sind sicher. Keine Weitergabe an Dritte.</div>
      </div>
      <div id="plx-lead-form-success" class="plx-form-success" style="display:none"></div>
      <div id="plx-lead-form-error" class="plx-form-error" style="display:none"></div>
    </form>
  `
}

function renderJobApplicationFormHtml(): string {
  return `
    <form id="plx-job-form">
      <div class="plx-form-inputs">
        <div class="plx-field-row">
          <div class="plx-field"><label class="plx-label">Vorname</label><input type="text" name="firstName" placeholder="Max" class="plx-input" /></div>
          <div class="plx-field"><label class="plx-label">Nachname</label><input type="text" name="lastName" placeholder="Mustermann" class="plx-input" /></div>
        </div>
        <div class="plx-field-row">
          <div class="plx-field"><label class="plx-label">E-Mail</label><input type="email" name="email" placeholder="max@email.de" required class="plx-input" /></div>
          <div class="plx-field"><label class="plx-label">Telefon</label><input type="tel" name="phone" placeholder="+49 89 123456" class="plx-input" /></div>
        </div>
        <div class="plx-field"><label class="plx-label">Motivationsschreiben</label><textarea name="message" placeholder="Warum möchten Sie bei uns arbeiten?" class="plx-input plx-textarea" rows="4"></textarea></div>
        <button type="submit" class="plx-submit-btn"><span class="plx-submit-label">Bewerbung absenden</span></button>
      </div>
      <div id="plx-job-form-success" class="plx-form-success" style="display:none"></div>
      <div id="plx-job-form-error" class="plx-form-error" style="display:none"></div>
    </form>
  `
}

function splitBrandName(brandName: string, tailLen = 2) {
  const name = brandName || 'Plexora'
  return { brandNameFirst: name.slice(0, -tailLen), brandNameLast: name.slice(-tailLen) }
}

export function buildLeadTemplateDataClient(campaign: any, form: any, branding: any = {}) {
  const contentItems = Array.isArray(campaign?.contentItems)
    ? campaign.contentItems.filter(Boolean)
    : (typeof campaign?.contentItems === 'string' ? campaign.contentItems.split('\n').filter(Boolean) : [])
  const brandName = branding?.brandName || 'Plexora'
  return {
    campaign: {
      headline:       campaign?.headline || '',
      subtext:        campaign?.subtext || '',
      logoUrl:        campaign?.logoUrl || branding?.logoUrl || '',
      headerImageUrl: campaign?.headerImageUrl || '',
      accentColor:    campaign?.accentColor || '#6C3FE8',
      bgImageUrl:      campaign?.bgImageUrl || '',
      bgColor:         campaign?.bgColor || '#050815',
      contentTitle:    campaign?.contentTitle || '',
      contentItems,
    },
    branding: {
      brandName,
      ...splitBrandName(brandName),
      brandTagline: branding?.brandTagline || '',
      logoUrl:      branding?.logoUrl || '',
      primaryColor: branding?.primaryColor || '#ea580c',
    },
    form: form ? { title: form.title || '', description: form.description || '', submitLabel: form.submitLabel || 'Absenden' } : null,
    form_html: new Handlebars.SafeString(renderLeadFormHtml(form)),
  }
}

export const JOB_TYPE_LABELS: Record<string, string> = {
  fulltime: 'Vollzeit', parttime: 'Teilzeit', internship: 'Praktikum', freelance: 'Freelance',
}

export function buildJobTemplateDataClient(campaign: any, branding: any = {}) {
  const brandName = branding?.brandName || 'Plexora'
  const hasCompanyName = !!campaign?.companyName
  const split = splitBrandName(brandName, 1)
  return {
    campaign: {
      title:          campaign?.title || '',
      department:     campaign?.department || '',
      location:       campaign?.location || '',
      type:           campaign?.type || 'fulltime',
      typeLabel:      JOB_TYPE_LABELS[campaign?.type] || campaign?.type || '',
      description:    campaign?.description || '',
      requirements:   campaign?.requirements || '',
      companyName:    campaign?.companyName || branding?.brandName || '',
      hasCompanyName,
      accentColor:    campaign?.accentColor || '#6C3FE8',
      logoUrl:        campaign?.logoUrl || branding?.logoUrl || '',
      headerImageUrl: campaign?.headerImageUrl || '',
      bgImageUrl:     campaign?.bgImageUrl || '',
      bgColor:        campaign?.bgColor || '#050815',
      contentTitle:   campaign?.contentTitle || '',
      contentItems:   Array.isArray(campaign?.contentItems) ? campaign.contentItems.filter(Boolean) : [],
    },
    branding: {
      brandName,
      brandNameFirst: hasCompanyName ? campaign.companyName : split.brandNameFirst,
      brandNameLast:  hasCompanyName ? '' : split.brandNameLast,
      brandTagline: branding?.brandTagline || '',
      logoUrl:      branding?.logoUrl || '',
      primaryColor: branding?.primaryColor || '#ea580c',
    },
    application_form_html: new Handlebars.SafeString(renderJobApplicationFormHtml()),
  }
}

export function renderCampaignHtmlClient(templateHtml: string, data: any): string {
  try {
    const compiled = Handlebars.compile(templateHtml, { noEscape: false })
    return compiled(data)
  } catch (e: any) {
    return `<pre style="color:#dc2626;padding:20px;font-family:monospace;white-space:pre-wrap">Template-Fehler:\n${e?.message || e}</pre>`
  }
}

// ── Visueller Bearbeitungsmodus (nur Editor-Vorschau, nie öffentliche Seiten) ──
// Presets markieren editierbare Elemente mit data-plx-field="campaign.xxx" +
// data-plx-type="text|multiline|image|image-bg" (siehe server/utils/campaignPresets/*).
// markEditableFields() macht daraus tatsächlich interaktive Elemente: einzeilige Text-
// felder werden contenteditable, alles andere (mehrzeilig/Bild/Hintergrundbild) bekommt
// nur eine Klick-Markierung — das eigentliche Bearbeiten läuft dafür über ein Modal in
// CampaignDesignEditor.vue, da contenteditable bei mehrzeiligem Text browserabhängig
// Absätze als <div>/<br> einfügt und beim Auslesen per textContent verlustbehaftet ist.
export function markEditableFields(html: string): string {
  if (typeof DOMParser === 'undefined') return html
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('[data-plx-field]').forEach((el) => {
    const type = el.getAttribute('data-plx-type')
    el.classList.add('plx-editable-field')
    if (type === 'text') {
      el.setAttribute('contenteditable', 'true')
    } else {
      el.classList.add('plx-editable-click')
    }
  })
  return doc.body.innerHTML
}

export const VISUAL_MODE_STYLE = `
  [data-plx-field] { outline-offset: 2px; transition: outline-color .15s; border-radius: 2px; }
  [data-plx-field]:hover { outline: 2px dashed #6C3FE8; cursor: pointer; }
  [data-plx-field][contenteditable="true"]:focus { outline: 2px solid #6C3FE8; cursor: text; }
`

// Ziel-Origin bewusst '*' statt window.location.origin: in einer srcdoc-Iframe (Dokument-URL
// about:srcdoc) liefert location.origin je nach Browser einen String, den postMessage als
// Ziel-Origin ablehnt (DOMException "An invalid or illegal string was specified", in Firefox
// live reproduziert). Vertrauensprüfung passiert stattdessen beim Empfang im Parent über
// event.source === iframe.contentWindow.
export const VISUAL_MODE_SCRIPT = `
  document.querySelectorAll('[data-plx-field]').forEach(function (el) {
    if (el.getAttribute('contenteditable') === 'true') {
      el.addEventListener('blur', function () {
        window.parent.postMessage({
          source: 'plx-visual-editor', type: 'plx-text-edit',
          field: el.getAttribute('data-plx-field'), value: el.textContent,
        }, '*')
      })
    } else {
      el.addEventListener('click', function (e) {
        e.preventDefault()
        window.parent.postMessage({
          source: 'plx-visual-editor', type: 'plx-field-click',
          field: el.getAttribute('data-plx-field'), fieldType: el.getAttribute('data-plx-type'),
        }, '*')
      })
    }
  })
`
