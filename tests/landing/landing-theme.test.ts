import { describe, it, expect } from 'vitest'
import { parseDisplay, displayVars, DEFAULT_DISPLAY, parseLandingTheme, customTheme, themeWarnings, blend, contrast, luminance, readableOn, mix, PRESETS, DEFAULT_LANDING_THEME } from '../../shared/landingTheme'

describe('Auswahl prüfen', () => {
  it('Standard ist das freundliche helle Design; Müll wird zu Standardwerten', () => {
    expect(parseLandingTheme(undefined).mode).toBe('light')
    expect(parseLandingTheme(null)).toEqual({ ...DEFAULT_LANDING_THEME, mode: 'light' })
    const t = parseLandingTheme({ mode: 'hack', bg: 'red', bgOpacity: 'x', accent: 'url(javascript:1)', text: '<script>' })
    expect(t).toEqual({ mode: 'light', bg: '#000000', bgOpacity: 75, accent: '#1e3a8a', text: '', display: { on: true, bg: '#000000', bgOpacity: 70, fg: '#2f7bff' }, wall: DEFAULT_LANDING_THEME.wall })
  })
  it('Farben nur als #rrggbb (kleingeschrieben), Deckkraft 0 bis 100', () => {
    expect(parseLandingTheme({ mode: 'custom', bg: '#AABBCC', accent: '#0A2A8A', text: '#FFFFFF', bgOpacity: 250 })).toEqual({ mode: 'custom', bg: '#aabbcc', bgOpacity: 100, accent: '#0a2a8a', text: '#ffffff', display: { on: true, bg: '#000000', bgOpacity: 70, fg: '#2f7bff' }, wall: DEFAULT_LANDING_THEME.wall })
    expect(parseLandingTheme({ bgOpacity: -5 }).bgOpacity).toBe(0)
    for (const bad of ['#fff', '#12345g', 'rgb(0,0,0)', '#1234567', '"><img>']) expect(parseLandingTheme({ accent: bad }).accent, bad).toBe('#1e3a8a')
  })
})

describe('Farbrechnung', () => {
  it('75 % Schwarz auf Weiß ergibt ein dunkles Grau', () => { expect(blend('#000000', 0.75)).toBe('#404040'); expect(blend('#000000', 1)).toBe('#000000'); expect(blend('#123456', 0)).toBe('#ffffff') })
  it('Kontrast nach WCAG: Schwarz/Weiß = 21, gleiche Farbe = 1', () => { expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 0); expect(contrast('#336699', '#336699')).toBeCloseTo(1, 5) })
  it('readableOn hellt auf dunklem Grund auf und dunkelt auf hellem Grund ab, bis der Kontrast reicht', () => {
    expect(contrast(readableOn('#1e3a8a', '#404040'), '#404040')).toBeGreaterThanOrEqual(4.5)
    expect(luminance(readableOn('#1e3a8a', '#404040'))).toBeGreaterThan(luminance('#1e3a8a'))
    expect(contrast(readableOn('#fde68a', '#ffffff'), '#ffffff')).toBeGreaterThanOrEqual(4.5)
    expect(readableOn('#ffffff', '#000000')).toBe('#ffffff')                    // schon gut: unverändert
  })
})

describe('Deep Blue auf 75 % Schwarz', () => {
  const r = customTheme(PRESETS.find(p => p.key === 'deepblue')!.theme)
  it('dunkler Grund, heller Text, Akzent als Schaltfläche mit lesbarer Schrift', () => {
    expect(r.dark).toBe(true); expect(r.vars['--bg']).toBe('#404040')
    expect(r.vars['--btn']).toBe('#1e3a8a'); expect(r.vars['--btn-text']).toBe('#ffffff')
    expect(r.info.buttonContrast).toBeGreaterThan(7)
  })
  it('Akzent als Schriftfarbe wird automatisch aufgehellt, damit er lesbar bleibt', () => {
    expect(contrast(r.vars['--orange2'], r.vars['--bg'])).toBeGreaterThanOrEqual(4.5)
    expect(r.vars['--orange2']).not.toBe('#1e3a8a')
  })
  it('liefert alle Variablen, die die Startseite braucht', () => {
    for (const k of ['--bg', '--card', '--card2', '--text', '--text-strong', '--body', '--muted', '--muted2', '--faint', '--accent', '--accent-rgb', '--btn', '--btn-text', '--g1', '--g2', '--g3', '--blue', '--ink', '--shadow', '--nav-bg', '--footer-bg', '--page-bg']) expect(r.vars[k], k).toBeTruthy()
    expect(Object.values(r.vars).every(v => !/[<>;{}]/.test(v) || v.startsWith('radial-gradient'))).toBe(true)
  })
})

