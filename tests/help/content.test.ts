import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { HELP_TOPICS, HELP_GROUPS, HELP_TIPS, TOUR_STEPS, searchHelp, topicForPath } from '../../shared/helpContent'
import { AREA_ROLES } from '../../shared/roles'

const pageExists = (route: string) => {
  const p = route.split('?')[0].replace(/^\//, '')
  if (p.startsWith('branche/')) return existsSync('app/pages/branche/[pkg].vue')      // Branchen-Baukasten: eine Seite für alle Pakete
  return ['', '/index'].some(sfx => existsSync(`app/pages/${p}${sfx}.vue`)) || existsSync(`app/pages/${p}/index.vue`)
}

describe('Hilfe-Inhalte', () => {
  it('Themen haben eindeutige IDs, bekannte Gruppen und Inhalt', () => {
    const ids = HELP_TOPICS.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const t of HELP_TOPICS) {
      expect(HELP_GROUPS.some(g => g.id === t.group), t.id).toBe(true)
      expect(t.title.length, t.id).toBeGreaterThan(2)
      expect(t.summary.length, t.id).toBeGreaterThan(10)
      expect(t.steps.length, t.id).toBeGreaterThan(0)
    }
  })
  it('jede Gruppe hat Themen', () => { for (const g of HELP_GROUPS) expect(HELP_TOPICS.some(t => t.group === g.id), g.id).toBe(true) })
  it('verweist nur auf vorhandene Seiten', () => { for (const t of HELP_TOPICS) if (t.route) expect(pageExists(t.route), `${t.id} → ${t.route}`).toBe(true) })
  it('jeder Bereich der Rollenliste hat ein Hilfethema', () => {
    for (const a of AREA_ROLES) expect(HELP_TOPICS.some(t => t.route?.startsWith(a.prefix)), a.prefix).toBe(true)
  })
  it('die Rollen-Angabe im Thema passt zur Rollenliste', () => {
    const label = { member: 'Mitglied', admin: 'Admin', owner: 'Inhaber' } as const
    for (const t of HELP_TOPICS) {
      if (!t.route || !t.role) continue
      const a = AREA_ROLES.find(x => t.route!.split('?')[0] === x.prefix || t.route!.startsWith(x.prefix + '/'))
      if (a) expect(t.role, t.id).toBe(label[a.role as keyof typeof label])
    }
  })
  it('Tooltips und Einführung sind gefüllt, Tooltip-Schlüssel im Quelltext existieren', () => {
    expect(TOUR_STEPS.length).toBeGreaterThanOrEqual(5)
    for (const v of Object.values(HELP_TIPS)) expect(v.length).toBeGreaterThan(20)
    const used = new Set<string>()
    for (const f of ['app/pages/team/index.vue', 'app/pages/settings/index.vue', 'app/pages/blog.vue', 'app/components/QuotesPanel.vue', 'app/pages/store.vue', 'app/components/GanttChart.vue'])
      for (const m of readFileSync(f, 'utf8').matchAll(/<HelpTip k="([^"]+)"/g)) used.add(m[1])
    expect(used.size).toBeGreaterThan(0)
    for (const k of used) expect(HELP_TIPS[k], k).toBeTruthy()
  })
  it('Suche findet Wörter mit Umlauten und ohne, und sortiert Titel-Treffer nach vorn', () => {
    expect(searchHelp('verträge')[0].id).toBe('vertraege')
    expect(searchHelp('vertrage').some(t => t.id === 'vertraege')).toBe(true)
    expect(searchHelp('gantt')[0].id).toBe('planer')
    expect(searchHelp('xyzunbekannt')).toEqual([])
    expect(searchHelp('  ').length).toBe(HELP_TOPICS.length)
  })
  it('Hilfe zur Seite: längster Pfad gewinnt, Unbekanntes ergibt nichts', () => {
    expect(topicForPath('/fewo')?.id).toBe('fewo')
    expect(topicForPath('/crm/123')?.id).toBe('crm')
    expect(topicForPath('/gibtesnicht')).toBeNull()
  })
  it('Hilfe-Seite ist im Menü, in der Kopfleiste und im Layout verdrahtet', () => {
    expect(readFileSync('app/components/AppSidebar.vue', 'utf8')).toContain("to: '/help'")
    expect(readFileSync('app/components/AppTopbar.vue', 'utf8')).toContain('openHelp')
    expect(readFileSync('app/layouts/dashboard.vue', 'utf8')).toContain('<OnboardingTour')
  })
})
