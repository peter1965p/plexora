import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { WALL_IMAGES, WALL_MAX, DEFAULT_WALL, parseWall, wallColumns, wallFrame, scrollProgress, ease } from '../../shared/landingWall'
import { parseLandingTheme } from '../../shared/landingTheme'

describe('Hero-Bildwand: Einstellung', () => {
  it('Standard: an, volle Neigung, alle 16 Bilder, fester Knopf an', () => {
    expect(parseWall(undefined)).toEqual(DEFAULT_WALL); expect(DEFAULT_WALL.images.length).toBe(16); expect(DEFAULT_WALL).toMatchObject({ on: true, intensity: 100, stickyCta: true, ctaLabel: '' })
    expect(parseLandingTheme(undefined).wall).toEqual(DEFAULT_WALL)
  })
  it('prüft: nur bekannte Bilder, keine Doppelten, höchstens 16, Stärke 0 bis 100, Knopftext bereinigt', () => {
    const w = parseWall({ on: false, intensity: 250, images: ['crm', 'crm', 'evil', 5, '../x', 'hr'], stickyCta: false, ctaLabel: '  <b>Los</b>\u0001 geht\'s  ' })
    expect(w).toEqual({ on: false, intensity: 100, images: ['crm', 'hr'], stickyCta: false, ctaLabel: 'bLos/b geht\'s' })
    expect(parseWall({ intensity: -5 }).intensity).toBe(0); expect(parseWall({ intensity: 'x' }).intensity).toBe(100)
    expect(parseWall({ images: WALL_IMAGES.map(i => i.key).concat(WALL_IMAGES.map(i => i.key)) }).images.length).toBe(WALL_MAX)
    expect(parseWall({ images: [] }).images).toEqual([]); expect(parseWall({ ctaLabel: 'x'.repeat(100) }).ctaLabel.length).toBe(40)
  })
  it('wird mit dem Design gespeichert und kommt unverändert zurück', () => { expect(parseLandingTheme({ wall: { images: ['hr', 'crm', 'taxi', 'fitness'], intensity: 40 } }).wall).toMatchObject({ images: ['hr', 'crm', 'taxi', 'fitness'], intensity: 40, on: true }) })
})

describe('Hero-Bildwand: Spalten und Bewegung', () => {
  it('Bilder reihum auf 4 Spalten', () => { expect(wallColumns(['a', 'b', 'c', 'd', 'e', 'f'])).toEqual([['a', 'e'], ['b', 'f'], ['c'], ['d']]); expect(wallColumns([])).toEqual([[], [], [], []]) })
  it('Anfang geneigt rechts, Ende flach und bildschirmfüllend; Neigung 0 bleibt flach', () => {
    const a = wallFrame(0), z = wallFrame(1)
    expect(a.wrapper).toBe('translate3d(40%, 0px, 0px) scale3d(0.8, 0.8, 1) rotateX(15deg) rotateY(-9deg) rotateZ(32deg)')
    expect(z.wrapper).toBe('translate3d(0%, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)')
    expect(a.textOpacity).toBe(1); expect(z.textOpacity).toBe(0); expect(a.fade).toBe(1); expect(z.fade).toBe(0)
    expect(wallFrame(0, 0).wrapper).toContain('rotateX(0deg) rotateY(0deg) rotateZ(0deg)'); expect(wallFrame(0, 0.5).wrapper).toContain('rotateZ(16deg)')
    expect(z.cols.every(c => c.startsWith('translate3d(0px, 0vh, 0px) rotateX(0deg)'))).toBe(true); expect(a.cols.length).toBe(4)
  })
  it('Text blendet bis zur Hälfte aus, Werte außerhalb 0 bis 1 werden begrenzt', () => {
    expect(wallFrame(0.45).textOpacity).toBe(0); expect(wallFrame(0.2).textOpacity).toBeGreaterThan(0.4); expect(wallFrame(5).wrapper).toBe(wallFrame(1).wrapper); expect(wallFrame(-3).wrapper).toBe(wallFrame(0).wrapper)
    expect(ease(0)).toBe(0); expect(ease(1)).toBe(1); expect(ease(0.5)).toBe(0.5)
  })
  it('Scrollfortschritt aus Lage und Höhe des Bereichs', () => {
    expect(scrollProgress(0, 2000, 900)).toBe(0); expect(scrollProgress(-550, 2000, 900)).toBeCloseTo(0.5, 2); expect(scrollProgress(-1100, 2000, 900)).toBe(1); expect(scrollProgress(-5000, 2000, 900)).toBe(1); expect(scrollProgress(300, 2000, 900)).toBe(0)
    expect(scrollProgress(-10, 500, 900)).toBe(1)
  })
})

describe('Hero-Bildwand: Dateien und Einbau', () => {
  it('jedes Bild der Bibliothek gibt es in groß und klein, mit Beschreibung und Beschriftung', () => {
    for (const i of WALL_IMAGES) { expect(existsSync(`public/wall/${i.key}.webp`), i.key).toBe(true); expect(existsSync(`public/wall/${i.key}-klein.webp`), i.key).toBe(true); expect(i.label.length).toBeGreaterThan(3); expect(i.alt.length).toBeGreaterThan(10) }
    expect(WALL_IMAGES.length).toBe(16)
  })
  it('Startseite: Bildwand nur Desktop ohne reduzierte Bewegung, Bilder nur dekorativ, fester Knopf', () => {
    const idx = readFileSync('app/pages/index.vue', 'utf8')
    expect(idx).toContain('aria-hidden="true"'); expect(idx).toContain('prefers-reduced-motion: no-preference'); expect(idx).toContain('min-width: 1100px'); expect(idx).toContain('lp-sticky-cta'); expect(idx).toContain('{ passive: true }')
  })
  it('Einstellungen bieten die Bildwand an', () => { const st = readFileSync('app/pages/settings/index.vue', 'utf8'); expect(st).toContain('Hero-Bildwand'); expect(st).toContain('lt.wall.intensity'); expect(st).toContain('lt.wall.stickyCta') })
})