describe('Heller Grund und Warnungen', () => {
  it('heller Hintergrund: dunkler Text, heller Grund erkannt', () => { const r = customTheme({ mode: 'custom', bg: '#e0f2fe', bgOpacity: 100, accent: '#0369a1', text: '', display: DEFAULT_LANDING_THEME.display }); expect(r.dark).toBe(false); expect(luminance(r.vars['--text'])).toBeLessThan(0.1) })
  it('Warnung bei unlesbarer Textfarbe (Deep Blue als Text auf 75 % Schwarz)', () => {
    const w = themeWarnings({ mode: 'custom', bg: '#000000', bgOpacity: 75, accent: '#1e3a8a', text: '#00008b', display: DEFAULT_LANDING_THEME.display })
    expect(w.some(x => /Text auf dem Hintergrund/.test(x))).toBe(true)
    expect(themeWarnings(PRESETS[0].theme)).toEqual(expect.not.arrayContaining([expect.stringMatching(/Text auf dem Hintergrund/)]))
    expect(themeWarnings({ ...PRESETS[0].theme, mode: 'light' })).toEqual([])
  })
  it('automatische Textfarbe ist immer gut lesbar, egal welcher Hintergrund', () => {
    for (const bg of ['#000000', '#ffffff', '#808080', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#7f7f7f']) for (const op of [10, 50, 75, 100]) {
      const r = customTheme({ mode: 'custom', bg, bgOpacity: op, accent: '#1e3a8a', text: '', display: DEFAULT_LANDING_THEME.display })
      expect(r.info.textContrast, `${bg} ${op}`).toBeGreaterThanOrEqual(4.5)
    }
  })
  it('mix liegt zwischen den Farben', () => { expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080') })
})

describe('Kennzahlen-Display', () => {
  it('Standard: 70 % Schwarz mit leuchtendem Blau; Müll wird zu Standardwerten', () => {
    expect(DEFAULT_DISPLAY).toEqual({ on: true, bg: '#000000', bgOpacity: 70, fg: '#2f7bff' })
    expect(parseDisplay(undefined)).toEqual(DEFAULT_DISPLAY)
    expect(parseDisplay({ on: 'nein', bg: 'red', bgOpacity: '', fg: '"><x>' })).toEqual(DEFAULT_DISPLAY)
    expect(parseDisplay({ on: false, bgOpacity: -3 }).on).toBe(false)
    expect(parseDisplay({ bgOpacity: -3 }).bgOpacity).toBe(0)
  })
  it('Zahlenfarbe wird bei Bedarf aufgehellt: auf dem tatsächlichen Grund Kontrast mindestens 3:1', () => {
    for (const page of ['#fff8f1', '#1a1723', '#404040', '#ffffff']) {
      for (const fg of ['#2f7bff', '#1e3a8a', '#000000', '#ffffff']) {
        const r = displayVars({ on: true, bg: '#000000', bgOpacity: 70, fg }, page)
        expect(contrast(r.fg, r.effectiveBg), `${page} ${fg}`).toBeGreaterThanOrEqual(3)
      }
    }
    expect(displayVars(DEFAULT_DISPLAY, '#1a1723').fg).toBe('#2f7bff')            // schon gut: unverändert
    expect(displayVars(DEFAULT_DISPLAY, '#fff8f1').vars['--disp-bg']).toBe('rgba(0,0,0,0.7)')
  })
})
