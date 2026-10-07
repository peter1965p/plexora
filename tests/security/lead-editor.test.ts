import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const editor = readFileSync('app/components/LeadDecorEditor.vue', 'utf8')
const preview = readFileSync('app/components/LeadPreview.vue', 'utf8')
const mk = readFileSync('app/pages/marketing/index.vue', 'utf8')

describe('Editor (Kampagnenformular)', () => {
  it('zeigt den Werbehinweis wörtlich', () => {
    expect(editor).toContain('Angaben müssen stimmen. Irreführende Werbung ist in Deutschland abmahnfähig.')
  })
  it('alle Funktionen: Schalter, Text, Icon, Reihenfolge, hinzufügen, löschen; Overlays mit Form, Text, Farbe, Größe, Drehung, Position, Animation, Schalter', () => {
    for (const t of ['v-model="t.on"', 'v-model="t.icon"', 'v-model="t.text"', 'move(state.trustItems', 'addTrust', 'state.trustItems.splice', 'v-model="state.privacyLine.on"', 'v-model="state.privacyLine.text"',
      'v-model="o.on"', 'v-model="o.shape"', 'v-model="o.text"', 'v-model="o.color"', 'v-model.number="o.size"', 'v-model.number="o.rotate"', 'v-model.number="o.textSize"', 'v-model="o.place"', 'v-model="o.hideMobile"', 'v-model.number="o.x"', 'v-model.number="o.y"', 'v-model="o.anim"', 'addOverlay'])
      expect(editor, t).toContain(t)
  })
  it('Grenzen im Formular: maxlength aus den gemeinsamen Konstanten, Hinzufügen bei Höchstzahl gesperrt, nur zwei animierte wählbar', () => {
    for (const t of [':maxlength="MAX_TRUST_TEXT"', ':maxlength="MAX_OVERLAY_TEXT"', ':maxlength="MAX_PRIVACY_TEXT"', ':disabled="state.trustItems.length >= MAX_TRUST_ITEMS"', ':disabled="state.overlays.length >= MAX_OVERLAYS"', 'animDisabled'])
      expect(editor, t).toContain(t)
    expect(editor).toMatch(/min="8" max="40"/); expect(editor).toMatch(/min="0" max="92"/)
  })
  it('Hinweise: ohne Hero-Bild keine Overlays; im frei gestalteten Template gelten Overlays nicht; Bewegungsreduzierung', () => {
    expect(editor).toContain('Ohne Hero-Bild (Header-Banner) werden keine Overlays angezeigt'); expect(editor).toContain('Overlays gelten nicht'); expect(editor).toContain('Bewegungsreduzierung')
  })
  it('keine Eingabe als HTML: kein v-html, keine Datei-Uploads, keine freien SVG-Felder', () => {
    for (const src of [editor, preview]) { expect(src).not.toMatch(/v-html|innerHTML/); expect(src).not.toMatch(/type="file"|<textarea[^>]*svg/i) }
  })
})

describe('Vorschau', () => {
  it('Desktop- und Handy-Ansicht, gleiche Bausteine wie die Seite (Vertrauenspunkte, Datenschutzzeile, Overlays im Hero-Bild)', () => {
    for (const t of ['Desktop', 'Handy', 'LeadOverlays', 'resolveTrustItems', 'resolvePrivacyLine', 'pv-mobile', 'pv-desktop', 'container-type: inline-size']) expect(preview, t).toContain(t)
    expect(preview.slice(preview.indexOf('pv-banner'), preview.indexOf('pv-banner') + 200)).toContain('LeadOverlays')
    expect(preview.slice(preview.indexOf('class="pv-form"'), preview.indexOf('<!-- Sticker frei auf der Seite'))).not.toContain('<LeadOverlays')
  })
})

