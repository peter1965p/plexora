import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, statSync } from 'node:fs'

const page = readFileSync('app/pages/index.vue', 'utf8')
const hero = page.slice(page.indexOf('<section class="lp-hero">'), page.indexOf('<!-- STATS STRIP -->'))

describe('Startseite: Hero zeigt "Plexora von innen"', () => {
  it('beide Bildgrößen liegen im Repo und sind nicht leer (kein kaputter Verweis)', () => {
    for (const f of ['public/img/plexora-von-innen-1280.webp', 'public/img/plexora-von-innen-2400.webp']) { expect(existsSync(f), f).toBe(true); expect(statSync(f).size, f).toBeGreaterThan(10_000) }
  })
  it('das Hero nutzt das neue Bild (srcset mit beiden Größen) und nicht mehr die alten Screenshots mit Browser-Rahmen und Zetteln', () => {
    expect(hero).toContain('/img/plexora-von-innen-1280.webp'); expect(hero).toContain('/img/plexora-von-innen-2400.webp'); expect(hero).toContain('srcset=')
    for (const old of ['dashboard-light.png', 'seo-light.png', 'modulstore-light.png', 'lp-browser-chrome', 'lp-hero-float']) expect(hero, old).not.toContain(old)
    expect(page).not.toMatch(/\.lp-browser-|\.lp-hero-float|\.lp-dot/)
  })
  it('Bild hat Größe (kein Springen beim Laden), Alternativtext in beiden Sprachen und öffnet die große Fassung sicher in neuem Tab', () => {
    expect(hero).toContain('width="1280" height="720"'); expect(hero).toContain(':alt="t.hero.visualAlt"')
    expect((page.match(/visualAlt:/g) || []).length).toBe(2); expect((page.match(/visualZoom:/g) || []).length).toBe(2)
    expect(hero).toMatch(/href="\/img\/plexora-von-innen-2400\.webp" target="_blank" rel="noopener"/)
  })
  it('Bewegung (Hover-Effekt) wird bei reduzierter Bewegung abgeschaltet', () => {
    expect(page).toMatch(/@media \(prefers-reduced-motion: reduce\) \{ \.lp-hero-art-img \{ transition: none; \}/)
  })
})
