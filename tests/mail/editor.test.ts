import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const ed = readFileSync('app/components/MailTemplateEditor.vue', 'utf8')
const settings = readFileSync('app/pages/settings/index.vue', 'utf8')

describe('Editor E-Mail-Vorlagen (Oberfläche)', () => {
  it('ist ein eigener Reiter der globalen Einstellungen (Muster Bot-Schutz) und bekommt das Demo-Flag', () => {
    expect(settings).toContain("{ key: 'mailtemplates', label: 'E-Mail-Vorlagen', icon: 'ti-mail-cog' }")
    expect(settings).toContain(`<MailTemplateEditor v-if="tab === 'mailtemplates'" :disabled="isDemo" />`)
  })
  it('nutzt für die Vorschau dieselbe Funktion wie der Server und zeigt sie in einem Iframe ohne Skripte (sandbox leer)', () => {
    expect(ed).toContain("renderInviteMail(resolveInviteConfig(draft)"); expect(ed).toMatch(/<iframe[^>]*sandbox=""[^>]*:srcdoc="preview"/)
    expect(ed).not.toMatch(/v-html|innerHTML|allow-scripts|allow-same-origin/)
  })
  it('Vorschau in Hell, Dunkel (invertiert) und Handy; Kontrastwarnung, Platzhalter-Markierung und Link-Erkennung kommen aus dem gemeinsamen Baustein', () => {
    for (const t of ['view.dark', 'invert(1) hue-rotate(180deg)', 'view.mobile', "'375px'", 'contrastWarnings(', 'unknownPlaceholders(', 'containsLink(', 'Das Speichern ist trotzdem möglich', 'Unbekannter Platzhalter']) expect(ed, t).toContain(t)
  })
  it('alle Texte mit den vorgegebenen Grenzen, vier Stilvorlagen, Zurücksetzen, Testmail und Speichern', () => {
    for (const t of ['MAIL_LIMITS.subject', 'MAIL_LIMITS.heading', 'MAIL_LIMITS.body', 'MAIL_LIMITS.button', 'MAIL_LIMITS.footer', 'MAIL_LIMITS.alt', 'v-for="(p, k) in STYLE_PRESETS"', 'Auf Standard zurücksetzen', 'Testmail an mich', "api('invite', { method: 'PUT'", "api('invite-test', { method: 'POST'", "api('invite', { method: 'DELETE' })"]) expect(ed, t).toContain(t)
  })
  it('Logo: nur PNG/JPG im Dateiauswahlfeld, Prüfung auf Größe, Optionen kein/Branding/eigenes, Alternativtext Pflicht, Platte mit Farbe', () => {
    expect(ed).toContain('accept="image/png,image/jpeg"'); expect(ed).not.toMatch(/image\/svg|image\/gif|image\/webp|\.svg|\.gif|\.webp/i)
    for (const t of ["300 * 1024", 'value="none"', 'value="branding"', 'value="custom"', 'Der Alternativtext ist Pflicht', 'draft.logo.plate', 'draft.logo.plateColor']) expect(ed, t).toContain(t)
  })
  it('Demo-Konto: alles gesperrt; Speichern ist nur ohne Fehler im Text möglich; Logo-Datei und Maße werden nicht vom Browser vorgegeben', () => {
    expect(ed).toContain('const canSave = computed(() => !props.disabled && !saving.value && Object.keys(fieldProblems.value).length === 0')
    expect((ed.match(/:disabled="disabled/g) || []).length).toBeGreaterThan(20)
    expect(ed).not.toMatch(/draft\.logo\.file\s*=|draft\.logo\.w\s*=|draft\.logo\.h\s*=/)    // Datei/Maße kommen nur aus der Antwort des Servers (Object.assign nach dem Upload)
  })
  it('Platzhalter-Chips zeigen die erlaubte Liste; ohne Berechtigung (kein Inhaber) erscheint ein Hinweis statt der Bearbeitung', () => {
    expect(ed).toContain('v-for="p in PLACEHOLDERS"'); expect(ed).toContain('Nur der Inhaber des Kontos kann E-Mail-Vorlagen ansehen und ändern')
  })
})
