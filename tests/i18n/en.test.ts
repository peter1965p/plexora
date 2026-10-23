import { describe, it, expect, vi } from 'vitest'
import * as vue from 'vue'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { EN } from '../../shared/i18n/en'

const walk = (d: string): string[] => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p] })
const files = ['app/pages', 'app/components', 'app/layouts'].flatMap(walk).filter(f => f.endsWith('.vue'))
// Nur Texte mit deutschen Wörtern brauchen eine Übersetzung (Namen, Beispiele und Fachwörter bleiben gleich)
const GER = /[äöüÄÖÜß]|(und|der|die|das|nicht|für|ein|eine|mit|bei|wird|ist|oder|noch|kein|keine|alle|neu|neue|neuer|bitte|fehler|datei|rechnung|kunde|kunden|angebot|datum|betrag|beschreibung|titel|preis|menge|notiz|speichern|löschen|abbrechen|bearbeiten|hinzufügen|offen|aktiv|gesendet|erledigt|termin|termine|seite|name der|zeit|tage|stunden|von|bis|zu|zum|zur|auf|an|im|in|aus|über|unter|vor|nach)/i

describe('Englische Oberflächentexte', () => {
  it('jeder mit tr() markierte feste Text hat eine englische Fassung oder ist in beiden Sprachen gleich', () => {
    const missing: string[] = []
    for (const f of files) {
      const s = readFileSync(f, 'utf8')
      for (const m of s.matchAll(/\btr\('((?:[^'\\]|\\.)*)'\)/g)) {
        const k = m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\')
        if (!(k in EN) && GER.test(k) && !/Muster|Päffgen|JetBrains/.test(k)) missing.push(`${f}: ${k}`)
      }
    }
    expect(missing.slice(0, 300), `${missing.length} Texte ohne Übersetzung`).toEqual([])
  })
  it('Einträge sind nicht leer und nicht identisch mit dem Schlüssel', () => {
    for (const [k, v] of Object.entries(EN)) { expect(v.length, k).toBeGreaterThan(0); expect(v, k).not.toBe(k) }
  })
  it('tr() liefert Deutsch unverändert und Englisch aus dem Wörterbuch', async () => {
    vi.stubGlobal('ref', vue.ref); vi.stubGlobal('onMounted', () => {}); vi.stubGlobal('onUnmounted', () => {}); vi.stubGlobal('computed', vue.computed)
    const { uiLang } = await import('../../app/composables/useLang')
    const { tr } = await import('../../app/utils/tr')
    uiLang.value = 'de'; expect(tr('Abbrechen')).toBe('Abbrechen')
    uiLang.value = 'en'; expect(tr('Abbrechen')).toBe('Cancel'); expect(tr('Unbekannter Text')).toBe('Unbekannter Text')
    uiLang.value = 'de'
  })
})