describe('Kampagnenformular', () => {
  it('der Editor ist ein eigener Abschnitt (Muster Bot-Schutz) und die Vorschau nutzt die Komponente', () => {
    expect(mk).toContain('Vertrauenspunkte, Datenschutzzeile &amp; Sticker'); expect(mk).toContain('<LeadDecorEditor'); expect(mk).toContain('<LeadPreview')
    expect(mk.indexOf('<LeadDecorEditor')).toBeGreaterThan(mk.indexOf('Bot-Schutz aktiv'))
  })
  it('der Editor steht in der rechten Spalte direkt unter der Live-Vorschau (Spalte scrollt für sich, damit nichts abgeschnitten wird)', () => {
    const side = mk.indexOf('class="camp-side"')
    expect(side).toBeGreaterThan(-1); expect(mk.slice(side, side + 200)).toMatch(/max-height:\d+vh;overflow-y:auto/)
    expect(mk.indexOf('<LeadDecorEditor')).toBeGreaterThan(mk.indexOf('<LeadPreview')); expect(mk.indexOf('<LeadDecorEditor')).toBeGreaterThan(side)
    expect(mk.indexOf('Vertrauenspunkte, Datenschutzzeile &amp; Sticker')).toBeGreaterThan(mk.indexOf('<LeadPreview'))
  })
  it('gesendet wird nur, was der Nutzer geändert hat – sonst bleiben bestehende Kampagnen unverändert (Standardwerte)', () => {
    expect(mk).toMatch(/if \(decorTouched\.value\) Object\.assign\(payload, \{ trustItems: decor\.trustItems, privacyLine: decor\.privacyLine, overlays: decor\.overlays \}\)/)
    expect(mk).toContain('@touched="decorTouched = true"'); expect(mk).toMatch(/function loadDecor[\s\S]*decorTouched\.value = false/)
  })
})

describe('Sticker frei auf der Seite (Editor und Vorschau)', () => {
  it('Platzierung pro Sticker wählbar; Seitenlage getrennt für Desktop und Handy; "Auf dem Handy ausblenden"', () => {
    for (const t of ['OVERLAY_PLACES', 'pageX(o)', 'pageY(o)', 'setPageX', 'setPageY', 'mobile', 'PAGE_X_LIMIT', 'PAGE_Y_LIMIT', 'Auf dem Handy ausblenden', 'Umschalter über der Vorschau']) expect(editor, t).toContain(t)
    expect(editor).toMatch(/if \(view === 'mobile'\) \{ o\.mx = x; o\.my = y \} else \{ o\.px = x; o\.py = y \}/)
  })
  it('ohne Hero-Bild wird ein neuer Sticker gleich auf der Seite platziert (sonst wäre er unsichtbar); der Hinweis "ohne Hero-Bild" gilt nur für Hero-Sticker', () => {
    expect(editor).toContain("place: props.hasHero ? 'image' : 'page'"); expect(editor).toContain('!hasHero && hasImageOverlay'); expect(preview).toContain("imageOverlays.length && !campaign.headerImageUrl")
  })
  it('die Vorschau hat eine Seitenebene über dem ganzen Rahmen, zieht in der gewählten Ansicht und warnt (ohne zu verbieten), wenn ein Sticker das Formular verdeckt', () => {
    expect(preview).toMatch(/<LeadOverlays :overlays="overlays" layer="page" :view="mode" :content-ratio="mode === 'desktop' \? CONTENT_RATIO : 1" editable/)
    for (const t of ['coversForm', 'getBoundingClientRect', 'pv-warn', 'blockiert keine Klicks', 'lo-dim']) expect(preview, t).toContain(t)
    expect(preview).not.toMatch(/coversForm\.value = true[^;]*;\s*return/) // nur Warnung, kein Eingriff in die Lage
  })
  it('Vorschau-Desktop zeigt Seitenrand (Inhalt 70 %), damit Sticker auch neben den Inhalt gezogen werden können', () => {
    expect(preview).toContain('const CONTENT_RATIO = 0.7'); expect(preview).toMatch(/\.pv-desktop \.pv-layout \{[^}]*width: 70%/)
  })
  it('Ansicht und Lage laufen von der Seite über den Editor-Zustand (touched, Prüfung beim Speichern)', () => {
    expect(mk).toContain(':view="previewMode"'); expect(mk).toContain('decorEditor?.setOverlayPos(m.id, m.x, m.y, m.view)')
  })
})
